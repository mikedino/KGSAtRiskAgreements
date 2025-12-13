import * as React from "react";
import { Grid } from "@mui/material";
import InfoCard from "../ui/infoCard";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import ErrorOutline from "@mui/icons-material/ErrorOutline";

const MyWork: React.FC = () => {
  
  return (
    <Grid container spacing={3}>

      <Grid size={4}>
        <InfoCard
          title="Pending Approvals"
          value={1}
          subtitle="Awaiting your review"
          icon={<ErrorOutline />}
          iconColor="error"
        />
      </Grid>

      <Grid size={4}>
        <InfoCard
          title="My Pending"
          value={2}
          subtitle="In approval process"
          icon={<AccessTimeIcon />}
          iconColor="warning"
        />
      </Grid>

      <Grid size={4}>
        <InfoCard
          title="Approved"
          value={5}
          subtitle="Successfully approved"
          icon={<CheckCircleOutline />}
          iconColor="success"
        />
      </Grid>

    </Grid>
  );
};

export default MyWork;
