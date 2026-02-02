import { WebPartContext } from "@microsoft/sp-webpart-base";
import { IPersonaProps } from "@fluentui/react/lib/Persona";
import { Types } from "gd-sprest";

export interface IAppProps {
  wpTitle: string;
  context: WebPartContext;
}

interface ILookupItem {
  Id: number;
  Title?: string;
}

export interface IPeoplePicker extends IPersonaProps {
  EMail: string;
  Id: number;
  Title: string;
}

export interface IAttachmentInfo extends Types.SP.Attachment {}

// interface IHyperlinkField {
//   Url: string;
//   Description?: string;
// }

export type ApprovalChoice = "Approved" | "Rejected" | "Not Started";
export type AraStatus =  "Draft"  | "Submitted"  | "Under Review" | "Mod Review" | "Approved"  | "Rejected"  | "Resolved"  | "Canceled";
export type ContractType = "FFP/LOE" | "T&M" | "LH" | "Cost Plus/Reimbursable" | "Hybrid";

export type WorkflowStepKey =
  | "submit"
  | "contractMgr"
  | "ogPresident"
  | "coo"
  | "ceo"
  | "svpContracts";

export type WorkflowRunStatus = "Active" | "Completed" | "Superseded";

export type ActionDecision = "Approved" | "Rejected";

export type WorkflowActionType =
  | "Submitted"
  | "Approved"
  | "Rejected"
  | "Comment"
  | "Returned"
  | "Reassigned"
  | "Modified"
  | "Restarted";

export interface IRiskAgreementItem {
  // System
  readonly Id: number;
  Title: string;
  readonly Created: string;
  readonly Modified: string;
  readonly Author: IPeoplePicker;
  readonly Editor: IPeoplePicker;
  Attachments: boolean;

  // Business fields
  projectName: string;
  contractId?: string;
  invoice: string;
  contractType: ContractType;
  riskStart: string;
  riskEnd: string;
  popEnd: string;
  entity: string;
  projectMgr: IPeoplePicker;
  contractMgr: IPeoplePicker;
  riskReason: "Lack of Funding" | "PoP End";
  riskFundingRequested: number;
  riskJustification: string;
  contractName: string;
  programName: string;
  araStatus: AraStatus;
  entityGM: IPeoplePicker;

  // Workflow pointer (SharePoint Lookup column to Runs)
  currentRun?: ILookupItem;
}

// "instance state machine" row. One row per run.
export interface IWorkflowRunItem {
  // System
  readonly Id: number;
  readonly Created: string;
  readonly Modified: string;
  readonly Author: IPeoplePicker;
  readonly Editor: IPeoplePicker;

  agreement: ILookupItem; //lookup to Agreements

  // Run lifecycle
  runNumber: number;
  runStatus: WorkflowRunStatus; 
  started: string; // date-time
  completed?: string; // date-time
  outcome?: ActionDecision;

  // Mod/restart metadata (optional but recommended)
  restartReason?: "Mod" | "Correction" | "Reopen" | "Other";
  restartComment?: string;
  triggerAgreementVersion?: number; // track version of Agreement (maybe)

  // Current/pending state (SOURCE OF TRUTH) for easiy view/filter/count
  currentStepKey: WorkflowStepKey;  // e.g. "contractMgr"
  pendingRole?: string;             // "Contract Manager"
  pendingApproverId?: number;       // numeric SP user id (easy filtering)
  pendingApproverEmail?: string;    // convenience
  stepAssignedDate?: string;        // when this step became pending (reporting)

  // Approver assignments
  contractMgr: IPeoplePicker;
  ogPresident: IPeoplePicker;
  coo: IPeoplePicker;
  ceo: IPeoplePicker;
  svpContracts: IPeoplePicker;
}

//Append-only rows. This is what renders in the timeline and use for "My Reviewed."
export interface IWorkflowActionItem {
  readonly Id: number;
  readonly Created: string;
  readonly Modified: string;
  readonly Author: IPeoplePicker;
  readonly Editor: IPeoplePicker;

  // Relationships (Lookups)
  agreement: ILookupItem; //lookup to Agreements
  run: ILookupItem;   //lookup to Runs

  stepKey: WorkflowStepKey; // role
  actionType: WorkflowActionType; //what happened
  actor: IPeoplePicker; // Who did it
  actionCompletedDate: string; 
  comment?: string;
  changeSummary?: string; // Mod/change details (optional)
  changePayloadJson?: string; // old/new values JSON
  // Ordering convenience (optional)
  sequence?: number;
}


export interface IOGPresidentsItem {
  readonly Id: number;
  Title: string;
  president: IPeoplePicker;
  LOB: string;
  coo: IPeoplePicker;
  CM: IPeoplePicker;
}

export interface IEntitiesItem {
  readonly Id: number;
  Title: string; 
  abbr: string;
  GM: IPeoplePicker;
  combinedTitle: string;
}

export interface IContractItem {
  readonly Id: number;
  Title: string;
  field_19: string; // Contract ID
  field_20: string; // Contract Title
  field_35: string; // Customer Contract Code
  field_21: string; // Manager 1 Email (Project Manager)
  field_23: string; // Manager 1 Name (Project Manager)
  field_75: string; // OG
  field_16: string; // Completion Date
}

export interface IInvoiceItem {
  readonly Id: number;
  Title: string;
  field_49: string; // Contract ID
  field_28: string; // Customer Contract Code
  field_14: string; // Invoice ID
  InvoiceID1: string; // "ContractID-InvoiceID"
  field_42: string; // Invoice Title
}

export interface IConfigItem {
  readonly Id: number;
  Title: string;
  IsFor: string;
  User: IPeoplePicker;
}