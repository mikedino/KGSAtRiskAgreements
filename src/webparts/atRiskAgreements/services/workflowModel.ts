import { IRiskAgreementItem } from "../data/props";
import { IPeoplePicker } from "../data/props";

export type WorkflowStepKey =
  | "Submission"
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
  approverField?: PeopleFieldKey;
  approvalField?: keyof IRiskAgreementItem;
  signDateField?: DateFieldKey;
  isRequired: (item: IRiskAgreementItem) => boolean;
  next: WorkflowStepKey;
}

export const RiskAgreementWorkflow: IWorkflowStep[] = [
  {
    key: "Submission",
    label: "Submitted by PM",
    isRequired: () => true,
    next: "CMReview"
  },
  {
    key: "CMReview",
    label: "Contract Manager Review",
    approverField: "contractMgr",
    approvalField: "cmDecision",
    signDateField: "cmDecisionDate",
    isRequired: () => true,
    next: "OGPApproval"
  },
  {
    key: "OGPApproval",
    label: "OG President Approval",
    approverField: "OGPresident",
    approvalField: "OGPresidentApproval",
    signDateField: "OGPresidentSignDate",
    isRequired: () => true,
    next: "LOBApproval"
  },
  {
    key: "LOBApproval",
    label: "LOB President Approval",
    approverField: "LOBPresident",
    approvalField: "LOBPresidentApproval",
    signDateField: "LOBPresidentSignDate",
    isRequired: item => item.riskFundingRequested > 50000,
    next: "CEOApproval"
  },
  {
    key: "CEOApproval",
    label: "CEO Approval",
    approverField: "CEO",
    approvalField: "CEOApproval",
    signDateField: "CEOSignDate",
    isRequired: item => item.riskFundingRequested > 100000,
    next: "SVPApproval"
  },
  {
    key: "SVPApproval",
    label: "SVP Contracts Approval",
    approverField: "SVPContracts",
    approvalField: "SVPContractsApproval",
    signDateField: "SVPContractsSignDate",
    isRequired: () => true,
    next: "Approved"
  }
];
