import dayjs from "dayjs";
import { IRiskAgreementItem, AraStatus, IWorkflowActionItem, IWorkflowRunItem } from "../data/props";

export type RiskLevel = "Low" | "Medium" | "High";

export interface IMonthlyTrendPoint extends Record<string, string | number> {
    month: string;     // "Aug", "Sep" etc (or "2026-01")
    created: number;
    approved: number;
}

export interface IDistributionPoint {
    id: number;
    value: number;
    label: string;
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
export const isValidDate = (value?: string): boolean =>
    value !== undefined && dayjs(value).isValid();

const isInFlight = (item: IRiskAgreementItem): boolean =>
    item.araStatus === "Under Review" || item.araStatus === "Mod Review";

const isSuccessComplete = (status: AraStatus): boolean =>
    status === "Approved" || status === "Resolved";

export const getRiskLevel = (amount: number): RiskLevel => {
    if (amount < 50000) return "Low";
    if (amount <= 100000) return "Medium";
    return "High";
};


/**
 * Age of the current step in days:
 * now - run.stepAssignedDate (source of truth for when current step became pending)
 */
export const getCurrentStepAgeDays = (run?: IWorkflowRunItem): number | undefined => {
    if (!run?.stepAssignedDate) return undefined;
    if (!isValidDate(run.stepAssignedDate)) return undefined;

    return dayjs().diff(dayjs(run.stepAssignedDate), "day", true);
};


/**
 * Overdue summary for KPI cards.
 * @param slaDays anything older than this is considered overdue
 * @param top take top N overdue items for inline links
 */
export const buildOverdueSummary = (
    items: IRiskAgreementItem[],
    runByAgreementId: Map<number, IWorkflowRunItem>,
    slaDays: number,
    top = 3
): IOverdueSummary => {
    const overdue: IOverdueItemLink[] = [];

    items.forEach(i => {
        if (!isInFlight(i)) return;

        const run = runByAgreementId.get(i.Id);
        const age = getCurrentStepAgeDays(run);
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
        .filter(i => isInFlight(i))
        .map(i => getCurrentStepAgeDays(runByAgreementId.get(i.Id)))
        .filter((d): d is number => d !== undefined)
        .sort((a, b) => b - a)[0];

    return {
        overdueCount: overdue.length,
        oldestPendingDays,
        topOverdue: overdue.slice(0, top)
    };
};



/**
 * Final approval date:
 * prefer run.completed when run is Completed + outcome Approved.
 * fallback: last Approved action for the terminal step ("svpContracts").
 */
export const getFinalApprovalDate = (
    run: IWorkflowRunItem | undefined,
    actions: IWorkflowActionItem[]
): string | undefined => {
    if (!run) return undefined;

    if (
        run.runStatus === "Completed" &&
        run.outcome === "Approved" &&
        isValidDate(run.completed)
    ) {
        return run.completed;
    }

    const last = actions
        .filter(
            a =>
                a.actionType === "Approved" &&
                a.stepKey === "svpContracts" &&
                isValidDate(a.actionCompletedDate)
        )
        .sort(
            (a, b) =>
                new Date(b.actionCompletedDate).getTime() -
                new Date(a.actionCompletedDate).getTime()
        )[0];

    return last?.actionCompletedDate;
};


/**
 * Total cycle days: Agreement.Created -> final approval date
 */
const getApprovalCycleDays = (
    agreement: IRiskAgreementItem,
    run: IWorkflowRunItem | undefined,
    actions: IWorkflowActionItem[]
): number | undefined => {
    if (!isValidDate(agreement.Created)) return undefined;

    const end = getFinalApprovalDate(run, actions);
    if (!end) return undefined;

    return dayjs(end).diff(dayjs(agreement.Created), "day", true);
};

/**
 * KPIs:
 * - pendingApprovals: agreements Under Review or Mod Review
 * - overdueSummary: based on run.stepAssignedDate
 * - approvedThisMonth: success-complete + final approval date in this month
 * - expiringSoon: riskEnd within next 30 days (excluding canceled)
 * - atRiskValue: sum riskFundingRequested for in-flight only
 * - avgApprovalDays + delta: cycle days for success-complete, grouped by approval month
 */
export const buildDashboardKpis = (
  items: IRiskAgreementItem[],
  runByAgreementId: Map<number, IWorkflowRunItem>,
  actionsByRunId: Map<number, IWorkflowActionItem[]>
): IDashboardKpis => {
  const now = dayjs();
  const startOfThisMonth = now.startOf("month");
  const startOfLastMonth = startOfThisMonth.subtract(1, "month");
  const endOfLastMonth = startOfThisMonth.subtract(1, "day").endOf("day");

  const totalAgreements = items.length | 0;

  const pendingApprovals = items.filter(i => isInFlight(i)).length;

  const SLA_DAYS = 7;
  const overdueSummary = buildOverdueSummary(items, runByAgreementId, SLA_DAYS, 3);

  const approvedThisMonth = items.filter(i => {
    if (!isSuccessComplete(i.araStatus)) return false;

    const run = runByAgreementId.get(i.Id);
    const actions = run ? (actionsByRunId.get(run.Id) ?? []) : [];

    const final = getFinalApprovalDate(run, actions);
    return final !== undefined && dayjs(final).isSame(now, "month");
  }).length;

  const expiringSoon = items.filter(i => {
    if (i.araStatus === "Canceled") return false;
    if (!isValidDate(i.riskEnd)) return false;

    const end = dayjs(i.riskEnd);
    const days = end.diff(now, "day");
    return days >= 0 && days <= 30;
  }).length;

  const atRiskValue = items
    .filter(i => isInFlight(i))
    .reduce((sum, i) => sum + (i.riskFundingRequested ?? 0), 0);

  const successItems = items.filter(i => isSuccessComplete(i.araStatus));

  const thisMonthCycleDays = successItems
    .map(i => {
      const run = runByAgreementId.get(i.Id);
      const actions = run ? (actionsByRunId.get(run.Id) ?? []) : [];
      const final = getFinalApprovalDate(run, actions);
      return {
        days: getApprovalCycleDays(i, run, actions),
        final
      };
    })
    .filter(
      x =>
        x.days !== undefined &&
        x.final !== undefined &&
        dayjs(x.final).isSame(now, "month")
    )
    .map(x => x.days as number);

  const lastMonthCycleDays = successItems
    .map(i => {
      const run = runByAgreementId.get(i.Id);
      const actions = run ? (actionsByRunId.get(run.Id) ?? []) : [];
      const final = getFinalApprovalDate(run, actions);
      return {
        days: getApprovalCycleDays(i, run, actions),
        final
      };
    })
    .filter(x => {
      if (x.days === undefined || x.final === undefined) return false;
      const d = dayjs(x.final);
      // inclusive bounds for the last month
      return (d.isAfter(startOfLastMonth) || d.isSame(startOfLastMonth)) &&
             (d.isBefore(endOfLastMonth) || d.isSame(endOfLastMonth));
    })
    .map(x => x.days as number);

  const avg = (arr: number[]): number | undefined =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined;

  const avgApprovalDays = avg(thisMonthCycleDays);
  const avgLastMonth = avg(lastMonthCycleDays);

  const avgApprovalDaysDelta =
    avgApprovalDays !== undefined && avgLastMonth !== undefined
      ? avgApprovalDays - avgLastMonth
      : undefined;

  return {
    totalAgreements,
    pendingApprovals,
    overdueSummary,
    approvedThisMonth,
    expiringSoon,
    avgApprovalDays,
    avgApprovalDaysDelta,
    atRiskValue
  };
};