/**
 * INNER APP - only mounts when config check is ready:
 * useAgreementsData
 * actions/runs/dashboard state
 * submit handlers
 * routes
 * backdrop/success/dialogs 
 */
import * as React from "react";
import { useState } from "react";
import { Switch, Route, Redirect, useHistory } from "react-router-dom";
import MyWork from "./components/MyWork";
import Agreements from "./components/AgreementsGrid";
import Dashboard from "./components/Dashboard";
import Admin from "./components/Admin";
import NavHeader from "./ui/NavHeader";
import { IAppProps, IRiskAgreementItem, IWorkflowActionItem, IWorkflowRunItem } from "./data/props";
import RiskAgreementForm, { CancelReason, formModMeta } from "./forms/araForm";
import { RiskAgreementService } from "./services/agreementService";
import AlertDialog from "./ui/Alert";
import ViewAgreementRoute from "./components/ViewAgreementRoute";
import { ApproverResolver } from "./services/defaultApprovers";
import { AgreementsContext } from "./services/agreementsContext";
import { WorkflowRunService } from "./services/runService";
import { WorkflowActionService } from "./services/actionService";
import { useAgreementsData } from "./data/agreementsDataCall";

import { ThemeProvider, CssBaseline, Box, Stack, Typography, Alert, Backdrop, Fab, AppBar, Toolbar } from "@mui/material";
import CircularProgress from '@mui/material/CircularProgress';
import CheckIcon from '@mui/icons-material/Check';
import { darkTheme } from "./styles/darkTheme";
import { lightTheme } from "./styles/lightTheme";
import { formatError } from "./services/utils";
import Strings from "../../strings";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { DataSource } from "./data/ds";
import dayjs from "dayjs";

interface IReadyAppProps extends IAppProps {
    useDarkTheme: boolean;
    setUseDarkTheme: React.Dispatch<React.SetStateAction<boolean>>;
    showDialog: boolean;
    dialogTitle: string;
    dialogMessage: string;
    setDialogProps: (title: string, message: string) => boolean;
    hideDialog: () => boolean;
}

export const AppInner: React.FC<IReadyAppProps> = ({
    wpTitle,
    context,
    useDarkTheme,
    setUseDarkTheme,
    showDialog,
    dialogTitle,
    dialogMessage,
    setDialogProps,
    hideDialog
}): JSX.Element => {
    const [showBackdrop, setShowBackdrop] = useState<boolean>(false);
    const [showProgress, setShowProgress] = useState<boolean>(false);
    const [backdropMessage, setBackdropMessage] = useState<string>("");
    const [showSuccess, setShowSuccess] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string>("");

    //my actions - only loaded for MyWork
    const [myActions, setMyActions] = React.useState<IWorkflowActionItem[]>([]);
    const [isMyActionsLoading, setIsMyActionsLoading] = React.useState(false);

    //runs and actions by agreement - only loaded for VIEW item
    const [runsByAgreementId, setRunsByAgreementId] = React.useState<Map<number, IWorkflowRunItem[]>>(new Map());
    const [actionsByAgreementId, setActionsByAgreementId] = React.useState<Map<number, IWorkflowActionItem[]>>(new Map());

    //all actions (from past year) -- only loaded for DASHBOARD
    const [dashboardActions, setDashboardActions] = React.useState<IWorkflowActionItem[]>([]);
    const [isDashboardActionsLoading, setIsDashboardActionsLoading] = React.useState(false);

    // track per-agreement load state
    const [agreementDetailLoading, setAgreementDetailLoading] = React.useState<Map<number, boolean>>(new Map());

    const history = useHistory();

    const {
        agreements,
        runByAgreementId,
        isBootLoading,
        isRefreshing,
        lastRefreshed,
        refresh,
        fatalError,
        currentUser,
        appUsers,
        appUserByUserId,
        getAppUserByUserId,
        refreshCurrentUser,
        refreshAppUsers
    } = useAgreementsData(setDialogProps, true);

    React.useEffect(() => {
        if (!currentUser) return;

        const isDark = currentUser.modePreference === "dark";
        setUseDarkTheme(isDark);
        sessionStorage.setItem("ara_theme", isDark ? "dark" : "light");
    }, [currentUser, setUseDarkTheme]);

    const hideSuccess = React.useCallback((): boolean => {
        setShowBackdrop(false);
        setShowSuccess(false);
        return true;
    }, []);

    ///////////// MY WORK / MY ACTIONS CALLBACK ////////////
    const loadMyActions = React.useCallback(async (userId: number, force = false) => {
        if (!userId || userId <= 0) return;
        if (!force && myActions.length > 0) return;

        try {
            setIsMyActionsLoading(true);
            const actions = await DataSource.getMyWorkflowActions(userId);
            setMyActions(actions ?? []);
        } catch (e) {
            console.error("loadMyActions error", e);
            setMyActions([]);
        } finally {
            setIsMyActionsLoading(false);
        }
    }, [myActions.length]);

    ///////////// AGREEMENT DETAIL AND LOAD STATE ////////////
    const isAgreementDetailLoading = React.useCallback((agreementId: number): boolean => {
        return agreementDetailLoading.get(agreementId) ?? false;
    }, [agreementDetailLoading]);

    const loadAgreementDetail = React.useCallback(async (agreementId: number, force = false): Promise<void> => {
        if (!agreementId || agreementId <= 0) return;

        // already loaded?
        if (!force && runsByAgreementId.has(agreementId) && actionsByAgreementId.has(agreementId)) return;

        // already loading?
        if (agreementDetailLoading.get(agreementId)) return;

        setAgreementDetailLoading(prev => {
            const next = new Map(prev);
            next.set(agreementId, true);
            return next;
        });

        try {
            // do BOTH calls in parallel
            const [runs, actions] = await Promise.all([
                DataSource.getWorkflowRunsByAgreement(agreementId),
                DataSource.getWorkflowActionsByAgreement(agreementId)
            ]);

            // sort runs newest first (optional)
            const sortedRuns = [...(runs ?? [])].sort((a, b) => (b.runNumber ?? 0) - (a.runNumber ?? 0));

            // sort actions newest first (recommended for timeline poppers)
            const sortedActions = [...(actions ?? [])].sort((a, b) =>
                new Date(b.actionCompletedDate).getTime() - new Date(a.actionCompletedDate).getTime()
            );

            setRunsByAgreementId(prev => {
                const next = new Map(prev);
                next.set(agreementId, sortedRuns);
                return next;
            });

            setActionsByAgreementId(prev => {
                const next = new Map(prev);
                next.set(agreementId, sortedActions);
                return next;
            });

        } catch (err) {
            console.error("loadAgreementDetail error", err);

            // still set empty so UI doesn't keep retrying every render
            setRunsByAgreementId(prev => {
                const next = new Map(prev);
                next.set(agreementId, []);
                return next;
            });

            setActionsByAgreementId(prev => {
                const next = new Map(prev);
                next.set(agreementId, []);
                return next;
            });

        } finally {
            setAgreementDetailLoading(prev => {
                const next = new Map(prev);
                next.set(agreementId, false);
                return next;
            });
        }
    }, [runsByAgreementId, actionsByAgreementId, agreementDetailLoading]);

    const clearAgreementDetailCache = React.useCallback((agreementId?: number) => {
        setRunsByAgreementId(prev => {
            if (!agreementId) return new Map();           // clear all
            const next = new Map(prev);
            next.delete(agreementId);
            return next;
        });

        setActionsByAgreementId(prev => {
            if (!agreementId) return new Map();
            const next = new Map(prev);
            next.delete(agreementId);
            return next;
        });

        setAgreementDetailLoading(prev => {
            if (!agreementId) return new Map();
            const next = new Map(prev);
            next.delete(agreementId);
            return next;
        });
    }, []);

    ///////////// ALL ACTIONS (CACHE) FOR DASHBOARD /////////////////

    //To stop the callback from changing when loading flips, use a ref for loaded and loading too:
    const dashboardActionsLoadedRef = React.useRef(false);
    const dashboardActionsLoadingRef = React.useRef(false);

    const loadDashboardActions = React.useCallback(async (force = false): Promise<void> => {
        if (dashboardActionsLoadingRef.current) return;
        if (!force && dashboardActionsLoadedRef.current) return;

        dashboardActionsLoadingRef.current = true;
        setIsDashboardActionsLoading(true);

        const oneYearAgo = dayjs().subtract(12, 'month').toISOString();

        try {
            const actions = await DataSource.getWorkflowActionsByDateRange(oneYearAgo);

            const sorted = [...(actions ?? [])].sort((a, b) =>
                new Date(b.actionCompletedDate).getTime() - new Date(a.actionCompletedDate).getTime()
            );

            setDashboardActions(sorted);
        } catch (err) {
            console.error("loadDashboardActions error", err);
            setDialogProps("Error Loading all Workflow Actions", formatError(err));
            setDashboardActions([]);
        } finally {
            setIsDashboardActionsLoading(false);
        }
    }, [isDashboardActionsLoading, dashboardActions.length]);

    // clear Action cache
    const clearDashboardActionsCache = React.useCallback((): void => {
        setDashboardActions([]);
    }, []);

    // ensure valid run exists
    const getCurrentRunOrThrow = (agreementId: number): IWorkflowRunItem => {
        const run = runByAgreementId.get(agreementId);
        if (!run?.Id) {
            throw new Error(`Cannot start MOD process: Agreement ${agreementId} has no currentRun loaded. Refresh and try again.`);
        }
        return run;
    };

    /////////////////// SUBMIT FORM HANDLER ///////////////////////
    type SubmitMode = "new" | "edit";
    const handleSubmitAgreement = async (item: IRiskAgreementItem, submitMode: SubmitMode, modMeta?: formModMeta): Promise<void> => {

        setBackdropMessage("Saving agreement…");
        setShowBackdrop(true);
        setShowProgress(true);

        let didRestartWorkflow = false;

        try {

            const approvers = await ApproverResolver.resolve(item);

            if (submitMode === "new") {

                // 1) UPDATE AGREEMENT BUSINESS DATA
                const agreement = await RiskAgreementService.submitNew({ ...item, ...approvers }, "Under Review");

                // 2) CREATE RUN (LINKED TO AGREEMENT)
                setBackdropMessage("Creating Approval Workflow…");
                const firstRun = await WorkflowRunService.createFirstRun(
                    item.Id,
                    agreement,
                    approvers.OGPresidentId,
                    approvers.cooId,
                    approvers.CEOId,
                    approvers.SVPContractsId
                );

                // 3) LINK RUN TO AGREEMENT
                await RiskAgreementService.updateRunId(item.Id, firstRun.Id);

                // 4) CREATE INITIAL ACTION ROW
                await WorkflowActionService.createSubmitted(agreement, firstRun.Id);

            } else {

                // MODIFICATION PROCESS

                // Get old/current run
                const oldRun = getCurrentRunOrThrow(item.Id);

                // check to see if any approval decision has been made
                if (!oldRun.hasDecision) {
                    // save only — NO WF restart
                    await RiskAgreementService.edit({ ...item, ...approvers }, item.araStatus);
                } else {
                    // CREATE A NEW WF RUN

                    // 1) set flag for proper message
                    didRestartWorkflow = true;

                    // 2) Save edits
                    const agreement = await RiskAgreementService.edit({ ...item, ...approvers }, "Mod Review");

                    // 3) Increment run number & create new run
                    setBackdropMessage("Creating New Approval Workflow Run…");
                    const newRunNumber = (oldRun.runNumber ?? 0) + 1;
                    const newRun = await WorkflowRunService.createRestartRun(
                        item.Id,
                        agreement,
                        newRunNumber,
                        approvers.OGPresidentId,
                        approvers.cooId,
                        approvers.CEOId,
                        approvers.SVPContractsId,
                        "Mod",
                        "Restart Run due to Mod"
                    );

                    // 4) Flip agreement pointer (UPDATE) asap
                    await RiskAgreementService.updateRunId(item.Id, newRun.Id);

                    // 5) Supercede old run
                    await WorkflowRunService.supercedeOldRun(oldRun.Id, "Mod", modMeta?.comment);

                    // 6) Action 1 - stop old run
                    setBackdropMessage("Stopping Prior Workflow Run…");
                    await WorkflowActionService.createAction({
                        agreement: agreement,
                        run: oldRun,
                        stepKey: oldRun.currentStepKey,
                        actionType: "Restarted",
                        comment: modMeta?.comment ? `Restarted Workflow due to Agreement modification. ${modMeta.comment}` : "Restarted Workflow due to Agreement modification."
                    });

                    // 7) Action 2 - CREATE INITIAL ACTION ROW FOR NEW RUN
                    await WorkflowActionService.createAction({
                        agreement: agreement,
                        run: newRun,
                        stepKey: "submit",
                        actionType: "Modified",
                        comment: modMeta?.comment ?? "",
                        changeSummary: modMeta?.changeSummary,
                        changePayloadJson: modMeta?.changePayloadJson
                    });

                }
            }

            // use existing refresh so all maps are rebuilt consistently
            clearAgreementDetailCache(item.Id) // invalidate detail cache for this agreement so it re-fetches
            await refresh(true, "refresh"); // rebuild map intentionally

            setSuccessMessage(
                submitMode === "new"
                    ? "Successfully created a new At-Risk Agreement!"
                    : didRestartWorkflow
                        ? "Successfully updated the agreement and restarted approvals!"
                        : "Successfully updated the At-Risk Agreement!"
            );

            setShowProgress(false);
            setBackdropMessage("");
            setShowSuccess(true);
            history.push(`/view/${item.Id}`); // navigate to item view

        } catch (error) {
            setShowProgress(false);
            setShowBackdrop(false);
            setBackdropMessage("");
            setDialogProps("Error saving Risk Agreement", formatError(error));
        }
    };

    // Agreements context - avoid unncessary re-renders
    const agreementsCtxValue = React.useMemo(() => ({
        agreements,
        runByAgreementId,

        runsByAgreementId,
        actionsByAgreementId,
        isAgreementDetailLoading,
        loadAgreementDetail, //nothing loads unless a page calls it
        clearAgreementDetailCache,

        dashboardActions,
        isDashboardActionsLoading,
        loadDashboardActions, // load on dashboard mount
        clearDashboardActionsCache,

        currentUser,
        appUsers,
        appUserByUserId,
        getAppUserByUserId,
        refreshCurrentUser,
        refreshAppUsers,

        myActions,
        isMyActionsLoading,
        loadMyActions, //nothing loads unless a page calls it

        isRefreshing,
        lastRefreshed,
        refresh
    }), [
        agreements, runByAgreementId, runsByAgreementId, actionsByAgreementId, isAgreementDetailLoading, loadAgreementDetail,
        dashboardActions, isDashboardActionsLoading, loadDashboardActions, clearDashboardActionsCache,
        clearAgreementDetailCache, currentUser, appUsers, getAppUserByUserId, appUserByUserId, refreshCurrentUser,
        refreshAppUsers, myActions, isMyActionsLoading, loadMyActions, isRefreshing, lastRefreshed, refresh
    ]);

    const handleBack = (): void => {
        if (window.history.length > 1) {
            history.goBack();
        } else {
            history.push("/my-work"); // or "/all-agreements"
        }
    };

    if (fatalError) {
        return (
            <ThemeProvider theme={useDarkTheme ? darkTheme : lightTheme}>
                <CssBaseline />
                <Box sx={{ p: 3, color: "text.primary", mx: "auto", maxWidth: "900px" }}>
                    <Alert severity="error" variant="outlined">
                        Failed to load application data. Please refresh the page.
                    </Alert>

                    <AlertDialog
                        open={showDialog}
                        title={dialogTitle}
                        message={dialogMessage}
                        onClose={hideDialog}
                    />
                </Box>
            </ThemeProvider>
        );
    }

    if (isBootLoading) {
        return (
            <ThemeProvider theme={useDarkTheme ? darkTheme : lightTheme}>
                <CssBaseline />
                <Box
                    sx={{
                        height: "70vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "background.default",
                        color: "text.primary"
                    }}
                >
                    <Stack spacing={3} alignItems="center">
                        <CircularProgress size={80} thickness={4} enableTrackSlot color="info" />
                        <Typography variant="h5" fontWeight={500}>
                            Loading At-Risk Agreement Application…
                        </Typography>
                    </Stack>
                </Box>

                <AlertDialog
                    open={showDialog}
                    title={dialogTitle}
                    message={dialogMessage}
                    onClose={hideDialog}
                />
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider theme={useDarkTheme ? darkTheme : lightTheme}>
            <CssBaseline />

            <AgreementsContext.Provider value={agreementsCtxValue}>

                {/* HEADER WITH THEME TOGGLE - USE APPBAR and TOOLBAR to provide "sticky" appearance */}
                <AppBar position="sticky" elevation={1} sx={{ top: 0 }} >
                    {/* Toolbar gives you the standard header height + padding */}
                    <Toolbar disableGutters>
                        <NavHeader context={context} appTitle={wpTitle} useDarkTheme={useDarkTheme} setUseDarkTheme={setUseDarkTheme} />
                    </Toolbar>
                </AppBar>

                {/* PAGE CONTENT - wrap in default text color otherwise SPO will overwrite */}
                <Box sx={{ p: 3, color: "text.primary", mx: "auto", maxWidth: "1600px" }}>

                    <Switch>
                        <Route exact path="/"><Redirect to="/my-work" /></Route>

                        <Route path="/my-work" component={MyWork} />
                        <Route path="/all-agreements" component={Agreements} />
                        <Route path="/dashboard" component={Dashboard} />
                        <Route path="/admin" render={() => (
                            <Admin
                                context={context}
                                showBusy={(msg) => {
                                    setBackdropMessage(msg ?? "");
                                    setShowProgress(true);
                                    setShowBackdrop(true);
                                }}
                                hideBusy={() => {
                                    setShowBackdrop(false);
                                    setShowProgress(false);
                                    setBackdropMessage("");
                                }}
                            />
                        )} />

                        <Route path="/new" render={() => {

                            const handleCancel = async (reason: CancelReason): Promise<void> => {
                                if (reason.type === "draft") {
                                    setBackdropMessage("Deleting draft agreement…");
                                    setShowBackdrop(true);
                                    setShowProgress(true);
                                    await RiskAgreementService.delete(reason.draftId);
                                    setShowBackdrop(false);
                                    setShowProgress(false);
                                }

                                history.push("/my-work");
                            };

                            return (
                                <RiskAgreementForm
                                    context={context}
                                    mode="new"
                                    onSubmit={handleSubmitAgreement}
                                    onCancel={handleCancel}
                                />
                            );
                        }}
                        />

                        {/* Route to EDIT AGREEMENT */}
                        <Route path="/edit/:id" render={(routeProps) => {
                            const id = routeProps.match.params.id;
                            const item = agreements.find((a) => a.Id.toString() === id);
                            if (item === undefined) return <div>Agreement not found</div>;

                            return (
                                <RiskAgreementForm
                                    item={item}
                                    context={context}
                                    mode="edit"
                                    onSubmit={handleSubmitAgreement}
                                    onCancel={handleBack}
                                    {...routeProps}
                                />
                            );
                        }}
                        />

                        {/* Route to VIEW AGREEMENT */}
                        <Route path="/view/:id" component={ViewAgreementRoute} />

                    </Switch>

                    <AlertDialog open={showDialog} title={dialogTitle} message={dialogMessage} onClose={hideDialog} />

                    <Backdrop
                        sx={(theme) => ({
                            zIndex: theme.zIndex.drawer + 1,
                            color: "#fff",  // force high contrast in BOTH themes
                            backgroundColor: "rgba(0, 0, 0, 0.7)", // slightly stronger overlay for light mode
                            pointerEvents: showSuccess ? "auto" : "none"
                        })}
                        open={showBackdrop || isRefreshing}
                        onClick={() => showSuccess && hideSuccess()}
                    >
                        {(showProgress || isRefreshing) && (
                            <Stack spacing={2} alignItems="center">
                                <CircularProgress size={64} sx={{ color: "warning.main" }} />
                                {(backdropMessage !== "" || isRefreshing) && (
                                    <Typography variant="h6" fontWeight={500}>
                                        {backdropMessage !== "" ? backdropMessage : "Refreshing data…"}
                                    </Typography>
                                )}
                            </Stack>
                        )}

                        {showSuccess && (
                            <Stack spacing={2} alignItems="center">
                                <Fab aria-label="Success!" color="success" onClick={hideSuccess}>
                                    <CheckIcon />
                                </Fab>
                                <Typography variant="h6" color="inherit" fontWeight={500}>
                                    {successMessage}
                                </Typography>
                            </Stack>
                        )}
                    </Backdrop>

                    <Typography sx={{ width: "100%", mt: 2, textAlign: "right", fontSize: 10 }} >App Version: {Strings.Version}</Typography>

                </Box>

            </AgreementsContext.Provider>

        </ThemeProvider>

    );
};