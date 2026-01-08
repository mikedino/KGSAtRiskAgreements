import { WebPartContext } from "@microsoft/sp-webpart-base";
import { IPersonaProps } from "@fluentui/react/lib/Persona";
import { Types } from "gd-sprest";

export interface IAppProps {
  wpTitle: string;
  context: WebPartContext;
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
export type AraStatus =  "Draft"  | "Submitted"  | "Under Review"  | "Approved"  | "Rejected"  | "Resolved"  | "Cancelled";
export type ContractType = "FFP/LOE" | "T&M" | "LH" | "Cost Plus/Reimbursable" | "Hybrid";

export interface IRiskAgreementItem {
  //System fields
  readonly Modified: string;
  readonly Created: string;
  readonly Editor: IPeoplePicker;
  readonly Author: IPeoplePicker;
  readonly Id: number;
  Title: string;
  Attachments: boolean;
  // Custom fields
  projectName: string;
  contractId?: string; 
  invoice: string;
  contractType: ContractType;
  riskStart: string; //date
  riskEnd: string; //date
  popEnd: string; //date
  entity: string;
  projectMgr: IPeoplePicker;
  contractMgr: IPeoplePicker;
  cmDecision: ApprovalChoice;
  cmComment: string;
  cmDecisionDate: string;
  riskReason: "Lack of Funding" | "PoP End";
  riskFundingRequested: number;
  riskJustification: string;
  contractName: string;
  programName: string;
  araStatus: AraStatus;
  entityGM: IPeoplePicker;
  OGPresident: IPeoplePicker;
  OGPresidentApproval: ApprovalChoice;
  OGPresidentComment: string;
  OGPresidentSignDate: string; //date
  SVPContracts: IPeoplePicker;
  SVPContractsApproval: ApprovalChoice;
  SVPContractsComment: string;
  SVPContractsSignDate: string; //date
  LOBPresident: IPeoplePicker;
  LOBPresidentApproval: ApprovalChoice;
  LOBPresidentComment: string;
  LOBPresidentSignDate: string; //date
  CEO: IPeoplePicker;
  CEOApproval: ApprovalChoice;
  CEOComment: string;
  CEOSignDate: string; //date
}

export interface IOGPresidentsItem {
  readonly Id: number;
  Title: string;
  president: IPeoplePicker;
  LOB: string;
  LOBPresident: IPeoplePicker;
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