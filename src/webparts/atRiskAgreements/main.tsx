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

import { ThemeProvider, CssBaseline, Box, Stack, Typography, Alert, Backdrop, Fab } from "@mui/material";
import CircularProgress from '@mui/material/CircularProgress';
import CheckIcon from '@mui/icons-material/Check';
import { darkTheme } from "./styles/darkTheme";
import { lightTheme } from "./styles/lightTheme";
import styles from "./styles/styles.module.scss";
import { formatError } from "./services/utils";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { ApproverResolver } from "./services/defaultApprovers";

export const App: React.FC<IAppProps> = ({ wpTitle, context }) => {

  const [useDarkTheme, setUseDarkTheme] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [dialogMessage, setDialogMessage] = useState<string>("");
  const [showBackdrop, setShowBackdrop] = useState<boolean>(false);
  const [showProgress, setShowProgress] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

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

  const initDatasource = async (override: boolean): Promise<void> => {
    try {
      await DataSource.init(override);
    } catch (error) {
      setDialogProps("Error initializing datasource", formatError(error));
      console.error('Error initializing datasource', error);
    }
  }

  useEffect(() => {
    initDatasource(false)
      .then(() => setLoading(false))
      .catch((error) => {
        setLoading(false);
        console.error("Unhandled promise rejection:", error);
      });
  }, [])

  type SubmitMode = "new" | "edit";
  const handleSubmitAgreement = async (item: IRiskAgreementItem, submitMode: SubmitMode): Promise<void> => {
    setShowBackdrop(true);
    setShowProgress(true);
    try {
      // get default approvers
      const approvers = await ApproverResolver.resolve(item);
      // save to SharePoint
      await RiskAgreementService.edit({ ...item, ...approvers });
      //refresh agreements
      await DataSource.getAgreeements();
      setSuccessMessage(submitMode === "new" ? "Successfully created a new At-Risk Agreement!" : "Successfully updaed the At-Risk Agreement!");
      setShowSuccess(true);
      setShowProgress(false);
      history.push("/my-work");
    } catch (error) {
      setShowProgress(false);
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

  if (loading) {
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
                const item = DataSource.Agreements.find((a) => a.Id.toString() === id);

                if (!item) return <div>Agreement not found</div>;

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
            pointerEvents: showSuccess ? "auto" : "none"
          })}
          open={showBackdrop}
          onClick={() => showSuccess && hideSuccess()}
        >
          {showProgress && <CircularProgress color="info" />}

          {showSuccess && (
            <Stack spacing={2} alignItems="center">
              <Fab aria-label="Success!" color="success" onClick={hideSuccess}><CheckIcon /> </Fab>
              <Typography variant="h6" color="inherit" fontWeight={500}>{successMessage}</Typography>
            </Stack>
          )}
        </Backdrop>

      </Box>

    </ThemeProvider>

  );
};