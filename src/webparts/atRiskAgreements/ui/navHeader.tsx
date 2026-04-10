import * as React from "react";
import { AppBar, Toolbar, Typography, Button, useMediaQuery, Box, Stack, Avatar, Popover } from "@mui/material";
import { useAgreements } from "../services/agreementsContext";
import { useTheme } from "@mui/material/styles";
import {
    Handshake, Add, Dashboard, Work, ListAlt, AdminPanelSettings,
    Refresh, HelpOutlineOutlined, People, PeopleOutline
} from "@mui/icons-material";
import IconButton from '@mui/material/IconButton';
import { Link, NavLink } from "react-router-dom";
import ThemeSwitcher from "./ThemeSwitcher";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { formatError, stringAvatar } from "../services/utils";
import { DataSource } from "../data/ds";
import { AppUserService } from "../services/userService";
import { IPeoplePicker } from "../data/props";
import { MuiPeoplePicker } from "./CustomPeoplePicker";
import { IPersonaProps } from "@fluentui/react";
import AlertDialog from "./Alert";

interface NavHeaderProps {
    context: WebPartContext;
    appTitle: string;
    useDarkTheme: boolean;
    setUseDarkTheme: (val: boolean) => void;
}

interface IBackups {
    results: IPeoplePicker[] | [];
}

const NavHeader: React.FC<NavHeaderProps> = ({ context, appTitle, useDarkTheme, setUseDarkTheme }) => {

    const theme = useTheme();

    // App-wide data refresh trigger
    const { refresh, isRefreshing, clearAgreementDetailCache, clearDashboardActionsCache, currentUser, refreshCurrentUser } = useAgreements();

    const [showDialog, setShowDialog] = React.useState(false);
    const [dialogTitle, setDialogTitle] = React.useState<string>("");
    const [dialogMessage, setDialogMessage] = React.useState<string>("");
    //const [user, setUser] = React.useState<IAppUserItem | undefined>(DataSource.CurrentUser);
    const [backups, setBackups] = React.useState<IBackups>({ results: [] });
    const [backupAnchorEl, setBackupAnchorEl] = React.useState<HTMLElement | null>(null);
    const [backupSaving, setBackupSaving] = React.useState<boolean>(false);

    //set user guide URL
    const userGuideUrl = DataSource.UserGuide;

    const backupOpen = Boolean(backupAnchorEl);

    // small screens (md = ~900px), large screens (lg = ~1200px)
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));
    const isLarge = useMediaQuery(theme.breakpoints.down("lg"));

    const showAdmin = DataSource.isAdmin

    const peoplePickerContext = {
        absoluteUrl: context.pageContext.web.absoluteUrl,
        msGraphClientFactory: context.msGraphClientFactory,
        spHttpClient: context.spHttpClient
    };

    const setDialogProps = (title: string, message: string): void => {
        setShowDialog(true);
        setDialogTitle(title);
        setDialogMessage(message);
    };

    const hideDialog = (): void => {
        setShowDialog(false);
    };

    //set initial backups
    React.useEffect((): void => {
        const bUps = currentUser?.backups ?? { results: [] };
        setBackups(bUps);
    }, [currentUser]);

    const handleBackupOpen = (event: React.MouseEvent<HTMLElement>): void => {
        setBackupAnchorEl(event.currentTarget);
    };

    const handleBackupClose = (): void => {
        setBackupAnchorEl(null);
    };

    const handleBackups = async (items: IPersonaProps[]): Promise<void> => {
        const people = items.map(p => ({
            Id: parseInt(p.id!, 10),
            EMail: p.secondaryText!,
            Title: p.text!
        }));

        setBackups({ results: people });
    };

    const handleSaveBackups = async (): Promise<void> => {
        if (!currentUser?.Id) {
            return;
        }

        setBackupSaving(true);

        try {
            await AppUserService.updateBackups(currentUser.Id, backups);
            await refreshCurrentUser();
            handleBackupClose();
        } catch (error) {
            setDialogProps("Error saving backups", formatError(error))
        } finally {
            setBackupSaving(false);
        }
    };

    // reusable style for button links
    const navButtonSx = {
        "&.active": {
            color: "#F2C744"
        },
        "&:hover": {
            color: "#F2C744",
            backgroundColor: "rgba(242, 199, 68, 0.08)"
        }
    };

    // custom icon color for light mode in NAV HEADER ONLY!!
    const navIconColor =
        theme.palette.mode === "light"
            ? "#00b7ff"
            : theme.palette.action.active; // existing dark mode color

    return (
        <AppBar
            position="static"
            color="primary"
            sx={{ border: "1px solid", borderColor: "divider" }}
        >
            <Toolbar sx={{ pl: 2, pr: 1 }}>

                {/* ICON + TITLE */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, marginRight: 4 }}>
                    {/* Always show the icon */}
                    <Handshake sx={{ fontSize: 38, color: "inherit" }} />

                    {/* Hide title when screen is small */}
                    {!isLarge && (
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>{appTitle}</Typography>
                    )}
                </Box>

                {/* MAIN ROUTER LINKS/BUTTONS */}
                <Stack
                    direction="row"
                    spacing={2}
                    sx={{ alignItems: "center", alignContent: "flex-start", display: "flex", flexGrow: 1 }}
                >
                    <Button title="My Work" startIcon={<Work />} color="inherit" component={NavLink} to="/my-work" sx={navButtonSx}>
                        {!isSmall && "My Work"}
                    </Button>
                    <Button title="All Agreeements" startIcon={<ListAlt />} color="inherit" component={NavLink} to="/all-agreements" sx={navButtonSx}>
                        {!isSmall && "All Agreements"}
                    </Button>
                    <Button title="Dashboard" startIcon={<Dashboard />} color="inherit" component={NavLink} to="/dashboard" sx={navButtonSx}>
                        {!isSmall && "Dashboard"}
                    </Button>
                    {showAdmin && (
                        <Button title="Admin" startIcon={<AdminPanelSettings />} color="inherit" component={NavLink} to="/admin" sx={navButtonSx}>
                            {!isSmall && "Admin"}
                        </Button>
                    )}

                </Stack>

                {/* REFRESH, NEW AGREEMENT BUTTON */}
                <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{
                        "& .MuiIconButton-root": { color: navIconColor },
                        //"& .MuiSvgIcon-root": { color: navIconColor }
                    }}>
                        
                    <IconButton
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!userGuideUrl) return;
                            window.open(userGuideUrl, "_blank", "noopener,noreferrer");
                        }}
                        disabled={!userGuideUrl}
                        size="medium"
                        aria-label="User Guide"
                        title={userGuideUrl ? "User Guide" : "User Guide not available"}
                    >
                        <HelpOutlineOutlined />
                    </IconButton>

                    <IconButton
                        onClick={async () => {
                            clearAgreementDetailCache();
                            clearDashboardActionsCache();
                            await refresh(true);
                        }}
                        disabled={isRefreshing}
                        size="medium"
                        aria-label="Refresh Data"
                        title={isRefreshing ? "Refreshing…" : "Refresh Data"}
                    >
                        <Refresh sx={{ animation: isRefreshing ? "spin 1s linear infinite" : undefined }} />
                    </IconButton>

                    <Button
                        title="Add New Agreement"
                        startIcon={<Add />}
                        variant="contained"
                        color="primary"
                        sx={{ mx: 2, whiteSpace: "nowrap" }}
                        component={Link} to="/new"
                    >
                        {!isSmall && "New Agreement"}
                    </Button>


                    {/* USER DISPLAY */}
                    <Stack direction="column" alignItems="flex-end" sx={{ mx: 1 }}>
                        {isSmall ? (
                            <Avatar alt={context.pageContext.user.displayName} {...stringAvatar(context.pageContext.user.displayName)} />
                        ) : (
                            <>
                                <Typography sx={{ fontWeight: 500, fontSize: 14 }}>
                                    {context.pageContext.user.displayName}
                                </Typography>
                                <Typography sx={{ fontWeight: 400, fontSize: 12 }}>
                                    {DataSource.isAdmin ? "Administrator" : DataSource.isCM ? "Contract Manager" : "User"}
                                </Typography>
                            </>
                        )}
                    </Stack>


                    {/* BACKUPS ICON */}
                    <Box>
                        <IconButton
                            onClick={handleBackupOpen}
                            size="medium"
                            aria-label="Add/Manage Backup(s)"
                            title={currentUser?.hasBackup ? "Manage Backups" : "Add Backup(s)"}
                        >
                            {currentUser?.hasBackup ? <People /> : <PeopleOutline />}
                        </IconButton>
                    </Box>

                    {/* THEME SWITCHER ICON */}
                    <Box>

                        <ThemeSwitcher
                            useDarkTheme={useDarkTheme}
                            onToggle={async () => {
                                const next = !useDarkTheme;

                                //update state immediately
                                setUseDarkTheme(next);

                                // update session storage (prevents flicker on refresh)
                                sessionStorage.setItem("ara_theme", next ? "dark" : "light");

                                // persist to profile
                                try {
                                    await AppUserService.updateMyModePreference(next ? "dark" : "light");
                                } catch (e) {
                                    console.error("failed to save theme preference", e);
                                    setDialogProps("Error saving theme preference", formatError(e))
                                }
                            }}
                        />
                    </Box>

                </Stack>

            </Toolbar>

            <Popover
                open={backupOpen}
                anchorEl={backupAnchorEl}
                onClose={handleBackupClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 1.5,
                            width: 450,
                            p: 2,
                            borderRadius: 2,
                            boxShadow: theme.shadows[8]
                        }
                    }
                }}
            >
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                            Manage Backups
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Select one or more backup approvers for your account.
                        </Typography>
                    </Box>

                    <MuiPeoplePicker
                        label="Backup(s)"
                        context={peoplePickerContext}
                        value={backups.results?.length ? backups.results.map(b => b.EMail) : []}
                        required
                        onChange={(items) => handleBackups(items)}
                        //error={submitted && isRequiredError(form.projectMgr)}
                        helperText={"Select one or more backups"}
                        selectionLimit={5}
                    />

                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button onClick={handleBackupClose} color="inherit">
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSaveBackups}
                            disabled={backupSaving}
                        >
                            Save
                        </Button>
                    </Stack>
                </Stack>
            </Popover>

            <AlertDialog open={showDialog} title={dialogTitle} message={dialogMessage} onClose={hideDialog} />
        </AppBar>
    );
};

export default NavHeader;
