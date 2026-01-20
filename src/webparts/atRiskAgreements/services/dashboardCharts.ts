import dayjs from "dayjs";
import { IRiskAgreementItem } from "../data/props";
import {
    IMonthlyTrendPoint, isValidDate, getFinalApprovalDate, IDistributionPoint,
    IStageAvgPoint, RiskLevel, getRiskLevel
} from "./dashboardHelpers";
import { buildWorkflowState, WorkflowStepWithStatus } from "./workflowState";
import { RiskAgreementWorkflow } from "./workflowModel";

/**
 * Duration for a completed step: sentDate -> date
 * sentDate is when it became "Current" (you set it to lastCompletedDate).
 */
const getStepDurationDays = (step: WorkflowStepWithStatus): number | undefined => {
    if (!isValidDate(step.sentDate) || !isValidDate(step.date)) return undefined;
    return dayjs(step.date!).diff(dayjs(step.sentDate!), "day", true);
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
    const map = new Map<string, number>();

    items.forEach(i => {
        map.set(i.araStatus, (map.get(i.araStatus) ?? 0) + 1);
    });

    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
};

/*
* Avg approval time by stage (bar)
* Uses sentDate + date pattern.
*/
export const buildAvgStageTimes = (items: IRiskAgreementItem[]): IStageAvgPoint[] => {
    const bucket = new Map<string, { label: string; values: number[] }>();

    items.forEach(item => {
        const wf = buildWorkflowState(item);

        wf.forEach(step => {
            // Only completed steps have a measurable duration
            if (step.status !== "Approved" && step.status !== "Rejected") return;

            const dur = getStepDurationDays(step);
            if (dur === undefined) return;

            const key = step.key; // stable identifier
            const existing = bucket.get(key);

            if (existing) {
                existing.values.push(dur);
            } else {
                bucket.set(key, { label: step.label, values: [dur] });
            }
        });
    });

    // Simpler: just return in insertion order
    // return Array.from(bucket.values()).map(b => ({
    //     stage: b.label,
    //     avgDays: b.values.reduce((a, c) => a + c, 0) / b.values.length
    // }));

    // Return in workflow order and exclude steps that never occurred
    return RiskAgreementWorkflow
        .filter((s) => s.key !== "Submitted") // optional
        .map((s) => {
            const b = bucket.get(s.key);
            if (b === undefined) return undefined;

            return {
                stage: b.label,
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
        { name: "Low", value: counts.Low },
        { name: "Medium", value: counts.Medium },
        { name: "High", value: counts.High }
    ];
};
