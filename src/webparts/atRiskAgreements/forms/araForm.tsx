import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import {
  Box, Grid, Typography, TextField, MenuItem, Button, Divider, Autocomplete,
  Skeleton, List, ListItem, ListItemText, CircularProgress,
  FormLabel, RadioGroup, FormControlLabel, Radio, Stack,
  ListItemIcon, IconButton, Link
} from "@mui/material";
import { AttachFileOutlined, Close } from "@mui/icons-material";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { ContractType, IAttachmentInfo, IContractItem, IInvoiceItem, IOgItem, IPeoplePicker, IRiskAgreementItem } from "../data/props";
import { IPersonaProps } from "@fluentui/react";
import CurrencyField from "../ui/CurrencyField";
import { DataSource } from "../data/ds";
import { Web } from "gd-sprest";
import Strings from "../../../strings";
import AlertDialog from "../ui/Alert";
import { MuiPeoplePicker } from "../ui/CustomPeoplePicker";
import { RiskAgreementService } from "../services/agreementService";
import { buildAgreementDelta, formatDeltaSummary } from "../services/agreementDiff";
import { useTheme } from "@mui/material/styles";
import { formatError } from "../services/utils";

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

  const theme = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [submissionType, setSubmissionType] = useState<SubmissionType>("existing");
  const [showDialog, setShowDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [dialogMessage, setDialogMessage] = useState<string>("");
  const [draftItemId, setDraftItemId] = useState<number | undefined>(undefined);
  const [attachments, setAttachments] = useState<IAttachmentInfo[]>([]);
  const [cmTouched, setCmTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [contractOgWarning, setContractOgWarning] = React.useState<string>("");
  const [form, setForm] = useState<IRiskAgreementItem>({
    ...item,
    riskFundingRequested: item?.riskFundingRequested
  } as IRiskAgreementItem);

  const setDialogProps = (title: string, message: string): void => {
    setShowDialog(true);
    setDialogTitle(title);
    setDialogMessage(message);
  };

  const hideDialog = (): void => {
    setShowDialog(false);
  };

  // create valid OG list
  const availableOgs = React.useMemo<IOgItem[]>(() => {
    return (DataSource.OGs ?? []).filter((og) =>
      og.isActive === true && og.isSelectable === true
    );
  }, [DataSource.OGs]);

  // centralized map to use in helpers
  const availableOgByTitle = React.useMemo<Map<string, IOgItem>>(() => {
    return new Map<string, IOgItem>(
      availableOgs.map((og) => [og.Title, og])
    );
  }, [availableOgs]);


  useEffect(() => {
    if (mode === "new") {
      RiskAgreementService.createDraft()
        .then(setDraftItemId)
        .catch((error) => {
          console.error("Error creating temp draft", error)
          setDialogProps("Error creating temporary draft", "Refresh and try again. If this continues to happen, please contact IT Support.")
        });
    } else if (item) {
      //set draftItemId to current ID
      setDraftItemId(item.Id);
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

  // helper for getting Project Manager automatically from Contract selection
  const getProjectMgrRecord = async (email: string): Promise<IPeoplePicker | undefined> => {
    const user = await Web().SiteUsers().getByEmail(email).executeAndWait() as unknown as IPeoplePicker;
    if (!user) return undefined;
    return { EMail: email, Id: user.Id, Title: user.Title }
  }

  // helper for contract onChange to find OG and set, then find CM and set
  // helper for contract onChange to find OG and set, then find CM and set
  const applyOgAndCmFromContract = (contract: IContractItem | null): undefined => {
    const ogTitle = (contract?.field_75 ?? "").trim();

    // no default OG on the contract
    if (!ogTitle) {
      updateField("og", "");
      updateField("contractMgr", undefined);
      updateField("subContractMgr", undefined);
      setContractOgWarning("");
      setCmTouched(false);
      return undefined;
    }

    const ogRec = availableOgByTitle.get(ogTitle);

    // contract OG exists and is valid/selectable
    if (ogRec) {
      updateField("og", ogRec.Title);
      updateField("contractMgr", ogRec.CM);
      updateField("subContractMgr", ogRec.SCM);
      setContractOgWarning("");
      setCmTouched(false);
      return undefined;
    }

    // contract OG points to an inactive / non-selectable / invalid OG
    updateField("og", "");
    updateField("contractMgr", undefined);
    updateField("subContractMgr", undefined);
    setContractOgWarning(
      `The contract's default OG "${ogTitle}" is inactive or no longer selectable. Please choose an Operating Group manually.`
    );
    setCmTouched(false);
    return undefined;
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
  // guard against empty contract ID
  const filteredInvoices = useMemo<IInvoiceItem[]>(() => {
    if (!form.contractId) return [];
    return DataSource.Invoices;
  }, [form.contractId, DataSource.Invoices]);

  // memoize the selected invoice so that it will render after async update of the Invoices DataSource
  // respect missing contract
  const selectedInvoice = useMemo<IInvoiceItem | null>(() => {
    if (!form.contractId || !form.invoice) return null;
    return DataSource.Invoices.find((i) => i.InvoiceID1 === form.invoice) ?? null;
  }, [form.contractId, DataSource.Invoices, form.invoice]);

  // ContractType options array
  const contractTypeOptions: ContractType[] = ["FFP/LOE", "T&M", "LH", "Hybrid", "Cost Plus/Reimbursable"];

  // RISK DATE VALIDATION HELPERS
  //const tomorrow = dayjs().add(1, "day").startOf("day");
  const today = dayjs().startOf("day");
  const startPlusOne = form.riskStart ? dayjs(form.riskStart).add(1, "day").startOf("day") : null;
  const riskEndMin = startPlusOne && startPlusOne.isAfter(today) ? startPlusOne : today;
  const riskEndDay = form.riskEnd ? dayjs(form.riskEnd) : null;
  const riskEndInvalid = !!riskEndDay && riskEndDay.isValid() && riskEndDay.isBefore(riskEndMin);
  const riskEndMissing = !form.riskEnd;
  const riskEndShowError = riskEndInvalid || (submitted && riskEndMissing);
  const riskEndHelperText =
    riskEndInvalid
      ? `End date must be on/after ${riskEndMin.format("M/D/YYYY")} (after Risk Start and after today).`
      : (submitted && riskEndMissing)
        ? "Risk End Date is required."
        : "End date must be after Risk Start and after today";

  // Check for required and set error
  const isRequiredError = (value?: unknown): boolean =>
    submitted && (value === undefined || value === "" || value === null);

  // Set custom form validation
  const formInvalid =
    riskEndInvalid ||
    !form.riskStart ||
    !form.riskEnd ||
    !form.projectMgr ||
    !form.contractMgr ||
    !form.contractType ||
    !form.entity ||
    !form.og ||
    !form.riskFundingRequested ||
    !form.riskJustification ||
    !attachments.length ||
    (submissionType === "existing" && (!form.contractId || !form.invoice || !form.popEnd || !form.riskReason));

  // OG custom validation/helper
  const ogRequiredError = submitted && isRequiredError(form.og);
  const ogWarningMessage = !ogRequiredError ? contractOgWarning : "";

  const uploadAttachment = async (file: File): Promise<void> => {
    if (!draftItemId) return;

    const buffer: ArrayBuffer = await file.arrayBuffer();

    const newFile = await Web().Lists(Strings.Sites.main.lists.Agreements).Items().getById(draftItemId)
      .AttachmentFiles().add(file.name, buffer).executeAndWait();

    setAttachments((prev) => [...prev, newFile]);
  }

  const removeAttachment = async (att: IAttachmentInfo): Promise<void> => {
    if (!draftItemId) return;

    //get the file
    const file = await Web()
      .Lists(Strings.Sites.main.lists.Agreements)
      .Items()
      .getById(draftItemId)
      .AttachmentFiles()
      .getByFileName(att.FileName)
      .executeAndWait();

    // then delete the file (would not do this all in one call)
    await file.delete().executeAndWait();

    setAttachments((prev) => prev.filter((a) => a.FileName !== att.FileName));
  };

  // SUBMIT HANDLER
  const handleSubmit = (e: React.FormEvent): void => {

    e.preventDefault();

    setSubmitted(true);

    // STOP HERE if invalid
    if (formInvalid) {
      setDialogProps("Missing Required Fields", "Please correct the highlighted fields before submitting.");
      return;
    }

    // EDIT mode
    if (mode === "edit") {
      if (!form.Id) {
        console.error("Edit mode submit without Id", form);
        return;
      }

      const formDelta = buildAgreementDelta(item!, form); // item is only undefined on NEW forms
      const changeSummary = formatDeltaSummary(formDelta);
      const changePayloadJson = JSON.stringify(formDelta);

      onSubmit(form, mode, { changeSummary, changePayloadJson });
      return;
    }

    // NEW mode
    if (!draftItemId) {
      setDialogProps("Submit Error", "New mode submitted before a valid draft was created." +
        "Please refresh and try again or contact IT Support if this continues.")
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
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6"><AttachFileOutlined /> Attachments</Typography>
      <Divider />
      <List dense>
        {attachments.map((a) => (
          <ListItem key={a.FileName} disableGutters sx={{ px: 1, py: 0 }} >
            {/* Left "X" */}
            <ListItemIcon sx={{ minWidth: 36 }}>
              <IconButton
                edge="start"
                size="small"
                title={`Remove ${a.FileName}`}
                onClick={() => {
                  removeAttachment(a).catch((e) => {
                    setDialogProps("Error deleting attachment", formatError(e));
                  });

                }}
              >
                <Close fontSize="small" />
              </IconButton>
            </ListItemIcon>

            {/* Clickable file name */}
            <ListItemText primary={
              <Link href={a.ServerRelativeUrl} target="_blank" rel="noreferrer" underline="hover">
                {a.FileName}
              </Link>
            } />
          </ListItem>
        ))}
      </List>
      <Stack direction="column" spacing={1} alignItems="flex-start">
        {!attachments.length && (<Typography variant="caption" color={submitted ? "error" : "primary"}>At least one attachment is required.</Typography>)}
        <Button variant="outlined" color="primary" component="label">
          Upload Documents
          <input hidden type="file" multiple
            onChange={(e) => {
              const files = e.target.files;
              if (!files) return;
              Array.from(files).forEach(uploadAttachment);
              e.target.value = ""; // allows re-uploading same filename immediately
            }}
          />
        </Button>
      </Stack>
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

  // const theme = useTheme();
  // console.log("mode", theme.palette.mode);
  // console.log("info.main", theme.palette.info.main);
  // console.log("primary.main", theme.palette.primary.main);

  const fontSizeDefault = 14;
  const minHeight = "41px";
  const paddingVertical = "10px";

  return (

    // let me handle the validation instead of the MUI/Browser
    <form onSubmit={handleSubmit} noValidate>
      <Box
        sx={{
          backgroundColor: theme.custom?.cardBg,
          borderColor: theme.custom?.cardBorder,
          border: "1px solid",
          padding: 2,
          "& .MuiPickersSectionList-root": { fontSize: fontSizeDefault, py: paddingVertical, minHeight: minHeight },
          "& .MuiAutocomplete-root .MuiOutlinedInput-root.MuiOutlinedInput-root": { padding: 0, minHeight: minHeight },
          "& .MuiAutocomplete-root .MuiOutlinedInput-root.MuiInputBase-sizeSmall .MuiAutocomplete-input": { padding: "10px 14px" }
        }}>

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

          <Grid container spacing={2}>

            {/* // -----------------------------
          // Project Information SECTION
          // ----------------------------- */}
            <Grid size={12} sx={{ mt: 1 }}>
              <Typography variant="h6">Project Information</Typography>
              {/* <Typography variant="body2">Core details about the project and contract</Typography> */}
              <Divider sx={{ mb: 1 }} />
            </Grid>

            {submissionType === "existing" && (
              // <Grid size={{ xs: 12, md: 6 }}>
              <Grid size={{ xs: 12, md: 6, xl: 4 }}>
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

                    // get/verify PM
                    const pmEmail = (newValue?.field_21 ?? "").trim();
                    if (pmEmail) {
                      getProjectMgrRecord(pmEmail)
                        .then((person) => updateField("projectMgr", person))
                        .catch((e) => console.error("Could not set Project Manager field", e))
                    } else {
                      updateField("projectMgr", undefined);
                    }

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
                      error={submitted && submissionType === "existing" && !form.contractId}
                      helperText={submitted && !form.contractId ? "Contract is required" : undefined}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.field_19}>
                      <Stack>
                        <Typography fontSize={14} fontWeight={500} about="Contract Title">{option.field_20}</Typography>
                        <Typography variant="body2" color="text.secondary" about="Customer Contract Code">{option.field_35}</Typography>
                      </Stack>
                    </li>
                  )}
                />
              </Grid>
            )}

            {submissionType === "existing" && (
              // <Grid size={{ xs: 12, md: 6 }}>
              <Grid size={{ xs: 12, md: 6, xl: 4 }}>
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
                    if (!search) { return options; }
                    return options
                      .filter(o =>
                        o.field_42?.toLowerCase().includes(search) ||
                        o.field_28?.toLowerCase().includes(search));
                  }}
                  value={selectedInvoice}
                  onChange={(_, newValue) => { updateField("invoice", newValue?.InvoiceID1 ?? ""); }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="JAMIS Invoice No."
                      required
                      disabled={!form.contractId || invoiceLoading}
                      error={submitted && submissionType === "existing" && !form.invoice}
                      helperText={
                        submitted && submissionType === "existing" && !form.invoice
                          ? "Invoice is required"
                          : undefined
                      }
                      slotProps={{
                        input: {
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {invoiceLoading ? <CircularProgress size={18} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          )
                        }
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.field_14}>
                      <Stack>
                        <Typography fontSize={14} fontWeight={500}>{option.InvoiceID1}</Typography>
                        <Typography variant="body2" color="text.secondary">{option.field_28}</Typography>
                      </Stack>
                    </li>
                  )}
                />
              </Grid>
            )}

            {submissionType === "newOpp" && (
              <>
                <Grid size={{ xs: 12, md: 6, xl: 4 }}>
                  <TextField
                    label="Contract Name"
                    fullWidth
                    required={submissionType === "newOpp"}
                    disabled
                    value="New Award"
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6, xl: 4 }}>
                  <TextField
                    label="Program Name"
                    fullWidth
                    required={submissionType === "newOpp"}
                    error={submitted && submissionType === "newOpp" && isRequiredError(form.programName)}
                    helperText={submitted && !form.programName ? "Program Name is required" : undefined}
                    value={form.programName ?? ""}
                    onChange={(e) => updateField("programName", e.target.value)}
                  />
                </Grid>
              </>
            )}

            {submissionType === "existing" && (
              <Grid size={{ xs: 12, md: 6, xl: 4 }} maxHeight="41px" >
                <FormLabel
                  id="hasSubcontract-label"
                  sx={{
                    fontSize: "0.75rem",
                    paddingLeft: "15px",
                    top: "-11px"
                  }}>
                  Has Subcontract?
                </FormLabel>

                <RadioGroup
                  row
                  aria-labelledby="hasSubcontract-label"
                  name="hasSubcontract"
                  value={form.hasSubcontract ? "true" : "false"}
                  sx={{
                    paddingLeft: 3,
                    position: "relative",
                    top: "-12px",
                    "& .MuiFormControlLabel-label": {
                      fontSize: "14px",
                      lineHeight: "20px"
                    }
                  }}
                  onChange={(e) =>
                    updateField("hasSubcontract", e.target.value === "true")
                  }
                >
                  <FormControlLabel value="false" control={<Radio size="small" />} label="No" />
                  <FormControlLabel value="true" control={<Radio size="small" />} label="Yes" />
                </RadioGroup>
              </Grid>
            )}

            <Grid size={{ xs: 12, md: 6, xl: 4 }}>
              <TextField
                select
                label="Contract Type"
                fullWidth
                required
                error={submitted && isRequiredError(form.contractType)}
                helperText={submitted && !form.contractType ? "Contract Type is required" : undefined}
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
              <Grid size={{ xs: 12, md: 6, xl: 4 }}>
                <DatePicker
                  label="Contractual PoP End Date"
                  value={form.popEnd ? dayjs(form.popEnd) : null}
                  onChange={(value: Dayjs | null) =>
                    updateField("popEnd", value ? value.format("MM/DD/YYYY") : "")
                  }
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: submissionType === "existing",
                      error: submitted && isRequiredError(form.popEnd),
                      helperText: submitted && !form.popEnd ? "PoP End Date is required" : undefined
                    }
                  }}
                />
              </Grid>
            )}

            <Grid size={{ xs: 12, md: 6, xl: 4 }}>
              <TextField
                select
                label="Entity"
                required
                fullWidth
                value={form.entity ?? ""}
                error={submitted && isRequiredError(form.entity)}
                helperText={submitted && !form.entity ? "Entity is required" : undefined}
                onChange={(e) => updateField("entity", e.target.value)}
              >
                <MenuItem value="">Select Entity</MenuItem>
                {DataSource.Entities.map((e) => (
                  <MenuItem key={e.Id} value={e.abbr}>
                    {e.combinedTitle}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 6, xl: 4 }}>
              <TextField
                select
                label="Operating Group"
                required
                fullWidth
                value={form.og ?? ""}
                error={ogRequiredError || !!ogWarningMessage}
                helperText={ogRequiredError ? "OG is required" : ogWarningMessage || undefined}
                onChange={(e) => {
                  // on change, default CM only if not touched (or CM empty)
                  const newOg = e.target.value;
                  updateField("og", newOg);

                  // user manually fixed the OG, so clear the warning
                  setContractOgWarning("");

                  if (!cmTouched || !form.contractMgr?.Id) {
                    const ogRec = availableOgByTitle.get(newOg);
                    updateField("contractMgr", ogRec?.CM);
                    updateField("subContractMgr", ogRec?.SCM);
                  }
                }}
              >
                <MenuItem value="">Select OG</MenuItem>
                {availableOgs.map((e) => (
                  <MenuItem key={e.Id} value={e.Title}>
                    {e.Title}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 6, xl: 4 }}>
              <MuiPeoplePicker
                label="Project Manager"
                context={peoplePickerContext}
                value={form.projectMgr?.EMail ? [form.projectMgr.EMail] : []}
                required
                onChange={(items) => handlePeoplePicker(items, "projectMgr")}
                error={submitted && isRequiredError(form.projectMgr)}
                helperText={submitted && isRequiredError(form.projectMgr) ? "Project Manager is required" : undefined}
                selectionLimit={1}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6, xl: 4 }}>
              <MuiPeoplePicker
                label="Contract Manager"
                context={peoplePickerContext}
                value={form.contractMgr?.EMail ? [form.contractMgr.EMail] : []}
                required
                onChange={(items) => {
                  setCmTouched(true);
                  handlePeoplePicker(items, "contractMgr");
                }}
                error={submitted && isRequiredError(form.contractMgr)}
                helperText={submitted && isRequiredError(form.contractMgr) ? "Contract Manager is required" : undefined}
                selectionLimit={1}
              />
            </Grid>

            {/* // -----------------------------
          // Risk Details SECTION
          // ----------------------------- */}
            <Grid size={12} sx={{ mt: 1 }}>
              <Typography variant="h6">Risk Details</Typography>
              <Divider sx={{ mb: 1 }} />
            </Grid>

            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <DatePicker
                label="Risk Start Date"
                value={form.riskStart ? dayjs(form.riskStart) : null}
                onChange={(value: Dayjs | null) =>
                  updateField("riskStart", value ? value.format("MM/DD/YYYY") : "")
                }
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: submitted && isRequiredError(form.riskStart),
                    helperText: submitted && !form.riskStart ? "Risk Start Date is required" : undefined
                  }
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <DatePicker
                label="Risk End Date"
                value={riskEndDay}
                minDate={riskEndMin}
                onChange={(value: Dayjs | null) =>
                  updateField("riskEnd", value ? value.format("MM/DD/YYYY") : "")
                }
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: riskEndShowError,
                    helperText: riskEndHelperText
                  }
                }}
              />
            </Grid>

            {submissionType === "existing" && (
              <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <TextField
                  select
                  label="Reason for At-Risk Work"
                  fullWidth
                  required
                  error={submitted && isRequiredError(form.riskReason)}
                  helperText={submitted && !form.riskReason ? "Risk Reason is required" : undefined}
                  value={form.riskReason ?? ""}
                  onChange={(e) => updateField("riskReason", e.target.value as IRiskAgreementItem["riskReason"])}
                >
                  <MenuItem value="Lack of funding">Lack of funding</MenuItem>
                  <MenuItem value="PoP End">PoP End</MenuItem>
                </TextField>
              </Grid>
            )}

            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <CurrencyField
                label="New Risk Funding Requested"
                fullWidth
                required
                value={form.riskFundingRequested}
                onChange={(val) => updateField("riskFundingRequested", val)}
                error={submitted && isRequiredError(form.riskFundingRequested)}
                helperText={
                  submitted && isRequiredError(form.riskFundingRequested)
                    ? "A Risk Funding Amount is required (0 is allowed)"
                    : undefined
                }
              />
            </Grid>

            {/* // -----------------------------
          // BACKUP REQUESTOR SECTION
          // ----------------------------- */}
            <Grid size={12} sx={{ mt: 1 }}>
              <Typography variant="h6">Backup</Typography>
              <Divider sx={{ mb: 1 }} />
            </Grid>

            <Grid size={{ xs: 12, md: 6, xl: 4 }}>
              <MuiPeoplePicker
                label="Backup Requestor (optional)"
                context={peoplePickerContext}
                value={form.backupRequestor?.EMail ? [form.backupRequestor.EMail] : []}
                required={false}
                onChange={(items) => handlePeoplePicker(items, "backupRequestor")}
                selectionLimit={1}
                showtooltip={true}
                tooltipMessage="Designated person who will receive notifications for this request, including the ability to take any necessary actions."
              />
            </Grid>

            {/* // -----------------------------
          // JUSTIFICATION SECTION
          // ----------------------------- */}
            <Grid size={12} sx={{ mt: 1 }}>
              <Typography variant="h6">Justification</Typography>
              <Divider sx={{ mb: 1 }} />
            </Grid>

            <Grid size={12}>
              <TextField
                multiline
                rows={5}
                fullWidth
                required
                error={submitted && isRequiredError(form.riskJustification)}
                helperText={submitted && !form.riskJustification ? "Justification is required" : undefined}
                placeholder="(REQUIRED) Explain why this at-risk work is necessary..."
                value={form.riskJustification ?? ""}
                onChange={(e) => updateField("riskJustification", e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-input": {
                    padding: 0,
                    lineHeight: "20px"
                  }
                }}
              />
            </Grid>

          </Grid>

        </LocalizationProvider>

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