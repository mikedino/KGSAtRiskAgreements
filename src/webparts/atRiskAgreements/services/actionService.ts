import { IRiskAgreementItem, IWorkflowRunItem } from "../data/props";
import { Web, ContextInfo } from "gd-sprest";
import Strings from "../../../strings";
import { formatError, encodeListName } from "./utils";
import { WorkflowStepKey, WorkflowActionType, ActionDecision } from "../data/props";

export class WorkflowActionService {

    static createSubmitted(run: IWorkflowRunItem, agreement: IRiskAgreementItem): Promise<void> {

        const today = new Date().toISOString();

        return new Promise<void>((resolve, reject) => {

            Web()
                .Lists(Strings.Sites.main.lists.WorkflowActions)
                .Items()
                .add({
                    __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.WorkflowActions)}ListItem` },

                    // Title - figure out later
                    Title: `Run-${run.Id}-submit`,

                    // Lookups
                    agreementId: agreement.Id,
                    runId: run.Id,

                    // Event
                    stepKey: "submit",
                    actionType: "Submitted",

                    // Actor
                    actorId: ContextInfo.userId,

                    // Timing
                    actionCompletedDate: today
                })
                .execute(
                    () => resolve(),
                    (error) => reject(new Error(`Error creating Submitted action: ${formatError(error)}`))
                );
        });
    }

    static createDecision(
        agreementId: number,
        run: IWorkflowRunItem,
        stepKey: WorkflowStepKey,
        actionType: Extract<WorkflowActionType, ActionDecision>,
        comment?: string
    ): Promise<void> {

        const now = new Date().toISOString();

        return new Promise<void>((resolve, reject) => {
            Web()
                .Lists(Strings.Sites.main.lists.WorkflowActions)
                .Items()
                .add({
                    __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.WorkflowActions)}ListItem` },
                    Title: `Run-${run.Id}-${stepKey}-${actionType}`,
                    agreementId,
                    runId: run.Id,
                    stepKey,
                    actionType,
                    actorId: ContextInfo.userId,
                    actionCompletedDate: now,
                    comment: comment ?? ""
                })
                .execute(
                    () => resolve(),
                    (error) => reject(new Error(`Error creating decision action: ${formatError(error)}`))
                );
        });
    }
}
