import * as React from "react";
import { useState, useEffect } from "react";
import { HashRouter, Switch, Route, Redirect, useHistory } from "react-router-dom";
import MyWork from "./components/MyWork";
import Agreements from "./components/AgreementsGrid";
import Dashboard from "./components/Dashboard";
import Admin from "./components/Admin";
import NavHeader from "./ui/NavHeader";
import { IAppProps, IRiskAgreementItem } from "./data/props";
import { DataSource } from "./data/ds";
import RiskAgreementForm, { CancelReason } from "./forms/araForm";
import { RiskAgreementService } from "./services/araService";
import AlertDialog from "./ui/Alert";
import ViewAgreementRoute from "./components/ViewAgreementRoute";
import { ApproverResolver } from "./services/defaultApprovers";

import { ThemeProvider, CssBaseline, Box, Stack, Typography, Alert, Backdrop, Fab } from "@mui/material";
import CircularProgress from '@mui/material/CircularProgress';
import CheckIcon from '@mui/icons-material/Check';
import { darkTheme } from "./styles/darkTheme";
import { lightTheme } from "./styles/lightTheme";
import styles from "./styles/styles.module.scss";
import { formatError } from "./services/utils";
import Strings from "../../strings";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { AgreementsContext } from "./services/agreementsContext";

type RefreshMode = "boot" | "refresh";

export const App: React.FC<IAppProps> = ({ wpTitle, context }) => {

  const [useDarkTheme, setUseDarkTheme] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [dialogMessage, setDialogMessage] = useState<string>("");
  const [showBackdrop, setShowBackdrop] = useState<boolean>(false);
  const [showProgress, setShowProgress] = useState<boolean>(false);
  const [backdropMessage, setBackdropMessage] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  const [isBootLoading, setIsBootLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [agreements, setAgreements] = useState<IRiskAgreementItem[]>([]);
  const [lastRefreshed, setLastRefreshed] = React.useState<string | undefined>(undefined);

  const history = useHistory();

  const setDialogProps = (title: string, message: string): void => {
    setShowDialog(true);
    setDialogTitle(title);
    setDialogMessage(message);
  };

  const hideDialog = (): void => {
    setShowDialog(false);
  };

  const hideSuccess = (): void => {
    setShowBackdrop(false);
    setShowSuccess(false);
  }

  const refresh = React.useCallback(
    async (override = false, mode: RefreshMode = "refresh"): Promise<void> => {
      const showBoot = mode === "boot";

      if (showBoot) {
        // initialize app
        setIsBootLoading(true);
      } else {
        // refreshing datasource
        setIsRefreshing(true);
        setBackdropMessage("Refreshing data…");
        setShowBackdrop(true);
        setShowProgress(true);
        setShowSuccess(false); // ensure we're not showing the success UI
      }

      try {
        await DataSource.init(override);
        setAgreements([...(DataSource.Agreements ?? [])]);
        setLastRefreshed(new Date().toISOString());
      } catch (error) {
        setDialogProps("Error refreshing agreements", formatError(error));
        console.error("refresh error", error);
      } finally {
        if (showBoot) {
          // initialize app
          setIsBootLoading(false);
        } else {
          // refreshing
          setShowProgress(false);
          setShowBackdrop(false); // auto-close, no user interaction
          setBackdropMessage("");
          setIsRefreshing(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    refresh(false, "boot").catch(console.error);
  }, [refresh]);

  type SubmitMode = "new" | "edit";
  const handleSubmitAgreement = async (item: IRiskAgreementItem, submitMode: SubmitMode): Promise<void> => {

    setBackdropMessage("Saving agreement…");
    setShowBackdrop(true);
    setShowProgress(true);

    try {
      const approvers = await ApproverResolver.resolve(item);
      await RiskAgreementService.edit({ ...item, ...approvers });

      // Re-fetch + update state (but don't show the boot loader)
      await DataSource.getAgreeements();
      setAgreements([...(DataSource.Agreements ?? [])]);
      setLastRefreshed(new Date().toISOString());

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

  if (!context || !context.pageContext || !context.pageContext.web) {
    return (
      <div className={styles.araWrapper}>
        <Alert severity="warning">Error initializing the Application. Missing SharePoint context. Please try to refresh the browser..</Alert>
      </div>
    )
  }

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
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={useDarkTheme ? darkTheme : lightTheme}>
      <CssBaseline />

      <AgreementsContext.Provider value={{ agreements, isRefreshing: isRefreshing, lastRefreshed, refresh }}>

        {/* HEADER WITH THEME TOGGLE */}
        <NavHeader context={context} useDarkTheme={useDarkTheme} setUseDarkTheme={setUseDarkTheme} />

        {/* PAGE CONTENT - wrap in default text color otherwise SPO will overwrite */}
        <Box sx={{ p: 3, color: "text.primary", mx: "auto", maxWidth: "1600px" }}>
          <HashRouter>
            <Switch>
              <Route exact path="/"><Redirect to="/my-work" /></Route>

              <Route path="/my-work" component={MyWork} />
              <Route path="/all-agreements" component={Agreements} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/admin" component={Admin} />

              <Route
                path="/new"
                render={() => {

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
              <Route
                path="/edit/:id"
                render={(routeProps) => {
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
          </HashRouter>

          <AlertDialog open={showDialog} title={dialogTitle} message={dialogMessage} onClose={hideDialog} />

          <Backdrop
            sx={(theme) => ({
              zIndex: theme.zIndex.drawer + 1,
              color: "#fff",  // force high contrast in BOTH themes
              backgroundColor: "rgba(0, 0, 0, 0.7)", // slightly stronger overlay for light mode
              pointerEvents: showSuccess ? "auto" : "none"
            })}
            open={showBackdrop}
            onClick={() => showSuccess && hideSuccess()}
          >
            {showProgress && (
              <Stack spacing={2} alignItems="center">
                <CircularProgress size={64} sx={{ color: "warning.main" }}/>
                {backdropMessage !== "" && (
                  <Typography variant="h6" fontWeight={500}>
                    {backdropMessage}
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