import * as React from "react";
import { Card, Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  contentHeight?: number | string;
  action?: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, children, contentHeight = 300, action }) => {
  const theme = useTheme();

  return (
    <Card
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        height: "100%",
        backgroundColor: theme.custom?.cardBg,
        border: "1px solid",
        borderColor: theme.custom?.cardBorder
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 1.5 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 500, color: "text.primary" }}>
          {title}
        </Typography>
        {action}
      </Box>
      <Box sx={{ height: contentHeight }}>
        {children}
      </Box>
    </Card>
  );
};
