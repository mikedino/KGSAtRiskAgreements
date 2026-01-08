import { ApprovalChoice, IRiskAgreementItem } from "../data/props";
import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { formatError, encodeListName } from "./utils";
import dayjs from 'dayjs';
import { buildWorkflowState } from "./workflowState";

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
      })
        .executeAndWait();

    } catch (error) {
      const err = formatError(error);
      console.error("Error updating Risk Agreement: ", error);
      throw new Error(`Error submitting Risk Agreement: ${err}`);
    }
  }

  static async getAgreementById(id: number): Promise<IRiskAgreementItem> {

    try {
      const ara = await Web().Lists(Strings.Sites.main.lists.Agreements).Items(id).query({
        Select: [
          "*", "Author/Id", "Author/Title", "Author/EMail", "projectMgr/Id", "projectMgr/Title", "projectMgr/EMail",
          "contractMgr/Id", "contractMgr/Title", "contractMgr/EMail", "entityGM/Id", "entityGM/Title", "entityGM/EMail",
          "OGPresident/Id", "OGPresident/Title", "OGPresident/EMail", "SVPContracts/Id", "SVPContracts/Title", "SVPContracts/EMail",
          "LOBPresident/Id", "LOBPresident/Title", "LOBPresident/EMail",
          "CEO/Id", "CEO/Title", "CEO/EMail"
        ],
        Expand: ["Author", "projectMgr", "contractMgr", "entityGM", "OGPresident", "SVPContracts",
          'LOBPresident',
          'CEO'
        ]
      }).executeAndWait()

      return ara as unknown as IRiskAgreementItem

    } catch (error) {
      const err = formatError(error);
      console.error("Error fetching Agreement item updates: ", error);
      throw new Error(`Error fetching Agreement: ${err}`);
    }

  }

  static async submitDecision(item: IRiskAgreementItem, decision: ApprovalChoice, comment?: string): Promise<IRiskAgreementItem> {

    try {
      const workflow = buildWorkflowState(item);
      const currentStep = workflow.find(s => s.status === "Current");

      if (!currentStep) {
        throw new Error("No active workflow step found.");
      }

      const today = dayjs().toISOString();

      const updatePayload: Record<string, unknown> = {
        __metadata: {
          type: `SP.Data.${encodeListName(Strings.Sites.main.lists.Agreements)}ListItem`
        }
      };

      // Approval / rejection fields
      if (currentStep.approvalField) {
        updatePayload[currentStep.approvalField] = decision;
      }

      if (currentStep.commentField) {
        updatePayload[currentStep.commentField] = comment ?? "";
      }

      if (currentStep.signDateField) {
        updatePayload[currentStep.signDateField] = today;
      }

      // araStatus rules
      if (decision === "Rejected") {
        updatePayload.araStatus = "Rejected";
      } else if (currentStep.completesOnApprove) {
        updatePayload.araStatus = "Completed";
      } else {
        updatePayload.araStatus = "In Progress";
      }

      // Persist
      await Web()
        .Lists(Strings.Sites.main.lists.Agreements)
        .Items()
        .getById(item.Id)
        .update(updatePayload)
        .executeAndWait();

      // Re-fetch item
      return await this.getAgreementById(item.Id);

    } catch (error) {
      const err = formatError(error);
      console.error("Error updating/approving Risk Agreement: ", error);
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