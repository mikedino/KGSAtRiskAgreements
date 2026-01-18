import * as React from "react";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export interface EmptyStateProps {
    title: string;
    description?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description }) => {

    const theme = useTheme();

    return (
        <Box
            sx={{
                p: 3,
                textAlign: "center",
                borderRadius: 3,
                backgroundColor: theme.custom?.cardBg,
                border: "1px dashed",
                borderColor: theme.custom?.cardBorder
            }}
        >
            <Typography variant="subtitle1" fontWeight={600}>
                {title}
            </Typography>

            {description && (
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                >
                    {description}
                </Typography>
            )}
        </Box>
    );
};

export default EmptyState;