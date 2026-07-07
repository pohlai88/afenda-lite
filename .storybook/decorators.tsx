import type { Decorator } from "@storybook/react";
import { useEffect } from "react";
import {
  applyThemeToDocument,
  ThemeProvider,
} from "@/components/theme-provider";

/** Portal theme + layout wrapper for all stories. */
export const withPortalTheme: Decorator = (Story, context) => {
  const toolbarTheme = context.globals.theme as "light" | "dark" | undefined;

  useEffect(() => {
    if (toolbarTheme) {
      applyThemeToDocument(toolbarTheme);
    }
  }, [toolbarTheme]);

  return (
    <ThemeProvider
      defaultTheme={toolbarTheme ?? "light"}
      storageKey="storybook-theme"
    >
      <Story />
    </ThemeProvider>
  );
};
