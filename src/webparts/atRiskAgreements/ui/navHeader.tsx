import * as React from "react";
import { AppBar, Toolbar, Typography, Button, useMediaQuery, Box, Stack, Avatar } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Handshake from "@mui/icons-material/Handshake";
import AddIcon from "@mui/icons-material/Add";
import DashboardIcon from "@mui/icons-material/Dashboard";
import WorkIcon from "@mui/icons-material/Work";
import ListAltIcon from "@mui/icons-material/ListAlt";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { Link } from "react-router-dom";
import ThemeSwitcher from "./themeSwitcher";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { stringAvatar } from "../services/utils";

interface NavHeaderProps {
    context: WebPartContext;
    useDarkTheme: boolean;
    setUseDarkTheme: (val: boolean) => void;
}

const NavHeader: React.FC<NavHeaderProps> = ({ context, useDarkTheme, setUseDarkTheme }) => {
    const theme = useTheme();

    // small screens (md = ~900px), large screens (lg = ~1200px)
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));
    const isLarge = useMediaQuery(theme.breakpoints.down("lg"));

    return (
        <AppBar
            position="static"
            color="primary"
            sx={{ border: "1px solid", borderColor: "divider" }}
        >
            <Toolbar sx={{ pl: 2, pr: 1 }}>

                {/* ICON + TITLE */}
                <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1, gap: 1 }}>
                    {/* Always show the icon */}
                    <Handshake sx={{ fontSize: 38, color: "inherit" }} />

                    {/* Hide title when screen is small */}
                    {!isLarge && (
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>At-Risk Agreements</Typography>
                    )}
                </Box>

                {/* ROUTER LINKS */}
                <Stack direction="row" spacing={2}>
                    <Button title="My Work" startIcon={<WorkIcon />} color="inherit" component={Link} to="/my-work" >{!isSmall && "My Work"}</Button>
                    <Button title="All Agreeements" startIcon={<ListAltIcon />} color="inherit" component={Link} to="/all-agreements">{!isSmall && "All Agreements"}</Button>
                    <Button title="Dashboard" startIcon={<DashboardIcon />} color="inherit" component={Link} to="/dashboard">{!isSmall && "Dashboard"}</Button>
                    <Button title="Admin" startIcon={<AdminPanelSettingsIcon />} color="inherit" component={Link} to="/admin">{!isSmall && "Admin"}</Button>
                </Stack>

                {/* NEW AGREEMENT BUTTON */}
                <Button title="Add New Agreement" startIcon={<AddIcon />} variant="contained" color="primary" sx={{ mx: 2, whiteSpace: "nowrap" }} component={Link} to="/new" >
                    New Agreement
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
                                Administrator
                            </Typography>
                        </>
                    )}
                </Stack>

                {/* THEME SWITCHER ICON */}
                <Box sx={{ ml: 1 }}>
                    <ThemeSwitcher useDarkTheme={useDarkTheme} onToggle={() => setUseDarkTheme(!useDarkTheme)} />
                </Box>

            </Toolbar>
        </AppBar>
    );
};

export default NavHeader;
