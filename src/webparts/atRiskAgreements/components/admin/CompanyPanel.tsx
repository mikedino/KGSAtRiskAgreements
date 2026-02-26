import * as React from "react";
import { Box, Grid, Stack, Typography } from "@mui/material";
import { MuiPeoplePicker } from "../../ui/CustomPeoplePicker";
import { IConfigItem } from "../../data/props";
import { IPersonaProps } from "@fluentui/react/lib/Persona";
import { PeoplePickerContext } from "./ApproversPanel";
import { toPickerValue, firstOrUndefined, run, ConfigKey } from "./ApproversPanel";

interface CompanyDefaultsSectionProps {
    ceo?: IConfigItem;
    svp?: IConfigItem;
    peoplePickerContext: PeoplePickerContext;
    savingKey: ConfigKey | string;
    onChangeCEO: (person?: IPersonaProps) => Promise<void>;
    onChangeSVP: (person?: IPersonaProps) => Promise<void>;
    errors: Record<string, string>;
    clearError: (key: ConfigKey) => void;
}

export const CompanyDefaultsSection: React.FC<CompanyDefaultsSectionProps> = ({
    ceo,
    svp,
    peoplePickerContext,
    savingKey,
    onChangeCEO,
    onChangeSVP,
    errors,
    clearError
}) => {
    return (
        <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Typography fontWeight={700}>Company Defaults (Config)</Typography>

            <Grid container spacing={2} sx={{ minWidth: 0 }}>
                <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: 0 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        CEO
                    </Typography>
                    <Box sx={{ minWidth: 0 }}>
                        <MuiPeoplePicker
                            label=""
                            context={peoplePickerContext}
                            value={toPickerValue(ceo?.User)}
                            selectionLimit={1}
                            error={!!errors["config-ceo"]}
                            helperText={errors["config-ceo"]}
                            onChange={(items: IPersonaProps[]) => {
                                const selected = firstOrUndefined(items, 1);

                                // clear red state immediately when user picks someone
                                if (selected?.id) clearError("config-ceo");

                                run(onChangeCEO(selected));
                            }}
                            disabled={savingKey === "config-ceo" || !!savingKey}
                        />
                    </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: 0 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        SVP Contracts
                    </Typography>
                    <Box sx={{ minWidth: 0 }}>
                        <MuiPeoplePicker
                            label=""
                            context={peoplePickerContext}
                            value={toPickerValue(svp?.User)}
                            selectionLimit={1}
                            error={!!errors["config-svp"]}
                            helperText={errors["config-svp"]}
                            onChange={(items: IPersonaProps[]) => {
                                const selected = firstOrUndefined(items, 1);

                                // clear red state immediately when user picks someone
                                if (selected?.id) clearError("config-svp");

                                run(onChangeSVP(selected));
                            }}
                            disabled={savingKey === "config-svp" || !!savingKey}
                        />
                    </Box>
                </Grid>
            </Grid>
        </Stack>
    );
};