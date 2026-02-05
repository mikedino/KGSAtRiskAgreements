import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import {
  Box, Grid, Typography, TextField, MenuItem, Button, Divider, Autocomplete,
  Skeleton, List, ListItem, ListItemText, CircularProgress
} from "@mui/material";
import AttachFileOutlined from "@mui/icons-material/AttachFileOutlined";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { ContractType, IAttachmentInfo, IContractItem, IRiskAgreementItem } from "../data/props";
import { IPersonaProps, Stack } from "@fluentui/react";
import CurrencyField from "../ui/CurrencyField";
import { DataSource } from "../data/ds";
import { Web } from "gd-sprest";
import Strings from "../../../strings";
import AlertDialog from "../ui/Alert";
import { MuiPeoplePicker } from "../ui/CustomPeoplePicker";
import { RiskAgreementService } from "../services/agreementService";
import { buildAgreementDelta, formatDeltaSummary } from "../services/agreementDiff";

export type CancelReason = { type: "draft"; draftId: number } | { type: "normal" };

export type formModMeta = {
  comment?: string;              // user-entered reason
  changeSummary?: string;        // auto summary
  changePayloadJson?: string;    // auto diff json
};

interface RiskAgreementFormProps {
  item?: IRiskAgreementItem; // undefined = NEW
  context: WebPartContext;
  mode: "new" | "edit";
  onSubmit: (data: IRiskAgreementItem, mode: "new" | "edit", modMeta?: formModMeta) => void;
  onCancel: (reason: CancelReason) => void;
}

type SubmissionType = "existing" | "newOpp";

const RiskAgreementForm: React.FC<RiskAgreementFormProps> = ({ item, context, mode, onSubmit, onCancel }) => {

  const [loading, setLoading] = useState<boolean>(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [submissionType, setSubmissionType] = useState<SubmissionType>("existing");
  const [showDialog, setShowDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [dialogMessage, setDialogMessage] = useState<string>("");
  const [draftItemId, setDraftItemId] = useState<number | undefined>(undefined);
  const [attachments, setAttachments] = useState<IAttachmentInfo[]>([]);
  const [cmTouched, setCmTouched] = useState(false);
  const [form, setForm] = useState<IRiskAgreementItem>({
    riskFundingRequested: 0,
    ...(item ?? {})
  } as IRiskAgreementItem);

  const setDialogProps = (title: string, message: string): void => {
    setShowDialog(true);
    setDialogTitle(title);
    setDialogMessage(message);
  };

  const hideDialog = (): void => {
    setShowDialog(false);
  };

  useEffect(() => {
    if (mode === "new") {
      RiskAgreementService.createDraft()
        .then(setDraftItemId)
        .catch((error) => {
          console.error("Error creating temp draft", error)
          setDialogProps("Error creating temporary draft", "Refresh and try again. If this continues to happen, please contact IT Support.")
        });
    } else if (item) {
      //get item attachments on load for edit item
      const files = Web().Lists(Strings.Sites.main.lists.Agreements).Items()
        .getById(item.Id).AttachmentFiles().executeAndWait();
      //set attachments state
      setAttachments(files.results ?? []);
      //set proper submission type
      setSubmissionType(item.invoice ? "existing" : "newOpp");
    }
  }, [mode, item]);


  // lazy-load invoices only after a contract is selected
  useEffect(() => {
    const load = async (): Promise<void> => {
      if (submissionType !== "existing") return;
      if (!form.contractId) return;

      setInvoiceLoading(true);
      try {
        await DataSource.getInvoicesByContract(form.contractId);
      } catch (e) {
        console.error("Failed to load invoices", e);
        setDialogProps("Error loading invoices", "Please try again or contact IT Support.");
      } finally {
        setInvoiceLoading(false);
      }
    };

    load().then(() => setLoading(false)).catch((error: unknown) => {
      console.error("Failed to load invoices", error);
    });

  }, [submissionType, form.contractId]);

  const peoplePickerContext = {
    absoluteUrl: context.pageContext.web.absoluteUrl,
    msGraphClientFactory: context.msGraphClientFactory,
    spHttpClient: context.spHttpClient
  };

  const updateField = <K extends keyof IRiskAgreementItem>(key: K, value: IRiskAgreementItem[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePeoplePicker = (items: IPersonaProps[], field: keyof IRiskAgreementItem): void => {
    if (!items.length) {
      updateField(field, undefined); // allow undefined if clearing field
      return;
    }

    updateField(field, {
      Id: parseInt(items[0].id!, 10),
      EMail: items[0].secondaryText!,
      Title: items[0].text!
    });
  };

  // helper for contract onChange to find OG and set, then find CM and set
  const applyOgAndCmFromContract = (contract: IContractItem | null): void => {
    const ogTitle = contract?.field_75 ?? "";
    const ogRec = DataSource.OGs.find(o => o.Title === ogTitle);

    updateField("og", ogTitle ?? ""); //maybe no match
    updateField("contractMgr", ogRec?.CM);

    setCmTouched(false);
  };

  // watch submission type and if NEW OPP, update the form projectName to "New Award"
  useEffect(() => {
    if (submissionType !== "newOpp") return;

    // ensure the saved backend field is always correct
    updateField("projectName", "New Award");

    // defensive: ensure we don't treat it like an existing contract
    updateField("contractId", undefined);
    updateField("invoice", "");
  }, [submissionType]);

  // memoized list so we don’t re-filter 2700+ invoices on every keystroke.
  const filteredInvoices = useMemo(() => DataSource.Invoices, [DataSource.Invoices]);

  // memoize the selected invoice so that it will render after async update of the Invoices DataSource
  const selectedInvoice = useMemo(() => {
    if (!form.invoice) return null;
    return DataSource.Invoices.find(i => i.InvoiceID1 === form.invoice) ?? null;
  }, [DataSource.Invoices, form.invoice]);

  // ContractType options array
  const contractTypeOptions: ContractType[] = ["FFP/LOE", "T&M", "LH", "Hybrid", "Cost Plus/Reimbursable"];

  const uploadAttachment = async (file: File): Promise<void> => {
    if (!draftItemId) return;

    const newFile = await Web().Lists(Strings.Sites.main.lists.Agreements).Items().getById(draftItemId)
      .AttachmentFiles().add(file.name, file).executeAndWait();

    setAttachments((prev) => [...prev, newFile]);
  }

  // SUBMIT HANDLER
  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    // EDIT mode
    if (mode === "edit") {
      if (!form.Id) {
        console.error("Edit mode submit without Id", form);
        return;
      }

      const formDelta = buildAgreementDelta(item!, form); // item is only undefined on NEW forms
      const changeSummary = formatDeltaSummary(formDelta);
      const changePayloadJson = JSON.stringify(formDelta);

      onSubmit(form, mode, { changeSummary, changePayloadJson, comment: "insert comment" });
      return;
    }

    // NEW mode
    if (!draftItemId) {
      console.error("New mode submit before draft item created");
      return;
    }

    onSubmit({
      ...form,
      Id: draftItemId
    }, mode);
  };

  // -----------------------------
  // ATTACHMENTS SECTION
  // -----------------------------
  const renderAttachments = (): JSX.Element => (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6"><AttachFileOutlined /> Attachments</Typography>
      <Divider sx={{ mt: 1 }} />
      <List dense>
        {attachments.map(a => (
          <ListItem key={a.FileName} component="a" href={a.ServerRelativeUrl} target="_blank">
            <ListItemText primary={a.FileName} />
          </ListItem>
        ))}
      </List>
      <Button variant="outlined" component="label">
        Upload Documents
        <input hidden type="file" multiple
          onChange={(e) => {
            const files = e.target.files;
            if (!files) return;
            Array.from(files).forEach(uploadAttachment);
          }}
        />
      </Button>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Skeleton height={40} />
        <Skeleton height={40} animation="wave" />
        <Skeleton height={40} />
        <Skeleton height={40} animation="wave" />
        <Skeleton height={40} />
        <Skeleton height={40} animation="wave" />
        <Skeleton height={40} />
        <Skeleton height={40} animation="wave" />
        <Skeleton height={40} />
      </Box>
    )
  }

  // -----------------------------
  // MAIN RENDER
  // -----------------------------
  return (

    <form onSubmit={handleSubmit}>
      <Box>

        <Typography variant="h5" sx={{ mb: 4 }}>
          {mode === "new" ? "New At-Risk Agreement" : `Edit At-Risk Agreement - ${form.Title}`}
        </Typography>

        {/* Submission type selector */}
        <TextField
          select
          label="Submission Type"
          sx={{ mb: 1, width: 300 }}
          value={submissionType}
          onChange={(e) =>
            setSubmissionType(e.target.value as SubmissionType)
          }
          disabled={mode === "edit"}
        >
          <MenuItem value="existing">Existing Contract</MenuItem>
          <MenuItem value="newOpp">Opportunity / New Contract</MenuItem>
        </TextField>

        {/* Sections */}
        <LocalizationProvider dateAdapter={AdapterDayjs}>

          <Grid container spacing={3}>

            {/* // -----------------------------
          // Project Information SECTION
          // ----------------------------- */}
            <Grid size={12} sx={{ mt: 4 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Project Information</Typography>
              {/* <Typography variant="body2">Core details about the project and contract</Typography> */}
              <Divider sx={{ mt: 1, mb: 2 }} />
            </Grid>

            {submissionType === "existing" && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Autocomplete
                  options={DataSource.Contracts}
                  fullWidth
                  autoHighlight
                  noOptionsText="Start typing to search contracts"
                  openOnFocus={false}
                  getOptionLabel={(option) => option.field_20 ?? ""}
                  isOptionEqualToValue={(option, value) => option.field_19 === value.field_19}
                  filterOptions={(options, { inputValue }) => {
                    const search = inputValue.toLowerCase().trim();
                    if (!search) return [];
                    return options
                      .filter(o =>
                        o.field_20?.toLowerCase().includes(search) ||
                        o.field_35?.toLowerCase().includes(search))
                      .slice(0, 20);
                  }}
                  value={DataSource.Contracts.find((c) => c.field_20 === form.projectName) ?? null}
                  onChange={(_, newValue) => {
                    updateField("projectName", newValue?.field_20 ?? "");
                    updateField("contractId", newValue?.field_19 ?? undefined);
                    // force defaults for OG and CM
                    applyOgAndCmFromContract(newValue);
                    // reset invoice when contract changes
                    updateField("invoice", "");
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Project / Contract Name"
                      required
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.field_19}>
                      <Stack>
                        <Typography fontWeight={500}>{option.field_20}</Typography>
                        <Typography variant="body2" color="text.secondary">{option.field_35}</Typography>
                      </Stack>
                    </li>
                  )}
                />
              </Grid>
            )}

            {submissionType === "existing" && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Autocomplete
                  options={filteredInvoices}
                  fullWidth
                  autoHighlight
                  openOnFocus={false}
                  noOptionsText={form.contractId ? "Start typing to search invoices" : "Select a contract first"}
                  getOptionLabel={(option) => option.InvoiceID1 ?? ""}
                  isOptionEqualToValue={(option, value) => option.InvoiceID1 === value.InvoiceID1}
                  filterOptions={(options, { inputValue }) => {
                    const search = inputValue.toLowerCase().trim();
                    if (!search) { return options.slice(0, 20); }
                    return options
                      .filter(o =>
                        o.field_42?.toLowerCase().includes(search) ||
                        o.field_28?.toLowerCase().includes(search))
                      .slice(0, 20);
                  }}
                  value={selectedInvoice}
                  onChange={(_, newValue) => { updateField("invoice", newValue?.InvoiceID1 ?? ""); }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Invoice"
                      required
                      disabled={!form.contractId || invoiceLoading}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {invoiceLoading ? <CircularProgress size={18} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        )
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.field_14}>
                      <Stack>
                        <Typography fontWeight={500}>{option.InvoiceID1}</Typography>
                        <Typography variant="body2" color="text.secondary">{option.field_28}</Typography>
                      </Stack>
                    </li>
                  )}
                />
              </Grid>
            )}

            {submissionType === "newOpp" && (
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Contract Name"
                  fullWidth
                  required
                  disabled
                  value="New Award"
                />
              </Grid>
            )}

            {submissionType === "newOpp" && (
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Program Name" fullWidth required value={form.programName ?? ""} onChange={(e) => updateField("programName", e.target.value)} />
              </Grid>
            )}

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                label="Contract Type"
                fullWidth
                required
                value={form.contractType ?? ""}
                onChange={(e) => updateField("contractType", e.target.value as ContractType)}
              >
                <MenuItem value="">Select contract type</MenuItem>
                {contractTypeOptions.map((ct) => (
                  <MenuItem key={ct} value={ct}>
                    {ct}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {submissionType === "existing" && (
              <Grid size={{ xs: 12, md: 6 }}>
                <DatePicker
                  label="Contractual PoP End Date"
                  value={form.popEnd ? dayjs(form.popEnd) : null}
                  onChange={(value: Dayjs | null) =>
                    updateField("popEnd", value ? value.format("MM/DD/YYYY") : "")
                  }
                  slotProps={{
                    textField: {
                      fullWidth: true
                    }
                  }}
                />
              </Grid>
            )}

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select label="Entity" required fullWidth value={form.entity ?? ""} onChange={(e) => updateField("entity", e.target.value)} >
                <MenuItem value="">Select Entity</MenuItem>
                {DataSource.Entities.map((e) => (
                  <MenuItem key={e.Id} value={e.abbr}>
                    {e.combinedTitle}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                label="Operating Group"
                required
                fullWidth
                value={form.og ?? ""}
                onChange={(e) => {
                  // on change, default CM only if not touched (or CM empty)
                  const newOg = e.target.value;
                  updateField("og", newOg);

                  if (!cmTouched || !form.contractMgr?.Id) {
                    const ogRec = DataSource.OGs.find(o => o.Title === newOg);
                    updateField("contractMgr", ogRec?.CM);
                  }
                }}
              >
                <MenuItem value="">Select OG</MenuItem>
                {DataSource.OGs.map((e) => (
                  <MenuItem key={e.Id} value={e.Title}>
                    {e.Title}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <MuiPeoplePicker
                label="Project Manager"
                context={peoplePickerContext}
                value={form.projectMgr?.EMail ? [form.projectMgr.EMail] : []}
                required
                onChange={(items) => handlePeoplePicker(items, "projectMgr")}
                selectionLimit={1}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <MuiPeoplePicker
                label="Contract Manager"
                context={peoplePickerContext}
                value={form.contractMgr?.EMail ? [form.contractMgr.EMail] : []}
                required
                onChange={(items) => {
                  setCmTouched(true);
                  handlePeoplePicker(items, "contractMgr");
                }}
                selectionLimit={1}
              />
            </Grid>

          </Grid>

          <Grid container spacing={3}>

            {/* // -----------------------------
          // Risk Details SECTION
          // ----------------------------- */}
            <Grid size={12} sx={{ mt: 4 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Risk Details</Typography>
              <Divider sx={{ mt: 1, mb: 2 }} />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <DatePicker
                label="Risk Start Date"
                value={form.riskStart ? dayjs(form.riskStart) : null}
                onChange={(value: Dayjs | null) =>
                  updateField("riskStart", value ? value.format("MM/DD/YYYY") : "")
                }
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true
                  }
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <DatePicker
                label="Risk End Date"
                value={form.riskEnd ? dayjs(form.riskEnd) : null}
                onChange={(value: Dayjs | null) =>
                  updateField("riskEnd", value ? value.format("MM/DD/YYYY") : "")
                }
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true
                  }
                }}
              />
            </Grid>

            {submissionType === "existing" && (
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField select label="Reason for At-Risk Work" fullWidth required value={form.riskReason ?? ""} onChange={(e) => updateField("riskReason", e.target.value as IRiskAgreementItem["riskReason"])} >
                  <MenuItem value="Lack of funding">Lack of funding</MenuItem>
                  <MenuItem value="PoP End">PoP End</MenuItem>
                </TextField>
              </Grid>
            )}

            <Grid size={{ xs: 12, md: 6 }}>
              <CurrencyField
                label="New Risk Funding Requested"
                fullWidth
                required
                value={form.riskFundingRequested}
                onChange={(val) => updateField("riskFundingRequested", val)}
              />
            </Grid>

          </Grid>

        </LocalizationProvider>

        {/* // -----------------------------
          // JUSTIFICATION SECTION
          // ----------------------------- */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6">Justification</Typography>
          <Divider sx={{ mt: 1, mb: 2 }} />
          <TextField multiline rows={5} fullWidth placeholder="Explain why this at-risk work is necessary..." value={form.riskJustification ?? ""} onChange={(e) => updateField("riskJustification", e.target.value)} />
        </Box>

        {renderAttachments()}

        <Divider sx={{ mt: 3, mb: 1 }} />

        {/* Footer */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 3 }}>
          <Button
            variant="outlined"
            onClick={() => {
              if (mode === "new" && draftItemId) {
                // when creating new and click cancel - we need to delete/cleanup the draft created
                onCancel({ type: "draft", draftId: draftItemId });
              } else {
                onCancel({ type: "normal" });
              }
            }}
          >Cancel</Button>
          <Button type="submit" variant="contained">{mode === "edit" ? 'Save Changes' : 'Submit for Approval'}</Button>
        </Box>
      </Box>

      <AlertDialog open={showDialog} title={dialogTitle} message={dialogMessage} onClose={hideDialog} />

    </form>

  );
};

export default RiskAgreementForm;