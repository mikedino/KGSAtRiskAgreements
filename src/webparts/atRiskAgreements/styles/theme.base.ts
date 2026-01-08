import { createTheme } from "@mui/material/styles";
// This import is crucial for extending the Material UI theme with DataGrid-specific colors
import type { } from '@mui/x-data-grid/themeAugmentation';

export const baseTheme = createTheme({
    typography: {
        fontSize: 14, // global baseline
    },
    components: {
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
                }
            },
        }
    },
    palette: {
        DataGrid: {
            // Container background
            bg: 'transparent',
            // Pinned rows and columns background
            pinnedBg: 'transparent',
            // Column header background
            headerBg: 'transparent',
        }
    }
});
