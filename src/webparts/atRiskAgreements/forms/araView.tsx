import * as React from "react";
import dayjs from "dayjs";
import { useState, useEffect } from "react";
import { IRiskAgreementItem, IAttachmentInfo, IWorkflowActionItem, IWorkflowRunItem } from "../data/props";
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, Grid, Stack, TextField, Typography } from "@mui/material";
import Edit from "@mui/icons-material/Edit";
import AgreementInfoCard from "./viewInfoCard";
import WorkflowTimeline from "./viewTimeline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useHistory } from "react-router-dom";
import { buildWorkflowState } from "../services/workflowState";
import { Web } from "gd-sprest";
import Strings from "../../../strings";
import { useAgreements } from "../services/agreementsContext";
import { ContextInfo } from "gd-sprest";

interface RiskAgreementViewProps {
    item: IRiskAgreementItem;
    currentUserEmail: string;
    onApprove: (comment?: string) => Promise<void>;
    onReject: (comment?: string) => Promise<void>;
}

const RiskAgreementView: React.FC<RiskAgreementViewProps> = ({ item, currentUserEmail, onApprove, onReject }) => {

    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [comment, setComment] = useState("");
    const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
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

    const runChangesSummary = runChangesAction?.changeSummary?.trim();


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

    const canApprove = !!run && run.runStatus === "Active" && run.pendingApproverId === ContextInfo.userId;

    const openCommentModal = (type: "approve" | "reject"): void => {
        setActionType(type);
        setComment("");
        setCommentModalOpen(true);
    };

    const handleModalCancel = (): void => {
        setCommentModalOpen(false);
        setActionType(null);
        setComment("");
    };

    const handleApprove = async (): Promise<void> => openCommentModal("approve");
    const handleReject = async (): Promise<void> => openCommentModal("reject");

    const handleModalSubmit = async (): Promise<void> => {
        if (!actionType) return;

        // close the dialog immediately so the App Backdrop is the top layer
        const type = actionType;
        const text = comment;

        setCommentModalOpen(false);
        setActionType(null);
        setComment("");
        setLoading(true);

        try {
            if (type === "approve") {
                await onApprove(text);
            } else {
                await onReject(text);
            }
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


    // ✅ Chip color based on araStatus (includes Resolved, Mod Review)
    const chipColor: "success" | "warning" | "error" | "default" =
        item.araStatus === "Rejected" ? "error" :
            (item.araStatus === "Approved" || item.araStatus === "Resolved") ? "success" :
                (item.araStatus === "Canceled" || item.araStatus === "Draft") ? "default" :
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
                    startIcon={<ArrowBackIcon />}
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
                        <Button
                            title="Edit this Agreement"
                            startIcon={<Edit />}
                            variant="contained"
                            color="primary"
                            onClick={handleEditClick}
                        >
                            Edit
                        </Button>
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
                                                borderColor: "divider",
                                                "&:before": { display: "none" }, // removes default divider line
                                                borderRadius: 1,
                                                overflow: "hidden"
                                            }}
                                        >
                                            <AccordionSummary
                                                expandIcon={<ExpandMoreIcon />}
                                                sx={{ minHeight: 40, "& .MuiAccordionSummary-content": { my: 0.5 }, px: 1.25 }}
                                            >
                                                <Stack direction="row" alignItems="center" spacing={1} sx={{ width: "100%" }}>
                                                    <Typography fontWeight={600}>{`Run ${r.runNumber}`}</Typography>

                                                    <Chip
                                                        size="small"
                                                        label={r.runStatus}
                                                        variant="outlined"
                                                        color={r.runStatus === "Active" ? "warning" : "default"}
                                                    />

                                                    <Box sx={{ flexGrow: 1 }} />

                                                    {/* ✅ Status date */}
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
                                                />
                                            </AccordionDetails>
                                        </Accordion>
                                    );
                                })}
                        </Stack>
                    )}
                </Grid>


            </Grid>

            <Divider sx={{ my: 2 }} />

            <Drawer anchor="right" open={changesSummaryOpen} onClose={() => setChangeSummaryOpen(false)}>
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
                            const summary = action.changeSummary?.trim();

                            // optional: show status for that run (nice context)
                            const runStatus = typeof runId === "number"
                                ? allRuns.find(r => r.Id === runId)?.runStatus
                                : undefined;

                            return (
                                <Box
                                    key={action.Id}
                                    sx={{
                                        border: "1px solid",
                                        borderColor: "divider",
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
                                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                                            {summary}
                                        </Typography>
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
                <DialogTitle>{actionType === "approve" ? "Approve Agreement" : "Reject Agreement"}</DialogTitle>

                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        label="Comment (optional)"
                        multiline
                        rows={4}
                        fullWidth
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        autoFocus
                        disabled={loading}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleModalCancel} disabled={loading}>
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleModalSubmit}
                        disabled={loading}
                        color={actionType === "approve" ? "primary" : "error"}
                    >
                        {actionType === "approve" ? "Approve" : "Reject"}
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

                            {runChangesSummary ? (
                                <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>{runChangesSummary}</Typography>
                            ) : (
                                <Typography variant="body2" color="text.secondary">No summary recorded.</Typography>
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