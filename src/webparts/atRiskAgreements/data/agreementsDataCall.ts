import * as React from "react";
import { DataSource } from "./ds";
import { IRiskAgreementItem, IWorkflowActionItem, IWorkflowRunItem } from "./props";
import { formatError } from "../services/utils";

export type RefreshMode = "boot" | "refresh";

export interface IAgreementsDataState {
  agreements: IRiskAgreementItem[];
  runByAgreementId: Map<number, IWorkflowRunItem>;
  actionsByRunId: Map<number, IWorkflowActionItem[]>;
  isBootLoading: boolean;
  isRefreshing: boolean;
  lastRefreshed: string | undefined;
  refresh: (override?: boolean, mode?: RefreshMode) => Promise<void>;
  fatalError?: string;
}

/**
 * This hook owns the data loading and "refresh pipeline" and current state
 * (keeping App clean)
 * DataSource.init -> Agreements -> RunIds -> Runs -> Actions -> Maps
 */
export const useAgreementsData = (
  onError?: (title: string, message: string) => void,
  enabled = true
): IAgreementsDataState => {

  const [agreements, setAgreements] = React.useState<IRiskAgreementItem[]>([]);
  const [runByAgreementId, setRunByAgreementId] = React.useState<Map<number, IWorkflowRunItem>>(new Map());
  const [actionsByRunId, setActionsByRunId] = React.useState<Map<number, IWorkflowActionItem[]>>(new Map());

  const [isBootLoading, setIsBootLoading] = React.useState<boolean>(enabled); // ✅ start boot only if enabled
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = React.useState<string | undefined>(undefined);
  const [fatalError, setFatalError] = React.useState<string | undefined>(undefined);

  const refresh = React.useCallback(async (override = false, mode: RefreshMode = "refresh"): Promise<void> => {

    // If install/config gate is blocking, do nothing
    if (!enabled) {
      setIsBootLoading(false);
      setIsRefreshing(false);
      return;
    }

    const showBoot = mode === "boot";

    try {
      // clear prior fatal error at the start of any refresh attempt
      setFatalError(undefined);

      if (showBoot) {
        setIsBootLoading(true);
      } else {
        setIsRefreshing(true);
      }

      await DataSource.init(override);

      const nextAgreements = [...(DataSource.Agreements ?? [])];
      setAgreements(nextAgreements);

      // collect current run ids (ignore blanks)
      // const runIds = Array.from(
      //   new Set(
      //     nextAgreements
      //       .map(a => a.currentRun?.Id)
      //       .filter((id): id is number => typeof id === "number" && id > 0)
      //   )
      // );

      // Get WF Runs and WF Actions
      const runs = await DataSource.getCurrentWorkflowRuns();
      const actions: IWorkflowActionItem[] = [];

      if (runs.length === 0) {
        setRunByAgreementId(new Map());
        setActionsByRunId(new Map());
        setLastRefreshed(new Date().toISOString());
        return;
      }

      // Map agreementId -> run
      const runMap = new Map<number, IWorkflowRunItem>();
      runs.forEach(r => {
        const agreementId = r.agreement?.Id ?? r.agreement.Id;
        if (typeof agreementId === "number") {
          // if multiple runs per agreement in the dataset, keep the most relevant one
          const existing = runMap.get(agreementId);

          // prefer Active; else highest runNumber
          if (!existing) runMap.set(agreementId, r);
          else if (existing.runStatus !== "Active" && r.runStatus === "Active") runMap.set(agreementId, r);
          else if ((r.runNumber ?? 0) > (existing.runNumber ?? 0)) runMap.set(agreementId, r);
        }
      });

      // Map runId -> actions[]
      const actionsMap = new Map<number, IWorkflowActionItem[]>();
      actions.forEach(a => {
        const runId = a.run?.Id ?? a.run.Id;
        if (typeof runId !== "number") return;

        const bucket = actionsMap.get(runId) ?? [];
        bucket.push(a);
        actionsMap.set(runId, bucket);
      });

      // Sort each run’s actions newest->oldest
      actionsMap.forEach((bucket, key) => {
        bucket.sort((x, y) => new Date(y.actionCompletedDate).getTime() - new Date(x.actionCompletedDate).getTime());
        actionsMap.set(key, bucket);
      });

      setRunByAgreementId(runMap);
      setActionsByRunId(actionsMap);

      setLastRefreshed(new Date().toISOString());

    } catch (err) {
      const msg = `Error refreshing datasource: ${formatError(err)}`;
      console.error("refresh error", err);

      // ✅ surface it
      setFatalError(msg);
      onError?.("Error refreshing agreements", msg);

    } finally {
      if (showBoot) setIsBootLoading(false);
      setIsRefreshing(false);
    }
  }, [onError, enabled]);

  // boot load ONLY when enabled
  React.useEffect(() => {
    if (!enabled) {
      setIsBootLoading(false);
      return;
    }

    refresh(false, "boot").catch((e) => {
      console.error("boot refresh error", e);
    });
  }, [refresh, enabled]);


  React.useEffect(() => {
    // should run once per enabled change
    console.log("boot effect fired", { enabled });
  }, [refresh, enabled]);

  return {
    agreements,
    runByAgreementId,
    actionsByRunId,
    isBootLoading,
    isRefreshing,
    lastRefreshed,
    refresh,
    fatalError
  };
};
