import { IRiskAgreementItem } from "../data/props";
import { IPeoplePicker } from "../data/props";

export type WorkflowStepKey =
  | "Submitted"
  | "CMReview"
  | "OGPApproval"
  | "LOBApproval"
  | "CEOApproval"
  | "SVPApproval"
  | "Approved"
  | "Resolved";

type PeopleFieldKey = {
  [K in keyof IRiskAgreementItem]:
  IRiskAgreementItem[K] extends IPeoplePicker ? K : never
}[keyof IRiskAgreementItem];

type DateFieldKey = {
  [K in keyof IRiskAgreementItem]:
  IRiskAgreementItem[K] extends string ? K : never
}[keyof IRiskAgreementItem];

export interface IWorkflowStep {
  key: WorkflowStepKey;
  label: string;
  isInitial?: boolean;   // submitted?
  
  approverField?: PeopleFieldKey;
  approvalField?: keyof IRiskAgreementItem;
  commentField?: keyof IRiskAgreementItem;
  signDateField?: DateFieldKey;

  isRequired: (item: IRiskAgreementItem) => boolean;
  next: WorkflowStepKey;
  completesOnApprove?: boolean;
}

export const RiskAgreementWorkflow: IWorkflowStep[] = [
  {
    key: "Submitted",
    label: "Submitted",
    isInitial: true,
    isRequired: () => true,
    next: "CMReview"
  },
  {
    key: "CMReview",
    label: "Contract Manager Review",
    approverField: "contractMgr",
    approvalField: "cmDecision",
    commentField: "cmComment",
    signDateField: "cmDecisionDate",
    isRequired: () => true,
    next: "OGPApproval"
  },
  {
    key: "OGPApproval",
    label: "OG President Approval",
    approverField: "OGPresident",
    approvalField: "OGPresidentApproval",
    commentField: "OGPresidentComment",
    signDateField: "OGPresidentSignDate",
    isRequired: () => true,
    next: "LOBApproval"
  },
  {
    key: "LOBApproval",
    label: "LOB President Approval",
    approverField: "LOBPresident",
    approvalField: "LOBPresidentApproval",
    commentField: "LOBPresidentComment",
    signDateField: "LOBPresidentSignDate",
    isRequired: item => item.riskFundingRequested > 50000,
    next: "CEOApproval"
  },
  {
    key: "CEOApproval",
    label: "CEO Approval",
    approverField: "CEO",
    approvalField: "CEOApproval",
    commentField: "CEOComment",
    signDateField: "CEOSignDate",
    isRequired: item => item.riskFundingRequested > 100000,
    next: "SVPApproval"
  },
  {
    key: "SVPApproval",
    label: "SVP Contracts Approval",
    approverField: "SVPContracts",
    approvalField: "SVPContractsApproval",
    commentField: "SVPContractsComment",
    signDateField: "SVPContractsSignDate",
    isRequired: () => true,
    next: "Approved",
    completesOnApprove: true
  }
];
