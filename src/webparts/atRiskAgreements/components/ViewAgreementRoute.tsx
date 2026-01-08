import * as React from "react";
import { ContextInfo } from "gd-sprest";
import { DataSource } from "../data/ds";
import { IRiskAgreementItem } from "../data/props";
import { RiskAgreementService } from "../services/araService";
import RiskAgreementView from "../forms/araView";
import { Alert, Snackbar } from "@mui/material";

interface ViewAgreementRouteProps {
    match: {
        params: {
            id: string;
        };
    };
}

const ViewAgreementRoute: React.FC<ViewAgreementRouteProps> = ({ match }) => {
    const id = match.params.id;
    const currentUserEmail = ContextInfo.userEmail;

    const initialItem = DataSource.Agreements.find(
        (a) => a.Id.toString() === id
    );

    const [item, setItem] = React.useState<IRiskAgreementItem | undefined>(
        initialItem
    );

    const [snackbar, setSnackbar] = React.useState<{
        message: string;
        severity: "success" | "error";
    } | null>(null);

    const onApprove = async (comment?: string): Promise<void> => {
        if (!item) return;

        const updated = await RiskAgreementService.submitDecision(
            item,
            "Approved",
            comment
        );

        setItem(updated);
        setSnackbar({
            message: "Agreement approved successfully",
            severity: "success",
        });
    };

    const onReject = async (comment?: string): Promise<void> => {
        if (!item) return;

        const updated = await RiskAgreementService.submitDecision(
            item,
            "Rejected",
            comment
        );

        setItem(updated);
        setSnackbar({
            message: "Agreement rejected successfully",
            severity: "error",
        });
    };

    if (!item) {
        return <div>Agreement not found</div>;
    }

    return (
        <>
            <RiskAgreementView
                item={item}
                currentUserEmail={currentUserEmail}
                onApprove={onApprove}
                onReject={onReject}
            />

            {snackbar && (
                <Snackbar
                    open
                    autoHideDuration={4000}
                    onClose={() => setSnackbar(null)}
                    anchorOrigin={{ vertical: "top", horizontal: "right" }}
                >
                    <Alert
                        severity={snackbar.severity}
                        onClose={() => setSnackbar(null)}
                        variant="filled"
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            )}
        </>
    );
};

export default ViewAgreementRoute;