import * as React from "react";
import { useState } from "react";
import { Box, Grid, Typography, TextField, MenuItem, Button, Divider } from "@mui/material";
import { PeoplePicker, PrincipalType } from "@pnp/spfx-controls-react/lib/PeoplePicker";
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { IRiskAgreementItem } from "../data/props";
import { IPersonaProps } from "@fluentui/react";
import { customPickerClass } from "../styles/componentStyles";

interface RiskAgreementFormProps {
  item?: IRiskAgreementItem; // undefined = NEW
  context: WebPartContext;
  mode: "new" | "edit";
  onSubmit: (data: IRiskAgreementItem) => void;
  onCancel: () => void;
}

type SubmissionType = "existing" | "opportunity";

const RiskAgreementForm: React.FC<RiskAgreementFormProps> = ({ item, context, mode, onSubmit, onCancel, }) => {

  const [submissionType, setSubmissionType] = useState<SubmissionType>("existing");
  const [form, setForm] = useState<IRiskAgreementItem>({ ...(item ?? {}) } as IRiskAgreementItem);

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

  // ContractType options array
  const CONTRACT_TYPE_OPTIONS: IRiskAgreementItem["ContractType"][] = ["FFP", "FFP/LOE", "T&M", "LH", "CPAF", "CPIF", "CPFF", "CR"];

  // -----------------------------
  // PROJECT / OPPORTUNITY SECTION
  // -----------------------------
  const renderProjectInfo = (): JSX.Element => {
    if (submissionType === "existing") {
      return (
        <Grid container spacing={3}>

          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Project Information
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              Core details about the project and contract
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Project/Contract Name"
              fullWidth
              required
              value={form.ProjectName ?? ""}
              onChange={(e) => updateField("ProjectName", e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Contract Number"
              fullWidth
              required
              value={form.ContractNumber ?? ""}
              onChange={(e) => updateField("ContractNumber", e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              type="date"
              label="PoP Start Date"
              InputLabelProps={{ shrink: true }}
              fullWidth
              value={form.StartD ?? ""}
              onChange={(e) => updateField("StartD", e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              type="date"
              label="PoP End Date"
              InputLabelProps={{ shrink: true }}
              fullWidth
              value={form.EndD ?? ""}
              onChange={(e) => updateField("EndD", e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select
              label="Entity"
              required
              fullWidth
              value={form.EntityB ?? ""}
              onChange={(e) => updateField("EntityB", e.target.value)}
            >
              <MenuItem value="">Select entity</MenuItem>
              <MenuItem value="KGS">KGS</MenuItem>
              <MenuItem value="KDS">KDS</MenuItem>
              {/* TODO: Populate dynamically */}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <PeoplePicker
              titleText="Entity General Manager"
              context={peoplePickerContext}
              peoplePickerCntrlclassName={customPickerClass}
              defaultSelectedUsers={form.EntityBManager?.EMail ? [form.EntityBManager.EMail] : []}
              personSelectionLimit={1}
              ensureUser
              onChange={(items) => handlePeoplePicker(items, "EntityBManager")}
              principalTypes={[PrincipalType.User]}
              resolveDelay={1000}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <PeoplePicker
              titleText="Project Manager"
              context={peoplePickerContext}
              peoplePickerCntrlclassName={customPickerClass}
              defaultSelectedUsers={form.ProjectManager?.EMail ? [form.ProjectManager.EMail] : []}
              personSelectionLimit={1}
              ensureUser
              onChange={(items) => handlePeoplePicker(items, "ProjectManager")}
              principalTypes={[PrincipalType.User]}
              resolveDelay={1000}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <PeoplePicker
              titleText="Contract Manager"
              context={peoplePickerContext}
              peoplePickerCntrlclassName={customPickerClass}
              defaultSelectedUsers={form.EntityAManager?.EMail ? [form.EntityAManager.EMail] : []}
              personSelectionLimit={1}
              ensureUser
              onChange={(items) => handlePeoplePicker(items, "EntityAManager")}
              principalTypes={[PrincipalType.User]}
              resolveDelay={1000}
            />
          </Grid>

          <Grid size={12}>
            <TextField
              label="Task Order"
              fullWidth
              value={form.TaskOrder ?? ""}
              onChange={(e) => updateField("TaskOrder", e.target.value)}
            />
          </Grid>
        </Grid>
      );
    }

    // -----------------------------
    //      OPPORTUNITY SECTION
    // -----------------------------
    return (
      <Grid container spacing={3}>

        <Grid size={12}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Opportunity Information
          </Typography>
        </Grid>

        <Grid size={12}>
          <TextField
            label="OppNet Number (Optional)"
            fullWidth
            value={form.Opportunity ?? ""}
            onChange={(e) => updateField("Opportunity", e.target.value)}
          />
        </Grid>

        {!form.Opportunity && (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Contract Name"
                fullWidth
                value={form.ProjectName ?? "New Award"}
                disabled
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Program Name"
                fullWidth
                required
                value={form.ProjectDescription ?? ""}
                onChange={(e) =>
                  updateField("ProjectDescription", e.target.value)
                }
              />
            </Grid>
          </>
        )}

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            select
            label="Entity"
            fullWidth
            required
            value={form.EntityB ?? ""}
            onChange={(e) => updateField("EntityB", e.target.value)}
          >
            <MenuItem value="">Select entity</MenuItem>
            <MenuItem value="KGS">KGS</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <PeoplePicker
            titleText="Project Manager"
            context={peoplePickerContext}
            peoplePickerCntrlclassName={customPickerClass}
            defaultSelectedUsers={form.ProjectManager?.EMail ? [form.ProjectManager.EMail] : []}
            personSelectionLimit={1}
            ensureUser
            onChange={(items) => handlePeoplePicker(items, "ProjectManager")}
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
              defaultSelectedUsers={form.EntityAManager?.EMail ? [form.EntityAManager.EMail] : []}
              personSelectionLimit={1}
              ensureUser
              onChange={(items) => handlePeoplePicker(items, "EntityAManager")}
              principalTypes={[PrincipalType.User]}
              resolveDelay={1000}
            />

          </Box>

        </Grid>

      </Grid>
    );
  };

  // -----------------------------
  // RISK DETAILS SECTION
  // -----------------------------
  const renderRiskDetails = (): JSX.Element => (
    <Grid container spacing={3} sx={{ mt: 4 }}>
      <Grid size={12}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Risk Details
        </Typography>
      </Grid>

      {submissionType === "existing" && (
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            select
            label="Reason for At-Risk Work"
            fullWidth
            required
            value={form.Reason ?? ""}
            onChange={(e) => updateField("Reason", e.target.value as IRiskAgreementItem["Reason"])}
          >
            <MenuItem value="Lack of funding">Lack of funding</MenuItem>
            <MenuItem value="PoP End / Lack of funding">PoP End</MenuItem>
          </TextField>
        </Grid>
      )}

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          type="date"
          label="Risk Start Date"
          InputLabelProps={{ shrink: true }}
          fullWidth
          required
          value={form.StartDate ?? ""}
          onChange={(e) => updateField("StartDate", e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          type="date"
          label="Risk End Date"
          InputLabelProps={{ shrink: true }}
          fullWidth
          required
          value={form.EndDate ?? ""}
          onChange={(e) => updateField("EndDate", e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          select
          label="Contract Type"
          fullWidth
          required
          value={form.ContractType ?? ""}
          onChange={(e) =>
            updateField("ContractType", e.target.value as IRiskAgreementItem["ContractType"])
          }
        >
          <MenuItem value="">Select contract type</MenuItem>
          {CONTRACT_TYPE_OPTIONS.map((ct) => (
            <MenuItem key={ct} value={ct}>
              {ct}
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      {submissionType === "existing" && (
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            type="number"
            label="Previous Risk Funding ($)"
            fullWidth
            value={form.HoursAuthorized ?? 0}
            onChange={(e) =>
              updateField("HoursAuthorized", Number(e.target.value))
            }
          />
        </Grid>
      )}

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          type="number"
          label="New Risk Funding Requested ($)"
          fullWidth
          required
          value={form.AmountAuthorized ?? 0}
          onChange={(e) =>
            updateField("AmountAuthorized", Number(e.target.value))
          }
        />
      </Grid>
    </Grid>
  );

  // -----------------------------
  // JUSTIFICATION SECTION
  // -----------------------------
  const renderJustification = (): JSX.Element => (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Justification
      </Typography>

      <TextField
        multiline
        rows={5}
        fullWidth
        placeholder="Explain why this at-risk work is necessary..."
        value={form.ContractComment ?? ""}
        onChange={(e) => updateField("ContractComment", e.target.value)}
      />
    </Box>
  );

  // -----------------------------
  // ATTACHMENTS SECTION
  // -----------------------------
  const renderAttachments = (): JSX.Element => (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Attachments
      </Typography>

      <Button variant="outlined">Upload Document</Button>
    </Box>
  );

  // -----------------------------
  // SUBMIT HANDLER
  // -----------------------------
  const handleSubmit = (): void => {
    onSubmit(form);
  };

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
        sx={{ mb: 4, width: 300 }}
        value={submissionType}
        onChange={(e) =>
          setSubmissionType(e.target.value as SubmissionType)
        }
      >
        <MenuItem value="existing">Existing Contract</MenuItem>
        <MenuItem value="opportunity">Opportunity / New Contract</MenuItem>
      </TextField>

      {/* Sections */}
      {renderProjectInfo()}

      <Divider sx={{ my: 4 }} />

      {renderRiskDetails()}
      {renderJustification()}
      {renderAttachments()}

      {/* Footer */}
      <Box sx={{ mt: 4, display: "flex", gap: 2 }}>
        <Button variant="outlined" onClick={onCancel}>
          Cancel
        </Button>

        <Button variant="contained" onClick={handleSubmit}>
          Submit for Approval
        </Button>
      </Box>
    </Box>
  );
};

export default RiskAgreementForm;