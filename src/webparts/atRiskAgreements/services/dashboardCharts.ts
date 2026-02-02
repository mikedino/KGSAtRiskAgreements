import dayjs from "dayjs";
import { IRiskAgreementItem, IWorkflowActionItem, IWorkflowRunItem } from "../data/props";
import {
  IMonthlyTrendPoint, isValidDate, IDistributionPoint, getFinalApprovalDate,
  IStageAvgPoint, RiskLevel, getRiskLevel
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
  Approved: "#3BA55C",         // green
  Resolved: "#3BA55C",         // green (same outcome)
  Rejected: "#fd3030",         // red
  Canceled: "#9e9e9e"         // neutral
};

/*
* Monthly trends (Created vs Approved)
* This version builds the last N months, so the chart doesn’t jump around.
*/
export const buildMonthlyTrends = (
  items: IRiskAgreementItem[],
  runsByAgreementId: Map<number, IWorkflowRunItem>,
  actionsByRunId: Map<number, IWorkflowActionItem[]>,
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

    const run = runsByAgreementId.get(i.Id);
    const actions = run ? (actionsByRunId.get(run.Id) ?? []) : [];
    const final = getFinalApprovalDate(run, actions);

    if (final) {
      const key = dayjs(final).startOf("month").format("YYYY-MM");
      approvedCounts.set(key, (approvedCounts.get(key) ?? 0) + 1);
    }
  });

  return months.map(m => {
    const key = m.format("YYYY-MM");
    return {
      month: m.format("MMM"),
      created: createdCounts.get(key) ?? 0,
      approved: approvedCounts.get(key) ?? 0
    };
  });
};



// Status distribution (donut)
export const buildStatusDistribution = (items: IRiskAgreementItem[]): IDistributionPoint[] => {
  const counts = new Map<AraStatus, number>();

  items.forEach(i => {
    const status = i.araStatus;
    counts.set(status, (counts.get(status) ?? 0) + 1);
  });

  return STATUS_ORDER
    .map((status, index) => ({
      id: index + 1,
      value: counts.get(status) ?? 0,
      label: STATUS_LABELS[status],
      color: STATUS_COLORS[status]
    }))
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
  runsByAgreementId: Map<number, IWorkflowRunItem>,
  actionsByRunId: Map<number, IWorkflowActionItem[]>
): IStageAvgPoint[] => {
  const bucket = new Map<string, { label: string; values: number[] }>();

  items.forEach((agreement) => {
    const run = runsByAgreementId.get(agreement.Id);
    if (!run) return;

    const actions = actionsByRunId.get(run.Id) ?? [];
    const wf = buildWorkflowState(agreement, run, actions);

    // Use Submitted complete date as starting point (matches your state logic)
    let prevCompleted: string | undefined =
      wf.find(s => s.isInitial)?.completeDate ?? agreement.Created;

    wf.forEach(step => {
      if (step.status !== "Approved" && step.status !== "Rejected") return;
      if (!isValidDate(step.completeDate) || !isValidDate(prevCompleted)) {
        prevCompleted = step.completeDate ?? prevCompleted;
        return;
      }

      const dur = dayjs(step.completeDate!).diff(dayjs(prevCompleted!), "day", true);
      prevCompleted = step.completeDate;

      if (!Number.isFinite(dur) || dur < 0) return;

      const key = step.key;
      const existing = bucket.get(key);

      if (existing) existing.values.push(dur);
      else bucket.set(key, { label: step.label, values: [dur] });
    });
  });

  // Return in workflow order (no Submitted)
  return RiskAgreementWorkflow
    .filter(s => !s.isInitial)
    .map(s => {
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
export const buildRiskDistribution = (items: IRiskAgreementItem[]): IDistributionPoint[] => {
  const counts: Record<RiskLevel, number> = { Low: 0, Medium: 0, High: 0 };

  items.forEach(i => {
    const amt = i.riskFundingRequested ?? 0;
    counts[getRiskLevel(amt)]++;
  });

  return [
    { id: 1, value: counts.Low, label: "Low (< 50k)" },
    { id: 2, value: counts.Medium, label: "Medium (50k-100k)" },
    { id: 3, value: counts.High, label: "High (> 100k)" }
  ];
};
