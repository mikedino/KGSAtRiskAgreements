import { IRiskAgreementItem } from "../data/props";
import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { formatError, encodeListName } from "./utils";
import dayjs from 'dayjs';

export class RiskAgreementService {

  // create the temp draft when NEW form opens to hold attachments
  static async createDraft(): Promise<number | undefined> {
    const item = await Web().Lists(Strings.Sites.main.lists.Agreements).Items().add({
      Title: "Draft",
      araStatus: "Draft"
    }).executeAndWait();

    return item.Id ?? undefined;
  }

  static async edit(item: IRiskAgreementItem, currentRunId?: number): Promise<void> {

    if (!item?.Id) {
      throw new Error("Cannot submit Risk Agreement: item.Id is missing. Refresh and try again or contact IT support.");
    }

    const year = dayjs().format("YYYY");
    const trackingNo = item.Id.toString().padStart(4, "0");

    try {

      await Web().Lists(Strings.Sites.main.lists.Agreements).Items().getById(item.Id).update({
        __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.Agreements)}ListItem` },
        Title: `ATR-${item.entity}-${year}-${trackingNo}`,
        araStatus: "Under Review",
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
        currentRunId
      })
        .executeAndWait();

    } catch (error) {
      const err = formatError(error);
      console.error("Error updating Risk Agreement: ", error);
      throw new Error(`Error submitting Risk Agreement: ${err}`);
    }
  }

  static delete(itemId: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      Web().Lists(Strings.Sites.main.lists.Agreements).Items(itemId).delete().execute(
        //success
        () => {
          console.info(`Deleted Agreement ${itemId} !`)
          resolve();
        },
        //error
        (error) => {
          const err = formatError(error);
          console.error(`Error deleting Agreement: ${err}`);
          reject(error);
        }
      )
    })
  }

}