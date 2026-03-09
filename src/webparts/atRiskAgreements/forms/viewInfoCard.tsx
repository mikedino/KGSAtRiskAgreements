import * as React from "react";
import { Typography, Card, CardContent, Grid, Box } from "@mui/material";
import { IRiskAgreementItem, IAttachmentInfo } from "../data/props";
import AttachmentsList from "./viewAttachmentsList";
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { formatCurrency, formatDate } from "../services/utils";

type ReadOnlyProps = {
    label: string;
    value?: React.ReactNode;
    xs?: number;
    md?: number;
};

const ReadOnly = ({ label, value, xs = 12, md = 6 }: ReadOnlyProps): JSX.Element => (
    <Grid size={{ xs, md }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{label}</Typography>
        <Typography variant="body1" fontSize="14px" >{value || "—"}</Typography>
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
                {item.contractId ? (
                    <>
                        <ReadOnly label="JAMIS Invoice No." value={item.invoice} />
                        <ReadOnly label="Has Subcontract?" value={item.hasSubcontract ? "Yes" : "No"} />
                    </>
                ) : (
                    <ReadOnly label="Contract Name" value={item.contractName} />
                )}
                <ReadOnly label="Contract Type" value={item.contractType} />
                <ReadOnly label="Entity" value={item.entity} />
                <ReadOnly label="Risk Start" value={formatDate(item.riskStart)} />
                <ReadOnly label="Risk End" value={formatDate(item.riskEnd)} />
                {item.contractId && (<ReadOnly label="Contractual PoP End" value={formatDate(item.popEnd)} />)}
                <ReadOnly label="Risk Funding Requested" value={formatCurrency(item.riskFundingRequested)} />
                <ReadOnly label="Operating Group" value={item.og} />
                <ReadOnly label="Project Manager" value={item.projectMgr?.Title} />
                <ReadOnly label="Contract Manager" value={item.contractMgr?.Title} />
            </Grid>

            <Grid container sx={{ mt: 2 }}>
                <ReadOnly label="Justification" value={item.riskJustification} xs={12} md={12} />
            </Grid>

            <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                    <AttachFileIcon sx={{ transform: "rotate(25deg)", fontSize: "medium", marginRight: .5 }} />
                    Attachments
                </Typography>
                <AttachmentsList attachments={attachments} loading={attachmentsLoading} />
            </Box>

        </CardContent>
    </Card>
);


export default AgreementInfoCard;