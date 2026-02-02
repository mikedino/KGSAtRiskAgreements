import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { encodeListName } from "./utils";
import { AraStatus, IRiskAgreementItem, IWorkflowRunItem } from "../data/props";
import { WorkflowActionService } from "./actionService";
import { WorkflowRunService } from "./runService";

type Decision = "Approved" | "Rejected";

export class WorkflowDecisionService {

  static async submitDecision(
    agreement: IRiskAgreementItem,
    run: IWorkflowRunItem,
    decision: Decision,
    comment?: string
  ): Promise<void> {

    const currentKey = run.currentStepKey;

    // 1) Add Action (audit trail)
    await WorkflowActionService.createDecision(
      agreement.Id,
      run,
      currentKey,
      decision,
      comment
    );

    // 2) Update Run (source of truth)
    const result = await WorkflowRunService.applyDecision(agreement, run, decision);

    // 3) Update Agreement status (business status)
    const nextStatus: AraStatus =
      decision === "Rejected"
        ? "Rejected"
        : result.completed
          ? "Approved"
          : (agreement.araStatus === "Mod Review" ? "Mod Review" : "Under Review");

    await Web()
      .Lists(Strings.Sites.main.lists.Agreements)
      .Items()
      .getById(agreement.Id)
      .update({
        __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.Agreements)}ListItem` },
        araStatus: nextStatus
      })
      .executeAndWait();
  }
}