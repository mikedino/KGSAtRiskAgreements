import * as React from "react";
import { useState, useEffect } from "react";
import { IRiskAgreementItem, IAttachmentInfo } from "../data/props";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Stack, TextField, Typography } from "@mui/material";
import AgreementInfoCard from "./viewAgreementInfo";
import WorkflowTimeline from "./viewTimeline";
import { buildWorkflowState } from "../services/workflowState";
import { Web } from "gd-sprest";
import Strings from "../../../strings";

interface RiskAgreementViewProps {
    item: IRiskAgreementItem;
    currentUserEmail: string;
    onApprove: (comment?: string) => Promise<void>;
    onReject: (comment?: string) => Promise<void>;
}

const RiskAgreementView: React.FC<RiskAgreementViewProps> = ({
    item,
    currentUserEmail,
    onApprove,
    onReject
}) => {
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [comment, setComment] = useState("");
    const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
    const [loading, setLoading] = useState(false);
    const [attachments, setAttachments] = useState<IAttachmentInfo[]>([]);
    const [attachmentsLoading, setAttachmentsLoading] = useState(true);

    //get item attachments on load
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

    const workflowSteps = buildWorkflowState(item);

    const nextPendingStep = workflowSteps.find(
        s => s.status === "Pending"
    );

    const canApprove =
        nextPendingStep &&
        nextPendingStep.approverField &&
        item[nextPendingStep.approverField]?.EMail === currentUserEmail;

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

    const handleApprove = async (): Promise<void> => {
        openCommentModal("approve");
    };

    const handleReject = async (): Promise<void> => {
        openCommentModal("reject");
    };

    const handleModalSubmit = async (): Promise<void> => {
        if (!actionType) return;

        setLoading(true);

        try {
            if (actionType === "approve") {
                await onApprove(comment);
            } else {
                await onReject(comment);
            }
            setCommentModalOpen(false);
            setActionType(null);
            setComment("");
        } catch (error) {
            console.error("Failed to submit action:", error);
            // optionally show error to user here
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 4 }}>
            <Box sx={{ mb: 3 }}>
                <Stack direction="row" alignItems="center" spacing={2}>

                    <Typography variant="h4">{item.Title}</Typography>

                    <Chip label={item.araStatus}
                        color={
                            item.araStatus === "Approved"
                                ? "success"
                                : item.araStatus === "Rejected"
                                    ? "error"
                                    : "warning"
                        }
                        size="small"
                    />
                </Stack>

                {/* <Typography variant="body2" color="text.secondary">AGR-{item.Id}</Typography> */}
            </Box>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 7 }}>
                    <AgreementInfoCard item={item} attachments={attachments} attachmentsLoading={attachmentsLoading} />
                </Grid>

                <Grid size={{ xs: 12, md: 5 }}>
                    <WorkflowTimeline
                        steps={workflowSteps}
                        canApprove={!!canApprove}
                        onApprove={handleApprove}
                        onReject={handleReject}
                    />
                </Grid>
            </Grid>

            {/* Comment Modal */}
            <Dialog open={commentModalOpen} onClose={handleModalCancel}>
                <DialogTitle>
                    {actionType === "approve" ? "Approve Agreement" : "Reject Agreement"}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        label="Comment (optional)"
                        multiline
                        rows={4}
                        fullWidth
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        autoFocus
                        disabled={loading}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleModalCancel} disabled={loading}>Cancel</Button>
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
        </Box>
    );
};

export default RiskAgreementView;