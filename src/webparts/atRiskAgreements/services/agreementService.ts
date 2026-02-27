import { AraStatus, ICounterItem, IRiskAgreementItem } from "../data/props";
import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { formatError, encodeListName } from "./utils";
import dayjs from 'dayjs';
import { DataSource } from "../data/ds";
import { Base } from "gd-sprest/@types/intellisense";

type IExecWithHeaders<T> = Base.IBaseExecution<T> & {
  headers?: { [key: string]: string };
};

export class RiskAgreementService {

  // create the temp draft when NEW form opens to hold attachments
  static async createDraft(): Promise<number | undefined> {
    const item = await Web().Lists(Strings.Sites.main.lists.Agreements).Items().add({
      Title: "Draft",
      araStatus: "Draft"
    }).executeAndWait();

    return item.Id ?? undefined;
  }

  // only on initial submit, load the counter for current year, create new one for new year
  static async reserveNextSequence(year: string, agreementId: number): Promise<number> {

    const listName = Strings.Sites.main.lists.Counters;
    const LIST = Web().Lists(listName);
    const maxRetries = 6;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {

      // 1. Load counter for year
      const counter: ICounterItem | undefined = await new Promise<ICounterItem | undefined>((resolve, reject) => {
        LIST
          .Items()
          .query({
            Select: ["Id", "Title", "currentId", "currentSeq", "nextSeq"],
            Filter: `Title eq '${year}'`,
            Top: 1
          })
          .execute(
            (items) => resolve(items?.results?.[0] as unknown as ICounterItem | undefined),
            (error) => reject(new Error(`Error loading counter for ${year}: ${formatError(error)}`))
          );
      });

      // 2. Create counter if it doesn’t exist
      const workingCounter: ICounterItem = counter ?? await new Promise<ICounterItem>((resolve, reject) => {
        LIST
          .Items()
          .add({
            Title: year,
            currentId: 0,
            currentSeq: 0,
            nextSeq: 1
          })
          .execute(
            (item) => resolve(item as unknown as ICounterItem),
            (error) => reject(new Error(`Error creating counter for ${year}: ${formatError(error)}`))
          );
      });

      const allocatedSeq: number = workingCounter.nextSeq ?? 1;
      const newNextSeq: number = allocatedSeq + 1;
      const etag: string = workingCounter.__metadata?.etag ?? "*";

      console.log(`Attempt ${attempt}: reserving seq ${allocatedSeq} for agreement ${agreementId} (ETag: ${etag})`);

      // 3. Update Counter list with new sequence and return the 
      try {

        const req = LIST
          .Items()
          .getById(workingCounter.Id)
          .update({
            __metadata: { type: `SP.Data.${encodeListName(listName)}ListItem` },
            currentId: agreementId,
            currentSeq: allocatedSeq,
            nextSeq: newNextSeq
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }) as unknown as IExecWithHeaders<any>;

        // Attach IF-MATCH header for optimistic concurrency
        req.headers = req.headers ?? {};
        req.headers["IF-MATCH"] = etag;

        await new Promise<void>((resolve, reject) => {
          req.execute(
            () => resolve(),
            (error) => reject(error)
          );
        });

        console.log(`Sequence ${allocatedSeq} successfully reserved for agreement ${agreementId}`);

        return allocatedSeq;

      } catch (error: unknown) {

        const msg = String(error);

        console.warn(`Sequence reservation attempt ${attempt} failed:`, msg);

        // 412 = ETag mismatch (someone else updated first)
        if (msg.includes("412") || msg.toLowerCase().includes("precondition")) {
          continue; // retry
        }

        throw new Error(`Error reserving sequence for ${year}: ${formatError(error)}`);
      }
    }

    throw new Error(`Unable to reserve tracking number for ${year}. Please try again.`);
  }

  // shared private updater
  private static async updateAgreement(item: IRiskAgreementItem, araStatus: AraStatus, trackingTitle?: string): Promise<IRiskAgreementItem> {

    return new Promise<IRiskAgreementItem>((resolve, reject) => {

      const updateBody: Record<string, unknown> = {
        __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.Agreements)}ListItem` },
        araStatus,
        projectName: item.projectName,
        contractId: item.contractId,
        invoice: item.invoice,
        hasSubcontract: item.hasSubcontract,
        contractType: item.contractType,
        riskStart: item.riskStart || null,
        riskEnd: item.riskEnd || null,
        popEnd: item.popEnd || null,
        entity: item.entity,
        og: item.og,
        projectMgrId: item.projectMgr?.Id,
        contractMgrId: item.contractMgr?.Id,
        backupRequestorId: item.backupRequestor?.Id,
        riskReason: item.riskReason,
        riskFundingRequested: item.riskFundingRequested ?? 0,
        riskJustification: item.riskJustification,
        contractName: item.contractName,
        programName: item.programName
      };

      if (trackingTitle) {
        updateBody.Title = trackingTitle;
      }

      Web().Lists(Strings.Sites.main.lists.Agreements).Items().getById(item.Id).update(updateBody).execute(
        (resp) => {
          if (!resp?.existsFl) {
            reject(new Error("Agreement was updated but response did not include a success message. Please refresh."));
            return;
          }

          Web().Lists(Strings.Sites.main.lists.Agreements).Items().getById(item.Id).query({
            Select: DataSource.agreementSelectQuery,
            Expand: DataSource.agreementExpandQuery
          }).execute(
            (agreement) => resolve(agreement as unknown as IRiskAgreementItem),
            (error) => reject(new Error(`Agreement updated but failed to re-fetch it: ${formatError(error)}`))
          );
        },
        (error) => reject(new Error(`Error updating Agreement ${item.Id}: ${formatError(error)}`))
      );
    });
  }

  // only for new agreements
  static async submitNew(item: IRiskAgreementItem, araStatus: AraStatus): Promise<IRiskAgreementItem> {
    const year = dayjs().format("YYYY");
    const seq = await this.reserveNextSequence(year, item.Id);
    const trackingNo = seq.toString().padStart(4, "0");
    const agreementNo = `ATR-${item.entity}-${year}-${trackingNo}`;

    // update item with tracking + everything else
    return await this.updateAgreement(item, araStatus, agreementNo);
  }

  // standard edit agreement
  static async edit(item: IRiskAgreementItem, araStatus: AraStatus): Promise<IRiskAgreementItem> {
    return await this.updateAgreement(item, araStatus);
  }

  // Update the current Run Id for Mod Review after new run is created successfully
  static async updateRunId(itemId: number, currentRunId: number): Promise<void> {

    if (!itemId || !currentRunId) {
      throw new Error("Cannot submit Risk Agreement: item.Id or run.Id is missing. Refresh and try again or contact IT support.");
    }

    try {

      await Web().Lists(Strings.Sites.main.lists.Agreements).Items(itemId).update({
        __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.Agreements)}ListItem` },
        currentRunId
      }).executeAndWait();

    } catch (error) {
      const err = formatError(error);
      console.error("Error updating Risk Agreement > Run Id: ", error);
      throw new Error(`Error submitting Risk Agreement > Run Id: ${err}`);
    }
  }

  // Only used for draft (when creating new > then click cancel)
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