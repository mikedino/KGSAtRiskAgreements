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

const Dashboard: React.FC = () => {

  // use AgreementsProvider Context
  const { agreements } = useAgreements();
  //const [items, setItems] = React.useState<IRiskAgreementItem[]>([]);
  const kpis = React.useMemo(() => buildDashboardKpis(agreements), [agreements]);
  // Chart datasets
  const monthlyTrends = React.useMemo(() => buildMonthlyTrends(agreements, 6), [agreements]);
  const statusDistribution = React.useMemo(() => buildStatusDistribution(agreements), [agreements]);
  const avgStageTimes = React.useMemo(() => buildAvgStageTimes(agreements), [agreements]);
  const riskDistribution = React.useMemo(() => buildRiskDistribution(agreements), [agreements]);

  // // detects app refreshes and resets items
  // React.useEffect(() => {
  //   setItems([...(DataSource.Agreements ?? [])]);
  // }, [DataSource.AgreementsVersion]);

  // formatting helpers
  const fmtMoney = (n: number): string =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

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
              margin={{ left: 50, right: 20, top: 20, bottom: 30 }}
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
                  innerRadius: 60,
                  outerRadius: 100,
                  paddingAngle: 2
                }
              ]}
              height={300}
              margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
            />
          </ChartCard>
        </Grid>

        <Grid size={{ lg: 6, md: 12, xs: 12 }}>
          {/* Stage bar */}
          <ChartCard title="Average Approval Time by Stage">
            <BarChart
              xAxis={[{ scaleType: "band", data: stageLabels }]}
              series={[{
                data: stageValues,
                //label: "Avg days"  remove label and it will not show
              }]}
              height={300}
              margin={{ left: 50, right: 20, top: 20, bottom: 100 }}
            />
          </ChartCard>
        </Grid>

        <Grid size={{ lg: 6, md: 12, xs: 12 }}>
          {/* Risk donut */}
          <ChartCard title="Risk Level Distribution">
            <PieChart
              series={[
                {
                  data: riskDistribution, // IDistributionPoint[]
                  innerRadius: 60,
                  outerRadius: 100,
                  paddingAngle: 2
                }
              ]}
              height={300}
              margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
            />
          </ChartCard>
        </Grid>
      </Grid>

    </Grid>
  );
};

export default Dashboard;