// EXTEND THEME TO ADD CUSTOM PROPERTIES FOR RESUABLE CARDS

import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Theme {
    custom?: {
      cardBg: string;
      cardBorder: string;
    };
  }
  interface ThemeOptions {
    custom?: {
      cardBg?: string;
      cardBorder?: string;
    };
  }
}
