import { IRiskAgreementItem, IWorkflowRunItem } from "../data/props";
import { Web, ContextInfo } from "gd-sprest";
import Strings from "../../../strings";
import { formatError, encodeListName } from "./utils";
import { WorkflowStepKey, WorkflowActionType } from "../data/props";

type CreateActionArgs = {
    agreement: IRiskAgreementItem;
    run: IWorkflowRunItem;
    stepKey: WorkflowStepKey;
    actionType: WorkflowActionType;
    comment?: string;
    changeSummary?: string;
    changePayloadJson?: string;
};

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
                    Title: `${agreement.Title}-Run${run.runNumber}-submit`,

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

    static createAction(args: CreateActionArgs): Promise<void> {
        const now = new Date().toISOString();

        const title = `${args.agreement?.Title}-Run${args.run?.runNumber}-${args.stepKey}-${args.actionType}`;

        return new Promise<void>((resolve, reject) => {
            Web()
                .Lists(Strings.Sites.main.lists.WorkflowActions)
                .Items()
                .add({
                    __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.WorkflowActions)}ListItem` },
                    Title: title,
                    agreementId: args.agreement?.Id,
                    runId: args.run?.Id,
                    stepKey: args.stepKey,
                    actionType: args.actionType,
                    actorId: ContextInfo.userId,
                    actionCompletedDate: now,
                    comment: args.comment ?? "",
                    ...(args.changeSummary ? { changeSummary: args.changeSummary } : {}),
                    ...(args.changePayloadJson ? { changePayloadJson: args.changePayloadJson } : {})
                })
                .execute(
                    () => resolve(),
                    (error) => reject(new Error(`Error creating workflow action: ${formatError(error)}`))
                );
        });
    }
}
