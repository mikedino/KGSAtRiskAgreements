import * as React from "react";
import { Box, Grid, Paper, Stack, Typography } from "@mui/material";
import { MuiPeoplePicker } from "../../ui/CustomPeoplePicker";
import { ILobItem } from "../../data/props";
import { IPersonaProps } from "@fluentui/react/lib/Persona";
import { PeoplePickerContext } from "./ApproversPanel";
import { toPickerValue, firstOrUndefined, run } from "./ApproversPanel";

interface LobDefaultsSectionProps {
    lobs: ILobItem[];
    peoplePickerContext: PeoplePickerContext;
    savingKey: string;
    onChangeCoo: (lobId: number, lobTitle: string, label: string, person?: IPersonaProps) => Promise<void>;
    errors: Record<string, string>;
    clearError: (key: string) => void;
}

export const LobDefaultsSection: React.FC<LobDefaultsSectionProps> = ({
    lobs,
    peoplePickerContext,
    savingKey,
    onChangeCoo,
    errors,
    clearError
}) => {
    return (
        <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700}>LOB Defaults</Typography>
                <Typography variant="body2" color="text.secondary">
                    COO is stored per LOB
                </Typography>
            </Box>

            <Stack spacing={1.5} sx={{ minWidth: 0 }}>
                {lobs.map((lob) => {
                    const rowKey = `lob-${lob.Id}`;
                    const errKey = `lob-${lob.Id}-coo`;

                    return (
                        <Paper key={lob.Id} variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
                            <Grid container spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
                                <Grid size={{ xs: 12, md: 4 }} sx={{ minWidth: 0 }}>
                                    <Typography fontWeight={700} noWrap>
                                        {lob.Title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        COO
                                    </Typography>
                                </Grid>

                                <Grid size={{ xs: 12, md: 8 }} sx={{ minWidth: 0 }}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <MuiPeoplePicker
                                            label=""
                                            context={peoplePickerContext}
                                            value={toPickerValue(lob.coo)}
                                            required={false}
                                            error={!!errors[errKey]}
                                            helperText={errors[errKey]}
                                            selectionLimit={1}
                                            onChange={(items: IPersonaProps[]) => {
                                                const selected = firstOrUndefined(items, 1);

                                                if (selected?.id) clearError(errKey);

                                                run(onChangeCoo(lob.Id, lob.Title, `${lob.Title} COO`, selected));
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