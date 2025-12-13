import * as React from "react";
import { useState, useEffect } from "react";
import { HashRouter as Router, Switch, Route, Redirect, useHistory } from "react-router-dom";
import MyWork from "./components/MyWork";
import Agreements from "./components/Agreements";
import Dashboard from "./components/Dashboard";
import Admin from "./components/Admin";
import NavHeader from "./ui/navHeader";
import { IAtRiskAgreementsProps, IRiskAgreementItem } from "./data/props";
import { DataSource } from "./data/ds";
import RiskAgreementForm from "./forms/riskAgreement";

import { ThemeProvider, CssBaseline, Box, Stack, Typography, Alert, Button } from "@mui/material";
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import CircularProgress from '@mui/material/CircularProgress';
import { darkTheme } from "./styles/darkTheme";
import { lightTheme } from "./styles/lightTheme";
import styles from "./styles/styles.module.scss";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { RiskAgreementService } from "./services/riskAgreement";

export const Main: React.FC<IAtRiskAgreementsProps> = ({ wpTitle, context }) => {

  const [useDarkTheme, setUseDarkTheme] = useState(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [dialogMessage, setDialogMessage] = useState<string>("");
  const history = useHistory();

  const setDialogProps = (title: string, message: string): void => {
    setShowDialog(true);
    setDialogTitle(title);
    setDialogMessage(message);
  };

  const hideDialog = (): void => {
    setShowDialog(false);
  };

  const initDatasource = async (override: boolean): Promise<void> => {
    try {
      await DataSource.init(override);
    } catch (error) {
      setDialogProps("Error initializing datasource", error);
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

  const handleCreateAgreement = async (item: IRiskAgreementItem): Promise<void> => {
    // save to SharePoint
    await RiskAgreementService.create(item);
    history.push("/my-work");
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
      <div className={styles.araWrapper}>
        <Stack alignSelf={"center"} alignItems={"center"} sx={{ height: 25 }}>
          <Typography>Loading At-Risk Agreement Application...</Typography>
          <CircularProgress enableTrackSlot size="3rem" />
        </Stack>
      </div>
    )
  }

  return (
    <ThemeProvider theme={useDarkTheme ? darkTheme : lightTheme}>
      <CssBaseline />

      <Router>
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

            <Route path="/new">
              <RiskAgreementForm
                context={context}
                mode="new"
                onSubmit={handleCreateAgreement}
                onCancel={() => history.push("/my-work")}
              />
            </Route>

            {/* example: deep linking to item */}
            {/* <Route path="/agreements/:id" component={AgreementDetails} /> */}
          </Switch>

          {/* ALERT DIALOG */}
          <Dialog
            open={showDialog}
            onClose={hideDialog}
            aria-labelledby={dialogTitle}
            aria-describedby={dialogMessage}
          >
            <DialogTitle id="alert-dialog-title">
              {dialogTitle}
            </DialogTitle>
            <DialogContent>
              <DialogContentText id="alert-dialog-description">
                {dialogMessage}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={hideDialog} autoFocus>Close</Button>
            </DialogActions>
          </Dialog>

        </Box>
      </Router>
    </ThemeProvider>
  );
};