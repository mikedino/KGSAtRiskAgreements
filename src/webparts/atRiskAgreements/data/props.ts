import { WebPartContext } from "@microsoft/sp-webpart-base";
import { IPersonaProps } from "@fluentui/react/lib/Persona";

export interface IAtRiskAgreementsProps {
  wpTitle: string;
  context: WebPartContext;
}

export interface IPeoplePicker extends IPersonaProps {
  EMail: string;
  Id: number;
  Title: string;
}

interface IHyperlinkField {
  Url: string;
  Description?: string;
}

type ApprovalChoice = "Approved" | "Rejected" | "Not Started";

export interface IRiskAgreementItem {
  //System fields
  readonly Modified: string;
  readonly Created: string;
  readonly Editor: IPeoplePicker;
  readonly Author: IPeoplePicker;
  readonly Id: number;
  Title: string;
  // Calculated fields
  readonly _x0033_0_x0020_Day_x0020_Lack_x0?: string; //30 Day Lack of Funding Date
  readonly Expiring_x0020_Date_x0020_30_x00?: string; //Expiring Date 30 Day
  // Custom fields
  Agreement_Type?: string;
  Amount?: number;
  AmountAuthorized?: number;
  ApprovalStatus?: string;
  Approval_Stat?: "Approved" | "Rejected";
  Approval_Status?: "Approved" | "Rejected";
  Attachment?: "Yes" | "No";
  CEO?: IPeoplePicker;
  CEOApproval?: ApprovalChoice;
  CEOComment?: string;
  CEO_Signature?: string;
  CEO_Signed?: boolean;
  CEO_SignedDate?: string;
  ContractComment?: string;
  ContractNumber?: string;
  ContractType?: "FFP" | "FFP/LOE" | "T&M" | "LH" | "CPAF" | "CPIF" | "CPFF" | "CR";
  ContractsApproval?: ApprovalChoice;
  DocL?: string;
  DocLocation?: IHyperlinkField;
  EndD?: string;
  EndDate?: string;
  EntityAManager?: IPeoplePicker;
  EntityB?: string; // will end up being a lookup
  EntityBManager?: IPeoplePicker;
  FinanceApproval?: ApprovalChoice;
  FinanceManager?: IPeoplePicker;
  Flow_Link?: string;
  GUID0?: string;
  HasAnAttachment?: boolean;
  HoursAuthorized?: number;
  IWAProjectID?: string;
  LackofFundingEndDate?: string;
  LineOfBusiness?: string;
  LOBApproval?: ApprovalChoice;
  LOBComment?: string;
  LOBPresident?: IPeoplePicker;
  LOBSignature?: string;
  LOBSigned?: boolean;
  LOBSignedDate?: string;
  Mod?: boolean;
  ModGUID?: string;
  NoOfDays?: string;
  OGApproval?: ApprovalChoice;
  OG_Comment?: string;
  OG_Manager?: IPeoplePicker;
  OG_Signature?: string;
  OG_Signed?: boolean;
  OG_SignedDate?: string;
  OperatingGroup?: string;
  Opportunity?: string;
  PMApproval?: ApprovalChoice;
  PM_Sign?: string;
  PM_SignDate?: string;
  PM_Signed?: boolean;
  ParentGUID?: string;
  Pdf?: boolean;
  PdfLocation?: string;
  ProjectDescription?: string;
  ProjectId?: string;
  ProjectManager?: IPeoplePicker;
  ProjectName?: string;
  Reason?: "Lack of funding" | "PoP End / Lack of funding";
  RequiredDate?: string;
  SentToCEO?: boolean;
  Signature?: string;
  SignatureB?: string;
  SignedA?: boolean;
  Signed_A_Date?: string;
  SignedB?: boolean;
  Signed_B_Date?: string;
  StartD?: string;
  StartDate?: string;
  Status?: "In Progress" | "Completed" | "Rejected" | "Submitted";
  TaskOrder?: string;
  TaskOrderEndDate?: string;
  TaskOrderProjectID?: string;
}