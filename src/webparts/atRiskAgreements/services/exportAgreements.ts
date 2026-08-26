import { AgreementGridRow } from "../components/AgreementsGrid";
import { formatCurrency, formatDate } from "./utils";

const escapeCsv = (value: string | number | boolean | undefined): string => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, "\"\"")}"`;
};

/**
 * Lightweight CSV export keeps the page self-contained without adding another
 * dependency while still giving users a usable spreadsheet handoff.
 */
export const exportAgreementRows = (
    rows: AgreementGridRow[],
    fileName: string
): void => {
    const header = [
        "Agreement",
        "Entity",
        "Project/Program",
        "Contract ID",
        "Invoice",
        "Contract Type",
        "Status",
        "ATP Recd",
        "Pending",
        "Risk Start",
        "Risk End",
        "PoP End",
        "Funding Requested",
        "Created",
        "Created By",
        "Project Manager",
        "Contract Manager",
        "Operating Group",
        "Line of Business",
        "Has Subcontract?"
    ];

    const lines = rows.map((row: AgreementGridRow): string => {
        return [
            row.Title,
            row.entity,
            row.contractId ? row.projectName : row.programName,
            row.contractId ?? "New Award",
            row.invoice ?? "New Award",
            row.contractType,
            row.araStatus,
            row.atpReceived,
            row.pendingWorkflowRole,
            formatDate(row.riskStart),
            formatDate(row.riskEnd),
            row.popEnd ? formatDate(row.popEnd): "",
            formatCurrency(row.riskFundingRequested),
            formatDate(row.Created),
            row.Author.Title,
            row.projectMgr?.Title,
            row.contractMgr?.Title,
            row.og,
            row.lob,
            row.hasSubcontract ? "Yes" : "No"
            
            // row.authorization.contractId ?? "",
            // row.authorization.donorEntity ?? "",
            // row.authorization.receivingEntity ?? "",
            // row.authorization.og ?? "",
            // row.authorization.lob ?? "",
            // authorizationStatusLabels[row.authorization.authorizationStatus],
            // row.currentRun ? workflowRunStatusLabels[row.currentRun.runStatus] : "",
            // row.currentRun?.pendingRole ? workflowRoleLabels[row.currentRun.pendingRole] : "",
            // row.currentRun?.stepAssignedDate ?? "",
            // row.authorization.baseGrandTotal ?? "",
            // row.authorization.approvedGrandTotal ?? "",
            // row.authorization.modCount ?? "",
            // row.authorization.periodEnd ?? "",
            // row.authorization.Modified ?? ""
        ].map((value: string | number | boolean | undefined) => escapeCsv(value)).join(",");
    });

    const csv = [header.map(escapeCsv).join(","), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
};
