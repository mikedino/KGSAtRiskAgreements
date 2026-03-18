import * as React from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { MuiPeoplePicker } from "../../ui/CustomPeoplePicker";
import { ILobItem, IOgItem, IPeoplePicker } from "../../data/props";
import { IPersonaProps } from "@fluentui/react/lib/Persona";
import { PeoplePickerContext } from "./ApproversPanel";
import { toPickerValue, firstOrUndefined, run, OgField } from "./ApproversPanel";
import { IOgPayload } from "../../services/ogService";
import { formatError } from "../../services/utils";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

interface OgDefaultsSectionProps {
    ogs: IOgItem[];
    lobs: ILobItem[];
    peoplePickerContext: PeoplePickerContext;
    savingKey: string;
    onChangeOg: (ogId: number, ogTitle: string, label: string, changedField: OgField, presidentId?: number, cmId?: number) => Promise<void>;
    onUpdate: (item: IOgPayload) => Promise<void>;
    onCreate: (item: IOgPayload) => Promise<void>;
    onDelete: (ogId: number, title: string) => Promise<void>;
    errors: Record<string, string>;
    clearError: (key: string) => void;
}

export const OgDefaultsSection: React.FC<OgDefaultsSectionProps> = ({
    ogs,
    lobs,
    peoplePickerContext,
    savingKey,
    onChangeOg,
    onUpdate,
    onCreate,
    onDelete,
    errors,
    clearError
}) => {

    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [dialogMode, setDialogMode] = React.useState<"add" | "edit">("add");
    const [editingOg, setEditingOg] = React.useState<IOgItem | undefined>(undefined);
    const [ogTitle, setOgTitle] = React.useState("");
    const [lobId, setLobId] = React.useState<number | "">("");
    const [ogPresident, setOgPresident] = React.useState<IPersonaProps | undefined>(undefined);
    const [ogCm, setOgCm] = React.useState<IPersonaProps | undefined>(undefined);

    const [dialogError, setDialogError] = React.useState("");
    const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
    const [deleteError, setDeleteError] = React.useState("");

    const handleTitleChange = (val: string): void => {
        setOgTitle(val);
        if (dialogError) setDialogError("");
    }

    const handlePresidentChange = (person: IPersonaProps | undefined): void => {
        setOgPresident(person);
        if (dialogError) setDialogError("");
    }

    const handleCmChange = (person: IPersonaProps | undefined): void => {
        setOgCm(person);
        if (dialogError) setDialogError("");
    }

    const handleLobChange = (lobId: number | ""): void => {
        setLobId(lobId);
        if (dialogError) setDialogError("");
    }

    const convertPickerToPersona = (person: IPeoplePicker | undefined): IPersonaProps | undefined => {
        return person ?
            {
                id: String(person.Id),
                text: person.Title,
                secondaryText: person.EMail
            }
            : undefined
    }

    const openAddDialog = (): void => {
        setDialogMode("add");
        setEditingOg(undefined);
        setOgTitle("");
        setLobId("");
        setOgPresident(undefined);
        setOgCm(undefined);
        setDialogError("");
        setDialogOpen(true);
    };

    const openEditDialog = (og: IOgItem): void => {
        setDialogMode("edit");
        setEditingOg(og);
        setOgTitle(og.Title ?? "");
        setLobId(og.lob?.Id ?? "");
        setOgPresident(convertPickerToPersona(og.president));
        setOgCm(convertPickerToPersona(og.CM));
        setDialogError("");
        setDialogOpen(true);
    };

    const closeDialog = (): void => {
        if (!!savingKey) return;

        setDialogOpen(false);
        setEditingOg(undefined);
        setOgTitle("");
        setLobId("");
        setOgCm(undefined);
        setOgPresident(undefined);
        setDialogError("");
    };

    const openDeleteConfirm = (): void => {
        setDeleteError("");
        setConfirmDeleteOpen(true);
    };

    const closeDeleteConfirm = (): void => {
        if (!!savingKey) return;
        setConfirmDeleteOpen(false);
        setDeleteError("");
    };

    const handleDialogSave = async (): Promise<void> => {
        const trimmedTitle = ogTitle.trim();

        if (!trimmedTitle) {
            setDialogError("OG title is required.");
            return;
        }

        const duplicate = ogs.some(e =>
            e.Title.trim().toLowerCase() === trimmedTitle.toLowerCase() &&
            e.Id !== editingOg?.Id
        );

        if (duplicate) {
            setDialogError("An OG with that title already exists.");
            return;
        }

        const presidentId = ogPresident?.id ? Number(ogPresident.id) : undefined;
        if (!presidentId || Number.isNaN(presidentId)) {
            setDialogError("President is required.");
            return;
        }

        const cmId = ogCm?.id ? Number(ogCm.id) : undefined;
        if (!cmId || Number.isNaN(cmId)) {
            setDialogError("CM is required.");
            return;
        }

        const thisLobId = lobId ? Number(lobId) : undefined;
        if (!thisLobId || Number.isNaN(thisLobId)) {
            setDialogError("LOB is required.");
            return;
        }

        // preserve state in case save fails
        const mode = dialogMode;
        const og = editingOg;
        const lob = thisLobId;
        const title = ogTitle;
        const president = ogPresident;
        const cm = ogCm;

        // close first so backdrop is top layer
        setDialogOpen(false);
        setDialogError("");

        const fullItem: IOgPayload = {
            Id: og?.Id ?? 0,
            Title: trimmedTitle,
            presidentId: presidentId,
            lobId: thisLobId,
            CMId: cmId
        }

        try {
            if (mode === "add") {
                await onCreate(fullItem);
            } else if (og) {
                await onUpdate(fullItem);
            }

            // clear after success
            setEditingOg(undefined);
            setOgTitle("");
            setLobId("");
            setOgCm(undefined);
            setOgPresident(undefined);
        } catch (e) {
            // reopen and restore values if save fails
            setDialogMode(mode);
            setEditingOg(og);
            setOgTitle(title);
            setLobId(lob);
            setOgPresident(president);
            setOgCm(cm);
            setDialogError(formatError(e));
            setDialogOpen(true);
        }
    };

    const handleDelete = async (): Promise<void> => {
        if (!editingOg?.Id) return;

        const current = ogs.find(e => e.Id === editingOg.Id);
        if (!current) {
            setDeleteError("OG not found.");
            return;
        }

        try {
            setConfirmDeleteOpen(false);
            setDialogOpen(false);

            await onDelete(current.Id, current.Title);

            setEditingOg(undefined);
            setOgTitle("");
            setLobId("");
            setOgCm(undefined);
            setOgPresident(undefined);
            setDialogError("");
            setDeleteError("");
        } catch (e) {
            setDeleteError(formatError(e));
            setConfirmDeleteOpen(true);
        }
    };


    return (
        <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Box
                sx={{
                    minWidth: 0,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 2,
                    flexWrap: "wrap"
                }}
            >
                <Box>
                    <Typography fontWeight={700}>Operating Group Defaults</Typography>
                    <Typography variant="body2" color="text.secondary">
                        OG President + Contract Manager are stored per OG
                    </Typography>
                </Box>

                <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={openAddDialog}>
                    Add OG
                </Button>
            </Box>

            <Stack spacing={1.5} sx={{ minWidth: 0 }}>
                {ogs.map((og) => {
                    const rowKey = `og-${og.Id}`;
                    const presKey = `og-${og.Id}-president`;
                    const cmKey = `og-${og.Id}-cm`;

                    return (
                        <Paper key={og.Id} variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                                <Typography fontWeight={700} sx={{ mb: 1 }} noWrap>
                                    {og.Title}
                                </Typography>

                                <IconButton
                                    size="small"
                                    aria-label={`Edit ${og.Title}`}
                                    onClick={() => openEditDialog(og)}
                                    disabled={savingKey === rowKey || !!savingKey}
                                >
                                    <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                            </Stack>

                            <Grid container spacing={2} sx={{ minWidth: 0 }}>

                                <Grid size={{ sm: 12, md: 4 }} sx={{ minWidth: 0 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        LOB
                                    </Typography>

                                    <Box
                                        sx={(theme) => ({
                                            minWidth: 0,
                                            minHeight: "41.33px",
                                            px: 1.75,
                                            py: 1,
                                            border: `1px solid ${theme.palette.secondary.light}`,
                                            borderRadius: "4px",
                                            display: "flex",
                                            alignItems: "center",
                                            backgroundColor: theme.palette.background.paper
                                        })}
                                    >
                                        <Typography variant="body2" noWrap>
                                            {og.lob?.Title ?? "—"}
                                        </Typography>
                                    </Box>
                                </Grid>

                                <Grid size={{ sm: 12, md: 4 }} sx={{ minWidth: 0 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        OG President
                                    </Typography>
                                    <Box sx={{ minWidth: 0 }}>
                                        <MuiPeoplePicker
                                            label=""
                                            context={peoplePickerContext}
                                            value={toPickerValue(og.president)}
                                            selectionLimit={1}
                                            error={!!errors[presKey]}
                                            helperText={errors[presKey]}
                                            onChange={(items: IPersonaProps[]) => {
                                                const selected = firstOrUndefined(items, 1);
                                                const newPresId = Number(selected?.id);
                                                const existingCmId = og.CM?.Id;

                                                if (selected?.id) clearError(presKey);

                                                run(onChangeOg(
                                                    og.Id,
                                                    og.Title,
                                                    `${og.Title} President`,
                                                    "president",
                                                    newPresId,
                                                    existingCmId
                                                ));
                                            }}
                                            disabled={savingKey === rowKey || !!savingKey}
                                        />
                                    </Box>
                                </Grid>

                                <Grid size={{ sm: 12, md: 4 }} sx={{ minWidth: 0 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Contract Manager
                                    </Typography>
                                    <Box sx={{ minWidth: 0 }}>
                                        <MuiPeoplePicker
                                            label=""
                                            context={peoplePickerContext}
                                            value={toPickerValue(og.CM)}
                                            selectionLimit={1}
                                            error={!!errors[cmKey]}
                                            helperText={errors[cmKey]}
                                            onChange={(items: IPersonaProps[]) => {
                                                const selected = firstOrUndefined(items, 1);
                                                const newCmId = Number(selected?.id);
                                                const existingPresId = og.president?.Id;

                                                if (selected?.id) clearError(cmKey);

                                                run(onChangeOg(
                                                    og.Id,
                                                    og.Title,
                                                    `${og.Title} CM`,
                                                    "cm",
                                                    existingPresId,
                                                    newCmId
                                                ));
                                            }}
                                            disabled={savingKey === rowKey || !!savingKey}
                                        />
                                    </Box>
                                </Grid>
                            </Grid>
                        </Paper>
                    );
                })}
            </Stack>

            <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
                <DialogTitle>{dialogMode === "add" ? `Add OG` : `Edit OG`}</DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2} sx={{ pt: 0.5 }}>
                        {dialogError && (
                            <Alert severity="error">
                                {dialogError}
                            </Alert>
                        )}

                        <TextField
                            label="OG Title"
                            value={ogTitle}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            fullWidth
                            size="small"
                            autoFocus
                        />

                        <MuiPeoplePicker
                            label="OG President"
                            context={peoplePickerContext}
                            value={toPickerValue(editingOg?.president)}
                            required
                            selectionLimit={1}
                            onChange={(items: IPersonaProps[]) => {
                                const selected = firstOrUndefined(items, 1);
                                handlePresidentChange(selected);
                            }}
                        />

                        <MuiPeoplePicker
                            label="Contract Manager"
                            context={peoplePickerContext}
                            value={toPickerValue(editingOg?.CM)}
                            required
                            selectionLimit={1}
                            onChange={(items: IPersonaProps[]) => {
                                const selected = firstOrUndefined(items, 1);
                                handleCmChange(selected);
                            }}
                        />

                        <TextField
                            select
                            label="LOB"
                            required
                            fullWidth
                            value={lobId}
                            onChange={(e) => {
                                const selected = e.target.value;
                                handleLobChange(selected === "" ? "" : Number(selected));
                            }}
                        >
                            {lobs.map((lob) => (
                                <MenuItem key={lob.Id} value={lob.Id}>
                                    {lob.Title}
                                </MenuItem>
                            ))}
                        </TextField>

                    </Stack>
                </DialogContent>

                <DialogActions sx={{ justifyContent: "space-between" }}>
                    <Box>
                        {dialogMode === "edit" && (
                            <Button
                                color="error"
                                variant="outlined"
                                onClick={openDeleteConfirm}
                                disabled={!!savingKey}
                            >
                                Delete
                            </Button>
                        )}
                    </Box>

                    <Stack direction="row" spacing={1}>
                        <Button onClick={closeDialog} disabled={!!savingKey}>
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => {
                                handleDialogSave().catch((err) => console.error(`OG dialog save failed`, err));
                            }}
                            disabled={!!savingKey}
                        >
                            {dialogMode === "add" ? "Add" : "Save"}
                        </Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            <ConfirmDeleteDialog
                open={confirmDeleteOpen}
                title="Delete OG"
                message={`Are you sure you want to delete "${ogTitle}"? This cannot be undone.`}
                confirmLabel="Delete"
                error={deleteError}
                busy={!!savingKey}
                onClose={closeDeleteConfirm}
                onConfirm={handleDelete}
            />

        </Stack>
    );
};