import * as React from "react";
import { IRiskAgreementItem } from "../data/props";

export interface IAgreementsContext {
  agreements: IRiskAgreementItem[];
  isRefreshing: boolean;
  lastRefreshed: string | undefined;
  refresh: (override?: boolean) => Promise<void>;
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
