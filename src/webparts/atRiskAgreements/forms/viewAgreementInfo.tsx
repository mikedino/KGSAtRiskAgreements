import * as React from "react";
import { Typography, Card, CardContent, Grid, Box } from "@mui/material";
import { IRiskAgreementItem, IAttachmentInfo } from "../data/props";
import AttachmentsList from "./viewAttachmentsList";

const ReadOnly = ({ label, value }: { label: string; value?: React.ReactNode; }): JSX.Element => (
    <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{label}</Typography>
        <Typography variant="body1">{value || "—"}</Typography>
    </Grid>
);

const AgreementInfoCard = ({
    item,
    attachments,
    attachmentsLoading
}: {
    item: IRiskAgreementItem;
    attachments: IAttachmentInfo[];
    attachmentsLoading: boolean;
}): JSX.Element => (
    <Card variant="outlined">
        <CardContent>

            <Typography variant="h6" gutterBottom>Agreement Information</Typography>

            <Grid container spacing={2}>
                <ReadOnly label="Project / Contract" value={item.projectName} />
                <ReadOnly label="Invoice" value={item.invoice} />
                <ReadOnly label="Contract Type" value={item.contractType} />
                <ReadOnly label="Entity" value={item.entity} />
                <ReadOnly label="Risk Start" value={new Date(item.riskStart).toLocaleDateString()} />
                <ReadOnly label="Risk End" value={new Date(item.riskEnd).toLocaleDateString()} />
                <ReadOnly label="PoP End" value={new Date(item.popEnd).toLocaleDateString()} />
                <ReadOnly label="Risk Funding Requested" value={`$${item.riskFundingRequested.toLocaleString()}`} />
                <ReadOnly label="Project Manager" value={item.projectMgr?.Title} />
                <ReadOnly label="Contract Manager" value={item.contractMgr?.Title} />
            </Grid>

            <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>Attachments</Typography>
                <AttachmentsList attachments={attachments} loading={attachmentsLoading} />
            </Box>

        </CardContent>
    </Card>
);


export default AgreementInfoCard;