import * as React from "react";
import { Grid, Box, Link, Typography } from "@mui/material";
import InfoCard from "../ui/InfoCard";
import { ChartCard } from "../ui/ChartCard";
import { buildDashboardKpis } from "../services/dashboardHelpers";
import { buildMonthlyTrends, buildStatusDistribution, buildAvgStageTimes, buildRiskDistribution } from "../services/dashboardCharts";
import { Link as RouterLink } from "react-router-dom";
import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import HourglassTop from "@mui/icons-material/HourglassTop";
import { useAgreements } from "../services/agreementsContext";
import { ChartsReferenceLine } from "@mui/x-charts/ChartsReferenceLine";
import { useTheme } from "@mui/material/styles";

const Dashboard: React.FC = () => {

  const theme = useTheme();

  // use AgreementsProvider Context
  const { agreements, runsByAgreementId, actionsByRunId } = useAgreements();

  // top cards
  const kpis = React.useMemo(
    () => buildDashboardKpis(agreements, runsByAgreementId, actionsByRunId),
    [agreements, runsByAgreementId, actionsByRunId]
  );

  // Chart datasets
  const monthlyTrends = React.useMemo(
    () => buildMonthlyTrends(agreements, runsByAgreementId, actionsByRunId, 6),
    [agreements, runsByAgreementId, actionsByRunId]
  );
  const statusDistribution = React.useMemo(() => buildStatusDistribution(agreements), [agreements]);
  const avgStageTimes = React.useMemo(
    () => buildAvgStageTimes(agreements, runsByAgreementId, actionsByRunId),
    [agreements, runsByAgreementId, actionsByRunId]
  );
  const riskDistribution = React.useMemo(() => buildRiskDistribution(agreements), [agreements]);

  // Avg resp time bar chart SLA
  // const goodValues = avgStageTimes.map(s => (s.avgDays <= 5 ? s.avgDays : 0));
  // const warnValues = avgStageTimes.map(s => (s.avgDays > 5 && s.avgDays <= 10 ? s.avgDays : 0));
  // const badValues = avgStageTimes.map(s => (s.avgDays > 10 ? s.avgDays : 0));

  // formatting helpers
  const fmtMoney = (n: number): string =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  // wrap bar chart long labels
  const wrapLabel = (label: string, maxCharsPerLine = 14, maxLines = 2): string => {
    const words = label.split(" ");
    const lines: string[] = [];
    let current = "";

    for (const w of words) {
      const next = current ? `${current} ${w}` : w;
      if (next.length <= maxCharsPerLine) {
        current = next;
      } else {
        lines.push(current);
        current = w;
        if (lines.length === maxLines - 1) break;
      }
    }

    if (current && lines.length < maxLines) lines.push(current);

    // If we had to truncate, add ellipsis to the last line
    const usedWords = lines.join(" ").split(" ").length;
    if (usedWords < words.length) {
      lines[lines.length - 1] = `${lines[lines.length - 1]}…`;
    }

    return lines.join("\n");
  };

  // assume overdueSummary comes from buildOverdueSummary(items, 7, 3)
  const overdueFooter = kpis.overdueSummary.topOverdue.length > 0 ? (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      {kpis.overdueSummary.topOverdue.map((o) => (
        <Link
          key={o.id}
          component={RouterLink}
          to={`/view/${o.id}`}
          underline="hover"
          sx={{ fontSize: 13 }}
        >
          {o.title}{" "}
          <Typography component="span" sx={{ color: "text.secondary", fontSize: 12 }}>
            ({o.daysOverdue.toFixed(1)}d overdue)
          </Typography>
        </Link>
      ))}
      {kpis.overdueSummary.overdueCount > kpis.overdueSummary.topOverdue.length && (
        <Link
          component={RouterLink}
          to={`/agreements?filter=overdue`}
          underline="hover"
          sx={{ fontSize: 13 }}
        >
          +{kpis.overdueSummary.overdueCount - kpis.overdueSummary.topOverdue.length} more
        </Link>
      )}
    </Box>
  ) : undefined;

  const stageLabels = avgStageTimes.map((s) => s.stage);
  const stageValues = avgStageTimes.map((s) => Number(s.avgDays.toFixed(2)));

  return (
    <Grid container spacing={3}>
      <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
        <InfoCard
          title="Total Agreements"
          value={kpis.totalAgreements}
          subtitle="All time"
          icon={<TrendingUpIcon />}
          iconColor="success"
        />
      </Grid>

      <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
        <InfoCard
          title="Pending Approvals"
          value={kpis.pendingApprovals}
          subtitle="Require action"
          icon={<AccessTimeIcon />}
          iconColor="error"
        />
      </Grid>

      <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
        <InfoCard
          title="Overdue Approvals"
          value={kpis.overdueSummary.overdueCount}
          subtitle="Over 7 days"
          icon={<HourglassTop />}
          iconColor="warning"
          footer={overdueFooter}
        />
      </Grid>

      <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
        <InfoCard
          title="Oldest Pending"
          value={kpis.overdueSummary.oldestPendingDays !== undefined ? `${kpis.overdueSummary.oldestPendingDays.toFixed(1)}d` : "—"}
          subtitle="Longest wait"
          icon={<AccessTimeIcon />}
          iconColor="info"
        />
      </Grid>

      <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
        <InfoCard
          title="Approved This Month"
          value={kpis.approvedThisMonth}
          subtitle=""
          icon={<CheckCircleIcon />}
          iconColor="success"
        />
      </Grid>

      <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
        <InfoCard
          title="Expiring Soon"
          value={kpis.expiringSoon}
          subtitle="Next 30 days"
          icon={<HourglassTop />}
          iconColor="warning"
        />
      </Grid>

      <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
        <InfoCard
          title="Avg Approval Time"
          value={kpis.avgApprovalDays !== undefined ? `${kpis.avgApprovalDays.toFixed(1)}d` : "—"}
          subtitle={
            kpis.avgApprovalDaysDelta !== undefined
              ? `${kpis.avgApprovalDaysDelta > 0 ? "+" : ""}${kpis.avgApprovalDaysDelta.toFixed(1)}d from last month`
              : ""
          }
          icon={<AccessTimeIcon />}
          iconColor="info"
        />
      </Grid>

      <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
        <InfoCard
          title="At-Risk Value"
          value={fmtMoney(kpis.atRiskValue)}
          subtitle="Active pipeline"
          icon={<MonetizationOnIcon />}
          iconColor="warning"
        />
      </Grid>

      {/* CHARTS GRID */}
      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid size={{ lg: 6, md: 12, xs: 12 }}>
          {/* Monthly Line chart */}
          <ChartCard title="Monthly Agreement Trends">
            <LineChart
              dataset={monthlyTrends} // IMonthlyTrendPoint[]
              xAxis={[{ dataKey: "month", scaleType: "point" }]}
              series={[
                { dataKey: "created", label: "Created" },
                { dataKey: "approved", label: "Approved" }
              ]}
              height={300}
              margin={{ left: 20, right: 20, top: 20, bottom: 30 }}
            />
          </ChartCard>
        </Grid>

        <Grid size={{ lg: 6, md: 12, xs: 12 }}>
          {/* Status donut */}
          <ChartCard title="Agreement Status Distribution">
            <PieChart
              series={[
                {
                  data: statusDistribution, // IDistributionPoint[]
                  innerRadius: 40,
                  outerRadius: 100,
                  paddingAngle: 2,
                  cornerRadius: 5
                }
              ]}
              height={300}
              margin={{ left: 10, right: 20, top: 10, bottom: 10 }}
            />
          </ChartCard>
        </Grid>

        <Grid size={{ lg: 6, md: 12, xs: 12 }}>
          {/* Stage bar */}
          <ChartCard title="Average Approval Time by Stage">
            <BarChart
              xAxis={[{
                scaleType: "band",
                data: stageLabels,
                valueFormatter: (v) => wrapLabel(String(v), 16, 3),
                tickLabelStyle: { whiteSpace: "pre-line", fontSize: 12 }
              }]}
              series={[{
                data: stageValues,
                //label: "Avg days",
                valueFormatter: (v) => `${Number(v).toFixed(1)}d`
              }]}
              height={300}
              borderRadius={5}
              margin={{ left: 20, right: 20, top: 20, bottom: 40 }}
              slotProps={{
                barLabel: { style: { fontSize: 12 } }
              }}
            >
              <ChartsReferenceLine y={5} lineStyle={{ stroke: theme.palette.warning.main, strokeWidth: 1 }} />
              <ChartsReferenceLine y={10} lineStyle={{ stroke: "#fa4f58", strokeWidth: 1 }} />
            </BarChart>
          </ChartCard>
        </Grid>

        <Grid size={{ lg: 6, md: 12, xs: 12 }}>
          {/* Risk donut */}
          <ChartCard title="Risk Level Distribution">
            <PieChart
              series={[
                {
                  data: riskDistribution, // IDistributionPoint[]
                  innerRadius: 40,
                  outerRadius: 100,
                  paddingAngle: 2,
                  cornerRadius: 5
                }
              ]}
              height={300}
              margin={{ left: 10, right: 20, top: 10, bottom: 10 }}
            />
          </ChartCard>
        </Grid>
      </Grid>

    </Grid>
  );
};

export default Dashboard;