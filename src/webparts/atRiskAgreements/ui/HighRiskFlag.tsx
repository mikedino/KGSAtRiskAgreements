import * as React from "react";
import { Box, Tooltip } from "@mui/material";
import FlagIcon from "@mui/icons-material/Flag";
import { IRiskAgreementItem } from "../data/props";

export const HIGH_RISK_ATR_LABEL = "This ATR is considered high risk";

export const isHighRiskAtr = (item: Pick<IRiskAgreementItem, "atpReceived">): boolean =>
    item.atpReceived === "No";

type HighRiskFlagProps = {
    item: Pick<IRiskAgreementItem, "atpReceived">;
    size?: "small" | "medium";
};

const HighRiskFlag = ({ item, size = "small" }: HighRiskFlagProps): JSX.Element => {
    if (!isHighRiskAtr(item)) return <></>;

    return (
        <Tooltip title={HIGH_RISK_ATR_LABEL} arrow>
            <Box
                component="span"
                role="img"
                aria-label={HIGH_RISK_ATR_LABEL}
                sx={{ display: "inline-flex", color: "error.main", lineHeight: 0 }}
            >
                <FlagIcon fontSize={size} titleAccess={HIGH_RISK_ATR_LABEL} />
            </Box>
        </Tooltip>
    );
};

export default HighRiskFlag;
