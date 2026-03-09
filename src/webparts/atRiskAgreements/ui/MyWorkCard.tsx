import * as React from "react";
import { Card, CardContent, Typography, Chip, Stack, Grid, Divider, Box } from "@mui/material";
import { IRiskAgreementItem } from "../data/props";
import { AgreementWorkflowSummary } from "../components/MyWork";
import { formatSinceDate, formatCurrency, formatDate } from "../services/utils";

interface MyWorkCardProps {
    item: IRiskAgreementItem;
    workflow: AgreementWorkflowSummary;
    onClick: () => void;
    variant: "full" | "compact";
}

const MyWorkCard: React.FC<MyWorkCardProps> = ({ item, workflow, onClick, variant }) => {

    const isResolved = item.araStatus === "Resolved";
    const chipLabel = isResolved ? "Resolved" : workflow.statusLabel;

    const chipColor: "success" | "warning" | "error" | "default" =
        isResolved ? "success" : workflow.statusColor;

    if (variant === "compact") {
        return (
            <Card
                onClick={onClick}
                sx={{
                    p: 1,
                    borderRadius: 2,
                    cursor: "pointer"
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Stack sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                            {item.projectName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                            {item.Title}
                        </Typography>
                    </Stack>

                    <Chip
                        size="small"
                        label={workflow.statusLabel}
                        color={workflow.statusColor}
                        sx={{ flexShrink: 0 }}
                    />

                    <Stack alignItems="flex-end" sx={{ flexShrink: 0 }}>
                        <Typography variant="caption" color="text.secondary" noWrap>
                            {item.entity}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                            Risk End: {formatDate(item.riskEnd)}
                        </Typography>
                    </Stack>
                </Stack>
            </Card>
        );
    }

    return (
        <Card
            onClick={onClick}
            sx={{
                p: 1.5,
                height: "100%",
                borderRadius: 3,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                cursor: "pointer"
            }}
        >
            <CardContent>
                <Stack spacing={1.5}>

                    {/* Header */}
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        {/* Left side: title info */}
                        <Stack>
                            <Typography variant="h6" fontWeight={600}>
                                {item.projectName}
                            </Typography>

                            <Typography variant="body2" color="text.secondary">
                                {item.Title}
                            </Typography>
                        </Stack>

                        {/* Right side: chip + metadata */}
                        <Stack alignItems="flex-end" spacing={0.25}>
                            <Chip
                                size="small"
                                label={chipLabel}
                                color={chipColor}
                            />

                            <Stack alignItems="flex-end">
                                {!isResolved && workflow.currentApprover && (
                                    <Typography variant="caption" color="text.secondary">
                                        with {workflow.currentApprover}
                                    </Typography>
                                )}

                                {isResolved && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                                        Risk resolved
                                    </Typography>
                                )}

                                {workflow.sentDate && (
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ fontStyle: "italic" }}
                                    >
                                        since {formatSinceDate(workflow.sentDate)}
                                    </Typography>
                                )}
                            </Stack>

                        </Stack>
                    </Stack>

                    {/* My Decision Highlight */}
                    {workflow.myDecision && (
                        <Box
                            sx={{
                                px: 1,
                                py: 0.75,
                                borderRadius: 1.5,
                                backgroundColor: "action.hover",
                                display: "flex",
                                gap: 0.5,
                                borderLeft: "3px solid",
                                borderLeftColor:
                                    workflow.myDecision === "Rejected"
                                        ? "error.main"
                                        : "success.main"
                            }}
                        >
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>Decision: </Typography>

                            <Typography variant="caption">
                                You{" "}
                                <Box component="span" sx={{ fontWeight: 600 }}>{workflow.myDecision.toLowerCase()}</Box>
                                {workflow.myDecisionLabel && ` as ${workflow.myDecisionLabel}`}
                                {workflow.myDecisionDate && ` on ${formatSinceDate(workflow.myDecisionDate)}`}
                            </Typography>
                        </Box>
                    )}

                    <Divider />

                    {/* Key Details */}
                    <Grid container spacing={1}>
                        <Grid size={6}>
                            <Typography variant="caption" color="text.secondary">
                                {item.invoice ? "Invoice" : "Program Name"}
                            </Typography>
                            <Typography variant="body2">
                                {item.invoice || item.programName}
                            </Typography>
                        </Grid>

                        <Grid size={6}>
                            <Typography variant="caption" color="text.secondary">
                                Entity
                            </Typography>
                            <Typography variant="body2">
                                {item.entity}
                            </Typography>
                        </Grid>

                        <Grid size={6}>
                            <Typography variant="caption" color="text.secondary">
                                Risk Funding Requested
                            </Typography>
                            <Typography variant="body2">
                                {formatCurrency(item.riskFundingRequested)}
                            </Typography>
                        </Grid>

                        <Grid size={6}>
                            <Typography variant="caption" color="text.secondary">
                                Contract Type
                            </Typography>
                            <Typography variant="body2">
                                {item.contractType}
                            </Typography>
                        </Grid>
                    </Grid>

                    <Divider />

                    {/* Dates */}
                    <Grid container spacing={1}>
                        <Grid size={6}>
                            <Typography variant="caption" color="text.secondary">
                                Risk Start
                            </Typography>
                            <Typography variant="body2">
                                {formatDate(item.riskStart)}
                            </Typography>
                        </Grid>

                        <Grid size={6}>
                            <Typography variant="caption" color="text.secondary">
                                Risk End
                            </Typography>
                            <Typography variant="body2">
                                {formatDate(item.riskEnd)}
                            </Typography>
                        </Grid>
                    </Grid>

                    <Divider />

                    {/* Meta */}
                    <Grid container spacing={1}>
                        <Grid size={6}>
                            <Typography variant="caption" color="text.secondary">
                                Submitted By
                            </Typography>
                            <Typography variant="body2">
                                {item.Author?.Title}
                            </Typography>
                        </Grid>

                        <Grid size={6}>
                            <Typography variant="caption" color="text.secondary">
                                Submitted On
                            </Typography>
                            <Typography variant="body2">
                                {formatDate(item.Created)}
                            </Typography>
                        </Grid>
                    </Grid>

                </Stack>
            </CardContent>
        </Card >
    );
};

export default MyWorkCard;