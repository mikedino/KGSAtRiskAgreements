import { IRiskAgreementItem } from "../data/props";
import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { formatError, encodeListName } from "./utils";

export class RiskAgreementService {

    static create(item: IRiskAgreementItem): Promise<IRiskAgreementItem> {
        return new Promise<IRiskAgreementItem>((resolve, reject) => {
            Web(Strings.Sites.main.url).Lists(Strings.Sites.main.lists.Agreements).Items().add({
                __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.Agreements)}ListItem` },
                Title: item.Title,
                Agreement_Type: item.Agreement_Type,
                Amount: item.Amount,
                AmountAuthorized: item.AmountAuthorized,
                CEO: item.CEO?.Id,
                //CEOApproval?: ApprovalChoice;
                //CEOComment?: string;
                //CEO_Signature?: string;
                //CEO_Signed?: boolean;
                //CEO_SignedDate?: string;
                ContractComment: item.ContractComment,
                ContractNumber: item.ContractComment,
                ContractType: item.ContractType,
                ContractsApproval: item.ContractsApproval,
                //DocL: item.DocL,
                //DocLocation: item.DocLocation,
                EndD: item.EndD,
                EndDate: item.EndDate && item.EndDate !== "" ? item.EndDate : null,
                EntityAManagerId: item.EntityAManager?.Id,
                EntityB: item.EntityB, // will end up being a lookup
                EntityBManagerId: item.EntityBManager?.Id,
                //FinanceApproval?: ApprovalChoice;
                FinanceManager: item.FinanceManager?.Id,
                //Flow_Link?: string;
                //GUID0?: string;
                //HasAnAttachment?: boolean;
                HoursAuthorized: item.HoursAuthorized,
                IWAProjectID: item.IWAProjectID,
                LackofFundingEndDate: item.LackofFundingEndDate && item.LackofFundingEndDate !== "" ? item.LackofFundingEndDate : null,
                LineOfBusiness: item.LineOfBusiness,
                //LOBApproval: ApprovalChoice,
                //LOBComment: string,
                LOBPresident: item.LOBPresident?.Id,
                //LOBSignature: string,
                //LOBSigned: boolean,
                //LOBSignedDate: string,
                //Mod: boolean,
                //ModGUID: string,
                NoOfDays: item.NoOfDays,
                //OGApproval: ApprovalChoice,
                //OG_Comment: string,
                OG_Manager: item.OG_Manager?.Id,
                //OG_Signature: string,
                //OG_Signed: boolean,
                //OG_SignedDate: string,
                OperatingGroup: item.OperatingGroup,
                Opportunity: item.Opportunity,
                //PMApproval: ApprovalChoice,
                //PM_Sign: string,
                //PM_SignDate: string,
                //PM_Signed: boolean,
                //ParentGUID: string,
                //Pdf: boolean,
                //PdfLocation: string,
                ProjectDescription: item.ProjectDescription,
                ProjectId: item.ProjectId,
                ProjectManager: item.ProjectManager?.Id,
                ProjectName: item.ProjectName,
                Reason: item.Reason,
                RequiredDate: item.RequiredDate && item.RequiredDate !== "" ? item.RequiredDate : null,
                //SentToCEO: boolean,
                //Signature: string,
                //SignatureB: string,
                //SignedA: boolean,
                //Signed_A_Date: string,
                //SignedB: boolean,
                //Signed_B_Date: string,
                //StartD: string,
                StartDate: item.StartDate && item.StartDate !== "" ? item.StartDate : null,
                //Status: "In Progress" | "Completed" | "Rejected" | "Submitted",
                TaskOrder: item.TaskOrder,
                TaskOrderEndDate: item.TaskOrderEndDate && item.TaskOrderEndDate !== "" ? item.TaskOrderEndDate : null,
                TaskOrderProjectID: item.TaskOrderProjectID
            }).execute(
                //success
                resp => {
                    if (resp && resp.Id) {
                        //get the item and all correct metadata to return to sender
                        const newItem = Web().Lists(Strings.Sites.main.lists.Agreements).Items(resp.Id.toString())
                            .query({
                                Select: ["*"]
                                //Expand: ["office", "customer", "stakeholders"]
                            }).executeAndWait();
                        resolve(newItem as unknown as IRiskAgreementItem);
                    } else {
                        reject("Item was created but there was a problem refreshing the data. Please refresh manually.")
                    }
                },
                //error
                (error) => {
                    const err = formatError(error);
                    console.error(`Error creating new Risk Agreement: ${err}`);
                    reject(error);
                }
            )
        })
    }

}