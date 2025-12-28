import * as React from "react";
import { Card, CardContent, Stepper, StepLabel, Step, StepContent, Typography, Chip, Box, Divider, Stack, Button } from "@mui/material";
import { WorkflowStepWithStatus } from "../services/workflowState";

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

    const activeStep = steps.findIndex(s => s.status === "Pending");

    return (
        <Card variant="outlined">
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Approval Workflow
                </Typography>

                <Stepper orientation="vertical" activeStep={activeStep}>
                    {steps.map(step => (
                        <Step key={step.key} completed={step.status === "Approved"}>
                            <StepLabel
                                optional={
                                    step.signDateField && (
                                        <Typography variant="caption">
                                            {step.status !== "Pending" && step.date}
                                        </Typography>
                                    )
                                }
                            >
                                {step.label}
                            </StepLabel>

                            <StepContent>
                                <Chip
                                    size="small"
                                    label={step.status}
                                    color={
                                        step.status === "Approved"
                                            ? "success"
                                            : step.status === "Rejected"
                                                ? "error"
                                                : "warning"
                                    }
                                />
                            </StepContent>
                        </Step>
                    ))}
                </Stepper>

                {canApprove && (
                    <Box sx={{ mt: 3 }}>

                        <Divider sx={{ mb: 2 }} />

                        <Stack direction="row" spacing={2}>
                            <Button variant="contained" color="success" fullWidth onClick={onApprove}>Approve</Button>
                            <Button variant="outlined" color="error" fullWidth onClick={onReject}>Reject</Button>
                        </Stack>

                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default WorkflowTimeline;