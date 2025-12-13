import { createTheme } from "@mui/material/styles";

export const darkTheme = createTheme({
  palette: {
    mode: "dark",

    primary: { main: "#003057" },     // KGS Navy
    secondary: { main: "#005C6C" },   // KGS Teal
    error: { main: "#D64545" },
    warning: { main: "#F4B740" },
    info: { main: "#4b82ff" },
    success: { main: "#3BA55C" },

    background: {
      default: "#001729",             // Almost black, subtle blue hint
      paper: "#003057"                
    },

    divider: "#ccd6dd",
    text: {
      primary: "#ffffff",
      secondary: "#ccd6dd"
    },

    action: {
      active: "#F2C744", // Gold accent for icons
      selected: "#4b82ff" 
    }

  },

  custom: {
    cardBg: "#062038",        // slightly lighter than page
    cardBorder: "#626262" 
  },

  typography: {
    fontFamily: ["Roboto", "Segoe UI", "Arial", "sans-serif"].join(","),
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

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
          //fontWeight: 600,
          transition: "background-color 200ms ease, color 200ms ease",
        },

        // PRIMARY button: GOLD
        containedPrimary: {
          backgroundColor: "#F2C744",
          color: "#003057",
          "&:hover": {
            backgroundColor: "#D9B238",
          }
        },

        // SECONDARY button: TEAL
        containedSecondary: {
          backgroundColor: "#005C6C",
          color: "#ffffff",
          "&:hover": {
            backgroundColor: "#00788A",
          }
        },

        // ERROR / DELETE BUTTON
        containedError: {
          backgroundColor: "#D64545",
          color: "#ffffff",
          "&:hover": {
            backgroundColor: "#B43B3B",
          }
        },

        // Outlined buttons inherit text color automatically
      }
    }
  }
});
