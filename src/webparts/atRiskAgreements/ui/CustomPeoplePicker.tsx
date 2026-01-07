import * as React from "react";
import { IPersonaProps } from "@fluentui/react";
import { SxProps, Theme } from "@mui/material";
import { FormControl, FormLabel, useTheme } from "@mui/material";
import { PeoplePicker, PrincipalType, IPeoplePickerContext } from "@pnp/spfx-controls-react/lib/PeoplePicker";

export interface MuiPeoplePickerProps {
    label: string;
    context: IPeoplePickerContext;
    value?: string[];
    required?: boolean;
    disabled?: boolean;
    onChange: (items: IPersonaProps[]) => void;
    selectionLimit?: number;
    sx?: SxProps<Theme>;
}

export const MuiPeoplePicker: React.FC<MuiPeoplePickerProps> = ({
    label,
    context,
    value,
    required = false,
    disabled = false,
    onChange,
    selectionLimit = 1,
    sx
}) => {
    const theme = useTheme();

    const defaultBorderColor =
        theme.palette.mode === "dark"
            ? theme.palette.divider
            : theme.palette.grey[400];

    return (
        <FormControl
            fullWidth
            required={required}
            disabled={disabled}
            sx={{ position: "relative", m: 0, p: 0 }}
        >
            <FormLabel
                sx={(theme) => ({
                    position: "absolute",
                    left: 0,
                    top: 0,
                    transform: "translate(14px, -9px) scale(0.75)",
                    transformOrigin: "top left",
                    color: theme.palette.text.secondary,
                    fontWeight: 400,
                    fontSize: theme.typography.body1.fontSize,
                    backgroundColor: theme.palette.background.default,
                    lineHeight: "1.4375em",
                    px: "4px",
                    zIndex: 1,
                    pointerEvents: "none",
                    maxWidth: "calc(133% - 32px)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                })}
            >
                {label}
            </FormLabel>

            <PeoplePicker
                context={context}
                personSelectionLimit={selectionLimit}
                principalTypes={[PrincipalType.User]}
                ensureUser
                disabled={disabled}
                defaultSelectedUsers={value}
                resolveDelay={1000}
                onChange={onChange} //pass thru unchanged
                styles={{
                    root: {
                        border: `1px solid ${defaultBorderColor}`,
                        borderRadius: theme.shape.borderRadius,
                        padding: "14.5px 14px",
                        minHeight: 56,
                        // backgroundColor: disabled
                        //     ? theme.palette.action.disabledBackground
                        //     : theme.palette.background.paper,
                        selectors: {
                            ".ms-BasePicker-text": {
                                border: "none",
                                minHeight: "unset"
                            },
                            ".ms-PickerPersona-container" :{
                                background: theme.palette.background.paper,
                                color: theme.palette.text.primary
                            },
                            ".ms-Persona-primaryText": {
                                color: theme.palette.text.primary
                            }
                        },
                        '&:hover': {
                            borderColor: theme.palette.text.primary
                        },
                        '&.focused': {
                            borderColor: theme.palette.primary.main,
                            borderWidth: 2
                        },
                        '&.error': {
                            borderColor: theme.palette.error.main
                        },
                        '&.disabled': {
                            borderColor: theme.palette.action.disabled
                        }
                    }
                }}
            />
        </FormControl>
    );
};
