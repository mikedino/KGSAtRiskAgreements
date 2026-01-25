import dayjs from "dayjs";
import { IRiskAgreementItem } from "../data/props";
import {
    IMonthlyTrendPoint, isValidDate, getFinalApprovalDate, IDistributionPoint,
    IStageAvgPoint, RiskLevel, getRiskLevel
} from "./dashboardHelpers";
import { buildWorkflowState } from "./workflowState";
import { RiskAgreementWorkflow } from "./workflowModel";
import { AraStatus } from "../data/props";

const STATUS_ORDER: AraStatus[] = [
  "Under Review",
  "Submitted",
  "Approved",
  "Resolved",
  "Rejected",
  "Cancelled"
];

const STATUS_LABELS: Record<AraStatus, string> = {
  Draft: "Draft",
  Submitted: "Submitted",
  "Under Review": "Under Review",
  Approved: "Approved",
  Resolved: "Resolved",
  Rejected: "Rejected",
  Cancelled: "Cancelled"
};

const STATUS_COLORS: Record<AraStatus, string> = {
  Draft: "#9e9e9e",            // neutral (shouldn't appear)
  Submitted: "#F4B740",        // warning / yellow
  "Under Review": "#4b82ff",   // info / blue
  Approved: "#3BA55C",         // green
  Resolved: "#3BA55C",         // green (same outcome)
  Rejected: "#fd3030",         // red
  Cancelled: "#9e9e9e"         // neutral
};

/*
* Monthly trends (Created vs Approved)
* This version builds the last N months, so the chart doesn’t jump around.
*/
export const buildMonthlyTrends = (items: IRiskAgreementItem[], monthsBack = 6): IMonthlyTrendPoint[] => {
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

        const final = getFinalApprovalDate(i);
        if (final !== undefined) {
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
* Uses sentDate + date pattern.
*/
export const buildAvgStageTimes = (items: IRiskAgreementItem[]): IStageAvgPoint[] => {
  const bucket = new Map<string, { label: string; values: number[] }>();

  items.forEach((item) => {
    const wf = buildWorkflowState(item);

    let prevCompletedDate: string | undefined = isValidDate(item.Created) ? item.Created : undefined;

    wf.forEach((step) => {
      if (step.status === "Skipped" || step.status === "Queued") return;

      // only completed steps
      if (step.status !== "Approved" && step.status !== "Rejected") return;

      if (isValidDate(step.date) === false) return;

      if (prevCompletedDate === undefined || isValidDate(prevCompletedDate) === false) {
        prevCompletedDate = step.date;
        return;
      }

      const dur = dayjs(step.date as string).diff(dayjs(prevCompletedDate), "day", true);
      prevCompletedDate = step.date;

      if (Number.isFinite(dur) === false || dur < 0) return;

      const key = step.key;
      const existing = bucket.get(key);

      if (existing !== undefined) {
        existing.values.push(dur);
      } else {
        bucket.set(key, { label: step.label, values: [dur] });
      }
    });
  });

  // Return in workflow order, excluding "Submitted" (and any other non-approval steps)
  return RiskAgreementWorkflow
    .filter((s) => s.key !== "Submitted")
    .map((s) => {
      const b = bucket.get(s.key);
      if (b === undefined || b.values.length === 0) return undefined;

      return {
        stage: b.label, // uses the label from workflowState (same as model)
        avgDays: b.values.reduce((a, c) => a + c, 0) / b.values.length
      };
    })
    .filter((x): x is IStageAvgPoint => x !== undefined);
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
