import * as React from "react";
import {
    Card, CardContent, Stepper, StepLabel, Step, Typography, Chip,
    Box, Divider, Stack, Button, ChipProps
} from "@mui/material";
import { CheckCircle, Cancel, Check, Schedule, RadioButtonUnchecked, RemoveCircleOutline } from "@mui/icons-material";
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

    const activeStep = steps.findIndex(s => s.status === "Current");

    const activeStepObj = activeStep >= 0 ? steps[activeStep] : undefined;

    const showActions =
        canApprove &&
        activeStepObj &&
        !activeStepObj.isInitial &&
        activeStepObj.status === "Current";

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
                                    {/* Top row: label + status */}
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography fontWeight={500}>{step.label}</Typography>
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