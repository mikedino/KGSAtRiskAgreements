import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { encodeListName } from "./utils";
import { AraStatus, IRiskAgreementItem, IWorkflowRunItem, WorkflowStepKey } from "../data/props";
import { WorkflowActionService } from "./actionService";
import { WorkflowRunService } from "./runService";

type Decision = "Approved" | "Rejected";

interface IApprovedRunSnapshot {
  Id: number;
  approvedSnapshotJson: string;
  outcome: string;
  runStatus: string;
  runNumber: number;
}

export class WorkflowDecisionService {

  /*********************************************
   * *
   *  Helper to builds a snapshot from agreement
   * *
   *********************************************/
  private static buildApprovedSnapshot(agreement: IRiskAgreementItem): Record<string, unknown> {
    return {
      projectName: agreement.projectName,
      contractId: agreement.contractId ?? null,
      invoice: agreement.invoice,
      contractName: agreement.contractName,
      programName: agreement.programName,
      contractType: agreement.contractType,
      hasSubcontract: agreement.hasSubcontract,
      riskStart: agreement.riskStart,
      riskEnd: agreement.riskEnd,
      popEnd: agreement.popEnd,
      entity: agreement.entity,
      og: agreement.og,
      projectMgrId: agreement.projectMgr?.Id ?? null,
      contractMgrId: agreement.contractMgr?.Id ?? null,
      riskReason: agreement.riskReason,
      riskFundingRequested: agreement.riskFundingRequested ?? null,
      riskJustification: agreement.riskJustification,
      entityGMId: agreement.entityGM?.Id ?? null,
      backupRequestorId: agreement.backupRequestor?.Id ?? null
    };
  }

  /*****************************************
   * 
   *  Helper to update the agreement status
   * 
   *****************************************/
  static async updateAgreementStatus(agreementId: number, status: AraStatus, effectiveApprovedRunId?: number): Promise<void> {

    const updatePayload: Record<string, unknown> = {
      __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.Agreements)}ListItem` },
      araStatus: status
    };

    if (effectiveApprovedRunId !== undefined) {
      updatePayload.effectiveApprovedRunId = effectiveApprovedRunId;
    }

    await Web().Lists(Strings.Sites.main.lists.Agreements).Items().getById(agreementId).update(updatePayload).executeAndWait();

  }


  /***********************************************
   * 
   *  Helper to get proper step key when canceling
   * 
   ***********************************************/
  private static getCancelStepKey(agreement: IRiskAgreementItem, run: IWorkflowRunItem, actorEmail?: string): WorkflowStepKey {
    // If the current user is the submitter, attribute it to submitter step.
    // Otherwise fall back to current step key to keep data consistent.
    const submitterEmail = agreement.Author?.EMail?.toLowerCase();
    const userEmail = actorEmail?.toLowerCase();

    return submitterEmail && userEmail && submitterEmail === userEmail
      ? "submitter"
      : run.currentStepKey;
  }


  /***********************************************
   * 
   *  Service to submit a decision action
   * 
   ***********************************************/
  static async submitDecision(agreement: IRiskAgreementItem, run: IWorkflowRunItem, decision: Decision, comment?: string): Promise<void> {

    // 1) Add decision action (audit trail)
    await WorkflowActionService.createAction({ agreement, run, stepKey: run.currentStepKey, actionType: decision, comment });

    // 2) Update Run (source of truth)
    const result = await WorkflowRunService.applyDecision(agreement, run, decision);

    const isRejected = decision === "Rejected";
    const isApproved = decision === "Approved";
    const isFinalApproval = isApproved && result.completed;

    // 2b) If rejected, log that it was returned to submitter
    if (isRejected) {
      await WorkflowActionService.createAction({
        agreement,
        run,
        stepKey: "submitter",
        actionType: "Returned",
        comment: comment ? `Returned after rejection: ${comment}` : "Returned after rejection"
      });
    }

    // 2c) If approved, capture and log the complete JSON snapshot and store on the run
    if (isFinalApproval) {
      const snapshot = this.buildApprovedSnapshot(agreement);
      await Web()
        .Lists(Strings.Sites.main.lists.WorkflowRuns)
        .Items()
        .getById(run.Id)
        .update({
          __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.WorkflowRuns)}ListItem` },
          approvedSnapshotJson: JSON.stringify(snapshot),
          approvedSnapshotDate: new Date().toISOString()
        })
        .executeAndWait();
    }

    // 3) Update Agreement status (business status)
    const nextStatus: AraStatus =
      decision === "Rejected"
        ? "Rejected"
        : isFinalApproval
          ? "Approved"
          : (agreement.araStatus === "Mod Review" ? "Mod Review" : "Under Review");

    // 4) If approved, set effectiveApprovedRunId
    const effectiveApprovedRunId = isFinalApproval ? run.Id : undefined;

    await this.updateAgreementStatus(agreement.Id, nextStatus, effectiveApprovedRunId);
  }


  /***********************************************
   * 
   *  Service to cancel an agreement
   * 
   ***********************************************/
  static async cancelAgreement(agreement: IRiskAgreementItem, run: IWorkflowRunItem, comment: string, actorEmail?: string): Promise<void> {

    const now = new Date().toISOString();
    const cancelStepKey = this.getCancelStepKey(agreement, run, actorEmail);

    // 1) Add Action (audit trail)
    await WorkflowActionService.createAction({ agreement, run, stepKey: cancelStepKey, actionType: "Canceled", comment });

    // 2) Update Run (mark completed)
    await Web().Lists(Strings.Sites.main.lists.WorkflowRuns).Items().getById(run.Id).update({
      __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.WorkflowRuns)}ListItem` },

      runStatus: "Completed",
      outcome: "Canceled",
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

  /***********************************************
   * 
   *  Service to revert an agreement
   * 
   ***********************************************/
  static async revertAgreement(agreement: IRiskAgreementItem, run: IWorkflowRunItem, comment: string): Promise<void> {

    const now = new Date().toISOString();

    // 0) Determine baseline run to revert to
    const effectiveApprovedRunId = agreement.effectiveApprovedRun?.Id
    if (!effectiveApprovedRunId) {
      throw new Error("Cannot revert: no effective approved run found on agreement.");
    }

    if (effectiveApprovedRunId === run.Id) {
      throw new Error("Cannot revert: current run is already the effective approved run.");
    }

    // 1) Load the approved snapshot from the effective run
    const approvedRun = await Web()
      .Lists(Strings.Sites.main.lists.WorkflowRuns).Items()
      .getById(effectiveApprovedRunId)
      .query({
        Select: ["Id", "approvedSnapshotJson", "outcome", "runStatus", "runNumber"]
      })
      .executeAndWait() as unknown as IApprovedRunSnapshot;

    const approvedSnapshotJson = approvedRun?.approvedSnapshotJson as string | undefined;
    if (!approvedSnapshotJson) {
      throw new Error("Cannot revert: approved snapshot is missing on the effective approved run.");
    }

    // get the snapshot JSON
    const snapshot = JSON.parse(approvedSnapshotJson) as Record<string, unknown>;

    // 2) Log revert action (audit)
    await WorkflowActionService.createAction({
      agreement,
      run,
      stepKey: "contractMgr",
      actionType: "Reverted",
      changeSummary: `Reverted to Run ${approvedRun.runNumber} - the last Approved Agreement information`,
      comment
    });

    // 3) Complete current run as Reverted, include revertedToRunId
    await Web().Lists(Strings.Sites.main.lists.WorkflowRuns).Items().getById(run.Id).update({
      __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.WorkflowRuns)}ListItem` },
      runStatus: "Completed",
      outcome: "Reverted",
      completed: now,
      hasDecision: true,
      revertedToRunId: effectiveApprovedRunId,
      pendingRole: null,
      pendingApproverId: null,
      pendingApproverEmail: null
    }).executeAndWait();

    // 4) Patch agreement business fields from snapshot
    await Web().Lists(Strings.Sites.main.lists.Agreements).Items().getById(agreement.Id).update({
      __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.Agreements)}ListItem` },
      ...snapshot,
      araStatus: "Approved",
      effectiveApprovedRunId: effectiveApprovedRunId
      // do NOT change currentRun; keep it pointing to the latest run (reverted run)
    }).executeAndWait();
  }


  /***********************************************
   * 
   *  Service to resolve an agreement
   * 
   ***********************************************/
  static async resolveAgreement(agreement: IRiskAgreementItem, run: IWorkflowRunItem, comment?: string): Promise<void> {

    // 1) Add Action (audit trail)
    await WorkflowActionService.createAction({ agreement, run, stepKey: "contractMgr", actionType: "Resolved", comment });

    // 3) Update Agreement status
    await this.updateAgreementStatus(agreement.Id, "Resolved");
  }
}