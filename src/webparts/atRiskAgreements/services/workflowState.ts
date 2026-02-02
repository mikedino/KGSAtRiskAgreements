// workflowState.ts
import { IRiskAgreementItem, IWorkflowActionItem, IWorkflowRunItem, WorkflowStepKey } from "../data/props";
import { IWorkflowStep, RiskAgreementWorkflow } from "./workflowModel";

export type WorkflowStepStatus =
  | "Submitted"
  | "Approved"
  | "Rejected"
  | "Current"  // waiting on THIS approver
  | "Queued"   // future approvers
  | "Skipped";

export interface WorkflowStepWithStatus extends IWorkflowStep {
  status: WorkflowStepStatus;
  approverName?: string;
  completeDate?: string;  // when THIS step was completed
  sentDate?: string;  // when THIS step became current (best effort)
  comment?: string;
}

/**
 * Finds the most relevant action for a step. For approvals/rejections,
 * we usually care about the last one (in case of reassign/return patterns later).
 */
const getLatestDecisionAction = (
  actions: IWorkflowActionItem[],
  stepKey: WorkflowStepKey
): IWorkflowActionItem | undefined => {
  const matches = actions
    .filter(a => a.stepKey === stepKey && (a.actionType === "Approved" || a.actionType === "Rejected"))
    .sort((a, b) => {
      const ad = new Date(a.actionCompletedDate).getTime();
      const bd = new Date(b.actionCompletedDate).getTime();
      return bd - ad;
    });

  return matches[0];
};

const getLatestCommentAction = (
  actions: IWorkflowActionItem[],
  stepKey: WorkflowStepKey
): IWorkflowActionItem | undefined => {
  const matches = actions
    .filter(a => a.stepKey === stepKey && a.comment && a.comment.trim().length > 0)
    .sort((a, b) => new Date(b.actionCompletedDate).getTime() - new Date(a.actionCompletedDate).getTime());

  return matches[0];
};

const getSubmittedActionDate = (agreement: IRiskAgreementItem, actions: IWorkflowActionItem[]): string => {
  const submitted = actions
    .filter(a => a.actionType === "Submitted" || a.actionType === "Restarted")
    .sort((a, b) => new Date(b.actionCompletedDate).getTime() - new Date(a.actionCompletedDate).getTime())[0];

  return submitted?.actionCompletedDate ?? agreement.Created;
};

/**
 * Build workflow state from:
 * - agreement (threshold rules)
 * - run (who is assigned + what step is current)
 * - actions (what happened)
 */
export function buildWorkflowState(
  agreement: IRiskAgreementItem,
  run: IWorkflowRunItem,
  actions: IWorkflowActionItem[]
): WorkflowStepWithStatus[] {

  // Best-effort "sent date" for the current step:
  // prefer run.stepAssignedDate; otherwise use the last completed step date or agreement created.
  let lastCompletedDate: string | undefined = agreement.Created;

  const submittedDate = getSubmittedActionDate(agreement, actions);
  lastCompletedDate = submittedDate;

  // Determine current step (and guard against non-required current step)
  const currentKey = run.currentStepKey;

  // Find the first required step at/after currentKey if the currentKey is not required anymore
  // (ex: risk amount reduced and COO step no longer required).
  const requiredSteps = RiskAgreementWorkflow.filter(s => !s.isInitial && s.isRequired(agreement));
  const currentIndex = requiredSteps.findIndex(s => s.key === currentKey);
  const effectiveCurrentKey =
    currentIndex >= 0 ? currentKey : (requiredSteps[0]?.key ?? "contractMgr");

  let currentFound = false;

  return RiskAgreementWorkflow.map(step => {
    // Initial step
    if (step.isInitial) {
      return {
        ...step,
        status: "Submitted",
        approverName: agreement.Author?.Title,
        completeDate: submittedDate
      };
    }

    // Skip if not required
    if (!step.isRequired(agreement)) {
      return { ...step, status: "Skipped" };
    }

    // Determine approver name from run snapshot
    const approver = step.getApprover ? step.getApprover(run) : undefined;

    // Determine decision from actions
    const decisionAction = getLatestDecisionAction(actions, step.key);

    if (decisionAction?.actionType === "Approved") {
      lastCompletedDate = decisionAction.actionCompletedDate;

      return {
        ...step,
        status: "Approved",
        approverName: approver?.Title ?? decisionAction.actor?.Title,
        completeDate: decisionAction.actionCompletedDate,
        comment: decisionAction.comment ?? ""
      };
    }

    if (decisionAction?.actionType === "Rejected") {
      lastCompletedDate = decisionAction.actionCompletedDate;

      return {
        ...step,
        status: "Rejected",
        approverName: approver?.Title ?? decisionAction.actor?.Title,
        completeDate: decisionAction.actionCompletedDate,
        comment: decisionAction.comment ?? ""
      };
    }

    // Current step is based on run state
    if (!currentFound && step.key === effectiveCurrentKey) {
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
}
