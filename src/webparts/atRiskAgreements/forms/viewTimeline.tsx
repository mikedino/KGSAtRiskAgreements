import * as React from "react";
import {
    Card, CardContent, Stepper, StepLabel, Step, Typography, Chip,
    Box, Divider, Stack, Button, ChipProps, IconButton, Popper, Paper, ClickAwayListener
} from "@mui/material";
import { CheckCircle, Cancel, Check, Schedule, RadioButtonUnchecked, RemoveCircleOutline } from "@mui/icons-material";
import MessageOutlinedIcon from "@mui/icons-material/MessageOutlined";
import { WorkflowStepWithStatus } from "../services/workflowState";
import { WorkflowStepStatus } from "../services/workflowState";
import dayjs from "dayjs";

const WorkflowTimeline = ({
    steps,
    canApprove,
    onApprove,
    onReject
}: {
    steps: WorkflowStepWithStatus[];
    canApprove: boolean;
    onApprove: () => Promise<void>;
    onReject: () => Promise<void>;
}): JSX.Element => {

    // for comment popper
    const [commentAnchorEl, setCommentAnchorEl] = React.useState<HTMLElement | null>(null);
    const [openCommentKey, setOpenCommentKey] = React.useState<string | null>(null);

    const activeStep = steps.findIndex(s => s.status === "Current");
    const activeStepObj = activeStep >= 0 ? steps[activeStep] : undefined;

    const showActions =
        canApprove &&
        activeStepObj &&
        !activeStepObj.isInitial &&
        activeStepObj.status === "Current";

    const handleCommentOpen = (stepKey: string, el: HTMLElement): void => {
        // toggle if clicking same icon
        setOpenCommentKey((prev) => (prev === stepKey ? null : stepKey));
        setCommentAnchorEl((prev) => (openCommentKey === stepKey ? null : el));
    };

    const handleCommentClose = (): void => {
        setOpenCommentKey(null);
        setCommentAnchorEl(null);
    };

    const open = Boolean(openCommentKey) && Boolean(commentAnchorEl);
    const activeComment = steps.find(s => s.key === openCommentKey)?.comment?.trim();

    // escape on keyboard closes the popper
    React.useEffect((): (() => void) => {
        const onKeyDown = (e: KeyboardEvent): void => {
            if (e.key === "Escape") {
                handleCommentClose();
            }
        };

        window.addEventListener("keydown", onKeyDown);

        return (): void => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, []);

    const WorkflowStepIcon = ({ status }: { status: WorkflowStepStatus }): JSX.Element | null => {
        switch (status) {
            case "Approved":
            case "Submitted":
                return <CheckCircle color="success" />;
            case "Rejected":
                return <Cancel color="error" />;
            case "Current":
                return <Schedule color="warning" />;
            case "Queued":
                return <RadioButtonUnchecked color="disabled" />;
            case "Skipped":
                return <RemoveCircleOutline color="disabled" />;
            default:
                return null;
        }
    };

    const getStatusChipProps = (status: WorkflowStepStatus): Pick<ChipProps, "label" | "color" | "variant"> => {
        switch (status) {
            case "Submitted":
                return { label: "Submitted", color: "success", variant: "filled" };
            case "Approved":
                return { label: "Approved", color: "success", variant: "filled" };
            case "Rejected":
                return { label: "Rejected", color: "error", variant: "filled" };
            case "Current":
                return { label: "Pending", color: "warning", variant: "filled" };
            case "Queued":
                return { label: "Queued", color: "default", variant: "outlined" };
            case "Skipped":
                return { label: "Skipped", color: "default", variant: "outlined" };
        }
    };

    const formatDate = (date?: string): string | undefined =>
        date ? dayjs(date).format("MMM D, YYYY h:mm A") : undefined;

    return (
        <Card variant="outlined">
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Approval Workflow
                </Typography>

                <Stepper orientation="vertical" activeStep={activeStep}>
                    {steps.map(step => (
                        <Step
                            key={step.key}
                            completed={step.status === "Approved"}
                            expanded
                        >
                            <StepLabel icon={<WorkflowStepIcon status={step.status} />} >
                                <Stack spacing={0.25}>
                                    {/* Top row: label + comment + status */}
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                                            <Typography fontWeight={500} noWrap>
                                                {step.label}
                                            </Typography>

                                            {!!step.comment?.trim() && (
                                                <IconButton
                                                    size="small"
                                                    aria-label="View comment"
                                                    onClick={(e) => handleCommentOpen(String(step.key), e.currentTarget)}
                                                >
                                                    <MessageOutlinedIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                        </Stack>

                                        <Chip size="small" {...getStatusChipProps(step.status)} />
                                    </Stack>

                                    {/* Approver name */}
                                    {step.approverName && (
                                        <Typography variant="body2" color="text.secondary">
                                            {step.approverName}
                                        </Typography>
                                    )}

                                    {/* Date */}
                                    {step.date && (
                                        <Typography variant="caption" color="text.secondary">
                                            {formatDate(step.date)}
                                        </Typography>
                                    )}
                                </Stack>
                            </StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <Popper
                    open={open}
                    anchorEl={commentAnchorEl}
                    placement="right-start"
                    modifiers={[
                        { name: "offset", options: { offset: [0, 8] } }
                    ]}
                >
                    <ClickAwayListener onClickAway={handleCommentClose}>
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                maxWidth: 350,
                                minWidth: 150,
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? theme.palette.grey[900]
                                        : theme.palette.grey[50],
                                boxShadow: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "0px 6px 18px rgba(0,0,0,0.6)"
                                        : theme.shadows[4],
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Comment
                            </Typography>

                            <Typography variant="caption" sx={{ whiteSpace: "pre-wrap", lineHeight: 1 }}>
                                {activeComment || "No comment."}
                            </Typography>
                        </Paper>
                    </ClickAwayListener>
                </Popper>

                {showActions && (
                    <Box sx={{ mt: 3 }}>
                        <Divider sx={{ mb: 2 }} />
                        <Stack direction="row" spacing={2}>
                            <Button variant="contained" color="success" fullWidth startIcon={<Check />} onClick={onApprove}>
                                Approve
                            </Button>
                            <Button variant="outlined" color="error" fullWidth startIcon={<Cancel />} onClick={onReject}>
                                Reject
                            </Button>
                        </Stack>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default WorkflowTimeline;