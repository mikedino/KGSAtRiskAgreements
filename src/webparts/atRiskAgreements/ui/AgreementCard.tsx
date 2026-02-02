import * as React from "react";
import { Card, CardContent, Typography, Chip, Stack, Grid, Divider, Box } from "@mui/material";
import { IRiskAgreementItem } from "../data/props";
import { AgreementWorkflowSummary } from "../components/MyWork";
import { useTheme } from "@mui/material/styles";
import { formatSinceDate } from "../services/utils";

interface AgreementCardProps {
    item: IRiskAgreementItem;
    workflow: AgreementWorkflowSummary;
    onClick: () => void;
}

const AgreementCard: React.FC<AgreementCardProps> = ({ item, workflow, onClick }) => {

    const theme = useTheme();
    const isResolved = item.araStatus === "Resolved";

    const chipLabel = isResolved ? "Resolved" : workflow.statusLabel;

    const chipColor: "success" | "warning" | "error" | "default" =
        isResolved ? "success" : workflow.statusColor;

    const formatDate = (value?: string): string => value ? new Date(value).toLocaleDateString() : "—"
    const formatCurrency = (value?: number): string => value === null || value === undefined ? "—" : `$${value.toLocaleString()}`;


    return (
        <Card onClick={onClick} sx={{
            p: 1.5,
            height: "100%",
            borderRadius: 3,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: theme.custom?.cardBg,
            border: "1px solid",
            borderColor: theme.custom?.cardBorder,
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

                    {/* FLAG MODIFICATIONS
                    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                        {workflow.isModReview && (
                            <Chip
                                size="small"
                                variant="outlined"
                                label={workflow.runNumber && workflow.runNumber > 1 ? `Mod #${workflow.runNumber - 1}` : "Mod Review"}
                            />
                        )}
                        <Chip size="small" label={workflow.statusLabel} color={workflow.statusColor} />
                    </Stack> */}

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
                                Created By
                            </Typography>
                            <Typography variant="body2">
                                {item.Author?.Title}
                            </Typography>
                        </Grid>

                        <Grid size={6}>
                            <Typography variant="caption" color="text.secondary">
                                Created On
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

export default AgreementCard;