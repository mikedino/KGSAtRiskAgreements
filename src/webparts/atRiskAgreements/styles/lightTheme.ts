import { createTheme } from "@mui/material/styles";
import { baseTheme } from "./theme.base";

export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: "light",

    primary: { main: "#003057" },
    secondary: { main: "#005C6C" },
    error: { main: "#B00020" },
    warning: { main: "#F4B740" },
    info: { main: "#0078D4" },
    success: { main: "#3BA55C" },

    background: {
      default: "#ffffff",
      paper: "#F7F9FA"
    },

    divider: "#ccd6dd",

    text: {
      primary: "#333333",
      secondary: "#005C6C",
    },

    action: {
      active: "#0078D4"   // Microsoft blue for icons
    }
  },

  custom: {
    cardBg: "#eff2f6", //#F3F6FA
    cardBorder: "#93a3b3", //#a2b0be
  },

  typography: {
    fontFamily: ["Roboto", "Segoe UI", "Arial", "sans-serif"].join(","),
  },

  components: {

    MuiButton: {
      styleOverrides: {
        //extend base theme overrides
        ...(baseTheme.components?.MuiButton?.styleOverrides ?? {}),

        // PRIMARY light mode: Microsoft blue
        containedPrimary: {
          backgroundColor: "#0078D4",
          "&:hover": {
            backgroundColor: "#106EBE",
          }
        },

        textPrimary: {
          color: "#0078D4",
          "&:hover": {
            color: "#106EBE",
          }
        },

        // SECONDARY: KGS Teal
        containedSecondary: {
          backgroundColor: "#005C6C",
          color: "#ffffff",
          "&:hover": {
            backgroundColor: "#00788A",
          }
        },

        containedError: {
          backgroundColor: "#D64545",
          color: "#ffffff",
          "&:hover": {
            backgroundColor: "#B43B3B",
          }
        }
      }
    }
  }
});
