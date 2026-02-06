import { IPeoplePicker, IRiskAgreementItem, IWorkflowRunItem, RunRestartReason } from "../data/props";
import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { formatError, encodeListName } from "./utils";
import { WorkflowStepKey, ActionDecision } from "../data/props";
import { IWorkflowStep, RiskAgreementWorkflow } from "./workflowModel";
import { DataSource } from "../data/ds";

export interface IRunDecisionResult {
    // Did this decision complete the workflow run?
    completed: boolean;

    // If not completed, what is the new current step?
    nextStepKey?: WorkflowStepKey;

    // New pending info (if not completed)
    pendingRole?: string;
    pendingApproverId?: number;
    pendingApproverEmail?: string;

    // timestamp used for stepAssignedDate/completed
    nowIso: string;
}

export class WorkflowRunService {

    static createRun(
        agreementId: number,
        agreement: IRiskAgreementItem,
        runNumber: number,
        ogPresidentId?: number,
        cooId?: number,
        ceoId?: number,
        svpContractsId?: number,
        restartReason?: RunRestartReason,
        restartComment?: string
    ): Promise<IWorkflowRunItem> {

        const today = new Date().toISOString();
        const titleBase = agreement.Title || agreement.contractName || agreement.projectName || `Agreement-${agreementId}`;

        return new Promise<IWorkflowRunItem>((resolve, reject) => {
            Web()
                .Lists(Strings.Sites.main.lists.WorkflowRuns)
                .Items()
                .add({
                    __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.WorkflowRuns)}ListItem` },

                    Title: `${titleBase}-RUN-${runNumber}`,

                    // Lookup to agreement
                    agreementId,

                    // Run lifecycle
                    runNumber,
                    runStatus: "Active",
                    started: today,

                    // Mod metadata (only if provided)
                    ...(restartReason ? { restartReason } : {}),
                    ...(restartComment ? { restartComment } : {}),

                    // State machine
                    currentStepKey: "contractMgr",
                    pendingApproverId: agreement.contractMgr?.Id,
                    pendingApproverEmail: agreement.contractMgr?.EMail,
                    stepAssignedDate: today,
                    pendingRole: "Contract Manager",

                    // Approver snapshots
                    contractMgrId: agreement.contractMgr?.Id,
                    ogPresidentId,
                    cooId,
                    ceoId,
                    svpContractsId
                })
                .execute(
                    (resp) => {
                        const id = resp?.Id;
                        if (!id) {
                            reject(new Error("Run was created but response did not include an Id. Please refresh."));
                            return;
                        }

                        Web()
                            .Lists(Strings.Sites.main.lists.WorkflowRuns)
                            .Items()
                            .getById(id)
                            .query({
                                Select: DataSource.runSelectQuery,
                                Expand: DataSource.runExpandQuery
                            })
                            .execute(
                                (run) => resolve(run as unknown as IWorkflowRunItem),
                                (error) => reject(new Error(`Run created but failed to re-fetch it: ${formatError(error)}`))
                            );
                    },
                    (error) => reject(new Error(`Error creating Run#${runNumber}: ${formatError(error)}`))
                );
        });
    }

    static createFirstRun(
        agreementId: number,
        agreement: IRiskAgreementItem,
        ogPresidentId?: number,
        cooId?: number,
        ceoId?: number,
        svpContractsId?: number
    ): Promise<IWorkflowRunItem> {
        return WorkflowRunService.createRun(
            agreementId,
            agreement,
            1,
            ogPresidentId,
            cooId,
            ceoId,
            svpContractsId
        );
    }

    static createRestartRun(
        agreementId: number,
        agreement: IRiskAgreementItem,
        nextRunNumber: number,
        ogPresidentId?: number,
        cooId?: number,
        ceoId?: number,
        svpContractsId?: number,
        restartReason?: RunRestartReason,
        restartComment?: string   
    ): Promise<IWorkflowRunItem> {
        return WorkflowRunService.createRun(
            agreementId,
            agreement,
            nextRunNumber,
            ogPresidentId,
            cooId,
            ceoId,
            svpContractsId,
            restartReason,
            restartComment
        );
    }


    private static getStep(key: WorkflowStepKey): IWorkflowStep | undefined {
        return RiskAgreementWorkflow.find(s => s.key === key);
    }

    // Walk "next" until you find a required step (or end)
    private static getNextRequiredStepKey(
        agreement: IRiskAgreementItem,
        startKey: WorkflowStepKey
    ): WorkflowStepKey | undefined {

        let current = this.getStep(startKey);

        // If model is misconfigured, bail safely
        const guardMax = 20;
        let guard = 0;

        while (current?.next && guard < guardMax) {
            guard++;

            const nextKey = current.next;
            const nextStep = this.getStep(nextKey);
            if (!nextStep) return undefined;

            if (nextStep.isRequired(agreement)) return nextKey;

            // skip not-required and keep walking
            current = nextStep;
        }

        return undefined;
    }

    private static getApproverForStep(run: IWorkflowRunItem, stepKey: WorkflowStepKey): IPeoplePicker | undefined {
        const step = this.getStep(stepKey);
        return step?.getApprover ? step.getApprover(run) : undefined;
    }

    static async applyDecision(
        agreement: IRiskAgreementItem,
        run: IWorkflowRunItem,
        decision: ActionDecision
    ): Promise<IRunDecisionResult> {

        const nowIso = new Date().toISOString();

        if (decision === "Rejected") {
            // complete run as rejected
            await Web()
                .Lists(Strings.Sites.main.lists.WorkflowRuns)
                .Items()
                .getById(run.Id)
                .update({
                    __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.WorkflowRuns)}ListItem` },

                    runStatus: "Completed",
                    outcome: "Rejected",
                    completed: nowIso,
                    hasDecision: true,

                    pendingRole: null,
                    pendingApproverId: null,
                    pendingApproverEmail: null,
                    stepAssignedDate: null
                })
                .executeAndWait();

            return { completed: true, nowIso };
        }

        // Approved: move to next required step, or complete run approved
        const nextKey = this.getNextRequiredStepKey(agreement, run.currentStepKey);

        if (!nextKey) {
            await Web()
                .Lists(Strings.Sites.main.lists.WorkflowRuns)
                .Items()
                .getById(run.Id)
                .update({
                    __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.WorkflowRuns)}ListItem` },

                    runStatus: "Completed",
                    outcome: "Approved",
                    completed: nowIso,

                    pendingRole: null,
                    pendingApproverId: null,
                    pendingApproverEmail: null,
                    stepAssignedDate: null
                })
                .executeAndWait();

            return { completed: true, nowIso };
        }

        const nextStep = this.getStep(nextKey);
        const approver = this.getApproverForStep(run, nextKey);

        await Web()
            .Lists(Strings.Sites.main.lists.WorkflowRuns)
            .Items()
            .getById(run.Id)
            .update({
                __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.WorkflowRuns)}ListItem` },

                runStatus: "Active",
                currentStepKey: nextKey,

                pendingRole: nextStep?.label ?? null,
                pendingApproverId: approver?.Id ?? null,
                pendingApproverEmail: approver?.EMail ?? null,
                stepAssignedDate: nowIso
            })
            .executeAndWait();

        return {
            completed: false,
            nextStepKey: nextKey,
            pendingRole: nextStep?.label,
            pendingApproverId: approver?.Id,
            pendingApproverEmail: approver?.EMail,
            nowIso
        };
    }

    static supercedeOldRun(runId: number, restartReason?: RunRestartReason, restartComment?: string): Promise<void> {

        const today = new Date().toISOString();

        return new Promise<void>((resolve, reject) => {

            Web()
                .Lists(Strings.Sites.main.lists.WorkflowRuns)
                .Items()
                .getById(runId)
                .update({
                    __metadata: { type: `SP.Data.${encodeListName(Strings.Sites.main.lists.WorkflowRuns)}ListItem` },
                    runStatus: "Superseded",
                    completed: today,
                    restartReason,
                    restartComment
                })
                .execute(
                    () => resolve(),
                    (error) => reject(new Error(`Error superceding prior Run: ${formatError(error)}`))
                );
        });
    }
}