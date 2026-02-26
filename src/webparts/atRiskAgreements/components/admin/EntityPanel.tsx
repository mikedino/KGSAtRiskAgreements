import * as React from "react";
import { Box, Grid, Paper, Stack, Typography } from "@mui/material";
import { MuiPeoplePicker } from "../../ui/CustomPeoplePicker";
import { IEntityItem } from "../../data/props";
import { IPersonaProps } from "@fluentui/react/lib/Persona";
import { PeoplePickerContext } from "./ApproversPanel";
import { toPickerValue, firstOrUndefined, run } from "./ApproversPanel";

interface EntityDefaultsSectionProps {
    entities: IEntityItem[];
    peoplePickerContext: PeoplePickerContext;
    savingKey: string;
    onChangeGm: (entityId: number, entityTitle: string, label: string, person?: IPersonaProps) => Promise<void>;
    errors: Record<string, string>;
    clearError: (key: string) => void;
}

export const EntityDefaultsSection: React.FC<EntityDefaultsSectionProps> = ({
    entities,
    peoplePickerContext,
    savingKey,
    onChangeGm,
    errors,
    clearError
}) => {
    return (
        <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700}>Entity Defaults</Typography>
                <Typography variant="body2" color="text.secondary">
                    GM is stored per Entity
                </Typography>
            </Box>

            <Stack spacing={1.5} sx={{ minWidth: 0 }}>
                {entities.map((ent) => {
                    const rowKey = `entity-${ent.Id}`;
                    const errKey = `entity-${ent.Id}-gm`;

                    return (
                        <Paper key={ent.Id} variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
                            <Grid container spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
                                <Grid size={{ xs: 12, md: 5 }} sx={{ minWidth: 0 }}>
                                    <Typography fontWeight={700} noWrap>
                                        {ent.combinedTitle || ent.Title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {ent.abbr}
                                    </Typography>
                                </Grid>

                                <Grid size={{ xs: 12, md: 7 }} sx={{ minWidth: 0 }}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <MuiPeoplePicker
                                            label=""
                                            context={peoplePickerContext}
                                            value={toPickerValue(ent.GM)}
                                            selectionLimit={1}
                                            error={!!errors[errKey]}
                                            helperText={errors[errKey]}
                                            onChange={(items: IPersonaProps[]) => {
                                                const selected = firstOrUndefined(items, 1);
                                                if (selected?.id) clearError(errKey);
                                                run(onChangeGm(ent.Id, ent.Title, `${ent.Title} GM`, selected));
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