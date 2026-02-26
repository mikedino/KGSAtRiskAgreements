import * as React from "react";
import { Box, Grid, Paper, Stack, Typography } from "@mui/material";
import { MuiPeoplePicker } from "../../ui/CustomPeoplePicker";
import { IOgItem } from "../../data/props";
import { IPersonaProps } from "@fluentui/react/lib/Persona";
import { PeoplePickerContext } from "./ApproversPanel";
import { toPickerValue, firstOrUndefined, run, OgField } from "./ApproversPanel";

interface OgDefaultsSectionProps {
    ogs: IOgItem[];
    peoplePickerContext: PeoplePickerContext;
    savingKey: string;
    onChangeOg: (ogId: number, ogTitle: string, label: string, changedField: OgField, presidentId?: number, cmId?: number) => Promise<void>;
    errors: Record<string, string>;
    clearError: (key: string) => void;
}

export const OgDefaultsSection: React.FC<OgDefaultsSectionProps> = ({
    ogs,
    peoplePickerContext,
    savingKey,
    onChangeOg,
    errors,
    clearError
}) => {
    return (
        <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700}>Operating Group Defaults</Typography>
                <Typography variant="body2" color="text.secondary">
                    OG President + Contract Manager are stored per OG
                </Typography>
            </Box>

            <Stack spacing={1.5} sx={{ minWidth: 0 }}>
                {ogs.map((og) => {
                    const rowKey = `og-${og.Id}`;
                    const presKey = `og-${og.Id}-president`;
                    const cmKey = `og-${og.Id}-cm`;

                    return (
                        <Paper key={og.Id} variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
                            <Typography fontWeight={700} sx={{ mb: 1 }} noWrap>
                                {og.Title}
                            </Typography>

                            <Grid container spacing={2} sx={{ minWidth: 0 }}>
                                <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: 0 }}>
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

                                <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: 0 }}>
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
        </Stack>
    );
};