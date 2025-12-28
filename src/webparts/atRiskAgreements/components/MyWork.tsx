import * as React from "react";
import { useState, useEffect } from "react";
import { Grid } from "@mui/material";
import InfoCard from "../ui/InfoCard";
import { DataSource } from "../data/ds";
import { ContextInfo } from "gd-sprest";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import { IRiskAgreementItem } from "../data/props";

const MyWork: React.FC = () => {

  const [myPendingItems, setMyPendingItems] = useState<IRiskAgreementItem[]>([]);
  const [myApprovedItems, setMyApprovedItems] = useState<IRiskAgreementItem[]>([]);
  
  useEffect(() => {
    const items = DataSource.Agreements.filter((a) => a.Author.Id === ContextInfo.userId);
    const pending = items.filter((i) => i.araStatus === "Draft" || i.araStatus === "Submitted" || i.araStatus === "Under Review");
    const approved = items.filter((i) => i.araStatus === "Approved");
    setMyPendingItems(pending);
    setMyApprovedItems(approved);
  }, [])
  
  return (
    <Grid container spacing={3}>

      <Grid size={4}>
        <InfoCard
          title="Pending Approvals"
          value={0}
          subtitle="Awaiting your review"
          icon={<ErrorOutline />}
          iconColor="error"
        />
      </Grid>

      <Grid size={4}>
        <InfoCard
          title="My Pending"
          value={myPendingItems.length}
          subtitle="In approval process"
          icon={<AccessTimeIcon />}
          iconColor="warning"
        />
      </Grid>

      <Grid size={4}>
        <InfoCard
          title="Approved"
          value={myApprovedItems.length}
          subtitle="Successfully approved"
          icon={<CheckCircleOutline />}
          iconColor="success"
        />
      </Grid>

    </Grid>
  );
};

export default MyWork;
