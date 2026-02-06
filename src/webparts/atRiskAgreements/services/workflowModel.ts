import { IRiskAgreementItem, IWorkflowRunItem, WorkflowStepKey } from "../data/props";
import { IPeoplePicker } from "../data/props";

export interface IWorkflowStep {
  key: WorkflowStepKey;
  label: string;
  isInitial?: boolean;

  // Required logic still depends on agreement values (riskFundingRequested)
  isRequired: (agreement: IRiskAgreementItem) => boolean;

  // Where to find the approver for this step (from the run snapshot)
  getApprover?: (run: IWorkflowRunItem) => IPeoplePicker | undefined;

  next?: WorkflowStepKey;
  completesOnApprove?: boolean;
}

// Helper for mapping step -> run approver snapshot
const getApproverFromRun = (step: WorkflowStepKey, run: IWorkflowRunItem): IPeoplePicker | undefined => {
  switch (step) {
    case "contractMgr":
      return run.contractMgr;
    case "ogPresident":
      return run.ogPresident;
    case "coo":
      return run.coo;
    case "ceo":
      return run.ceo;
    case "svpContracts":
      return run.svpContracts;
    default:
      return undefined;
  }
};

export const RiskAgreementWorkflow: IWorkflowStep[] = [
  {
    key: "submit",
    label: "Submitted",
    isInitial: true,
    isRequired: () => true,
    next: "contractMgr"
  },
  {
    key: "contractMgr",
    label: "Contract Manager Review",
    isRequired: () => true,
    getApprover: (run) => getApproverFromRun("contractMgr", run),
    next: "ogPresident"
  },
  {
    key: "ogPresident",
    label: "OG President Approval",
    isRequired: () => true,
    getApprover: (run) => getApproverFromRun("ogPresident", run),
    next: "coo"
  },
  {
    key: "coo",
    label: "COO Approval",
    isRequired: (agreement) => agreement.riskFundingRequested! > 50000, //never undefined (could be zero)
    getApprover: (run) => getApproverFromRun("coo", run),
    next: "ceo"
  },
  {
    key: "ceo",
    label: "CEO Approval",
    isRequired: (agreement) => agreement.riskFundingRequested! > 100000, //never undefined
    getApprover: (run) => getApproverFromRun("ceo", run),
    next: "svpContracts"
  },
  {
    key: "svpContracts",
    label: "SVP Contracts Approval",
    isRequired: () => true,
    getApprover: (run) => getApproverFromRun("svpContracts", run),
    completesOnApprove: true
  }
];
