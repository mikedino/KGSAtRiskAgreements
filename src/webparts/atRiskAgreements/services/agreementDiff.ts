import { IRiskAgreementItem, IPeoplePicker } from "../data/props";

export type FieldDelta = {
    label: string;
    from: string;
    to: string;
};

export type AgreementDelta = Record<string, FieldDelta>;

const fmtDate = (value?: string): string => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value; // fallback
    return d.toLocaleDateString();
};

const fmtCurrency0 = (n?: number): string => {
    const num = typeof n === "number" ? n : 0;
    return num.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
};

const fmtText = (s?: string): string => (s ?? "").trim();

const fmtPerson = (p?: IPeoplePicker): string => {
    if (!p?.Id) return "";
    const name = (p.Title ?? "").trim();
    const email = (p.EMail ?? "").trim();
    return email ? `${name} (${email})` : name;
};

const same = (a: string, b: string): boolean => a.trim() === b.trim();

export const buildAgreementDelta = (before: IRiskAgreementItem, after: IRiskAgreementItem): AgreementDelta => {
    const delta: AgreementDelta = {};

    const add = (key: string, label: string, from: string, to: string): void => {
        if (!same(from, to)) delta[key] = { label, from, to };
    };

    add("projectName", "Project/Contract Name", fmtText(before.projectName), fmtText(after.projectName));
    add("contractId", "Contract ID", fmtText(before.contractId), fmtText(after.contractId));
    add("invoice", "Invoice", fmtText(before.invoice), fmtText(after.invoice));
    add("contractType", "Contract Type", fmtText(before.contractType), fmtText(after.contractType));
    add("riskStart", "Risk Start", fmtDate(before.riskStart), fmtDate(after.riskStart));
    add("riskEnd", "Risk End", fmtDate(before.riskEnd), fmtDate(after.riskEnd));
    add("popEnd", "PoP End", fmtDate(before.popEnd), fmtDate(after.popEnd));
    add("entity", "Entity", fmtText(before.entity), fmtText(after.entity));
    add("projectMgr", "Project Manager", fmtPerson(before.projectMgr), fmtPerson(after.projectMgr));
    add("contractMgr", "Contract Manager", fmtPerson(before.contractMgr), fmtPerson(after.contractMgr));
    add("riskReason", "Risk Reason", fmtText(before.riskReason), fmtText(after.riskReason));
    add("riskFundingRequested", "Funding Requested", fmtCurrency0(before.riskFundingRequested), fmtCurrency0(after.riskFundingRequested));
    add("riskJustification", "Risk Justification", fmtText(before.riskJustification), fmtText(after.riskJustification));
    add("contractName", "Contract Name", fmtText(before.contractName), fmtText(after.contractName));
    add("programName", "Program Name", fmtText(before.programName), fmtText(after.programName));
    add("araStatus", "Status", fmtText(before.araStatus), fmtText(after.araStatus));
    add("entityGM", "Entity GM", fmtPerson(before.entityGM), fmtPerson(after.entityGM));

    return delta;
};

export const formatDeltaSummary = (delta: AgreementDelta, max = 4): string => {
    const entries = Object.values(delta);
    if (entries.length === 0) return "No business field changes detected.";

    const parts = entries.slice(0, max).map(d => `${d.label}: ${d.from || "—"} → ${d.to || "—"}`);
    const extra = entries.length > max ? ` (+${entries.length - max} more)` : "";
    return parts.join("; ") + extra;
};
