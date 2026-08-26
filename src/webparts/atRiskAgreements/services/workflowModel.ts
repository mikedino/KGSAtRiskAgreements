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
  completesOnApprove?: boolean | ((agreement: IRiskAgreementItem) => boolean);
}

// Runs started before v3.0.0.1 deployment --> keep the production workflow order they began with.
export const NEW_WORKFLOW_EFFECTIVE_DATE = "2026-08-25T04:00:00.000Z";

// Helper for mapping step -> run approver snapshot
const getApproverFromRun = (step: WorkflowStepKey, run: IWorkflowRunItem): IPeoplePicker | undefined => {
  switch (step) {
    case "contractMgr":
      return run.contractMgr;
    case "svpContracts":
      return run.svpContracts;
    case "ogPresident":
      return run.ogPresident;
    case "coo":
      return run.coo;
    case "ceo":
      return run.ceo;
    default:
      return undefined;
  }
};

const commonStartSteps: IWorkflowStep[] = [
  {
    key: "submit",
    label: "Submitted",
    isInitial: true,
    isRequired: () => true,
    next: "contractMgr"
  },
  {
    // AFTER REJECT
    key: "submitter",
    label: "Submitter Action",
    isRequired: () => true,
    next: "contractMgr" // resubmission goes back to CM
  },
];

export const LegacyRiskAgreementWorkflow: IWorkflowStep[] = [
  ...commonStartSteps,
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
    isRequired: (agreement) => agreement.riskFundingRequested! >= 50000, //never undefined (could be zero)
    getApprover: (run) => getApproverFromRun("coo", run),
    next: "ceo"
  },
  {
    key: "ceo",
    label: "CEO Approval",
    isRequired: (agreement) => agreement.riskFundingRequested! >= 100000, //never undefined
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

export const RiskAgreementWorkflow: IWorkflowStep[] = [
  ...commonStartSteps,
  {
    key: "contractMgr",
    label: "Contract Manager Review",
    isRequired: () => true,
    getApprover: (run) => getApproverFromRun("contractMgr", run),
    next: "svpContracts"
  },
  {
    key: "svpContracts",
    label: "SVP Contracts Approval",
    isRequired: () => true,
    getApprover: (run) => getApproverFromRun("svpContracts", run),
    next: "ogPresident",
  },
  {
    key: "ogPresident",
    label: "OG President Approval",
    isRequired: () => true,
    getApprover: (run) => getApproverFromRun("ogPresident", run),
    completesOnApprove: (agreement) => agreement.riskFundingRequested! < 50000,
    next: "coo"
  },
  {
    key: "coo",
    label: "COO Approval",
    isRequired: (agreement) => agreement.riskFundingRequested! >= 50000, //never undefined (could be zero)
    getApprover: (run) => getApproverFromRun("coo", run),
    completesOnApprove: (agreement) => agreement.riskFundingRequested! < 100000,
    next: "ceo"
  },
  {
    key: "ceo",
    label: "CEO Approval",
    isRequired: (agreement) => agreement.riskFundingRequested! >= 100000, //never undefined
    getApprover: (run) => getApproverFromRun("ceo", run),
    completesOnApprove: true
  }

];

export const getWorkflowForRun = (run?: Pick<IWorkflowRunItem, "started">): IWorkflowStep[] => {
  if (!run?.started) return RiskAgreementWorkflow;

  const started = new Date(run.started).getTime();
  const effective = new Date(NEW_WORKFLOW_EFFECTIVE_DATE).getTime();

  return Number.isFinite(started) && started < effective
    ? LegacyRiskAgreementWorkflow
    : RiskAgreementWorkflow;
};
