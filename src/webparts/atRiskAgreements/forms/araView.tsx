import * as React from "react";
import dayjs from "dayjs";
import { useState, useEffect } from "react";
import { IRiskAgreementItem, IAttachmentInfo, IWorkflowActionItem, IWorkflowRunItem } from "../data/props";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, Grid, Stack, TextField, Typography } from "@mui/material";
import Edit from "@mui/icons-material/Edit";
import AgreementInfoCard from "./viewInfoCard";
import WorkflowTimeline from "./viewTimeline";
import { ArrowBack, ExpandMore, Backspace, AssignmentTurnedInOutlined } from "@mui/icons-material";
import { useHistory } from "react-router-dom";
import { buildWorkflowState } from "../services/workflowState";
import { ContextInfo, Web } from "gd-sprest";
import Strings from "../../../strings";
import { useAgreements } from "../services/agreementsContext";
import { DataSource } from "../data/ds";
import { AgreementDelta } from "../services/agreementDiff";
import { useTheme } from "@mui/material/styles";

interface RiskAgreementViewProps {
    item: IRiskAgreementItem;
    currentUserEmail: string;
    onApprove: (comment?: string) => Promise<void>;
    onReject: (comment?: string) => Promise<void>;
    onCancel: (comment?: string) => Promise<void>;
    onResolve: (comment?: string) => Promise<void>;
    onRevert: (comment?: string) => Promise<void>;
}

type ActionModalType = "approve" | "reject" | "cancel" | "resolve" | "revert";

// dynamic re-usable modal dialog settings
const ACTION_UI: Record<ActionModalType, {
    title: string;
    cta: string;
    ctaColor: "primary" | "error";
    commentLabel: string;
    warning?: string;
    requiresComment?: boolean;
}> = {
    approve: {
        title: "Approve Agreement",
        cta: "Approve",
        ctaColor: "primary",
        commentLabel: "Comment (optional)",
    },
    reject: {
        title: "Reject Agreement",
        cta: "Reject",
        ctaColor: "error",
        commentLabel: "Comment (required)",
        requiresComment: true
    },
    resolve: {
        title: "Resolve Agreement",
        cta: "Resolve",
        ctaColor: "primary",
        commentLabel: "Comment (optional)",
        warning:
            "You are about to mark this At-Risk Agreement as resolved. After marking resolved, this agreement will not be editable and will serve as the final record.",
    },
    revert: {
        title: "Revert Agreement",
        cta: "Revert",
        ctaColor: "error",
        commentLabel: "Comment (required)",
        warning:
            "You are about to revert this At-Risk Agreement. After reverting, the current run of approvals will be canceled and the status of this At-Risk Agreement will return to the 'Approved' status of the previous run.",
        requiresComment: true
    },
    cancel: {
        title: "Cancel Agreement",
        cta: "Yes, cancel",
        ctaColor: "error",
        commentLabel: "Cancellation reason (required)",
        warning:
            "Canceling this agreement cannot be undone. The agreement cannot be re-opened or re-used once canceled.",
        requiresComment: true
    },
};

const RiskAgreementView: React.FC<RiskAgreementViewProps> = ({ item, currentUserEmail, onApprove, onReject, onCancel, onResolve, onRevert }) => {

    const theme = useTheme();
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [comment, setComment] = useState("");
    const [actionType, setActionType] = React.useState<ActionModalType | null>(null);
    const [loading, setLoading] = useState(false);
    const [attachments, setAttachments] = useState<IAttachmentInfo[]>([]);
    const [attachmentsLoading, setAttachmentsLoading] = useState(false);
    const [editConfirmOpen, setEditConfirmOpen] = useState(false);
    // changes state for chip drawer
    const [changesSummaryOpen, setChangeSummaryOpen] = React.useState<boolean>(false);
    // change chip for timeline
    const [runChangesOpen, setRunChangesOpen] = React.useState<boolean>(false);
    const [runChangesRunId, setRunChangesRunId] = React.useState<number | undefined>(undefined);
    // timeline accordion expanded
    const [expandedRunId, setExpandedRunId] = React.useState<number | false>(false);
    const history = useHistory();

    // set the modal dialog action type, comment reqd, and UI render
    const ui = actionType ? ACTION_UI[actionType] : null;
    const isCommentRequired = ui?.requiresComment ?? false;
    const isCommentValid = !isCommentRequired || comment.trim().length > 0;

    // get the page content container to display the DRAWER
    // const spChrome = React.useMemo(
    //     () => document.getElementById("spPageChromeAppDiv"),
    //     []
    // );

    const {
        runByAgreementId,
        runsByAgreementId,
        actionsByAgreementId,
        loadAgreementDetail,
        isAgreementDetailLoading
    } = useAgreements();

    React.useEffect(() => {
        loadAgreementDetail(item.Id).catch(e => console.error("loadAgreementDetail error", e));
    }, [item.Id, loadAgreementDetail]);

    const run = runByAgreementId.get(item.Id); // current run pointer (boot)
    const allRuns = runsByAgreementId.get(item.Id) ?? [];
    const allActions = actionsByAgreementId.get(item.Id) ?? [];
    const detailLoading = isAgreementDetailLoading(item.Id);

    // expand current run on load by default
    React.useEffect(() => {
        if (run?.Id) setExpandedRunId(run.Id);
    }, [run?.Id]);

    const openChangeSummary = (): void => setChangeSummaryOpen(true);

    const openRunChanges = (runId: number): void => {
        setRunChangesRunId(runId);
        setRunChangesOpen(true);
    };

    const handleRunChangesClose = (): void => setRunChangesOpen(false);

    // build a map for actions by run since we have them all 
    const actionsByRunId = React.useMemo(() => {
        const map = new Map<number, IWorkflowActionItem[]>();

        for (const a of allActions) {
            const runId = a.run?.Id ?? a.run.Id;
            if (typeof runId !== "number") continue;

            const bucket = map.get(runId) ?? [];
            bucket.push(a);
            map.set(runId, bucket);
        }

        // sort newest -> oldest for each run
        map.forEach((bucket, key) => {
            bucket.sort((x, y) =>
                new Date(y.actionCompletedDate).getTime() - new Date(x.actionCompletedDate).getTime()
            );
            map.set(key, bucket);
        });

        return map;
    }, [allActions]);


    // build steps per run
    const stepsByRunId = React.useMemo(() => {
        const map = new Map<number, ReturnType<typeof buildWorkflowState>>();

        for (const r of allRuns) {
            const runActions = actionsByRunId.get(r.Id) ?? [];
            map.set(r.Id, buildWorkflowState(item, r, runActions));
        }

        return map;
    }, [allRuns, actionsByRunId, item]);


    // actions for CURRENT run (timeline needs this)
    const currentRunActions = React.useMemo(() => {
        if (!run) return [];
        return allActions.filter(a => (a.run?.Id ?? a.run.Id) === run.Id);
    }, [allActions, run]);

    const workflowSteps = run ? buildWorkflowState(item, run, currentRunActions) : [];


    // find the modified action to get the "Change Summary"
    const modifiedActionForRun = React.useCallback((runId: number): IWorkflowActionItem | undefined => {
        const runActions = actionsByRunId.get(runId) ?? [];
        return (
            runActions.find(a => a.actionType === "Modified" && a.stepKey === "submit") ??
            runActions.find(a => a.actionType === "Modified")
        );
    }, [actionsByRunId]);


    // build change history array to display in big change summary
    const changeHistory = React.useMemo(() => {
        const runsById = new Map<number, IWorkflowRunItem>();
        allRuns.forEach(r => runsById.set(r.Id, r));

        return allActions
            .filter(a => a.actionType === "Modified")
            .map(a => {
                const runId = a.run?.Id ?? a.run.Id;
                const runNo = runId ? runsById.get(runId)?.runNumber : undefined;
                return { action: a, runId, runNo };
            })
            .sort((x, y) =>
                new Date(y.action.actionCompletedDate).getTime() -
                new Date(x.action.actionCompletedDate).getTime()
            );
    }, [allActions, allRuns]);

    const runChangesAction = React.useMemo(() => {
        if (!runChangesRunId) return undefined;
        return modifiedActionForRun(runChangesRunId);
    }, [runChangesRunId, modifiedActionForRun]);

    const runChangesRunNumber = React.useMemo(() => {
        if (!runChangesRunId) return undefined;
        return allRuns.find(r => r.Id === runChangesRunId)?.runNumber;
    }, [runChangesRunId, allRuns]);

    const runChangesWho = runChangesAction?.actor?.Title ?? "Unknown";
    const runChangesWhen = runChangesAction?.actionCompletedDate
        ? dayjs(runChangesAction.actionCompletedDate).format("MMM D, YYYY h:mm A")
        : undefined;

    const runChangesDelta = runChangesAction?.changePayloadJson
        ? JSON.parse(runChangesAction.changePayloadJson) as AgreementDelta
        : undefined;

    // attachments
    useEffect(() => {
        if (!item.Attachments) return;

        const load = async (): Promise<void> => {
            setAttachmentsLoading(true);

            const files = await Web()
                .Lists(Strings.Sites.main.lists.Agreements)
                .Items()
                .getById(item.Id)
                .AttachmentFiles()
                .executeAndWait();

            setAttachments(files.results ?? []);
            setAttachmentsLoading(false);
        };

        load().catch((error: unknown) => {
            console.error("Failed to load attachments", error);
            setAttachmentsLoading(false);
        });
    }, [item.Id, item.Attachments]);

    // helper to see if anyone has reviewed yet
    const hasAnyDecision = React.useMemo(() => {
        return workflowSteps.some(
            (step) => step.status === "Approved" || step.status === "Rejected"
        );
    }, [workflowSteps]);

    const handleEditClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
        if (hasAnyDecision) {
            e.preventDefault(); // stop navigation
            setEditConfirmOpen(true);
            return;
        }

        history.push(`/edit/${item.Id}`);
    };

    const handleEditCancel = (): void => setEditConfirmOpen(false);

    const handleEditConfirm = (): void => {
        setEditConfirmOpen(false);
        history.push(`/edit/${item.Id}`);
    };

    const isElevated = DataSource.isAdmin || DataSource.isCM;
    const isSubmitter = (item.Author.Id === ContextInfo.userId) || (item.backupRequestor.Id === ContextInfo.userId);
    const isActive = !!run && run.runStatus === "Active";
    const isFinalStatus = item.araStatus === "Resolved" || item.araStatus === "Canceled";

    const canApprove = isActive && (run.pendingApproverId === ContextInfo.userId || isElevated);
    const canCancel = !isFinalStatus && (isSubmitter || isElevated);
    const canEdit = !isFinalStatus && (isSubmitter || isElevated);
    const canResolve = !!run && run.runStatus === "Completed" && item.araStatus === "Approved" && isElevated;
    const canRevert = isActive && run.runNumber > 1 && (isSubmitter || isElevated);

    const openCommentModal = (type: ActionModalType): void => {
        setActionType(type);
        setComment("");
        setCommentModalOpen(true);
    };

    const handleModalCancel = (): void => {
        setCommentModalOpen(false);
        setActionType(null);
        setComment("");
    };

    // don't allow to close modal while loading (clicking on backdrop, etc.)
    const handleDialogClose = (_: unknown, reason?: string): void => {
        if (loading) return;
        handleModalCancel();
    };

    const handleApprove = async (): Promise<void> => openCommentModal("approve");
    const handleReject = async (): Promise<void> => openCommentModal("reject");
    const handleCancel = async (): Promise<void> => openCommentModal("cancel");
    const handleResolve = async (): Promise<void> => openCommentModal("resolve");
    const handleRevert = async (): Promise<void> => openCommentModal("revert");

    const handleModalSubmit = async (): Promise<void> => {
        if (!actionType) return;

        const type = actionType;
        const text = comment;

        // close the dialog immediately so the App Backdrop is the top layer
        setCommentModalOpen(false);
        setActionType(null);
        setComment("");
        setLoading(true);

        const actionHandlers: Record<ActionModalType, (text: string) => Promise<void>> = {
            approve: onApprove,
            reject: onReject,
            resolve: onResolve,
            revert: onRevert,
            cancel: onCancel,
        };

        try {
            await actionHandlers[type](text);
        } catch (error) {
            console.error("Failed to submit action:", error);

            // Optional: re-open with the previous text so user doesn’t lose it
            setActionType(type);
            setComment(text);
            setCommentModalOpen(true);
        } finally {
            setLoading(false);
        }
    };


    // Chip color based on araStatus (includes Resolved, Mod Review)
    const chipColor: "success" | "warning" | "error" | "default" =
        item.araStatus === "Rejected" || item.araStatus === "Canceled" ? "error" :
            (item.araStatus === "Approved" || item.araStatus === "Resolved") ? "success" :
                item.araStatus === "Draft" ? "default" :
                    "warning"; // Submitted / Under Review / Mod Review


    // helper for superseded/completed date in accordion header (right side)
    const formatWhen = (date?: string): string | undefined =>
        date ? dayjs(date).format("MMM D, YYYY h:mm A") : undefined;

    const getRunStatusDate = (
        run: IWorkflowRunItem,
        actionsForRun: IWorkflowActionItem[]
    ): string | undefined => {

        // use explicit field vals if available
        if (run.runStatus === "Superseded" && run.completed) return run.completed;
        if (run.runStatus === "Completed" && run.completed) return run.completed;

        // Otherwise fall back to the newest action in the run
        const lastAction = actionsForRun?.[0];
        return lastAction?.actionCompletedDate;
    };

    // build run status label on accordion
    const getRunStatusLabel = (
        run: IWorkflowRunItem,
        actionsForRun: IWorkflowActionItem[]
    ): string | undefined => {

        const when = formatWhen(getRunStatusDate(run, actionsForRun));
        if (!when) return undefined;

        switch (run.runStatus) {
            case "Superseded":
                return `Superseded ${when}`;
            case "Completed":
                return `Completed ${when}`;
            case "Active":
                return `Started ${when}`;
            default:
                return when;
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ mb: 3 }}>
                <Button
                    startIcon={<ArrowBack />}
                    color="primary"
                    variant="text"
                    onClick={() => history.goBack()}
                    sx={{ mb: 2 }}
                >
                    Back
                </Button>

                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography variant="h4">{item.Title}</Typography>

                        <Chip
                            label={item.araStatus}
                            color={chipColor}
                            size="small"
                        />

                        {changeHistory.length > 0 && (
                            <Chip
                                label={`Change History (${changeHistory.length})`}
                                size="small"
                                color="info"
                                variant="filled"
                                onClick={openChangeSummary}
                                sx={{ cursor: "pointer" }}
                            />
                        )}
                    </Stack>

                    <Stack direction="row" spacing={2}>
                        {canCancel && (
                            <Button
                                title="Permanently Cancel this Agreement"
                                variant="outlined"
                                startIcon={<Backspace />}
                                color="error"
                                onClick={handleCancel}
                            >
                                Cancel Agreement
                            </Button>
                        )}
                        {canResolve && (
                            <Button
                                title="Permanently Resolve this Agreement"
                                variant="contained"
                                startIcon={<AssignmentTurnedInOutlined />}
                                color="success"
                                onClick={handleResolve}
                            >
                                Resolve Agreement
                            </Button>
                        )}
                        {canEdit && (
                            <Button
                                title="Edit this Agreement"
                                startIcon={<Edit />}
                                variant="contained"
                                color="primary"
                                onClick={handleEditClick}
                            >
                                Edit
                            </Button>
                        )}
                    </Stack>
                </Stack>
            </Box>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, lg: 6 }}>
                    <AgreementInfoCard item={item} attachments={attachments} attachmentsLoading={attachmentsLoading} />
                </Grid>

                <Grid size={{ xs: 12, lg: 6 }}>
                    {!run ? (
                        <Typography variant="body2" color="text.secondary">
                            This agreement has not been submitted yet.
                        </Typography>
                    ) : detailLoading ? (
                        <Typography variant="body2" color="text.secondary">
                            Loading workflow history…
                        </Typography>
                    ) : (
                        <Stack spacing={1}>
                            {/* Action Required banner */}
                            {(run.currentStepKey === "submitter" && run.runStatus === "Active") && (
                                <Alert
                                    severity="warning"
                                    variant="outlined"
                                    sx={{ borderRadius: 2 }}
                                >
                                    <Typography fontWeight={700} component="span">
                                        Action required:
                                    </Typography>{" "}
                                    This agreement was rejected and is waiting on the submitter to{" "}
                                    <b>Modify &amp; Resubmit</b> or <b>Cancel</b>.
                                </Alert>
                            )}
                            <Stack spacing={0.5}>
                                {allRuns
                                    .slice()
                                    .sort((a, b) => (a.runNumber ?? 0) - (b.runNumber ?? 0))
                                    .map(r => {
                                        const steps = stepsByRunId.get(r.Id) ?? [];
                                        const isCurrent = r.Id === run.Id;

                                        const hasChanges = !!modifiedActionForRun(r.Id)?.changeSummary;

                                        return (
                                            <Accordion
                                                key={r.Id}
                                                expanded={expandedRunId === r.Id}
                                                onChange={(_, expanded) => setExpandedRunId(expanded ? r.Id : false)}
                                                disableGutters
                                                elevation={0}
                                                square
                                                sx={{
                                                    border: "1px solid",
                                                    borderColor: "secondary.light",
                                                    "&:before": { display: "none" }, // removes default divider line
                                                    borderRadius: 1,
                                                    overflow: "hidden"
                                                }}
                                            >
                                                <AccordionSummary
                                                    expandIcon={<ExpandMore />}
                                                    sx={{ minHeight: 40, "& .MuiAccordionSummary-content": { my: 0.5 }, px: 1.25 }}
                                                >
                                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ width: "100%" }}>
                                                        <Typography fontWeight={600}>{`Run ${r.runNumber}`}</Typography>

                                                        <Chip
                                                            size="small"
                                                            label={r.runStatus}
                                                            variant="outlined"
                                                            color={r.runStatus === "Active" ? "info" : "default"}
                                                        />

                                                        <Box sx={{ flexGrow: 1 }} />

                                                        {/* Status date */}
                                                        {(() => {
                                                            const statusLabel = getRunStatusLabel(r, actionsByRunId.get(r.Id) ?? []);
                                                            return statusLabel ? (
                                                                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }} >
                                                                    {statusLabel}
                                                                </Typography>
                                                            ) : null;
                                                        })()}

                                                        {hasChanges && (
                                                            <Chip
                                                                size="small"
                                                                label="Changes"
                                                                color="info"
                                                                variant="filled"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openRunChanges(r.Id);
                                                                }}
                                                                sx={{ cursor: "pointer" }}
                                                            />
                                                        )}
                                                    </Stack>
                                                </AccordionSummary>


                                                <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
                                                    <WorkflowTimeline
                                                        steps={steps}
                                                        canApprove={isCurrent && canApprove}
                                                        onApprove={handleApprove}
                                                        onReject={handleReject}
                                                        canCancel={canCancel}
                                                        onCancel={handleCancel}
                                                        canRevert={canRevert}
                                                        onRevert={handleRevert}
                                                    />
                                                </AccordionDetails>
                                            </Accordion>
                                        );
                                    })}
                            </Stack>
                        </Stack>
                    )}
                </Grid>


            </Grid>

            <Divider sx={{ my: 2 }} />

            <Drawer
                anchor="right"
                open={changesSummaryOpen}
                onClose={() => setChangeSummaryOpen(false)}
                sx={{
                    "& .MuiDrawer-paper": {
                        top: `48px`,
                        height: `calc(100% - 48px)` //fit under SP Suite Nav Header
                    }
                }}
            >
                <Box sx={{ width: 520, p: 3 }}>
                    <Typography variant="h6">Change History</Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {`All recorded modifications (${changeHistory.length})`}
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Stack spacing={1.5}>
                        {changeHistory.map(({ action, runId, runNo }) => {
                            const when = formatWhen(action.actionCompletedDate);
                            const who = action.actor?.Title ?? "Unknown";
                            //const summary = action.changeSummary?.trim();
                            const summary = action.changePayloadJson
                                ? JSON.parse(action.changePayloadJson) as AgreementDelta
                                : undefined;

                            // show status for that run
                            const runStatus = typeof runId === "number"
                                ? allRuns.find(r => r.Id === runId)?.runStatus
                                : undefined;

                            return (
                                <Box
                                    key={action.Id}
                                    sx={{
                                        border: "1px solid",
                                        borderColor: theme.custom?.cardBorder,
                                        backgroundColor: theme.custom?.cardBg,
                                        borderRadius: 2,
                                        p: 1.75
                                    }}
                                >
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                                                <Typography variant="subtitle2" noWrap>
                                                    {runNo ? `Run ${runNo}` : "Run"}
                                                    {when ? ` • ${when}` : ""}
                                                </Typography>

                                                {runStatus && (
                                                    <Chip
                                                        size="small"
                                                        label={runStatus}
                                                        variant="outlined"
                                                        sx={{ height: 20 }}
                                                    />
                                                )}
                                            </Stack>

                                            <Typography variant="body2" color="text.secondary">
                                                {`By ${who}`}
                                            </Typography>
                                        </Box>

                                        {typeof runId === "number" && (
                                            <Button
                                                size="small"
                                                onClick={() => {
                                                    setChangeSummaryOpen(false); // close drawer
                                                    openRunChanges(runId);       // open per-run dialog
                                                }}
                                                sx={{ textTransform: "none", flexShrink: 0 }}
                                            >
                                                View
                                            </Button>
                                        )}
                                    </Stack>

                                    <Divider sx={{ my: 1.25 }} />

                                    {summary ? (
                                        <Stack spacing={1}>
                                            {Object.values(summary).map((d, i) => (
                                                <Box key={i}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {d.label}
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {d.from || "—"} → {d.to || "—"}
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                                            No change summary provided.
                                        </Typography>
                                    )}
                                </Box>
                            );
                        })}
                    </Stack>

                </Box>
            </Drawer>


            <Dialog open={commentModalOpen} onClose={handleModalCancel} fullWidth maxWidth="md" disableEscapeKeyDown={loading}>
                <DialogTitle>{ui?.title}</DialogTitle>

                <DialogContent sx={{ pt: 2 }}>
                    {ui?.warning && (
                        <Alert severity="warning" variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                            <Typography fontWeight={700} component="span">
                                Permanent action:
                            </Typography>{" "}
                            {ui?.warning}
                        </Alert>
                    )}

                    <TextField
                        label={ui?.commentLabel ?? "Comment"}
                        multiline
                        rows={4}
                        fullWidth
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        autoFocus
                        required={isCommentRequired}
                        error={!isCommentValid}
                        disabled={loading}
                        helperText={
                            !isCommentValid ? "A comment is required for this action." : undefined
                        }
                        sx={{ mt: 1 }}
                    />
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleDialogClose} disabled={loading}>
                        Cancel
                    </Button>

                    <Button variant="contained" onClick={handleModalSubmit} disabled={loading || !isCommentValid} color={ui?.ctaColor ?? "primary"}>
                        {ui?.cta ?? "Submit"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={editConfirmOpen} onClose={handleEditCancel} maxWidth="sm" fullWidth>
                <DialogTitle>Modify Agreement?</DialogTitle>

                <DialogContent>
                    <Typography variant="body1" sx={{ mt: 1 }}>
                        Are you sure you want to modify this Agreement?
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        At least one approver has already made a decision. If you continue, the approval workflow will be restarted.
                    </Typography>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleEditCancel}>
                        Cancel
                    </Button>

                    <Button variant="contained" color="warning" onClick={handleEditConfirm}>
                        Yes, continue
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={runChangesOpen} onClose={handleRunChangesClose} maxWidth="md" fullWidth>
                <DialogTitle>
                    {`Changes${runChangesRunNumber ? ` — Run ${runChangesRunNumber}` : ""}`}
                </DialogTitle>

                <DialogContent sx={{ pt: 2 }}>
                    {!runChangesAction ? (
                        <Typography variant="body2" color="text.secondary">
                            No change summary recorded for this run.
                        </Typography>
                    ) : (
                        <>
                            <Stack spacing={0.5} sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    {runChangesWhen ? `Modified ${runChangesWhen}` : "Modified"}
                                </Typography>

                                <Typography variant="body2" color="text.secondary">
                                    {`By ${runChangesWho}`}
                                </Typography>
                            </Stack>

                            <Divider sx={{ mb: 2 }} />

                            {runChangesDelta ? (
                                <Stack spacing={1}>
                                    {Object.values(runChangesDelta).map((d, i) => (
                                        <Box key={i}>
                                            <Typography variant="subtitle2" fontWeight={600}>
                                                {d.label}
                                            </Typography>
                                            <Typography variant="body2">
                                                {d.from || "—"} → {d.to || "—"}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    No summary recorded.
                                </Typography>
                            )}
                        </>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleRunChangesClose}>Close</Button>

                    <Button
                        variant="contained"
                        color="info"
                        onClick={() => {
                            setRunChangesOpen(false);
                            setChangeSummaryOpen(true);
                        }}
                        sx={{ textTransform: "none" }}
                    >
                        Open full history
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default RiskAgreementView;