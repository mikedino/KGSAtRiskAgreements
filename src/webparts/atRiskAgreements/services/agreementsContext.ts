import * as React from "react";
import { IRiskAgreementItem, IWorkflowActionItem, IWorkflowRunItem } from "../data/props";
import { RefreshMode } from "../data/agreementsDataCall";

export interface IAgreementsContext {
  agreements: IRiskAgreementItem[];
  // current runs (one per agreement)
  runsByAgreementId: Map<number, IWorkflowRunItem>;
  // actions for the current run (runId -> actions[])
  actionsByRunId: Map<number, IWorkflowActionItem[]>;

  isRefreshing: boolean;
  lastRefreshed: string | undefined;
  refresh: (override?: boolean, mode?: RefreshMode) => Promise<void>;
}

export const AgreementsContext = React.createContext<IAgreementsContext | undefined>(undefined);

/*
* Main/App is responsible for loadAgreements() / refreshAgreements()
* Store agreements, loading, lastRefreshed, and a refresh() function in a context
* Any page/component can read the current list and trigger refresh without threading props everywhere
*/
export const useAgreements = (): IAgreementsContext => {
  const ctx = React.useContext(AgreementsContext);
  if (ctx === undefined) throw new Error("useAgreements must be used within AgreementsContext.Provider");
  return ctx;
};
