import { createTheme } from "@mui/material/styles";
// This import is crucial for extending the Material UI theme with DataGrid-specific colors
import type { } from '@mui/x-data-grid/themeAugmentation';

export const fontSizeDefault = 14;
export const lineHeight = "21px";

export const baseTheme = createTheme({
    typography: {
        fontSize: 14 // global baseline
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: "none",
                    //fontFamily: "inherit",
                    borderRadius: 8,
                    transition: "background-color 200ms ease, color 200ms ease"
                }
            }
        },
        MuiButtonBase: {
            styleOverrides: {
                root: {
                    textTransform: "none"
                }
            }
        },
        // Smooth transitions globally
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    transition: "background-color 300ms ease, color 300ms ease",
                },
            },
        },
        MuiInputBase: {
            styleOverrides: {
                root: {
                    fontSize: fontSizeDefault,
                    lineHeight: lineHeight,
                },
            },
        },
        MuiList: {
            styleOverrides: {
                root: {
                    fontSize: fontSizeDefault,
                },
            },
        },
        MuiMenuItem: {
            styleOverrides: {
                root: {
                    fontSize: fontSizeDefault,
                    padding: "2px 16px"
                },
            },
        },
        MuiMenu: {
            styleOverrides: {
                root: {
                    fontSize: fontSizeDefault,
                },
            }
        },
        MuiMenuList: {
            styleOverrides: {
                root: {
                    fontSize: fontSizeDefault,
                },
            },
        },
        MuiTextField: {
            defaultProps: {
                size: "small",
                variant: "outlined",
            },
            styleOverrides: {
                root: {
                    fontSize: fontSizeDefault,
                    minHeight: "41px"
                }
            }
        },
        MuiFormHelperText: {
            styleOverrides: {
                root: {
                    fontSize: "0.75rem"
                }
            }
        },
        MuiSelect: {
            defaultProps: { size: "small" },
        },
        MuiFormControl: {
            defaultProps: { size: "small" },
        },
        MuiAutocomplete: {
            defaultProps: {
                size: "small",
            },
            styleOverrides: {
                option: {
                    fontSize: fontSizeDefault,
                },
                input: {
                    fontSize: fontSizeDefault,
                },
                paper: {
                    fontSize: fontSizeDefault,
                },
                inputRoot: ({ theme }) => ({
                    "&&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: theme.palette.info.main,
                        borderWidth: 2,
                    },
                }),
            },
        },
        //outlined inputs on forms
        MuiOutlinedInput: {
            styleOverrides: {
                root: ({ theme }) => ({
                    "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: theme.palette.secondary.light,
                    },

                    "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: theme.palette.action.hover,
                    },

                    "&&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: theme.palette.info.main,
                        borderWidth: 2,
                    },
                    fontSize: fontSizeDefault
                }),
                input: {
                    paddingTop: "10px",
                    paddingBottom: "10px",
                    lineHeight: lineHeight
                }
            }
        },
        //focused label color
        MuiInputLabel: {
            styleOverrides: {
                root: ({ theme }) => ({
                    "&.Mui-focused": {
                        color: theme.palette.info.main
                    },
                    // only the resting label (before input/focus)
                    "&:not(.MuiInputLabel-shrink)": {
                        transform: "translate(14px, 12px) scale(1)",
                    }
                }),
            },
        },
        // MuiFormControlLabel: {
        //     styleOverrides : {
        //         labelPlacementStart: {

        //         }
        //     }
        // },
        //standard filled inputs just in case
        MuiInput: {
            styleOverrides: {
                underline: ({ theme }) => ({
                    "&:after": {
                        borderBottomColor: theme.palette.info.main
                    },
                }),
            },
        },
        MuiNativeSelect: {
            styleOverrides: {
                root: {
                    fontSize: fontSizeDefault
                },
                nativeInput: {
                    fontSize: fontSizeDefault
                }
            }
        },
        MuiFilledInput: {
            styleOverrides: {
                root: ({ theme }) => ({
                    "&.Mui-focused": {
                        backgroundColor: "transparent",
                    },
                    "&:after": {
                        borderBottomColor: theme.palette.info.main
                    },
                }),
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: ({ theme }) => ({
                    backgroundImage: "none",
                    transition: "background-color 250ms ease",
                    backgroundColor: theme.custom?.cardBg,
                    borderColor: theme.custom?.cardBorder
                }),
            },
        },
        MuiCard: {
            styleOverrides: {
                root: ({ theme }) => ({
                    borderRadius: 3,
                    //backgroundColor: theme.custom?.cardBg,
                    border: "1px solid",
                    borderColor: theme.custom?.cardBorder
                }),
            },
        }
    },
    ///////////// this didn't work -->
    // palette: {
    //     DataGrid: {
    //         // Container background
    //         bg: 'transparent',
    //         // Pinned rows and columns background
    //         pinnedBg: 'transparent',
    //         // Column header background
    //         headerBg: 'transparent',
    //     }
    // }
});
