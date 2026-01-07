import { IRiskAgreementItem } from "../data/props";
import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { formatError, encodeListName } from "./utils";
import dayjs from 'dayjs';

export class RiskAgreementService {

  static async edit(item: IRiskAgreementItem): Promise<void> {

    if (!item?.Id) {
      throw new Error("Cannot submit Risk Agreement: item.Id is missing. Refresh and try again or contact IT support.");
    }

    const year = dayjs().format("YYYY");
    const trackingNo = item.Id.toString().padStart(4, "0");

    try {

      await Web().Lists(Strings.Sites.main.lists.Agreements).Items().getById(item.Id).update({
          __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.Agreements)}ListItem` },
          Title: `ATR-${item.entity}-${year}-${trackingNo}`,
          araStatus: "Submitted",
          projectName: item.projectName,
          invoice: item.invoice,
          contractType: item.contractType,
          riskStart: item.riskStart || null,
          riskEnd: item.riskEnd || null,
          popEnd: item.popEnd || null,
          entity: item.entity,
          projectMgrId: item.projectMgr?.Id,
          contractMgrId: item.contractMgr?.Id,
          riskReason: item.riskReason,
          riskFundingRequested: item.riskFundingRequested,
          riskJustification: item.riskJustification,
          contractName: item.contractName,
          programName: item.programName,
          // entityGMId: item.entityGM?.Id,  
          // OGPresidentId: item.OGPresident?.Id, 
          // LOBPresidentId: item.LOBPresident?.Id, 
          // CEOId: item.CEO?.Id, 
          // SVPContractsId: item.SVPContracts?.Id 
        })
        .executeAndWait();

    //   if (!resp?.Id) {
    //     throw new Error("Item was submitted but no ID was returned. Refresh the browser to see your changes.");
    //   }

    //   const newItem = await Web().Lists(Strings.Sites.main.lists.Agreements)
    //     .Items(resp.Id.toString())
    //     .query({ Select: ["*"] })
    //     .executeAndWait();

    //   return newItem as unknown as IRiskAgreementItem;

    } catch (error) {
      const err = formatError(error);
      console.error("Error updating Risk Agreement: ", error);
      throw new Error(`Error submitting Risk Agreement: ${err}`);
    }
  }
}