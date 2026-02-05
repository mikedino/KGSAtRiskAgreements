import * as React from "react";
import { useState, useEffect, useCallback } from "react";
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
import { Configuration } from "./data/cfg";
import { InstallationRequired } from "dattatable";
import { useAgreementsData } from "./data/agreementsDataCall";

import { ThemeProvider, CssBaseline, Box, Stack, Typography, Alert, Backdrop, Fab } from "@mui/material";
import CircularProgress from '@mui/material/CircularProgress';
import CheckIcon from '@mui/icons-material/Check';
import { darkTheme } from "./styles/darkTheme";
import { lightTheme } from "./styles/lightTheme";
import styles from "./styles/styles.module.scss";
import { formatError } from "./services/utils";
import Strings from "../../strings";
import { ContextInfo } from "gd-sprest";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { DataSource } from "./data/ds";

type InstallState = "checking" | "ready" | "blocked" | "error";

export const App: React.FC<IAppProps> = ({ wpTitle, context }) => {

  const [installState, setInstallState] = React.useState<InstallState>("checking");
  const [useDarkTheme, setUseDarkTheme] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [dialogMessage, setDialogMessage] = useState<string>("");
  const [showBackdrop, setShowBackdrop] = useState<boolean>(false);
  const [showProgress, setShowProgress] = useState<boolean>(false);
  const [backdropMessage, setBackdropMessage] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  //my actions - only loaded for MyWork
  const [myActions, setMyActions] = React.useState<IWorkflowActionItem[]>([]);
  const [isMyActionsLoading, setIsMyActionsLoading] = React.useState(false);

  const history = useHistory();

  const setDialogProps = useCallback((title: string, message: string): void => {
    setShowDialog(true);
    setDialogTitle(title);
    setDialogMessage(message);
  }, []);

  const hideDialog = (): void => {
    setShowDialog(false);
  };

  const hideSuccess = (): void => {
    setShowBackdrop(false);
    setShowSuccess(false);
  }

  // 1) Run install check FIRST
  useEffect(() => {
    const checkInstall = async (): Promise<void> => {
      try {
        // if not admin/owner, proceed normally
        if (!ContextInfo.isSiteOwner && !ContextInfo.isSiteAdmin) {
          setInstallState("ready");
          return;
        }

        Configuration.setWebUrl(ContextInfo.webServerRelativeUrl);

        // ✅ use await so try/catch catches failures
        const needsInstall = await InstallationRequired.requiresInstall({ cfg: Configuration });

        if (needsInstall) {
          InstallationRequired.showDialog();
          setInstallState("blocked");
          return;
        }

        setInstallState("ready");

      } catch (err) {
        setDialogProps("Error checking App configuration", formatError(err));
        setInstallState("error");
      }
    };

    checkInstall().catch((e) => {
      console.error("checkInstall error", e);
      setDialogProps("Error checking App configuration", formatError(e));
      setInstallState("error");
    });
  }, []);

  const enabled = installState === "ready";

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

  const {
    agreements,
    runByAgreementId,
    actionsByRunId,
    isBootLoading,
    isRefreshing,
    lastRefreshed,
    refresh,
    fatalError
  } = useAgreementsData(setDialogProps, enabled);

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
  const handleSubmitAgreement = async (item: IRiskAgreementItem, submitMode: SubmitMode, modMeta: formModMeta): Promise<void> => {

    setBackdropMessage("Saving agreement…");
    setShowBackdrop(true);
    setShowProgress(true);

    try {

      const approvers = await ApproverResolver.resolve(item);

      if (submitMode === "new") {

        // 1) UPDATE AGREEMENT BUSINESS DATA
        await RiskAgreementService.edit({ ...item, ...approvers }, "Under Review");

        // 2) CREATE RUN (LINKED TO AGREEMENT)
        const run = await WorkflowRunService.createFirstRun(
          item.Id,
          item,
          approvers.OGPresidentId,
          approvers.cooId,
          approvers.CEOId,
          approvers.SVPContractsId
        );

        // 3) LINK RUN TO AGREEMENT
        await RiskAgreementService.updateRunId(item.Id, run.Id);

        // 4) CREATE INITIAL ACTION ROW
        await WorkflowActionService.createAction({
          agreement: item,
          run: run,
          stepKey: "submit",
          actionType: "Restarted"
        });

      } else {

        // MODIFICATION PROCESS

        // 1) Get old/current run
        const oldRun = getCurrentRunOrThrow(item.Id);

        // check to see if any approval decision has been made
        if (!oldRun.hasDecision) {
          // No one approved/rejected yet: so just save edits and exit - NO WF RESTART
          await RiskAgreementService.edit({ ...item, ...approvers }, item.araStatus);
          return;
        }

        // 2) Save edits
        await RiskAgreementService.edit({ ...item, ...approvers }, "Mod Review");

        // 3) Incement run number & create new run
        const newRunNumber = (oldRun.runNumber ?? 0) + 1;
        const newRun = await WorkflowRunService.createRestartRun(
          item.Id,
          item,
          newRunNumber,
          approvers.OGPresidentId,
          approvers.cooId,
          approvers.CEOId,
          approvers.SVPContractsId,
          "Mod",
          "test restart comment"
        );

        // 4) Flip agreement pointer (UPDATE) asap
        await RiskAgreementService.updateRunId(item.Id, newRun.Id);

        // 5) Supercede old run
        await WorkflowRunService.supercedeOldRun(oldRun.Id, "Mod", modMeta?.comment);

        // 6) Action 1 - stop old run
        await WorkflowActionService.createAction({
          agreement: item,
          run: oldRun,
          stepKey: oldRun.currentStepKey,
          actionType: "Restarted",
          comment: modMeta?.comment ? `Restarted due to modification. ${modMeta.comment}` : "Restarted due to modification."
        });

        // 7) Action 2 - CREATE INITIAL ACTION ROW FOR NEW RUN
        await WorkflowActionService.createAction({
          agreement: item,
          run: newRun,
          stepKey: "submit",
          actionType: "Modified",
          comment: modMeta?.comment ?? "",
          changeSummary: modMeta?.changeSummary,
          changePayloadJson: modMeta?.changePayloadJson
        });

      }

      // use existing refresh so all maps are rebuilt consistently
      await refresh(true, "refresh");

      setSuccessMessage(submitMode === "new"
        ? "Successfully created a new At-Risk Agreement!"
        : "Successfully updated the At-Risk Agreement!"
      );

      setShowProgress(false);
      setBackdropMessage("");
      setShowSuccess(true);
      history.push("/my-work");

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
    actionsByRunId,
    isRefreshing,
    lastRefreshed,
    refresh,

    myActions,
    isMyActionsLoading,
    loadMyActions //nothing loads unless a page calls it
  }), [
    agreements, runByAgreementId, actionsByRunId, isRefreshing, lastRefreshed, refresh,
    myActions, isMyActionsLoading, loadMyActions
  ]);


  /**
 * PAGE CONTEXT MISSING
 * Just need a page reset - sat too long
 */
  if (!context || !context.pageContext || !context.pageContext.web) {
    return (
      <div className={styles.araWrapper}>
        <Alert severity="warning">Error initializing the Application. Missing SharePoint context. Please try to refresh the browser..</Alert>
      </div>
    )
  }

  /**
 * INSTALL / CONFIG GATE
 * These must run BEFORE the boot loader, otherwise you get "stuck spinning"
 * while install is blocked or failed.
 */
  if (installState === "checking") {
    return (
      <ThemeProvider theme={useDarkTheme ? darkTheme : lightTheme}>
        <CssBaseline />
        <Box sx={{ height: "70vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default", color: "text.primary" }}>
          <Stack spacing={3} alignItems="center">
            <CircularProgress size={80} thickness={4} enableTrackSlot color="info" />
            <Typography variant="h5" fontWeight={500}>Verifying App Configuration...</Typography>
          </Stack>
        </Box>
      </ThemeProvider>
    );
  }

  /**
* INSTALL / CONFIG GATE
* Blocked - can not run install
*/
  if (installState === "blocked") {
    return (
      <ThemeProvider theme={useDarkTheme ? darkTheme : lightTheme}>
        <CssBaseline />
        <Box sx={{ p: 3, color: "text.primary", mx: "auto", maxWidth: "900px" }}>
          <Alert severity="info" variant="outlined">
            Installation or configuration is required before this app can run.
            If you are an admin, complete the setup dialog. Otherwise, contact your site admin.
          </Alert>

          {/* keep your dialog available since InstallationRequired.showDialog() is modal-driven */}
          <AlertDialog open={showDialog} title={dialogTitle} message={dialogMessage} onClose={hideDialog} />
        </Box>
      </ThemeProvider>
    );
  }

  /**
* INSTALL / CONFIG GATE
* ERROR installing
*/
  if (installState === "error") {
    return (
      <ThemeProvider theme={useDarkTheme ? darkTheme : lightTheme}>
        <CssBaseline />
        <Box sx={{ p: 3, color: "text.primary", mx: "auto", maxWidth: "900px" }}>
          <Alert severity="error" variant="outlined">
            Unable to validate installation/configuration. Please refresh the page.
            If the problem persists, contact support.
          </Alert>

          <AlertDialog open={showDialog} title={dialogTitle} message={dialogMessage} onClose={hideDialog} />
        </Box>
      </ThemeProvider>
    );
  }

  /**
   * DATA LOAD FAILURE GATE
   * If the datasource fails during boot, don't keep spinning forever.
   */
  if (fatalError) {
    return (
      <ThemeProvider theme={useDarkTheme ? darkTheme : lightTheme}>
        <CssBaseline />
        <Box sx={{ p: 3, color: "text.primary", mx: "auto", maxWidth: "900px" }}>
          <Alert severity="error" variant="outlined">
            Failed to load application data. Please refresh the page.
          </Alert>

          {/* still show full error details in your dialog (you already set it in setDialogProps) */}
          <AlertDialog open={showDialog} title={dialogTitle} message={dialogMessage} onClose={hideDialog} />
        </Box>
      </ThemeProvider>
    );
  }

  /**
   * BOOT LOADER
   * Only happens once install gate is ready and no fatal boot error occurred.
   */
  if (isBootLoading) {
    return (
      <ThemeProvider theme={useDarkTheme ? darkTheme : lightTheme}>
        <CssBaseline />
        <Box sx={{ height: "70vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default", color: "text.primary" }}>
          <Stack spacing={3} alignItems="center">
            <CircularProgress size={80} thickness={4} enableTrackSlot color="info" />
            <Typography variant="h5" fontWeight={500}>Loading At-Risk Agreement Application…</Typography>
          </Stack>
        </Box>

        {/* Render dialog even while boot loading */}
        <AlertDialog open={showDialog} title={dialogTitle} message={dialogMessage} onClose={hideDialog} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={useDarkTheme ? darkTheme : lightTheme}>
      <CssBaseline />

      <AgreementsContext.Provider value={agreementsCtxValue}>

        {/* HEADER WITH THEME TOGGLE */}
        <NavHeader context={context} useDarkTheme={useDarkTheme} setUseDarkTheme={setUseDarkTheme} />

        {/* PAGE CONTENT - wrap in default text color otherwise SPO will overwrite */}
        <Box sx={{ p: 3, color: "text.primary", mx: "auto", maxWidth: "1600px" }}>

          <Switch>
            <Route exact path="/"><Redirect to="/my-work" /></Route>

            <Route path="/my-work" component={MyWork} />
            <Route path="/all-agreements" component={Agreements} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/admin" component={Admin} />
            <Route path="/new" render={() => {

              const handleCancel = async (reason: CancelReason): Promise<void> => {
                if (reason.type === "draft") {
                  await RiskAgreementService.delete(reason.draftId);
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
                  onCancel={() => history.goBack()}
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
            {showProgress || isRefreshing && (
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