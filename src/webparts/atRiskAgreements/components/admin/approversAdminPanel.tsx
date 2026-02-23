import * as React from "react";
import { useMemo, useState } from "react";
import { Alert, Box, Divider, Paper, Stack, TextField, Typography } from "@mui/material";
import { DataSource } from "../../data/ds";
import { formatError } from "../../services/utils";
import { IConfigItem, IEntityItem, ILobItem, IOgItem, IPeoplePicker } from "../../data/props";
import { MuiPeoplePicker } from "../../ui/CustomPeoplePicker";
import { WebPartContext } from "@microsoft/sp-webpart-base";

interface ApproversAdminPanelProps {
    context: WebPartContext;
    config: IConfigItem[];
    lobs: ILobItem[];
    ogs: IOgItem[];
    entities: IEntityItem[];
    onSaved: () => Promise<void>;
}

const toPickerValue = (person?: IPeoplePicker): string[] => {
    const email = person?.EMail;
    return email ? [email] : [];
};

const firstOrUndefined = (items: IPeoplePicker[], selectionLimit: number): IPeoplePicker | undefined => {
    if (!items?.length) return undefined;
    // respect selectionLimit=1 for safety
    return selectionLimit === 1 ? items[0] : items[0];
};

export const ApproversAdminPanel: React.FC<ApproversAdminPanelProps> = ({ context, config, lobs, ogs, entities, onSaved }) => {

    const [error, setError] = useState<string>("");
    const [savingKey, setSavingKey] = useState<string>("");
    const [filter, setFilter] = useState<string>("");

    const ceo = useMemo(() => config.find(c => c.IsFor === "CEO"), [config]);
    const svp = useMemo(() => config.find(c => c.IsFor === "SVPContracts"), [config]);

    const peoplePickerContext = {
        absoluteUrl: context.pageContext.web.absoluteUrl,
        msGraphClientFactory: context.msGraphClientFactory,
        spHttpClient: context.spHttpClient
    };

    const filteredLobs = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return lobs;
        return lobs.filter(l => (l.Title ?? "").toLowerCase().includes(q));
    }, [lobs, filter]);

    const filteredOgs = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return ogs;
        return ogs.filter(o => (o.Title ?? "").toLowerCase().includes(q));
    }, [ogs, filter]);

    const filteredEntities = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return entities;
        return entities.filter(e => ((e.combinedTitle ?? e.Title ?? "")).toLowerCase().includes(q));
    }, [entities, filter]);

    const save = async (key: string, fn: () => Promise<void>): Promise<void> => {
        setError("");
        setSavingKey(key);
        try {
            await fn();
            await onSaved();
        } catch (e) {
            setError(formatError(e));
        } finally {
            setSavingKey("");
        }
    };

    const handleSaveConfig = async (key: string, configItem?: IConfigItem, person?: IPeoplePicker): Promise<void> => {
        if (!configItem?.Id) {
            setError("Config item was not found. Please verify the Config list has the required rows.");
            return;
        }

        await save(key, async () => {
            await DataSource.updateConfigApprover(configItem.Id, person);
        });
    };

    return (
        <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" fontWeight={700}>Default Approvers</Typography>
                <Typography variant="body2" color="text.secondary">
                    Edit defaults where they are stored (Config / LOB / OG / Entities)
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography fontWeight={700} sx={{ mb: 1 }}>Company Defaults (Config list)</Typography>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>CEO</Typography>
                        <MuiPeoplePicker
                            label=""
                            context={peoplePickerContext}
                            value={toPickerValue(ceo?.User)}
                            required={false}
                            selectionLimit={1}
                            onChange={(items: IPeoplePicker[]) => {
                                const selected = firstOrUndefined(items, 1);
                                handleSaveConfig("config-ceo", ceo, selected).catch(err => console.error(err));
                            }}
                            disabled={savingKey === "config-ceo" || !!savingKey}
                        />
                    </Box>

                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>SVP Contracts</Typography>
                        <MuiPeoplePicker
                            label=""
                            context={peoplePickerContext}
                            value={toPickerValue(svp?.User)}
                            required={false}
                            selectionLimit={1}
                            onChange={(items: IPeoplePicker[]) => {
                                const selected = firstOrUndefined(items, 1);
                                handleSaveConfig("config-svp", svp, selected).catch(err => console.error(err));
                            }}
                            disabled={savingKey === "config-svp" || !!savingKey}
                        />
                    </Box>
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
                <TextField
                    size="small"
                    fullWidth
                    label="Filter (LOB / OG / Entity)"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </Paper>

            {/* LOBs */}
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography fontWeight={700} sx={{ mb: 1 }}>LOB Defaults (LOB list)</Typography>

                <Stack spacing={2}>
                    {filteredLobs.map((lob) => {
                        const rowKey = `lob-${lob.Id}`;
                        return (
                            <Box key={lob.Id} sx={{ p: 1.25, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
                                    <Box sx={{ width: { xs: "100%", md: 280 } }}>
                                        <Typography fontWeight={700}>{lob.Title}</Typography>
                                        <Typography variant="caption" color="text.secondary">COO</Typography>
                                    </Box>

                                    <Box sx={{ flex: 1 }}>
                                        <MuiPeoplePicker
                                            label=""
                                            context={peoplePickerContext}
                                            value={toPickerValue(lob.coo)}
                                            required={false}
                                            selectionLimit={1}
                                            onChange={(items: IPeoplePicker[]) => {
                                                const selected = firstOrUndefined(items, 1);
                                                save(rowKey, async () => {
                                                    await DataSource.updateLobCoo(lob.Id, selected);
                                                }).catch(err => console.error(err));
                                            }}
                                            disabled={savingKey === rowKey || !!savingKey}
                                        />
                                    </Box>
                                </Stack>
                            </Box>
                        );
                    })}
                </Stack>
            </Paper>

            {/* OGs */}
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography fontWeight={700} sx={{ mb: 1 }}>Operating Group Defaults (OG list)</Typography>

                <Stack spacing={2}>
                    {filteredOgs.map((og) => {
                        const rowKey = `og-${og.Id}`;

                        const updateOg = async (president?: IPeoplePicker, cm?: IPeoplePicker, scm?: IPeoplePicker): Promise<void> => {
                            await save(rowKey, async () => {
                                await DataSource.updateOgApprovers(og.Id, president, cm, scm);
                            });
                        };

                        return (
                            <Box key={og.Id} sx={{ p: 1.25, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                                <Typography fontWeight={700} sx={{ mb: 1 }}>{og.Title}</Typography>

                                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" color="text.secondary">OG President</Typography>
                                        <MuiPeoplePicker
                                            label=""
                                            context={peoplePickerContext}
                                            value={toPickerValue(og.president)}
                                            required={false}
                                            selectionLimit={1}
                                            onChange={(items: IPeoplePicker[]) => {
                                                const selected = firstOrUndefined(items, 1);
                                                updateOg(selected, og.CM, og.SCM).catch(err => console.error(err));
                                            }}
                                            disabled={savingKey === rowKey || !!savingKey}
                                        />
                                    </Box>

                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" color="text.secondary">Contract Manager</Typography>
                                        <MuiPeoplePicker
                                            label=""
                                            context={peoplePickerContext}
                                            value={toPickerValue(og.CM)}
                                            required={false}
                                            selectionLimit={1}
                                            onChange={(items: IPeoplePicker[]) => {
                                                const selected = firstOrUndefined(items, 1);
                                                updateOg(og.president, selected, og.SCM).catch(err => console.error(err));
                                            }}
                                            disabled={savingKey === rowKey || !!savingKey}
                                        />
                                    </Box>

                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" color="text.secondary">Senior Contract Manager</Typography>
                                        <MuiPeoplePicker
                                            label=""
                                            context={peoplePickerContext}
                                            value={toPickerValue(og.SCM)}
                                            required={false}
                                            selectionLimit={1}
                                            onChange={(items: IPeoplePicker[]) => {
                                                const selected = firstOrUndefined(items, 1);
                                                updateOg(og.president, og.CM, selected).catch(err => console.error(err));
                                            }}
                                            disabled={savingKey === rowKey || !!savingKey}
                                        />
                                    </Box>
                                </Stack>
                            </Box>
                        );
                    })}
                </Stack>
            </Paper>

            {/* Entities */}
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography fontWeight={700} sx={{ mb: 1 }}>Entity Defaults (Entities list)</Typography>

                <Stack spacing={2}>
                    {filteredEntities.map((ent) => {
                        const rowKey = `entity-${ent.Id}`;
                        return (
                            <Box key={ent.Id} sx={{ p: 1.25, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
                                    <Box sx={{ width: { xs: "100%", md: 320 } }}>
                                        <Typography fontWeight={700}>{ent.combinedTitle || ent.Title}</Typography>
                                        <Typography variant="caption" color="text.secondary">{ent.abbr}</Typography>
                                    </Box>

                                    <Box sx={{ flex: 1 }}>
                                        <MuiPeoplePicker
                                            label=""
                                            context={peoplePickerContext}
                                            value={toPickerValue(ent.GM)}
                                            required={false}
                                            selectionLimit={1}
                                            onChange={(items: IPeoplePicker[]) => {
                                                const selected = firstOrUndefined(items, 1);
                                                save(rowKey, async () => {
                                                    await DataSource.updateEntityGm(ent.Id, selected);
                                                }).catch(err => console.error(err));
                                            }}
                                            disabled={savingKey === rowKey || !!savingKey}
                                        />
                                    </Box>
                                </Stack>
                            </Box>
                        );
                    })}
                </Stack>
            </Paper>
        </Stack>
    );
};