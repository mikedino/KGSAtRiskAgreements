import dayjs from "dayjs";
import { IRiskAgreementItem, IWorkflowActionItem, IWorkflowRunItem } from "../data/props";
import {
  IMonthlyTrendPoint, isValidDate, getFinalApprovalDate,
  IStageAvgPoint, RiskLevel, getRiskLevel, IValueDistributionPoint, ILobValuePoint
} from "./dashboardHelpers";
import { buildWorkflowState } from "./workflowState";
import { RiskAgreementWorkflow } from "./workflowModel";
import { AraStatus } from "../data/props";

const STATUS_ORDER: AraStatus[] = [
  "Mod Review",
  "Under Review",
  "Submitted",
  "Approved",
  "Resolved",
  "Rejected",
  "Canceled"
];

const STATUS_LABELS: Record<AraStatus, string> = {
  Draft: "Draft",
  Submitted: "Submitted",
  "Under Review": "Under Review",
  "Mod Review": "Mod Review",
  Approved: "Approved",
  Resolved: "Resolved",
  Rejected: "Rejected",
  Canceled: "Canceled"
};

const STATUS_COLORS: Record<AraStatus, string> = {
  Draft: "#9e9e9e",            // neutral (shouldn't appear)
  Submitted: "#F4B740",        // warning / yellow
  "Under Review": "#4b82ff",   // info / blue
  "Mod Review": "#7b61ff",     // purple-ish
  Approved: "#3BA55C",   // strong green
  Resolved: "#2CB1A1",   // tealish green
  Rejected: "#fd3030",         // red
  Canceled: "#9e9e9e"         // neutral
};

const RISK_ORDER: RiskLevel[] = ["Low", "Medium", "High"];

const RISK_LABELS: Record<RiskLevel, string> = {
  Low: "Low (< 50k)",
  Medium: "Medium (50k-100k)",
  High: "High (> 100k)"
};

const RISK_COLORS: Record<RiskLevel, string> = {
  Low: "#3BA55C",
  Medium: "#F4B740",
  High: "#fd3030"
};

/*
* Monthly trends (Created vs Approved)
* This version builds the last N months, so the chart doesn’t jump around.
*/
export const buildMonthlyTrends = (
  items: IRiskAgreementItem[],
  runByAgreementId: Map<number, IWorkflowRunItem>,
  monthsBack = 6
): IMonthlyTrendPoint[] => {
  const now = dayjs();
  const months: dayjs.Dayjs[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    months.push(now.subtract(i, "month").startOf("month"));
  }

  const createdCounts = new Map<string, number>();
  const approvedCounts = new Map<string, number>();

  items.forEach((i) => {
    if (isValidDate(i.Created)) {
      const key = dayjs(i.Created).startOf("month").format("YYYY-MM");
      createdCounts.set(key, (createdCounts.get(key) ?? 0) + 1);
    }

    const run = runByAgreementId.get(i.Id);
    const final = getFinalApprovalDate(run);

    if (final) {
      const key = dayjs(final).startOf("month").format("YYYY-MM");
      approvedCounts.set(key, (approvedCounts.get(key) ?? 0) + 1);
    }
  });

  return months.map((m) => {
    const key = m.format("YYYY-MM");
    return {
      month: m.format("MMM"),
      created: createdCounts.get(key) ?? 0,
      approved: approvedCounts.get(key) ?? 0
    };
  });
};


// Status distribution (donut)
export const buildStatusDistribution = (items: IRiskAgreementItem[]): IValueDistributionPoint[] => {
  const buckets = new Map<AraStatus, { count: number; totalRiskFundingRequested: number }>();

  items.forEach(i => {
    const status = i.araStatus;
    const existing = buckets.get(status) ?? { count: 0, totalRiskFundingRequested: 0 };
    existing.count++;
    existing.totalRiskFundingRequested += i.riskFundingRequested ?? 0;
    buckets.set(status, existing);
  });

  return STATUS_ORDER
    .map((status, index): IValueDistributionPoint => {
      const bucket = buckets.get(status) ?? { count: 0, totalRiskFundingRequested: 0 };

      return {
      id: index + 1,
      value: bucket.count,
      label: STATUS_LABELS[status],
      color: STATUS_COLORS[status],
      totalRiskFundingRequested: bucket.totalRiskFundingRequested
      };
    })
    .filter(p => p.value > 0); // remove empty slices
};

/*
* Avg approval time by stage (bar)
* compute per run:
* sort completed actions by completed date
* measure deltas between consecutive completed actions
* bucket by stepKey
*/
export const buildAvgStageTimes = (
  items: IRiskAgreementItem[],
  runByAgreementId: Map<number, IWorkflowRunItem>,
  dashboardActions: IWorkflowActionItem[]
): IStageAvgPoint[] => {
  const bucket = new Map<string, { label: string; values: number[] }>();

  const actionsByRunId = new Map<number, IWorkflowActionItem[]>();

  dashboardActions.forEach((action) => {
    const runId = action.run?.Id;
    if (!runId) return;

    const existing = actionsByRunId.get(runId);
    if (existing) {
      existing.push(action);
    } else {
      actionsByRunId.set(runId, [action]);
    }
  });

  items.forEach((agreement) => {
    const run = runByAgreementId.get(agreement.Id);
    if (!run) return;

    const actions = actionsByRunId.get(run.Id) ?? [];
    if (actions.length === 0) return;

    const wf = buildWorkflowState(agreement, run, actions);

    let prevCompleted: string | undefined =
      wf.find((s) => s.isInitial)?.completeDate ?? agreement.Created;

    wf.forEach((step) => {
      if (step.status !== "Approved" && step.status !== "Rejected") return;
      if (!isValidDate(step.completeDate) || !isValidDate(prevCompleted)) {
        prevCompleted = step.completeDate ?? prevCompleted;
        return;
      }

      const dur = dayjs(step.completeDate).diff(dayjs(prevCompleted), "day", true);
      prevCompleted = step.completeDate;

      if (!Number.isFinite(dur) || dur < 0) return;

      const existing = bucket.get(step.key);
      if (existing) existing.values.push(dur);
      else bucket.set(step.key, { label: step.label, values: [dur] });
    });
  });

  return RiskAgreementWorkflow
    .filter((s) => !s.isInitial)
    .map((s) => {
      const b = bucket.get(s.key);
      if (!b || b.values.length === 0) return undefined;

      return {
        stage: b.label,
        avgDays: b.values.reduce((a, c) => a + c, 0) / b.values.length
      };
    })
    .filter((x): x is IStageAvgPoint => !!x);
};


// Risk distribution (pie)
export const buildRiskDistribution = (items: IRiskAgreementItem[]): IValueDistributionPoint[] => {
  const buckets: Record<RiskLevel, { count: number; totalRiskFundingRequested: number }> = {
    Low: { count: 0, totalRiskFundingRequested: 0 },
    Medium: { count: 0, totalRiskFundingRequested: 0 },
    High: { count: 0, totalRiskFundingRequested: 0 }
  };

  items.forEach(i => {
    const amt = i.riskFundingRequested ?? 0;
    const riskLevel = getRiskLevel(amt);
    buckets[riskLevel].count++;
    buckets[riskLevel].totalRiskFundingRequested += amt;
  });

  return RISK_ORDER.map((level, index) => ({
    id: index + 1,
    value: buckets[level].count,
    label: RISK_LABELS[level],
    color: RISK_COLORS[level],
    totalRiskFundingRequested: buckets[level].totalRiskFundingRequested
  }));
};

export const buildLobValueDistribution = (items: IRiskAgreementItem[]): ILobValuePoint[] => {
  const buckets = new Map<string, { count: number; totalRiskFundingRequested: number }>();

  items.forEach((item) => {
    const lob = item.lob?.trim() || "Unassigned";
    const existing = buckets.get(lob) ?? { count: 0, totalRiskFundingRequested: 0 };
    existing.count++;
    existing.totalRiskFundingRequested += item.riskFundingRequested ?? 0;
    buckets.set(lob, existing);
  });

  return Array.from(buckets.entries())
    .map(([lob, bucket], index) => ({
      id: index + 1,
      lob,
      count: bucket.count,
      totalRiskFundingRequested: bucket.totalRiskFundingRequested
    }))
    .sort((a, b) => b.totalRiskFundingRequested - a.totalRiskFundingRequested || a.lob.localeCompare(b.lob));
};
