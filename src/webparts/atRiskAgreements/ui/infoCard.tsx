import * as React from "react";
import { Box, Card, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export interface IInfoCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode; // any MUI icon
    iconColor?: "primary" | "secondary" | "error" | "warning" | "info" | "success";
}

const InfoCard: React.FC<IInfoCardProps> = ({ title, value, subtitle, icon, iconColor = "secondary" }) => {

    const theme = useTheme();
    const resolvedColor = theme.palette[iconColor].main;

    return (
        <Card
            elevation={0}
            sx={{
                p: 2.5,
                borderRadius: 3,
                height: "100%",         
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                backgroundColor: theme.custom?.cardBg,
                border: "1px solid",
                borderColor: theme.custom?.cardBorder
            }}
        >
            {/* HEADER + ICON */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography sx={{ fontSize: 16, fontWeight: 500, color: "text.primary" }}>
                    {title}
                </Typography>

                {icon && (
                    <Box sx={{ color: resolvedColor, fontSize: 22 }}>
                        {icon}
                    </Box>
                )}
            </Box>

            {/* VALUE */}
            <Typography sx={{ fontSize: 32, fontWeight: 700, mt: 1, color: "text.primary" }}>
                {value}
            </Typography>

            {/* SUBTEXT */}
            {subtitle && (
                <Typography sx={{ fontSize: 14, color: "text.secondary", mt: 0.5 }}>
                    {subtitle}
                </Typography>
            )}
        </Card>
    );
};

export default InfoCard;