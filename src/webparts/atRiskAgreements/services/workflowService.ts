import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { encodeListName } from "./utils";
import { AraStatus, IRiskAgreementItem, IWorkflowRunItem, WorkflowStepKey } from "../data/props";
import { WorkflowActionService } from "./actionService";
import { WorkflowRunService } from "./runService";

type Decision = "Approved" | "Rejected";

export class WorkflowDecisionService {

  static async updateAgreementStatus(agreementId: number, status: AraStatus): Promise<void> {

    await Web().Lists(Strings.Sites.main.lists.Agreements).Items().getById(agreementId).update({
      __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.Agreements)}ListItem` },
      araStatus: status
    })
      .executeAndWait();
  }

  private static getCancelStepKey(agreement: IRiskAgreementItem, run: IWorkflowRunItem, actorEmail?: string): WorkflowStepKey {
    // If the current user is the submitter, attribute it to submitter step.
    // Otherwise fall back to current step key to keep data consistent.
    const submitterEmail = agreement.Author?.EMail?.toLowerCase();
    const userEmail = actorEmail?.toLowerCase();

    return submitterEmail && userEmail && submitterEmail === userEmail
      ? "submitter"
      : run.currentStepKey;
  }

  static async submitDecision(agreement: IRiskAgreementItem, run: IWorkflowRunItem, decision: Decision, comment?: string): Promise<void> {

    // 1) Add decision action (audit trail)
    await WorkflowActionService.createAction({ agreement, run, stepKey: run.currentStepKey, actionType: decision, comment });

    // 2) Update Run (source of truth)
    const result = await WorkflowRunService.applyDecision(agreement, run, decision);

    // 2b) If rejected, log that it was returned to submitter
    if (decision === "Rejected") {
      await WorkflowActionService.createAction({
        agreement,
        run,
        stepKey: "submitter",
        actionType: "Returned",
        comment: comment ? `Returned after rejection: ${comment}` : "Returned after rejection"
      });
    }

    // 3) Update Agreement status (business status)
    const nextStatus: AraStatus =
      decision === "Rejected"
        ? "Rejected"
        : result.completed
          ? "Approved"
          : (agreement.araStatus === "Mod Review" ? "Mod Review" : "Under Review");

    await this.updateAgreementStatus(agreement.Id, nextStatus);
  }

  static async cancelAgreement(agreement: IRiskAgreementItem, run: IWorkflowRunItem, comment?: string, actorEmail?: string): Promise<void> {

    const now = new Date().toISOString();
    const cancelStepKey = this.getCancelStepKey(agreement, run, actorEmail);

    // 1) Add Action (audit trail)
    await WorkflowActionService.createAction({ agreement, run, stepKey: cancelStepKey, actionType: "Canceled", comment });

    // 2) Update Run (mark completed)
    await Web().Lists(Strings.Sites.main.lists.WorkflowRuns).Items().getById(run.Id).update({
      __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.WorkflowRuns)}ListItem` },

      runStatus: "Completed",
      completed: now,
      hasDecision: true,

      pendingRole: null,
      pendingApproverId: null,
      pendingApproverEmail: null
    })
      .executeAndWait();

    // 3) Update Agreement status
    await this.updateAgreementStatus(agreement.Id, "Canceled");
  }

  static async resolveAgreement(agreement: IRiskAgreementItem, run: IWorkflowRunItem, comment?: string): Promise<void> {

    // 1) Add Action (audit trail)
    await WorkflowActionService.createAction({ agreement, run, stepKey: "contractMgr", actionType: "Resolved", comment });

    // 3) Update Agreement status
    await this.updateAgreementStatus(agreement.Id, "Resolved");
  }
}