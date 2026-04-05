import { WebPartContext } from "@microsoft/sp-webpart-base";
import { IPersonaProps } from "@fluentui/react/lib/Persona";
import { Types } from "gd-sprest";

export interface IAppProps {
  wpTitle: string;
  context: WebPartContext;
}

export interface ILookupItem {
  Id: number;
  Title?: string;
}

export interface IPeoplePicker extends IPersonaProps {
  EMail: string;
  Id: number;
  Title: string;
}

export interface IAttachmentInfo extends Types.SP.Attachment {
  UniqueId?: string;  //GUID
  LinkingUrl?: string;
}

// interface IHyperlinkField {
//   Url: string;
//   Description?: string;
// }

export type ApprovalChoice = "Approved" | "Rejected" | "Not Started";
export type AraStatus = "Draft" | "Submitted" | "Under Review" | "Mod Review" | "Approved" | "Rejected" | "Resolved" | "Canceled";
export type ContractType = "FFP/LOE" | "T&M" | "LH" | "Cost Plus/Reimbursable" | "Hybrid";

export type WorkflowStepKey =
  | "submit"
  | "contractMgr"
  | "ogPresident"
  | "coo"
  | "ceo"
  | "svpContracts"
  | "submitter";

export type WorkflowRunStatus = "Active" | "Completed" | "Superseded";

export type ActionDecision = "Approved" | "Rejected" | "Canceled" | "Reverted";

export type WorkflowActionType =
  | "Submitted"
  | "Approved"
  | "Rejected"
  | "Returned"
  | "Reassigned"
  | "Modified"
  | "Restarted"
  | "Canceled"
  | "Reverted"
  | "Resolved";

export type RunRestartReason = "Mod" | "Correction" | "Reopen" | "Other";

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
  contractName: string;
  programName: string;
  contractType: ContractType;
  hasSubcontract: boolean;
  riskStart: string;
  riskEnd: string;
  popEnd: string;
  entity: string;
  og: string;
  projectMgr?: IPeoplePicker;
  contractMgr?: IPeoplePicker;
  subContractMgr?: IPeoplePicker;
  riskReason: "Lack of Funding" | "PoP End";
  riskFundingRequested?: number;
  riskJustification: string;
  araStatus: AraStatus;
  entityGM: IPeoplePicker;
  backupRequestor: IPeoplePicker;

  // Workflow pointer (SharePoint Lookup column to Runs)
  currentRun?: ILookupItem;
  effectiveApprovedRun?: ILookupItem

  // FLOW NOTIFICATION USE
  popReminderLastSentOn: string; //date only
  expiredReminderLastSentOn: string; //date only
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
  hasDecision: boolean; // does this run have any decision yet?

  // Capture Approved JSON 
  approvedSnapshotJson?: string; // only set when run outcome becomes Approved
  approvedSnapshotDate?: string;

  // REVERT capture, when applicable
  revertedToRunId?: number;
  revertedToRunNumber?: string;

  // Mod/restart metadata (optional but recommended)
  restartReason?: RunRestartReason;
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

  // FLOW NOTIFICATION USE
  bicNotifiedOn: string; // datetime
  bicNotifiedTo: string // auditing/troubleshooting
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
  sequence?: number;
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

export interface IOgItem {
  readonly Id: number;
  Title: string;
  president: IPeoplePicker;
  lob: ILookupItem;
  CM: IPeoplePicker;
  SCM?: IPeoplePicker;
  // Hierarchy
  ogType: "OG" | "SrOG";
  parentOg?: ILookupItem;   // set on child OGs; lookup resolves to the SrOG row (and its president)
  isActive: boolean;
  isSelectable: boolean;
}

export interface ILobItem {
  readonly Id: number;
  Title: string;
  coo: IPeoplePicker;
}

export interface IEntityItem {
  readonly Id: number;
  Title: string;
  abbr: string;
  GM: IPeoplePicker;
  combinedTitle: string;
}

export interface IConfigItem {
  readonly Id: number;
  Title: string;
  IsFor: string;
  User: IPeoplePicker;
}

export interface IAppUserItem {
  readonly Id: number;
  user: IPeoplePicker;
  modePreference: "dark" | "light",
  role: "user" | "cm" | "admin",
  lastVisit?: string;
  visitCount?: number;
  backups: {results: IPeoplePicker[]};
  hasBackup: boolean;
}

export interface ICounterItem {
  Id: number;
  Title: string; // year
  currentId: number; // last agreement ID that consumed a number
  currentSeq: number; // last allocated sequence
  nextSeq: number; // next available sequence (authoritative)
  __metadata?: {
    etag?: string;
  };
}