import * as React from "react";
import { Box, Button, Grid, Stack, Tooltip } from "@mui/material";
import InfoCard from "../ui/InfoCard";
import { DataSource } from "../data/ds";
import { ContextInfo } from "gd-sprest";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import { IRiskAgreementItem } from "../data/props";
import { buildWorkflowState, WorkflowStepWithStatus } from "../services/workflowState";
import AgreementCard from "../ui/AgreementCard";
import { useHistory } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import EmptyState, { EmptyStateProps } from "../ui/EmptyStateBox";

export interface AgreementWorkflowSummary {
  statusLabel: string;
  statusColor: "success" | "warning" | "error" | "default";
  currentApprover?: string;
  sentDate?: string;
  // only for "My Reviewed" view
  myDecision?: "Approved" | "Rejected";
  myDecisionDate?: string;
  myDecisionLabel?: string; // e.g. "CEO Approval"
}

//Instead of passing around IRiskAgreementItem everywhere, introduce a view model
//Single source of truth for My Work
interface MyWorkItem {
  item: IRiskAgreementItem;
  workflow: WorkflowStepWithStatus[];
  summary: AgreementWorkflowSummary;
}

// Pre-defined view key
type MyWorkViewKey =
  | "action"
  | "pending"
  | "approved"
  | "all"
  | "reviewed";

interface MyWorkView {
  key: MyWorkViewKey;
  label: string;
  tooltip: string;
  getItems: () => MyWorkItem[];
}

// for my reviewed items
export interface MyReviewInfo {
  decision: "Approved" | "Rejected";
  date?: string;
  label?: string;
}

const MyWork: React.FC = () => {

  const userId = ContextInfo.userId;
  const history = useHistory();
  const theme = useTheme();
  const [selectedView, setSelectedView] = React.useState<MyWorkViewKey>("action");

  // Summary Builder - this takes steps, not the item = no recompute.
  const buildWorkflowSummaryFromSteps = (steps: WorkflowStepWithStatus[]): AgreementWorkflowSummary => {

    const rejected = steps.find(s => s.status === "Rejected");
    if (rejected) {
      return { statusLabel: "Rejected", statusColor: "error" };
    }

    const completed = steps.find(
      s => s.status === "Approved" && s.completesOnApprove
    );
    if (completed) {
      return { statusLabel: "Approved", statusColor: "success" };
    }

    const current = steps.find(s => s.status === "Current");
    if (current) {
      return {
        statusLabel: `Pending ${current.label}`,
        statusColor: "warning",
        currentApprover: current.approverName,
        sentDate: current.sentDate
      };
    }

    return { statusLabel: "In Progress", statusColor: "default" };
  };

  //Cache summaries so they don’t rebuild on every render
  const workflowItems = React.useMemo<MyWorkItem[]>(() => {
    return DataSource.Agreements.map(item => {
      const workflow = buildWorkflowState(item);
      return {
        item,
        workflow,
        summary: buildWorkflowSummaryFromSteps(workflow)
      };
    });
  }, [DataSource.Agreements]);

  // find all items I had action on and return decision, date & label
  const getMyReviewInfo = (w: MyWorkItem, userId: number): MyReviewInfo | undefined => {
    const matches = w.workflow
      .filter(step => {
        if (!step.approverField) return false;
        if (step.status !== "Approved" && step.status !== "Rejected") return false;

        const approver = w.item[step.approverField];
        return approver?.Id === userId;
      })
      .map(step => ({
        decision: step.status as "Approved" | "Rejected",
        // prefer the workflow step date (set from signDateField in your builder), fallback to signDateField directly
        date: step.date || (step.signDateField ? String(w.item[step.signDateField] ?? "") : ""),
        label: step.label
      }));

    if (matches.length === 0) return undefined;

    // If multiple, pick most recent decision date (or just first if dates missing)
    matches.sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      return bTime - aTime;
    });

    return matches[0];
  };

  // cache review info map once, then re-use for building the reviewed list and enriching the summary
  // passed to the card
  const myReviewInfoMap = React.useMemo(() => {
    const map = new Map<number, MyReviewInfo>();

    workflowItems.forEach(w => {
      const info = getMyReviewInfo(w, userId);
      if (info) map.set(w.item.Id, info);
    });

    return map;
  }, [workflowItems, userId]);

  //Enrich the summary for reviewed cards (also uses the map)
  const getCardWorkflow = (w: MyWorkItem): AgreementWorkflowSummary => {
    const review = myReviewInfoMap.get(w.item.Id);

    return review
      ? {
        ...w.summary,
        myDecision: review.decision,
        myDecisionDate: review.date,
        myDecisionLabel: review.label
      }
      : w.summary;
  };

  // get items for counts and views
  const myActionItems = workflowItems.filter(w => {
    const current = w.workflow.find(s => s.status === "Current");
    if (!current?.approverField) return false;

    const approver = w.item[current.approverField];
    return approver?.Id === userId;
  });
  const myAgreements = workflowItems.filter(w => w.item.Author?.Id === userId);
  const myApprovedItems = myAgreements.filter(w => w.summary.statusLabel === "Approved");
  const myPendingItems = myAgreements.filter(w => w.summary.statusLabel.startsWith("Pending"));
  const myReviewedItems = workflowItems.filter(w => myReviewInfoMap.has(w.item.Id));

  const myAgreementViews: MyWorkView[] = [
    {
      key: "action",
      label: "My Action",
      tooltip: "Agreements requiring your review & action",
      getItems: () => myActionItems
    },
    {
      key: "reviewed",
      label: "My Reviewed",
      tooltip: "Agreements you have reviewed as an approver",
      getItems: () => myReviewedItems
    },
    {
      key: "pending",
      label: "Pending",
      tooltip: "My submitted agreements Under Review",
      getItems: () => myPendingItems
    },
    {
      key: "approved",
      label: "Approved",
      tooltip: "My submitted agreements that are approved",
      getItems: () => myApprovedItems
    },
    {
      key: "all",
      label: "All",
      tooltip: "All my submitted agreements",
      getItems: () => myAgreements
    }
  ];

  // compute view counts for each chip
  const viewCounts = React.useMemo(() => {
    return myAgreementViews.reduce<Record<MyWorkViewKey, number>>((acc, v) => {
      acc[v.key] = v.getItems().length;
      return acc;
    }, {} as Record<MyWorkViewKey, number>);
  }, [myAgreementViews]);

  // active list of items is  just a lookup
  const activeItems = React.useMemo(() => {
    const view = myAgreementViews.find(v => v.key === selectedView);
    return view ? view.getItems() : myActionItems;
  }, [myAgreementViews, selectedView, myActionItems, myPendingItems, myReviewedItems]);

  const getEmptyStateContent = (view: MyWorkViewKey): EmptyStateProps => {
    switch (view) {
      case "action":
        return {
          title: "Nothing needs your action right now",
          description: "You don’t have any agreements waiting on your review."
        };

      case "pending":
        return {
          title: "No pending agreements",
          description: "You haven’t submitted any agreements that are currently in review."
        };

      case "reviewed":
        return {
          title: "You haven’t reviewed any agreements yet",
          description: "Once you approve or reject an agreement, it will appear here."
        };

      case "approved":
        return {
          title: "No approved agreements",
          description: "Agreements you submit and get approved will show here."
        };

      case "all":
      default:
        return {
          title: "No agreements found",
          description: "You haven’t submitted any agreements yet."
        };
    }
  };


  return (
    <>
      <Grid container spacing={3}>
        <Grid size={4}>
          <InfoCard
            title="Pending My Approval"
            value={myActionItems.length}
            subtitle="Awaiting your review/approval"
            icon={<ErrorOutline />}
            iconColor="error"
          //onClick={() => setView("myAction")}
          />
        </Grid>

        <Grid size={4}>
          <InfoCard
            title="My Agreements Pending"
            value={myPendingItems.length}
            subtitle="Agreements you submitted in the approval process"
            icon={<AccessTimeIcon />}
            iconColor="warning"
          //onClick={() => setView("pendingApprovals")}
          />
        </Grid>

        <Grid size={4}>
          <InfoCard
            title="Approved"
            value={myApprovedItems.length}
            subtitle="Agreements you submitted that are approved"
            icon={<CheckCircleOutline />}
            iconColor="success"
          //onClick={() => setView("myAgreements")}
          />
        </Grid>
      </Grid>

      {/* PRE-FILTERED VIEWS */}
      <Box
        sx={{
          my: 3,
          p: 1,
          bgcolor: theme.custom?.cardBg,
          border: "1px solid",
          borderColor: theme.custom?.cardBorder,
          borderRadius: 3
        }}
      >
        <Stack direction="row" alignItems="center" flexWrap="wrap">

          {myAgreementViews.map(view => {
            const isSelected = selectedView === view.key;

            return (
              <Tooltip
                key={view.key}
                title={view.tooltip}
                placement="top"
                arrow
              >
                <Button
                  size="small"
                  variant={isSelected ? "contained" : "text"}
                  color="primary"
                  onClick={() => setSelectedView(view.key)}
                  sx={{
                    textTransform: "none",
                    fontWeight: 400,
                    borderRadius: 2,
                    px: 1.5,
                    py: "2px",
                    fontFamily: "Roboto,Segoe UI,Arial,sans-serif !important",

                    // Unselected styling
                    ...(!isSelected && {
                      color: "text.secondary",
                      "&:hover": {
                        backgroundColor: "action.hover",
                        color: "text.primary"
                      }
                    })
                  }}
                >
                  {view.label} ({viewCounts[view.key]})
                </Button>
              </Tooltip>
            );
          })}
        </Stack>

      </Box>

      <Box sx={{ mt: 3 }}>
        {activeItems.length === 0 ? (
          <EmptyState {...getEmptyStateContent(selectedView)} />
        ) : (
          <Grid container spacing={3}>
            {activeItems.map(w => (
              <Grid key={w.item.Id} size={6}>
                <AgreementCard
                  item={w.item}
                  workflow={getCardWorkflow(w)}
                  onClick={() => history.push(`/view/${w.item.Id}`)}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

    </>
  )
};

export default MyWork;