import { IRiskAgreementItem } from "../data/props";
import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { formatError, encodeListName } from "./utils";

export class RiskAgreementService {

    static create(item: IRiskAgreementItem): Promise<IRiskAgreementItem> {
        return new Promise<IRiskAgreementItem>((resolve, reject) => {
            Web(Strings.Sites.main.url).Lists(Strings.Sites.main.lists.Agreements).Items().add({
                __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.Agreements)}ListItem` },
                Title: `ATR-${item.entity}-2025-0001`, //TODO: DYNAMIC NUMBERING
                projectName: item.projectName,
                invoice: item.invoice,
                contractType: item.contractType,
                riskStart: item.riskStart && item.riskStart !== "" ? item.riskStart : null,
                riskEnd: item.riskEnd && item.riskEnd !== "" ? item.riskEnd : null,
                popEnd: item.popEnd && item.popEnd !== "" ? item.popEnd : null,
                entity: item.entity,
                projectMgrId: item.projectMgr?.Id,
                contractMgrId: item.contractMgr?.Id,
                riskReason: item.riskReason,
                riskFundingRequested: item.riskFundingRequested,
                riskJustification: item.riskJustification,
                contractName: item.contractName,
                programName: item.programName,
                entityGMId: item.entityGM?.Id, 
                OGPresidentId: item.OGPresident?.Id, 
                SVPContractsId: item.SVPContracts?.Id, //set default
                LOBPresidentId: item.LOBPresident?.Id, 
                CEOId:item.CEO?.Id // set default
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