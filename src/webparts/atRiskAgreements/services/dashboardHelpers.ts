import dayjs from "dayjs";
import { IRiskAgreementItem, AraStatus } from "../data/props";
import { buildWorkflowState, WorkflowStepWithStatus } from "../services/workflowState";

export type RiskLevel = "Low" | "Medium" | "High";

export interface IMonthlyTrendPoint extends Record<string, string | number> {
    month: string;     // "Aug", "Sep" etc (or "2026-01")
    created: number;
    approved: number;
}

export interface IDistributionPoint {
    name: string;
    value: number;
}

export interface IStageAvgPoint {
    stage: string;     // label
    avgDays: number;   // avg duration in days
}

export interface IOverdueItemLink {
    id: number;
    title: string;
    daysOverdue: number;
}

export interface IOverdueSummary {
    overdueCount: number;
    oldestPendingDays: number | undefined;
    topOverdue: IOverdueItemLink[]; // sorted desc, capped
}

export interface IDashboardKpis {
    totalAgreements: number;
    pendingApprovals: number;
    //overdueApprovals: number;
    //oldestPendingDays: number | undefined;
    overdueSummary: IOverdueSummary,
    approvedThisMonth: number;
    expiringSoon: number;
    avgApprovalDays: number | undefined;
    avgApprovalDaysDelta: number | undefined; //this month - last month
    atRiskValue: number;
}

// CORE HELPER FUNCTIONS
export const isValidDate = (value?: string): boolean => value !== undefined && dayjs(value).isValid();

const getCurrentStep = (item: IRiskAgreementItem): WorkflowStepWithStatus | undefined =>
    buildWorkflowState(item).find(s => s.status === "Current");

const isInFlight = (item: IRiskAgreementItem): boolean =>
    item.araStatus === "Under Review";

const isSuccessComplete = (status: AraStatus): boolean =>
    status === "Approved" || status === "Resolved";

export const getRiskLevel = (amount: number): RiskLevel => {
    if (amount < 50000) return "Low";
    if (amount <= 100000) return "Medium";
    return "High";
};

/**
 * Age of the current step in days:
 * now - sentDate (sentDate is when the step became Current)
 */
export const getCurrentStepAgeDays = (item: IRiskAgreementItem): number | undefined => {
    const step = getCurrentStep(item);
    if (step === undefined) return undefined;
    if (isValidDate(step.sentDate) === false) return undefined;

    return dayjs().diff(dayjs(step.sentDate as string), "day", true);
};


/**
 * Overdue summary for KPI cards.
 * @param slaDays anything older than this is considered overdue
 * @param top take top N overdue items for inline links
 */
export const buildOverdueSummary = (
    items: IRiskAgreementItem[],
    slaDays: number,
    top = 3
): IOverdueSummary => {
    const overdue: IOverdueItemLink[] = [];

    items.forEach((i) => {
        if (isInFlight(i) === false) return;

        const age = getCurrentStepAgeDays(i);
        if (age === undefined) return;

        if (age > slaDays) {
            overdue.push({
                id: i.Id,
                title: i.Title,
                daysOverdue: age - slaDays
            });
        }
    });

    overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);

    const oldestPendingDays = items
        .filter((i) => isInFlight(i))
        .map((i) => getCurrentStepAgeDays(i))
        .filter((d): d is number => d !== undefined)
        .sort((a, b) => b - a)[0];

    return {
        overdueCount: overdue.length,
        oldestPendingDays,
        topOverdue: overdue.slice(0, top)
    };
};


/**
 * Final approval date: last step with status Approved (by date).
 * Uses workflow-derived dates (ex: SVPContractsSignDate).
 */
export const getFinalApprovalDate = (item: IRiskAgreementItem): string | undefined => {
    const wf = buildWorkflowState(item);

    const approvedSteps = wf
        .filter(s => s.status === "Approved" && isValidDate(s.date))
        .sort((a, b) => dayjs(a.date!).valueOf() - dayjs(b.date!).valueOf());

    if (approvedSteps.length === 0) return undefined;

    return approvedSteps[approvedSteps.length - 1].date;
};

/**
 * Total cycle days: Created -> final approval date (success only usually).
 */
const getApprovalCycleDays = (item: IRiskAgreementItem): number | undefined => {
    if (isValidDate(item.Created) === false) return undefined;

    const end = getFinalApprovalDate(item);
    if (end === undefined) return undefined;

    // fractional days are fine; you can round later for display
    return dayjs(end).diff(dayjs(item.Created), "day", true);
};

/**
 * Pending = Under Review + has Current step
 * Approved this month = Approved/Resolved + final approval date in current month
 * Expiring soon = riskEnd within next 30 days (exclude Cancelled by default; tweak if you want)
 * At-risk value = sum riskFundingRequested for Under Review only
 * Avg approval time = avg cycle days for Approved/Resolved (success complete)
 * Delta = this month avg - last month avg (both success complete)
 */
export const buildDashboardKpis = (items: IRiskAgreementItem[]): IDashboardKpis => {
    const now = dayjs();
    const startOfThisMonth = now.startOf("month");
    const startOfLastMonth = startOfThisMonth.subtract(1, "month");
    const endOfLastMonth = startOfThisMonth.subtract(1, "day").endOf("day");

    const totalAgreements = items.length | 0;

    const pendingApprovals = items.filter((i) => isInFlight(i) && getCurrentStep(i) !== undefined).length;

    const SLA_DAYS = 7; //default "overdue" days
    const overdueSummary = buildOverdueSummary(items, SLA_DAYS, 3);

    const approvedThisMonth = items.filter((i) => {
        if (isSuccessComplete(i.araStatus) === false) return false;

        const final = getFinalApprovalDate(i);
        return final !== undefined && dayjs(final).isSame(now, "month");
    }).length;

    const expiringSoon = items.filter((i) => {
        if (i.araStatus === "Cancelled") return false;
        if (isValidDate(i.riskEnd) === false) return false;

        const end = dayjs(i.riskEnd);
        const days = end.diff(now, "day");
        return days >= 0 && days <= 30;
    }).length;

    const atRiskValue = items
        .filter((i) => isInFlight(i))
        .reduce((sum, i) => sum + (i.riskFundingRequested ?? 0), 0);

    const successItems = items.filter((i) => isSuccessComplete(i.araStatus));

    const thisMonthCycleDays = successItems
        .map((i) => ({ days: getApprovalCycleDays(i), final: getFinalApprovalDate(i) }))
        .filter((x) => x.days !== undefined && x.final !== undefined && dayjs(x.final).isSame(now, "month"))
        .map((x) => x.days as number);

    const lastMonthCycleDays = successItems
        .map((i) => ({ days: getApprovalCycleDays(i), final: getFinalApprovalDate(i) }))
        .filter((x) => {
            if (x.days === undefined || x.final === undefined) return false;
            const d = dayjs(x.final);
            return d.isAfter(startOfLastMonth) && d.isBefore(endOfLastMonth);
        })
        .map((x) => x.days as number);

    const avg = (arr: number[]): number | undefined =>
        arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined;

    const avgApprovalDays = avg(thisMonthCycleDays);
    const avgLastMonth = avg(lastMonthCycleDays);

    const avgApprovalDaysDelta =
        avgApprovalDays !== undefined && avgLastMonth !== undefined ? avgApprovalDays - avgLastMonth : undefined;


    return {
        totalAgreements,
        pendingApprovals,
        //overdueApprovals: overdueSummary.overdueCount,
        //oldestPendingDays: overdueSummary.oldestPendingDays,
        overdueSummary,
        approvedThisMonth,
        expiringSoon,
        avgApprovalDays,
        avgApprovalDaysDelta,
        atRiskValue
    };
};