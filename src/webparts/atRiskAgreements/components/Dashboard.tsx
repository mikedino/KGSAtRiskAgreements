import * as React from "react";
import { Grid } from "@mui/material";
import InfoCard from "../ui/infoCard";

import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import HourglassTop from "@mui/icons-material/HourglassTop";

const Dashboard: React.FC = () => {
  return (

    <Grid container spacing={3}>

      <Grid size={{ lg: 2, md: 4, sm: 6 }}>
        <InfoCard
          title="Total Agreements"
          value={62}
          subtitle="All time"
          icon={<TrendingUpIcon />}
          iconColor="success"
        />
      </Grid>

      <Grid size={{ lg: 2, md: 4, sm: 6 }}>
        <InfoCard
          title="Pending Approvals"
          value={16}
          subtitle="Require action"
          icon={<AccessTimeIcon />}
          iconColor="error"
        />
      </Grid>

      <Grid size={{ lg: 2, md: 4, sm: 6 }}>
        <InfoCard
          title="Approved This Month"
          value={24}
          subtitle="+12% from last month"
          icon={<CheckCircleIcon />}
          iconColor="success"
        />
      </Grid>

      <Grid size={{ lg: 2, md: 4, sm: 6 }}>
        <InfoCard
          title="Expiring Soon"
          value={3}
          subtitle="In next 30 days"
          icon={<HourglassTop />}
          iconColor="warning"
        />
      </Grid>

      <Grid size={{ lg: 2, md: 4, sm: 6 }}>
        <InfoCard
          title="Avg Approval Time"
          value="4.8d"
          subtitle="-0.3d from last month"
          icon={<AccessTimeIcon />}
          iconColor="info"
        />
      </Grid>

      <Grid size={{ lg: 2, md: 4, sm: 6 }}>
        <InfoCard
          title="At-Risk Value"
          value="$1.88M"
          subtitle="Active pipeline"
          icon={<MonetizationOnIcon />}
          iconColor="warning"
        />
      </Grid>

    </Grid>
  );
};

export default Dashboard;
