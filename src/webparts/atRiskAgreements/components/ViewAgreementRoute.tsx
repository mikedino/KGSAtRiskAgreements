import * as React from "react";
import { ContextInfo } from "gd-sprest";
import { Alert, Snackbar } from "@mui/material";
import { useAgreements } from "../services/agreementsContext";
import RiskAgreementView from "../forms/araView";
import { WorkflowDecisionService } from "../services/workflowService";

interface ViewAgreementRouteProps {
  match: { params: { id: string } };
}

const ViewAgreementRoute: React.FC<ViewAgreementRouteProps> = ({ match }) => {
  const agreementId = Number(match.params.id);
  const currentUserEmail = ContextInfo.userEmail;

  const { agreements, runsByAgreementId, refresh } = useAgreements();

  const item = agreements.find(a => a.Id === agreementId);
  const run = item ? runsByAgreementId.get(item.Id) : undefined;

  const [snackbar, setSnackbar] = React.useState<{ message: string; severity: "success" | "error" } | null>(null);

  const onApprove = async (comment?: string): Promise<void> => {
    if (!item || !run) return;

    // If you’re using the new orchestrator:
    await WorkflowDecisionService.submitDecision(item, run, "Approved", comment);

    await refresh(true);
    setSnackbar({ message: "Agreement approved successfully", severity: "success" });
  };

  const onReject = async (comment?: string): Promise<void> => {
    if (!item || !run) return;

    await WorkflowDecisionService.submitDecision(item, run, "Rejected", comment);

    await refresh(true);
    setSnackbar({ message: "Agreement rejected successfully", severity: "error" });
  };

  if (!item) return <div>Agreement not found</div>;
  if (!run) return <div>Workflow run not found</div>;

  return (
    <>
      <RiskAgreementView
        item={item}
        currentUserEmail={currentUserEmail}
        onApprove={onApprove}
        onReject={onReject}
      />

      {snackbar && (
        <Snackbar
          open
          autoHideDuration={4000}
          onClose={() => setSnackbar(null)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)} variant="filled">
            {snackbar.message}
          </Alert>
        </Snackbar>
      )}
    </>
  );
};

export default ViewAgreementRoute;
