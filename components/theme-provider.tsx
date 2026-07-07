"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

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
  storageKey = "client-declaration-theme",
) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, theme);
  }
}

function applyTheme(theme: Theme) {
  applyThemeToDocument(theme);
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "client-declaration-theme",
}: {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey) as Theme | null;
    const nextTheme = stored ?? defaultTheme;
    setThemeState(nextTheme);
    applyTheme(nextTheme);
    setResolvedTheme(nextTheme === "system" ? getSystemTheme() : nextTheme);
  }, [defaultTheme, storageKey]);

  useEffect(() => {
    applyTheme(theme);
    setResolvedTheme(theme === "system" ? getSystemTheme() : theme);

    if (theme !== "system") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyTheme("system");
      setResolvedTheme(getSystemTheme());
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme: (nextTheme) => {
          window.localStorage.setItem(storageKey, nextTheme);
          setThemeState(nextTheme);
        },
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

/** Theme controls that work with or without ThemeProvider (e.g. auth shell RSC boundary). */
export function useThemeControls(storageKey = "client-declaration-theme") {
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
