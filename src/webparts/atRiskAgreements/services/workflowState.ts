import { IRiskAgreementItem } from "../data/props";
import { IWorkflowStep } from "./workflowModel";
import { RiskAgreementWorkflow } from "./workflowModel";

export type WorkflowStepStatus =
    | "Submitted"
    | "Approved"
    | "Rejected"
    | "Current"   // waiting on THIS approver
    | "Queued"    // future approvers
    | "Skipped";

export interface WorkflowStepWithStatus extends IWorkflowStep {
    status: WorkflowStepStatus;
    approverName?: string;
    date?: string;
}

export function buildWorkflowState(item: IRiskAgreementItem): WorkflowStepWithStatus[] {

    let currentFound = false;

    return RiskAgreementWorkflow.map(step => {

        // Initial "Submitted" step
        if (step.isInitial) {
            return {
                ...step,
                status: "Submitted",
                approverName: item.Author?.Title,
                date: item.Created
            };
        }

        // Step not required (e.g. CEO < $100k)
        if (!step.isRequired(item)) {
            return {
                ...step,
                status: "Skipped"
            };
        }

        const approval = step.approvalField
            ? item[step.approvalField]
            : undefined;

        if (approval === "Approved") {
            return {
                ...step,
                status: "Approved",
                approverName:
                    step.approverField
                        ? item[step.approverField]?.Title
                        : undefined,
                date:
                    step.signDateField
                        ? String(item[step.signDateField])
                        : undefined
            };
        }

        if (approval === "Rejected") {
            return {
                ...step,
                status: "Rejected",
                approverName:
                    step.approverField
                        ? item[step.approverField]?.Title
                        : undefined,
                date:
                    step.signDateField
                        ? String(item[step.signDateField])
                        : undefined
            };
        }

        if (!currentFound) {
            currentFound = true;
            return {
                ...step,
                status: "Current",
                approverName:
                    step.approverField
                        ? item[step.approverField]?.Title
                        : undefined
            };
        }

        return {
            ...step,
            status: "Queued",
            approverName:
                step.approverField
                    ? item[step.approverField]?.Title
                    : undefined
        };
    });
}