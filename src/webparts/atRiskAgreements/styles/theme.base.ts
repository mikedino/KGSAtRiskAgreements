import { createTheme } from "@mui/material/styles";
// This import is crucial for extending the Material UI theme with DataGrid-specific colors
import type { } from '@mui/x-data-grid/themeAugmentation';

export const baseTheme = createTheme({
    typography: {
        fontSize: 14, // global baseline
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: "none",
                    fontFamily: "inherit",
                    borderRadius: 8,
                    transition: "background-color 200ms ease, color 200ms ease"
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
        MuiPaper: {
            styleOverrides: {
                root: {
                    //borderRadius: 10,
                    backgroundImage: "none",
                    transition: "background-color 250ms ease",
                },
            },
        },
        MuiInputBase: {
            styleOverrides: {
                root: {
                    fontSize: "10pt",
                },
            },
        },
        MuiList: {
            styleOverrides: {
                root: {
                    fontSize: "10pt",
                },
            },
        },
        MuiMenuList: {
            styleOverrides: {
                root: {
                    fontSize: "10pt",
                },
            },
        },
        MuiAutocomplete: {
            styleOverrides: {
                option: {
                    fontSize: "10pt",
                },
                input: {
                    fontSize: "10pt",
                },
                paper: {
                    fontSize: "10pt",
                },
                inputRoot: ({ theme }) => ({
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
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
                        borderColor: theme.palette.divider,
                    },

                    "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: theme.palette.action.hover,
                    },

                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: theme.palette.info.main,
                        borderWidth: 2,
                    },
                }),
            },
        },
        //focused label color
        MuiInputLabel: {
            styleOverrides: {
                root: ({ theme }) => ({
                    "&.Mui-focused": {
                        color: theme.palette.info.main,
                    },
                }),
            },
        },
        //standard filled inputs just in case
        MuiInput: {
            styleOverrides: {
                underline: ({ theme }) => ({
                    "&:after": {
                        borderBottomColor: theme.palette.info.main,
                    },
                }),
            },
        },
        MuiFilledInput: {
            styleOverrides: {
                root: ({ theme }) => ({
                    "&.Mui-focused": {
                        backgroundColor: "transparent",
                    },
                    "&:after": {
                        borderBottomColor: theme.palette.info.main,
                    },
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
