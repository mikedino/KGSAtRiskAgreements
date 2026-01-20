import * as React from "react";
import { Card, Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, children }) => {
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
      <Typography sx={{ fontSize: 16, fontWeight: 500, color: "text.primary", mb: 1.5 }}>
        {title}
      </Typography>
      <Box sx={{ height: 300 }}>
        {children}
      </Box>
    </Card>
  );
};
