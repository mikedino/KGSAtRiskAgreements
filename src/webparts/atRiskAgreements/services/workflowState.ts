import { IRiskAgreementItem } from "../data/props";
import { IWorkflowStep } from "./workflowModel";
import { RiskAgreementWorkflow } from "./workflowModel";

export type WorkflowStepStatus = "Pending" | "Approved" | "Rejected" | "Skipped";

export interface WorkflowStepWithStatus extends IWorkflowStep {
    status: WorkflowStepStatus;
    approverName?: string;
    date?: string;
}

export function buildWorkflowState(item: IRiskAgreementItem): WorkflowStepWithStatus[] {

    return RiskAgreementWorkflow.map(step => {

        // Step not required (e.g. CEO < $100k)
        if (!step.isRequired(item)) {
            return {
                ...step,
                status: "Skipped"
            };
        }

        // CM review (non-approval step)
        if (step.key === "CMReview") {
            const decision = item.cmDecision;

            return {
                ...step,
                status:
                    decision === "Rejected"
                        ? "Rejected"
                        : decision === "Sent to OGP"
                            ? "Approved"
                            : "Pending",
                approverName: item.contractMgr?.Title,
                date: item.cmDecisionDate
            };
        }

        // Standard approval steps
        const approval = step.approvalField
            ? item[step.approvalField]
            : undefined;

        return {
            ...step,
            status:
                approval === "Approved"
                    ? "Approved"
                    : approval === "Rejected"
                        ? "Rejected"
                        : "Pending",
            approverName:
                step.approverField
                    ? item[step.approverField]?.Title
                    : undefined,
            date:
                step.signDateField
                    ? item[step.signDateField]
                    : undefined
        };
    });
}
