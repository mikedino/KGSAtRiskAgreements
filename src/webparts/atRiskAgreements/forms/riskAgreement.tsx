import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { Box, Grid, Typography, TextField, MenuItem, Button, Divider, Autocomplete } from "@mui/material";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { PeoplePicker, PrincipalType } from "@pnp/spfx-controls-react/lib/PeoplePicker";
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { ContractType, IRiskAgreementItem } from "../data/props";
import { IPersonaProps, Stack } from "@fluentui/react";
import { customPickerClass } from "../styles/componentStyles";
import CurrencyField from "../ui/CurrencyField";
import { DataSource } from "../data/ds";

interface RiskAgreementFormProps {
  item?: IRiskAgreementItem; // undefined = NEW
  context: WebPartContext;
  mode: "new" | "edit";
  onSubmit: (data: IRiskAgreementItem) => void;
  onCancel: () => void;
}

type SubmissionType = "existing" | "new";

const RiskAgreementForm: React.FC<RiskAgreementFormProps> = ({ item, context, mode, onSubmit, onCancel, }) => {

  const [submissionType, setSubmissionType] = useState<SubmissionType>("existing");
  const [form, setForm] = useState<IRiskAgreementItem>({
    riskFundingRequested: 0,
    ...(item ?? {})
  } as IRiskAgreementItem);

  useEffect(() => {
    const loadInvoices = async (): Promise<void> => {
      await DataSource.getInvoices();
    };

    loadInvoices().catch((error: unknown) => {
      console.error("Failed to load attachments", error);
    });
  }, []);

  const peoplePickerContext = {
    absoluteUrl: context.pageContext.web.absoluteUrl,
    msGraphClientFactory: context.msGraphClientFactory,
    spHttpClient: context.spHttpClient
  };

  const updateField = <K extends keyof IRiskAgreementItem>(key: K, value: IRiskAgreementItem[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePeoplePicker = async (items: IPersonaProps[], field: keyof IRiskAgreementItem): Promise<void> => {
    if (items.length > 0) {
      updateField(field, {
        Id: parseInt(items[0].id!, 10),
        EMail: items[0].secondaryText!,
        Title: items[0].text!
      });
    }
  };

  // memoized list so we don’t re-filter 2700+ invoices on every keystroke.
  const filteredInvoices = useMemo(() => {
    if (!form.contractId) return [];

    const dInvoice = DataSource.Invoices;

    return dInvoice.filter(
      i => i.field_49 === form.contractId

    );
  }, [form.contractId, DataSource.Invoices]);


  // ContractType options array
  const contractTypeOptions: ContractType[] = ["FFP/LOE", "T&M", "LH", "Hybrid", "Cost Plus/Reimbursable"];

  // SUBMIT HANDLER
  const handleSubmit = (): void => {
    onSubmit(form);
  };

  // -----------------------------
  // ATTACHMENTS SECTION
  // -----------------------------
  const renderAttachments = (): JSX.Element => (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6">Attachments</Typography>
      <Divider sx={{ mt: 1, mb: 2 }} />
      <Button variant="outlined">Upload Document</Button>
    </Box>
  );

  // -----------------------------
  // MAIN RENDER
  // -----------------------------
  return (

    <Box sx={{ p: 4 }}>

      <Typography variant="h4" sx={{ mb: 3 }}>
        {mode === "new" ? "New At-Risk Agreement" : "Edit At-Risk Agreement"}
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
      >
        <MenuItem value="existing">Existing Contract</MenuItem>
        <MenuItem value="new">Opportunity / New Contract</MenuItem>
      </TextField>

      {/* Sections */}
      <LocalizationProvider dateAdapter={AdapterDayjs}>

        <Grid container spacing={3}>

          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 1 }}>Project Information</Typography>
            <Typography variant="body2">Core details about the project and contract</Typography>
            <Divider sx={{ mt: 1, mb: 2 }} />
          </Grid>

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
                value={filteredInvoices.find(i => i.InvoiceID1 === form.invoice) ?? null}
                onChange={(_, newValue) => { updateField("invoice", newValue?.InvoiceID1 ?? ""); }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Invoice"
                    required
                    disabled={!form.contractId}
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

          {submissionType === "new" && (
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
              <DatePicker
                label="PoP End Date"
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
                <MenuItem key={e.Id} value={e.Title}>
                  {e.combinedTitle}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <PeoplePicker
              titleText="Project Manager"
              context={peoplePickerContext}
              peoplePickerCntrlclassName={customPickerClass}
              defaultSelectedUsers={form.projectMgr?.EMail ? [form.projectMgr.EMail] : []}
              personSelectionLimit={1}
              ensureUser
              onChange={(items) => handlePeoplePicker(items, "projectMgr")}
              principalTypes={[PrincipalType.User]}
              resolveDelay={1000}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ mt: 2 }}>
              {/* <Typography variant="body1" sx={{ mb: 1 }}>
              Contract Manager
            </Typography> */}

              <PeoplePicker
                titleText="Contract Manager"
                context={peoplePickerContext}
                peoplePickerCntrlclassName={customPickerClass}
                defaultSelectedUsers={form.contractMgr?.EMail ? [form.contractMgr.EMail] : []}
                personSelectionLimit={1}
                ensureUser
                onChange={(items) => handlePeoplePicker(items, "contractMgr")}
                principalTypes={[PrincipalType.User]}
                resolveDelay={1000}
              />
            </Box>
          </Grid>

          {submissionType === "existing" && (
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select label="Reason for At-Risk Work" fullWidth required value={form.riskReason ?? ""} onChange={(e) => updateField("riskReason", e.target.value as IRiskAgreementItem["riskReason"])} >
                <MenuItem value="Lack of funding">Lack of funding</MenuItem>
                <MenuItem value="PoP End / Lack of funding">PoP End</MenuItem>
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

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6">Justification</Typography>
        <Divider sx={{ mt: 1, mb: 2 }} />
        <TextField multiline rows={5} fullWidth placeholder="Explain why this at-risk work is necessary..." value={form.riskJustification ?? ""} onChange={(e) => updateField("riskJustification", e.target.value)} />
      </Box>

      {renderAttachments()}

      <Divider sx={{ mt: 3, mb: 1 }} />

      {/* Footer */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 3 }}>
        <Button variant="outlined" onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Submit for Approval</Button>
      </Box>
    </Box>

  );
};

export default RiskAgreementForm;