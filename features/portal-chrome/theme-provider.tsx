"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";
import { PORTAL_THEME_STORAGE_KEY } from "@/lib/copy/portal-theme";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

/**
 * Single dark-mode owner for the app (auth + AdminCN).
 * Uses next-themes with the portal storage key so boot script, auth, and
 * dashboard ModeToggle share one `html.dark` source of truth.
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = PORTAL_THEME_STORAGE_KEY,
}: {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      storageKey={storageKey}
      disableTransitionOnChange
    >
      <PortalThemeBridge>{children}</PortalThemeBridge>
    </NextThemesProvider>
  );
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function PortalThemeBridge({ children }: { children: ReactNode }) {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  const value: ThemeContextValue = {
    theme: (theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : "system") as Theme,
    resolvedTheme: resolvedTheme === "dark" ? "dark" : "light",
    setTheme: (next) => setTheme(next),
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Imperative apply for Storybook toolbar / non-React callers. */
export function readResolvedThemeFromDocument(): ResolvedTheme {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyThemeToDocument(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  return resolved;
}

export function persistThemePreference(
  theme: Theme,
  storageKey = PORTAL_THEME_STORAGE_KEY,
) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, theme);
  }
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

/** Theme controls that work with or without ThemeProvider (e.g. auth shell RSC boundary). */
export function useThemeControls(storageKey = PORTAL_THEME_STORAGE_KEY) {
  const context = useContext(ThemeContext);
  const [fallbackResolved, setFallbackResolved] =
    useState<ResolvedTheme>("light");

  useEffect(() => {
    if (!context) {
      setFallbackResolved(readResolvedThemeFromDocument());
    }
  }, [context]);

  const resolvedTheme = context?.resolvedTheme ?? fallbackResolved;

  return {
    resolvedTheme,
    setTheme: (nextTheme: Extract<Theme, "light" | "dark">) => {
      if (context) {
        context.setTheme(nextTheme);
        return;
      }

      persistThemePreference(nextTheme, storageKey);
      setFallbackResolved(applyThemeToDocument(nextTheme));
    },
  };
}
