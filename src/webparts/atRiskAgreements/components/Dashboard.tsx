import * as React from "react";
import { Grid, Box, Link, Typography, ToggleButton, ToggleButtonGroup } from "@mui/material";
import InfoCard from "../ui/InfoCard";
import { ChartCard } from "../ui/ChartCard";
import { buildDashboardKpis, getActiveRiskFundingRequested, isActiveByRiskEnd } from "../services/dashboardHelpers";
import { buildMonthlyTrends, buildStatusDistribution, buildAvgStageTimes, buildRiskDistribution, buildLobValueDistribution } from "../services/dashboardCharts";
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
import { DataSource } from "../data/ds";

type LobValueScope = "active" | "all";

const LOB_COLORS = ["#005c6c", "#f2c744", "#4b82ff", "#7b61ff"];

const Dashboard: React.FC = () => {

  const theme = useTheme();
  const [lobValueScope, setLobValueScope] = React.useState<LobValueScope>("active");

  // use AgreementsProvider Context
  const { agreements, runByAgreementId, effectiveApprovedRunByAgreementId, dashboardActions, loadDashboardActions } = useAgreements();

  // load all the actions one time
  React.useEffect(() => {
    loadDashboardActions().catch((e) => console.error("loadDashboardActions error", e));
  }, [loadDashboardActions]);

  // top cards
  const kpis = React.useMemo(
    () => buildDashboardKpis(agreements, runByAgreementId, effectiveApprovedRunByAgreementId),
    [agreements, runByAgreementId, effectiveApprovedRunByAgreementId]
  );

  // Chart datasets
  const monthlyTrends = React.useMemo(
    () => buildMonthlyTrends(agreements, runByAgreementId, 6),
    [agreements, runByAgreementId]
  );

  const statusDistribution = React.useMemo(() => buildStatusDistribution(agreements), [agreements]);

  const avgStageTimes = React.useMemo(
    () => buildAvgStageTimes(agreements, runByAgreementId, dashboardActions),
    [agreements, runByAgreementId, dashboardActions]
  );
  const riskDistribution = React.useMemo(() => buildRiskDistribution(agreements), [agreements]);
  const activeAgreements = React.useMemo(
    () => agreements.filter((agreement) => isActiveByRiskEnd(agreement)),
    [agreements]
  );
  const lobNames = React.useMemo(
    () => DataSource.LOBs.map((lob) => lob.Title).filter(Boolean),
    [agreements]
  );
  const lobValueDistribution = React.useMemo(
    () => buildLobValueDistribution(
      lobValueScope === "active" ? activeAgreements : agreements,
      (agreement) => getActiveRiskFundingRequested(agreement, effectiveApprovedRunByAgreementId),
      lobNames
    ),
    [activeAgreements, agreements, lobValueScope, effectiveApprovedRunByAgreementId, lobNames]
  );

  // Avg resp time bar chart SLA
  // const goodValues = avgStageTimes.map(s => (s.avgDays <= 5 ? s.avgDays : 0));
  // const warnValues = avgStageTimes.map(s => (s.avgDays > 5 && s.avgDays <= 10 ? s.avgDays : 0));
  // const badValues = avgStageTimes.map(s => (s.avgDays > 10 ? s.avgDays : 0));

  // formatting helpers
  const fmtMoney = (n: number): string =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const fmtCompactMoney = (n: number): string => {
    const abs = Math.abs(n);

    if (abs >= 1000000) {
      const value = n / 1000000;
      const digits = abs >= 10000000 ? 0 : 1;
      return `$${value.toFixed(digits)}M`;
    }

    if (abs >= 1000) {
      const value = n / 1000;
      const digits = abs >= 100000 ? 0 : 1;
      return `$${value.toFixed(digits)}K`;
    }

    return fmtMoney(n);
  };

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

  // filter out any NaN or negative numbers
  const safeAvgStageTimes = avgStageTimes.filter((s) => Number.isFinite(s.avgDays));
  const stageLabels = safeAvgStageTimes.map((s) => s.stage);
  const stageValues = safeAvgStageTimes.map((s) => {
    const value = Number(s.avgDays);
    return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
  });

  const safeMonthlyTrends = monthlyTrends.filter(
    (m) => Number.isFinite(m.created) && Number.isFinite(m.approved)
  );

  const safeRiskDistribution = riskDistribution.filter((p) => Number.isFinite(p.value) && p.value > 0);
  const statusRiskFundingById = new Map(
    statusDistribution.map((point) => [String(point.id), point.totalRiskFundingRequested])
  );
  const riskFundingById = new Map(
    safeRiskDistribution.map((point) => [String(point.id), point.totalRiskFundingRequested])
  );
  const safeLobValueDistribution = lobValueDistribution.filter((p) =>
    Number.isFinite(p.count) && Number.isFinite(p.totalRiskFundingRequested)
  );
  const lobLabels = safeLobValueDistribution.map((point) => point.lob);
  const lobLegendItems = safeLobValueDistribution.map((point, seriesIndex) => ({
    color: LOB_COLORS[seriesIndex % LOB_COLORS.length],
    label: point.lob
  }));
  const lobMaxValue = Math.max(
    0,
    ...safeLobValueDistribution.map((point) => point.totalRiskFundingRequested)
  );
  const lobYAxisMax = lobMaxValue > 0 ? lobMaxValue * 1.18 : undefined;
  const lobChartTitle = lobValueScope === "active"
    ? "Active Total At-Risk Value by LOB"
    : "Grand Total At-Risk Value by LOB";

  // console.log("monthlyTrends", monthlyTrends);
  // console.log("statusDistribution", statusDistribution);
  // console.log("avgStageTimes", avgStageTimes);
  // console.log("riskDistribution", riskDistribution);
  // console.log("stageLabels", stageLabels);
  // console.log("stageValues", stageValues);

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={700}>Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          View metrics and actionable data
        </Typography>
      </Box>

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
            subtitle="Active approved baseline"
            icon={<MonetizationOnIcon />}
            iconColor="warning"
          />
        </Grid>

        {/* CHARTS GRID */}
        <Grid container spacing={3} sx={{ mt: 0 }}>
          <Grid size={{ lg: 6, md: 12, xs: 12 }}>
            {/* LOB value bar */}
            <ChartCard
              title={lobChartTitle}
              contentHeight={380}
              action={
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={lobValueScope}
                  onChange={(_, value: LobValueScope | null) => {
                    if (value) setLobValueScope(value);
                  }}
                  aria-label="LOB value scope"
                  sx={{
                    "& .MuiToggleButton-root": {
                      px: 1.25,
                      py: 0.25,
                      fontSize: 12,
                      textTransform: "none",
                      borderColor: "divider",
                      "&.Mui-selected": {
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        fontWeight: 700,
                        "&:hover": {
                          bgcolor: "primary.dark"
                        }
                      }
                    }
                  }}
                >
                  <ToggleButton value="active" aria-label="Active pipeline">
                    Active
                  </ToggleButton>
                  <ToggleButton value="all" aria-label="All agreements">
                    All
                  </ToggleButton>
                </ToggleButtonGroup>
              }
            >
              <BarChart
                dataset={safeLobValueDistribution}
                xAxis={[{
                  scaleType: "band",
                  dataKey: "lob",
                  categoryGapRatio: 0.35,
                  colorMap: {
                    type: "ordinal",
                    values: lobLabels,
                    colors: lobLegendItems.map((item) => item.color)
                  },
                  valueFormatter: (v) => wrapLabel(String(v), 14, 2),
                  tickLabelStyle: { whiteSpace: "pre-line", fontSize: 12 }
                }]}
                yAxis={[{
                  min: 0,
                  max: lobYAxisMax,
                  valueFormatter: (value: number) => fmtCompactMoney(Number(value)),
                  tickLabelStyle: { fontSize: 11 }
                }]}
                series={[
                  {
                    dataKey: "totalRiskFundingRequested",
                    label: "At-Risk Value",
                    valueFormatter: (value) => fmtCompactMoney(Number(value)),
                    barLabel: (item: { value: number | null }) => item.value !== null ? fmtCompactMoney(item.value) : "",
                    barLabelPlacement: "outside"
                  }
                ]}
                height={380}
                hideLegend
                borderRadius={5}
                margin={{ left: 44, right: 36, top: 34, bottom: 58 }}
                slotProps={{
                  barLabel: { style: { fontSize: 12, fontWeight: 600 } }
                }}
              />
            </ChartCard>
          </Grid>

          <Grid size={{ lg: 6, md: 12, xs: 12 }}>
            {/* Status donut */}
            <ChartCard title="Agreement Status Distribution" contentHeight={380}>
              <PieChart
                series={[
                  {
                    data: statusDistribution, // IDistributionPoint[]
                    innerRadius: 40,
                    outerRadius: 100,
                    arcLabel: (item) => fmtCompactMoney(statusRiskFundingById.get(String(item.id)) ?? 0),
                    arcLabelMinAngle: 12,
                    arcLabelRadius: "78%",
                    paddingAngle: 2,
                    cornerRadius: 5
                  }
                ]}
                height={300}
                margin={{ left: 10, right: 20, top: 10, bottom: 10 }}
                slotProps={{
                  pieArcLabel: {
                    style: {
                      fontSize: 15,
                      fontWeight: 700,
                      fill: theme.palette.text.primary,
                      paintOrder: "stroke",
                      stroke: theme.custom?.cardBg ?? theme.palette.background.paper,
                      strokeWidth: 3
                    }
                  }
                }}
              />
            </ChartCard>
          </Grid>

          <Grid size={{ lg: 6, md: 12, xs: 12 }}>
            {/* Risk donut */}
            <ChartCard title="Risk Level Distribution" contentHeight={380}>
              <PieChart
                series={[
                  {
                    data: safeRiskDistribution, // IDistributionPoint[]
                    innerRadius: 40,
                    outerRadius: 100,
                    arcLabel: (item) => fmtCompactMoney(riskFundingById.get(String(item.id)) ?? 0),
                    arcLabelMinAngle: 12,
                    arcLabelRadius: "78%",
                    paddingAngle: 2,
                    cornerRadius: 5
                  }
                ]}
                height={300}
                margin={{ left: 10, right: 20, top: 10, bottom: 10 }}
                slotProps={{
                  pieArcLabel: {
                    style: {
                      fontSize: 15,
                      fontWeight: 700,
                      fill: theme.palette.text.primary,
                      paintOrder: "stroke",
                      stroke: theme.custom?.cardBg ?? theme.palette.background.paper,
                      strokeWidth: 3
                    }
                  }
                }}
              />
            </ChartCard>
          </Grid>

          <Grid size={{ lg: 6, md: 12, xs: 12 }}>
            {/* Monthly Line chart */}
            <ChartCard title="Monthly Agreement Trends">
              <LineChart
                dataset={safeMonthlyTrends} // IMonthlyTrendPoint[]
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
        </Grid>

      </Grid>
    </Box>
  );
};

export default Dashboard;
