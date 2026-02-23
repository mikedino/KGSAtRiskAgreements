import * as React from "react";
import { useMemo, useState } from "react";
import {
    Avatar, Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
    IconButton, List, ListItem, ListItemAvatar, ListItemText, MenuItem, Paper, Stack, TextField,
    Typography, Button,
    Alert
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
//import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"; // (not used yet)
import { IAppUserItem } from "../../data/props";

type RoleFilter = "all" | "admin" | "cm" | "user";

interface UsersAdminPanelProps {
    users: IAppUserItem[];
    onRoleChanged: (appUserItemId: number, role: IAppUserItem["role"]) => Promise<void>;
}

const getInitials = (displayName?: string): string => {
    const name = (displayName ?? "").trim();
    if (!name) return "?";
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "?";
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return (first + last).toUpperCase();
};

const formatLastVisit = (iso?: string): string => {
    if (!iso) return "—";
    // keep it simple; you can swap to date-fns later if you want
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
};

export const UsersAdminPanel: React.FC<UsersAdminPanelProps> = ({ users, onRoleChanged }) => {
    const [search, setSearch] = useState<string>("");
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

    const [editOpen, setEditOpen] = useState<boolean>(false);
    const [editUser, setEditUser] = useState<IAppUserItem | null>(null);
    const [editRole, setEditRole] = useState<IAppUserItem["role"]>("user");
    const [saving, setSaving] = useState<boolean>(false);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();

        return users.filter(u => {
            const role = (u.role ?? "user").toLowerCase() as IAppUserItem["role"];
            const name = (u.user?.Title ?? "").toLowerCase();
            const email = (u.user?.EMail ?? "").toLowerCase();

            const matchesSearch = !q || name.includes(q) || email.includes(q);

            const matchesRole =
                roleFilter === "all"
                    ? true
                    : roleFilter === "cm"
                        ? (role === "cm" || role === "admin")
                        : role === roleFilter;

            return matchesSearch && matchesRole;
        });
    }, [users, search, roleFilter]);

    const adminCount = useMemo(() => {
        return users.filter(u => ((u.role ?? "user").toLowerCase() as IAppUserItem["role"]) === "admin").length;
    }, [users]);

    const currentEditRole = useMemo(() => {
        if (!editUser) return "user" as IAppUserItem["role"];
        return ((editUser.role ?? "user").toLowerCase() as IAppUserItem["role"]);
    }, [editUser]);

    const isDemotingLastAdmin = useMemo(() => {
        if (!editUser) return false;
        return currentEditRole === "admin" && adminCount <= 1 && editRole !== "admin";
    }, [editUser, currentEditRole, adminCount, editRole]);

    const openEdit = (u: IAppUserItem): void => {
        setEditUser(u);
        setEditRole((u.role ?? "user").toLowerCase() as IAppUserItem["role"]);
        setEditOpen(true);
    };

    const closeEdit = (): void => {
        if (saving) return;
        setEditOpen(false);
        setEditUser(null);
    };

    const handleSave = async (): Promise<void> => {
        if (!editUser) return;

        setSaving(true);
        try {
            await onRoleChanged(editUser.Id, editRole);
            setEditOpen(false);
            setEditUser(null);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h6" fontWeight={700}>User Management</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage Admin and Contract Manager access
                    </Typography>
                </Box>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} sx={{ mb: 2 }}>
                <TextField
                    size="small"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    fullWidth
                />

                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                    <Chip
                        label="All"
                        clickable
                        color={roleFilter === "all" ? "info" : "default"}
                        variant={roleFilter === "all" ? "filled" : "outlined"}
                        onClick={() => setRoleFilter("all")}
                    />
                    <Chip
                        label="Admins"
                        clickable
                        color={roleFilter === "admin" ? "info" : "default"}
                        variant={roleFilter === "admin" ? "filled" : "outlined"}
                        onClick={() => setRoleFilter("admin")}
                    />
                    <Chip
                        label="CMs"
                        clickable
                        color={roleFilter === "cm" ? "info" : "default"}
                        variant={roleFilter === "cm" ? "filled" : "outlined"}
                        onClick={() => setRoleFilter("cm")}
                    />
                    <Chip
                        label="Users"
                        clickable
                        color={roleFilter === "user" ? "info" : "default"}
                        variant={roleFilter === "user" ? "filled" : "outlined"}
                        onClick={() => setRoleFilter("user")}
                    />
                </Stack>
            </Stack>

            <Divider sx={{ mb: 1 }} />

            <List disablePadding>
                {filtered.map((u) => {
                    const name = u.user?.Title ?? "(unknown)";
                    const email = u.user?.EMail ?? "";
                    const role = (u.role ?? "user").toLowerCase() as IAppUserItem["role"];

                    return (
                        <React.Fragment key={u.Id}>
                            <ListItem
                                sx={{
                                    py: 1.25,
                                    px: 1,
                                    borderRadius: 2
                                }}
                                secondaryAction={
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <Chip
                                            size="small"
                                            label={role === "admin" ? "Admin" : role === "cm" ? "CM" : "User"}
                                            variant="outlined"
                                            color={role === "admin" ? "warning" : role === "cm" ? "info" : "default"}
                                        />
                                        <Chip
                                            size="small"
                                            label={u.modePreference === "dark" ? "Dark" : "Light"}
                                            variant="outlined"
                                        />
                                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mr: 0.5 }}>
                                            Last visit: {formatLastVisit(u.lastVisit)}
                                        </Typography>

                                        <IconButton size="small" onClick={() => openEdit(u)} aria-label="Edit user">
                                            <EditOutlinedIcon fontSize="small" />
                                        </IconButton>

                                        {/* future */}
                                        {/* <IconButton size="small" disabled aria-label="Delete user">
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton> */}
                                    </Stack>
                                }
                            >
                                <ListItemAvatar>
                                    <Avatar>{getInitials(name)}</Avatar>
                                </ListItemAvatar>

                                <ListItemText
                                    primary={<Typography fontWeight={700}>{name}</Typography>}
                                    secondary={
                                        <Typography variant="body2" color="text.secondary">
                                            {email}
                                            {typeof u.visitCount === "number" ? ` • Visits: ${u.visitCount}` : ""}
                                        </Typography>
                                    }
                                />
                            </ListItem>
                            <Divider sx={{ my: 0.5 }} />
                        </React.Fragment>
                    );
                })}

                {!filtered.length && (
                    <Box sx={{ py: 4, textAlign: "center" }}>
                        <Typography variant="body2" color="text.secondary">
                            No users found.
                        </Typography>
                    </Box>
                )}
            </List>

            <Dialog open={editOpen} onClose={closeEdit} fullWidth maxWidth="xs">
                <DialogTitle>Edit User</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        {isDemotingLastAdmin && (
                            <Alert severity="warning">You can’t demote the last Admin.</Alert>
                        )}
                        <Box>
                            <Typography fontWeight={700}>{editUser?.user?.Title ?? "—"}</Typography>
                            <Typography variant="body2" color="text.secondary">{editUser?.user?.EMail ?? ""}</Typography>
                        </Box>

                        <TextField
                            select
                            label="Role"
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as IAppUserItem["role"])}
                            fullWidth
                            size="small"
                        >
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="cm">CM</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                        </TextField>

                        <Typography variant="caption" color="text.secondary">
                            Admins automatically have CM privileges.
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeEdit} disabled={saving}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => handleSave()}
                        disabled={saving || !editUser || isDemotingLastAdmin}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};