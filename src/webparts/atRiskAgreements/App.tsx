/**
 * OUTER SHELL
 * theme/dialog shell state
 * context check
 * install/config check
 * mounting ReadyApp 
 */

import * as React from "react";
import { IAppProps } from "./data/props";
import AlertDialog from "./ui/Alert";
import { Configuration } from "./data/cfg";
import { InstallationRequired } from "dattatable";
import { ThemeProvider, CssBaseline, Box, Stack, Typography, Alert } from "@mui/material";
import CircularProgress from '@mui/material/CircularProgress';

import { darkTheme } from "./styles/darkTheme";
import { lightTheme } from "./styles/lightTheme";
import styles from "./styles/styles.module.scss";
import { formatError } from "./services/utils";

import { ContextInfo } from "gd-sprest";
import { loadStyles } from "@microsoft/load-themed-styles";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { AppInner } from "./AppInner";


type InstallState = "checking" | "ready" | "blocked" | "error";

export const App: React.FC<IAppProps> = ({ wpTitle, context }): JSX.Element => {
    React.useEffect((): undefined => {
        loadStyles(`
      #spCommandBar button[name="Edit"] {
        display: none !important;
      }
    `);

        return undefined;
    }, []);

    const [installState, setInstallState] = React.useState<InstallState>("checking");
    const [useDarkTheme, setUseDarkTheme] = React.useState<boolean>(() => {
        const cached = sessionStorage.getItem("ara_theme");
        if (cached === "dark") return true;
        if (cached === "light") return false;
        return false;
    });

    const [showDialog, setShowDialog] = React.useState<boolean>(false);
    const [dialogTitle, setDialogTitle] = React.useState<string>("");
    const [dialogMessage, setDialogMessage] = React.useState<string>("");

    const setDialogProps = React.useCallback((title: string, message: string): boolean => {
        setShowDialog(true);
        setDialogTitle(title);
        setDialogMessage(message);
        return true;
    }, []);

    const hideDialog = React.useCallback((): boolean => {
        setShowDialog(false);
        return true;
    }, []);

    React.useEffect(() => {
        const checkInstall = async (): Promise<void> => {
            try {
                // if not admin/owner, proceed normally
                if (!ContextInfo.isSiteOwner && !ContextInfo.isSiteAdmin && !ContextInfo.hasManageWebPermissions) {
                    setInstallState("ready");
                    return;
                }

                Configuration.setWebUrl(ContextInfo.webServerRelativeUrl);

                // use await so try/catch catches failures
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

    if (!context || !context.pageContext || !context.pageContext.web) {
        return (
            <div className={styles.araWrapper}>
                <Alert severity="warning">
                    Error initializing the application. Missing SharePoint context. Please refresh the browser.
                </Alert>
            </div>
        );
    }

    if (installState === "checking") {
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
                            Verifying App Configuration...
                        </Typography>
                    </Stack>
                </Box>
            </ThemeProvider>
        );
    }

    if (installState === "blocked") {
        return (
            <ThemeProvider theme={useDarkTheme ? darkTheme : lightTheme}>
                <CssBaseline />
                <Box sx={{ p: 3, color: "text.primary", mx: "auto", maxWidth: "900px" }}>
                    <Alert severity="info" variant="outlined">
                        You do not have permission to access the data required to configure this application.
                        Please contact your site administrator.
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

    if (installState === "error") {
        return (
            <ThemeProvider theme={useDarkTheme ? darkTheme : lightTheme}>
                <CssBaseline />
                <Box sx={{ p: 3, color: "text.primary", mx: "auto", maxWidth: "900px" }}>
                    <Alert severity="error" variant="outlined">
                        Unable to validate installation/configuration. Please refresh the page.
                        If the problem persists, contact support.
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

    return (
        <AppInner
            wpTitle={wpTitle}
            context={context}
            useDarkTheme={useDarkTheme}
            setUseDarkTheme={setUseDarkTheme}
            showDialog={showDialog}
            dialogTitle={dialogTitle}
            dialogMessage={dialogMessage}
            setDialogProps={setDialogProps}
            hideDialog={hideDialog}
        />
    );
};