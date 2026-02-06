import * as React from "react";
import { useState, useEffect } from "react";
import { IRiskAgreementItem, IAttachmentInfo } from "../data/props";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Stack, TextField, Typography } from "@mui/material";
import Edit from "@mui/icons-material/Edit";
import AgreementInfoCard from "./viewInfoCard";
import WorkflowTimeline from "./viewTimeline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
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
    const history = useHistory();

    const {
        runByAgreementId,
        //runsByAgreementId, // WILL USE AT SOME POINT
        actionsByAgreementId,
        loadAgreementDetail,
        isAgreementDetailLoading
    } = useAgreements();

    React.useEffect(() => {
        loadAgreementDetail(item.Id).catch(e => console.error("loadAgreementDetail error", e));
    }, [item.Id, loadAgreementDetail]);

    const run = runByAgreementId.get(item.Id); // current run pointer (boot)
    //const allRuns = runsByAgreementId.get(item.Id) ?? [];
    const allActions = actionsByAgreementId.get(item.Id) ?? [];
    const detailLoading = isAgreementDetailLoading(item.Id);

    // actions for CURRENT run (timeline needs this)
    const currentRunActions = React.useMemo(() => {
        if (!run) return [];
        return allActions.filter(a => (a.run?.Id ?? a.run.Id) === run.Id);
    }, [allActions, run]);

    const workflowSteps = run ? buildWorkflowState(item, run, currentRunActions) : [];

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

                        {/* optional: show run number */}
                        {run && (
                            <Chip label={`Run ${run.runNumber}`} size="small" variant="outlined" />
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
                    {run ? (
                        detailLoading ? (
                            <Typography variant="body2" color="text.secondary">
                                Loading workflow history…
                            </Typography>
                        ) : (
                            <WorkflowTimeline
                                steps={workflowSteps}
                                canApprove={!!canApprove}
                                onApprove={handleApprove}
                                onReject={handleReject}
                            />
                        )
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            This agreement has not been submitted yet.
                        </Typography>
                    )}
                </Grid>

            </Grid>

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
        </Box>
    );
};

export default RiskAgreementView;