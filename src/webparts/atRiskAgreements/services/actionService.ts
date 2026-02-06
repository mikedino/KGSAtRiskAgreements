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

    static createSubmitted(agreement: IRiskAgreementItem, runId: number): Promise<void> {

        const today = new Date().toISOString();

        return new Promise<void>((resolve, reject) => {

            Web()
                .Lists(Strings.Sites.main.lists.WorkflowActions)
                .Items()
                .add({
                    __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.WorkflowActions)}ListItem` },
                    Title: `${agreement.Title}-Run1-submit`, //initial is always run1
                    agreementId: agreement.Id,
                    runId,
                    stepKey: "submit",
                    actionType: "Submitted",
                    actorId: ContextInfo.userId,
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
