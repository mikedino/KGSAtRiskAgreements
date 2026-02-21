// workflowState.ts
import { IRiskAgreementItem, IWorkflowActionItem, IWorkflowRunItem, WorkflowStepKey } from "../data/props";
import { IWorkflowStep, RiskAgreementWorkflow } from "./workflowModel";

// create a synthentic step definition for timeline display
export type TimelineStepKey = WorkflowStepKey | "resolved";

export type WorkflowStepStatus =
  | "Submitted"
  | "Approved"
  | "Rejected"
  | "Canceled"
  | "Current"  // waiting on THIS approver
  | "Queued"   // future approvers
  | "Resolved"
  | "Reverted"
  | "Skipped";

export interface WorkflowStepWithStatus extends Omit<IWorkflowStep, "key"> {
  key: TimelineStepKey; // to allow for resolved
  status: WorkflowStepStatus;
  approverName?: string;
  completeDate?: string;  // when THIS step was completed
  sentDate?: string;  // when THIS step became current (best effort)
  comment?: string;
  hidden?: boolean;
  isSynthetic?: boolean; // allow synthetic (not part of state machine - RESOLVED)
}

/**
 * Finds the most relevant action for a step. For approvals/rejections,
 * we usually care about the last one (in case of reassign/return patterns later).
 */
const getLatestDecisionAction = (actions: IWorkflowActionItem[], stepKey: TimelineStepKey): IWorkflowActionItem | undefined => {
  const matches = actions
    .filter(a => a.stepKey === stepKey && (a.actionType === "Approved" || a.actionType === "Rejected"))
    .sort((a, b) => {
      const ad = new Date(a.actionCompletedDate).getTime();
      const bd = new Date(b.actionCompletedDate).getTime();
      return bd - ad;
    });

  return matches[0];
};

const getLatestCommentAction = (actions: IWorkflowActionItem[], stepKey: TimelineStepKey): IWorkflowActionItem | undefined => {
  const matches = actions
    .filter(a => a.stepKey === stepKey && a.comment && a.comment.trim().length > 0)
    .sort((a, b) => new Date(b.actionCompletedDate).getTime() - new Date(a.actionCompletedDate).getTime());

  return matches[0];
};

const getSubmittedActionDate = (agreement: IRiskAgreementItem, actions: IWorkflowActionItem[]): string => {
  const submitted = actions
    .filter(a =>
      a.actionType === "Submitted" ||
      a.actionType === "Modified" ||   // restart/resubmission marker for new run
      a.actionType === "Restarted"     // keep for old run end marker if needed
    )
    .sort((a, b) => new Date(b.actionCompletedDate).getTime() - new Date(a.actionCompletedDate).getTime())[0];

  return submitted?.actionCompletedDate ?? agreement.Created;
};

// find rejection step to know where to place the new submitter action
const getLatestRejectedStepKey = (actions: IWorkflowActionItem[]): TimelineStepKey | undefined => {
  const lastReject = actions
    .filter(a => a.actionType === "Rejected")
    .sort((a, b) => new Date(b.actionCompletedDate).getTime() - new Date(a.actionCompletedDate).getTime())[0];

  return lastReject?.stepKey;
};

/**
 * Build workflow state from:
 * - agreement (threshold rules)
 * - run (who is assigned + what step is current)
 * - actions (what happened)
 */
export function buildWorkflowState(agreement: IRiskAgreementItem, run: IWorkflowRunItem, actions: IWorkflowActionItem[]): WorkflowStepWithStatus[] {

  // Best-effort "sent date" for the current step:
  // prefer run.stepAssignedDate; otherwise use the last completed step date or agreement created.
  let lastCompletedDate: string | undefined = agreement.Created;

  const submittedDate = getSubmittedActionDate(agreement, actions);
  lastCompletedDate = submittedDate;

  // is run completed (including canceled)
  const runIsCompleted = run.runStatus === "Completed";

  // CANCEL DETECTION action for this run (if any)
  const cancelAction = actions
    .filter(a => a.actionType === "Canceled")
    .sort((a, b) => new Date(b.actionCompletedDate).getTime() - new Date(a.actionCompletedDate).getTime())[0];
  const isCanceled = agreement.araStatus === "Canceled" || !!cancelAction;
  const cancelDate = cancelAction?.actionCompletedDate ?? run.completed;
  const cancelComment = cancelAction?.comment ?? "";

  // RESOLVE DETECTION action for this run (if any)
  const resolveAction = actions
    .filter(a => a.actionType === "Resolved")
    .sort((a, b) => new Date(b.actionCompletedDate).getTime() - new Date(a.actionCompletedDate).getTime())[0];

  const isResolved = agreement.araStatus === "Resolved" || !!resolveAction;
  const resolveDate = resolveAction?.actionCompletedDate;
  const resolveComment = resolveAction?.comment ?? "";
  const resolveActorName = resolveAction?.actor?.Title ?? run.contractMgr?.Title ?? "Contract Manager";

  // REVERT DETECTION action for this run (if any)
  const revertAction = actions
    .filter(a => a.actionType === "Reverted")
    .sort((a, b) => new Date(b.actionCompletedDate).getTime() - new Date(a.actionCompletedDate).getTime())[0];

  const isReverted = !!revertAction;
  const revertDate = revertAction?.actionCompletedDate;
  const revertComment = revertAction?.comment ?? "";
  const revertActorName = revertAction?.actor?.Title ?? run.contractMgr?.Title ?? "Contract Manager";

  // Determine current step (and guard against non-required current step)
  const currentKey = run.currentStepKey;

  // Find the first required step at/after currentKey if the currentKey is not required anymore
  // (ex: risk amount reduced and COO step no longer required).
  const requiredSteps = RiskAgreementWorkflow.filter(s => !s.isInitial && s.isRequired(agreement));
  const currentIndex = requiredSteps.findIndex(s => s.key === currentKey);
  const effectiveCurrentKey = currentIndex >= 0 ? currentKey : (requiredSteps[0]?.key ?? "contractMgr");

  let currentFound = false;

  // build dynamic display flow for when a rejection happens
  const awaitingSubmitter = run.currentStepKey === "submitter";
  const rejectedKey = awaitingSubmitter ? getLatestRejectedStepKey(actions) : undefined;

  const submitterDef = RiskAgreementWorkflow.find(s => s.key === "submitter");
  const baseWorkflow = RiskAgreementWorkflow.filter(s => s.key !== "submitter");

  let displayWorkflow = baseWorkflow;

  if (awaitingSubmitter && submitterDef) {
    const insertAfterKey = rejectedKey ?? run.currentStepKey; // fallback
    const idx = baseWorkflow.findIndex(s => s.key === insertAfterKey);

    if (idx >= 0) {
      displayWorkflow = [
        ...baseWorkflow.slice(0, idx + 1),
        submitterDef,
        ...baseWorkflow.slice(idx + 1),
      ];
    } else {
      // fallback: put it right after Submitted
      displayWorkflow = [baseWorkflow[0], submitterDef, ...baseWorkflow.slice(1)];
    }
  }

  const steps = displayWorkflow.map((step): WorkflowStepWithStatus => {

    // Initial step
    if (step.isInitial) {
      return {
        ...step,
        label: run.runNumber > 1 ? "Resubmitted" : step.label,
        status: "Submitted",
        approverName: agreement.Author?.Title,
        completeDate: submittedDate,
        hidden: false
      };
    }

    // Determine decision from actions
    const decisionAction = getLatestDecisionAction(actions, step.key);

    // Special handling for submitter step
    if (step.key === "submitter") {
      if (!awaitingSubmitter) {
        return { ...step, status: "Skipped", hidden: true };
      }

      // If canceled, show canceled
      if (isCanceled) {
        return {
          ...step,
          status: "Canceled",
          approverName: decisionAction?.actor.Title,
          completeDate: cancelDate,
          comment: cancelComment,
          hidden: false
        };
      }

      const bestComment = getLatestCommentAction(actions, "submitter")?.comment ?? "";

      return {
        ...step,
        status: "Current",
        approverName: agreement.Author?.Title,
        sentDate: run.stepAssignedDate ?? lastCompletedDate,
        comment: bestComment,
        hidden: false
      };
    }

    // Skip if not required
    if (!step.isRequired(agreement)) {
      return { ...step, status: "Skipped" };
    }

    // Determine approver name from run snapshot
    const approver = step.getApprover ? step.getApprover(run) : undefined;

    if (decisionAction?.actionType === "Approved") {
      lastCompletedDate = decisionAction.actionCompletedDate;

      return {
        ...step,
        status: "Approved",
        approverName: approver && approver.Id === decisionAction.actor.Id
          ? approver.Title
          : `${decisionAction.actor?.Title} on behalf of ${approver?.Title}`,
        completeDate: decisionAction.actionCompletedDate,
        comment: decisionAction.comment ?? ""
      };
    }

    if (decisionAction?.actionType === "Rejected") {
      lastCompletedDate = decisionAction.actionCompletedDate;

      return {
        ...step,
        status: "Rejected",
        approverName: approver && approver.Id === decisionAction.actor.Id
          ? approver.Title
          : `${decisionAction.actor?.Title} on behalf of ${approver?.Title}`,
        completeDate: decisionAction.actionCompletedDate,
        comment: decisionAction.comment ?? ""
      };
    }

    // If canceled, mark the effective current step as Canceled (terminal) instead of Pending
    if (isCanceled && step.key === effectiveCurrentKey) {
      return {
        ...step,
        status: "Canceled",
        approverName: `Canceled at this step by ${agreement.Author?.Title}`,
        completeDate: cancelDate,
        comment: cancelComment
      };
    }

    // Current step is based on run state (not canceled , not completed)
    if (!isCanceled && !runIsCompleted && !currentFound && step.key === effectiveCurrentKey) {
      currentFound = true;

      const bestComment = getLatestCommentAction(actions, step.key)?.comment ?? "";

      return {
        ...step,
        status: "Current",
        approverName: approver?.Title,
        sentDate: run.stepAssignedDate ?? lastCompletedDate,
        comment: bestComment
      };
    }

    // Steps before current but without a decision (should be rare) -> treat as queued
    // Steps after current -> queued
    return {
      ...step,
      status: "Queued",
      approverName: approver?.Title
    };

  });

  //Append "Resolved" only if it happened
  if (!isCanceled && isResolved && resolveDate) {
    steps.push({
      key: "contractMgr", // use a real key to avoid widening types
      label: "Resolved",
      isRequired: () => true,
      status: "Resolved",
      approverName: resolveActorName,
      completeDate: resolveDate,
      comment: resolveComment,
      hidden: false,
      isSynthetic: true
    });
  }

  // Append "Reverted" only if it happened
  if (!isCanceled && isReverted && revertDate) {
    steps.push({
      key: "contractMgr",
      label: "Reverted",
      isRequired: () => true,
      status: "Reverted",
      approverName: revertActorName,
      completeDate: revertDate,
      comment: revertComment,
      hidden: false,
      isSynthetic: true
    });
  }

  // If reverted, this run ended early -> hide remaining pending steps
  if (isReverted) {
    for (const s of steps) {
      if (s.status === "Current" || s.status === "Queued") {
        s.status = "Skipped";
        s.hidden = true;
      }
    }
  }

  return steps;

}
