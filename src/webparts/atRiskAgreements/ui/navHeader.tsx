import * as React from "react";
import { AppBar, Toolbar, Typography, Button, useMediaQuery, Box, Stack, Avatar } from "@mui/material";
import { useAgreements } from "../services/agreementsContext";
import { useTheme } from "@mui/material/styles";
import { Handshake, Add, Dashboard, Work, ListAlt, AdminPanelSettings, Refresh, HelpOutlineOutlined } from "@mui/icons-material";
import IconButton from '@mui/material/IconButton';
import { Link } from "react-router-dom";
import ThemeSwitcher from "./ThemeSwitcher";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { stringAvatar } from "../services/utils";
import { DataSource } from "../data/ds";
import { AppUserService } from "../services/userService";

interface NavHeaderProps {
    context: WebPartContext;
    useDarkTheme: boolean;
    setUseDarkTheme: (val: boolean) => void;
}

const NavHeader: React.FC<NavHeaderProps> = ({ context, useDarkTheme, setUseDarkTheme }) => {

    const theme = useTheme();

    // App-wide data refresh trigger
    const { refresh, isRefreshing, clearAgreementDetailCache } = useAgreements();

    // small screens (md = ~900px), large screens (lg = ~1200px)
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));
    const isLarge = useMediaQuery(theme.breakpoints.down("lg"));

    const showAdmin = DataSource.isAdmin

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
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>At-Risk Agreements</Typography>
                    )}
                </Box>

                {/* MAIN ROUTER LINKS/BUTTONS */}
                <Stack
                    direction="row"
                    spacing={2}
                    sx={{
                        alignItems: "center",
                        alignContent: "flex-start",
                        display: "flex",
                        flexGrow: 1,
                        "& .MuiButton-textInherit:hover": {
                            color: "#F2C744",
                            backgroundColor: "rgba(242, 199, 68, 0.08)"
                        }
                    }}>
                    <Button title="My Work" startIcon={<Work />} color="inherit" component={Link} to="/my-work" >{!isSmall && "My Work"}</Button>
                    <Button title="All Agreeements" startIcon={<ListAlt />} color="inherit" component={Link} to="/all-agreements">{!isSmall && "All Agreements"}</Button>
                    <Button title="Dashboard" startIcon={<Dashboard />} color="inherit" component={Link} to="/dashboard">{!isSmall && "Dashboard"}</Button>
                    {showAdmin && (
                        <Button title="Admin" startIcon={<AdminPanelSettings />} color="inherit" component={Link} to="/admin">
                            {!isSmall && "Admin"}
                        </Button>
                    )}

                </Stack>

                {/* REFRESH, NEW AGREEMENT BUTTON */}
                <Stack direction="row" spacing={1}>
                    <IconButton
                        onClick={() => alert("help link")}
                        size="medium"
                        aria-label="User Guide"
                        title="User Guide"
                    >
                        <HelpOutlineOutlined />
                    </IconButton>

                    <IconButton
                        onClick={async () => {
                            await refresh(true);
                            clearAgreementDetailCache();
                        }}
                        disabled={isRefreshing}
                        size="medium"
                        aria-label="Refresh Data"
                        title={isRefreshing ? "Refreshing…" : "Refresh Data"}
                    >
                        <Refresh sx={{ animation: isRefreshing ? "spin 1s linear infinite" : undefined }} />
                    </IconButton>

                    <Button title="Add New Agreement" startIcon={<Add />} variant="contained" color="primary" sx={{ mx: 2, whiteSpace: "nowrap" }} component={Link} to="/new" >
                        New Agreement
                    </Button>

                </Stack>

                {/* USER DISPLAY */}
                <Stack direction="column" alignItems="flex-end" sx={{ mx: 2 }}>
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

                {/* THEME SWITCHER ICON */}
                <Box sx={{ ml: 1 }}>

                    <ThemeSwitcher
                        useDarkTheme={useDarkTheme}
                        onToggle={async () => {
                            const next = !useDarkTheme;
                            setUseDarkTheme(next);

                            try {
                                await AppUserService.updateMyModePreference(next ? "dark" : "light");
                            } catch (e) {
                                console.error("failed to save theme preference", e);
                            }
                        }}
                    />
                </Box>

            </Toolbar>
        </AppBar>
    );
};

export default NavHeader;
