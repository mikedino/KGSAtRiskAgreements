import * as React from "react";
import { Box, Button, Grid, Stack, Tooltip } from "@mui/material";
import InfoCard from "../ui/InfoCard";
import { useAgreements } from "../services/agreementsContext";
import { ContextInfo } from "gd-sprest";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import { IRiskAgreementItem, IWorkflowRunItem, ActionDecision } from "../data/props";
import { buildWorkflowState, WorkflowStepWithStatus } from "../services/workflowState";
import { RiskAgreementWorkflow } from "../services/workflowModel";
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
  myDecision?: ActionDecision;
  myDecisionDate?: string;
  myDecisionLabel?: string; // e.g. "CEO Approval"
  runNumber?: number;
  isModReview?: boolean;
}

//Instead of passing around IRiskAgreementItem everywhere, introduce a view model
//Single source of truth for My Work
interface MyWorkItem {
  item: IRiskAgreementItem;
  run: IWorkflowRunItem;
  workflow: WorkflowStepWithStatus[];
  summary: AgreementWorkflowSummary;
}

// Pre-defined view key
type MyWorkViewKey =
  | "action"
  | "pending"
  | "approved"
  | "resolved"
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
  decision: ActionDecision;
  date?: string;
  label?: string;
}

// Helper to label step keys
const getStepLabel = (stepKey?: string): string | undefined => {
  if (!stepKey) return undefined;
  const step = RiskAgreementWorkflow.find(s => s.key === stepKey);
  return step?.label;
};

const MyWork: React.FC = () => {

  // Agreements context provider -- also get MY ACTIONS
  const { agreements, runByAgreementId, myActions, loadMyActions } = useAgreements();

  const userId = ContextInfo.userId;
  const history = useHistory();
  const theme = useTheme();
  const [selectedView, setSelectedView] = React.useState<MyWorkViewKey>("action");

  React.useEffect(() => {
    loadMyActions(userId).catch((err) => console.error("Error loading my actions", err));
  }, [userId, loadMyActions]);

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
    return (agreements ?? [])
      .map(item => {
        const run = runByAgreementId.get(item.Id);
        if (!run) return undefined;

        // ✅ no actions on MyWork
        const workflow = buildWorkflowState(item, run, []);

        return {
          item,
          run,
          workflow,
          summary: buildWorkflowSummaryFromSteps(workflow)
        };
      })
      .filter((x): x is MyWorkItem => !!x);
  }, [agreements, runByAgreementId]);

  // cache review info map once, then re-use for building the reviewed list and enriching the summary
  // find all items I had action on and return decision, date & label
  // passed to the card
  const myReviewInfoMap = React.useMemo(() => {
    const map = new Map<number, MyReviewInfo>();

    (myActions ?? [])
      .filter(a =>
        (a.actionType === "Approved" || a.actionType === "Rejected") &&
        a.actor?.Id === userId
      )
      .forEach(a => {
        const agreementId = a.agreement?.Id ?? a.agreement.Id;
        if (typeof agreementId !== "number") return;

        const existing = map.get(agreementId);

        const newTime = a.actionCompletedDate ? new Date(a.actionCompletedDate).getTime() : 0;
        const oldTime = existing?.date ? new Date(existing.date).getTime() : 0;

        if (!existing || newTime > oldTime) {
          map.set(agreementId, {
            decision: a.actionType as ActionDecision,
            date: a.actionCompletedDate,
            label: getStepLabel(a.stepKey)
          });
        }
      });

    return map;
  }, [myActions, userId]);


  //Enrich the summary for reviewed cards (also uses the map)
  const getCardWorkflow = (w: MyWorkItem): AgreementWorkflowSummary => {
    const review = myReviewInfoMap.get(w.item.Id);

    const base = review
      ? {
        ...w.summary,
        myDecision: review.decision,
        myDecisionDate: review.date,
        myDecisionLabel: review.label
      }
      : w.summary;

    return {
      ...base,
      runNumber: w.run.runNumber,
      isModReview: w.item.araStatus === "Mod Review" || w.run.runNumber > 1
    };
  };

  // get items for counts and views
  const myActionItems = workflowItems.filter(w => w.run.pendingApproverId === userId);
  const myAgreements = workflowItems.filter(w => w.item.Author?.Id === userId);
  const myPendingItems = myAgreements.filter(w =>
    w.item.araStatus === "Under Review" || w.item.araStatus === "Mod Review"
  );
  // Approved (open) = Approved only
  const myApprovedItems = myAgreements.filter(w => w.item.araStatus === "Approved");
  // Resolved = Resolved only
  const myResolvedItems = myAgreements.filter(w => w.item.araStatus === "Resolved");
  const myReviewedItems = workflowItems.filter(w => myReviewInfoMap.has(w.item.Id));

  // compute total approved for top card
  const myApprovedTotal = myAgreements.filter(w =>
    w.item.araStatus === "Approved" || w.item.araStatus === "Resolved"
  );

  // wrap in useMemo to avoid recomputing viewCounts ever render when nothing changed
  const myAgreementViews = React.useMemo<MyWorkView[]>(() => [
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
      label: "Approved (open)",
      tooltip: "My submitted agreements that are approved and not yet resolved",
      getItems: () => myApprovedItems
    },
    {
      key: "resolved",
      label: "Resolved",
      tooltip: "My submitted agreements that are resolved",
      getItems: () => myResolvedItems
    },
    {
      key: "all",
      label: "All",
      tooltip: "All my submitted agreements",
      getItems: () => myAgreements
    }
  ], [myActionItems, myReviewedItems, myPendingItems, myApprovedItems, myResolvedItems, myAgreements]);

  // compute view counts for each chip
  const viewCounts = React.useMemo(() => {
    return myAgreementViews.reduce<Record<MyWorkViewKey, number>>((acc, v) => {
      acc[v.key] = v.getItems().length;
      return acc;
    }, {} as Record<MyWorkViewKey, number>);
  }, [myAgreementViews]);

  // active list of items is just a lookup
  const activeItems = React.useMemo(() => {
    const view = myAgreementViews.find(v => v.key === selectedView);
    return view ? view.getItems() : myActionItems;
  }, [myAgreementViews, selectedView, myActionItems]);

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

      case "resolved":
        return {
          title: "No resolved agreements",
          description: "Once your approved agreements are resolved, they will appear here."
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
            value={myApprovedTotal.length}
            subtitle="Agreements you submitted that are approved OR resolved"
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