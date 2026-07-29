"use client";

import type { ReactNode } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

import {
	APPLICATION_SHELL_SETTINGS_COOKIE,
	type ApplicationShellSettings,
	DEFAULT_APPLICATION_SHELL_SETTINGS,
} from "./application-shell-settings";

type ApplicationShellSettingsContextValue = Readonly<{
	settings: ApplicationShellSettings;
	setSettings: (settings: ApplicationShellSettings) => void;
	resetSettings: () => void;
	defaultSettings: ApplicationShellSettings;
}>;

const ApplicationShellSettingsContext =
	createContext<ApplicationShellSettingsContextValue | null>(null);

export function useApplicationShellSettings() {
	const context = useContext(ApplicationShellSettingsContext);
	if (context === null) {
		throw new Error(
			"useApplicationShellSettings must be used inside AppShellThemeProvider.",
		);
	}
	return context;
}

export function AppShellThemeProvider({
	children,
	controlledTheme,
	defaultSettings = DEFAULT_APPLICATION_SHELL_SETTINGS,
	initialSettings = defaultSettings,
}: Readonly<{
	children: ReactNode;
	controlledTheme?: ApplicationShellSettings["mode"];
	defaultSettings?: ApplicationShellSettings;
	initialSettings?: ApplicationShellSettings;
}>) {
	const [settings, setSettingsState] = useState<ApplicationShellSettings>({
		...initialSettings,
		mode: controlledTheme ?? initialSettings.mode,
	});

	const setSettings = useCallback((next: ApplicationShellSettings) => {
		setSettingsState(next);
		document.cookie = `${APPLICATION_SHELL_SETTINGS_COOKIE}=${encodeURIComponent(
			JSON.stringify(next),
		)}; path=/; max-age=31536000`;
	}, []);

	const resetSettings = useCallback(() => {
		setSettings(defaultSettings);
	}, [defaultSettings, setSettings]);

	useEffect(() => {
		const resolvedMode = controlledTheme ?? settings.mode;
		document.documentElement.classList.toggle("dark", resolvedMode === "dark");
		document.documentElement.classList.toggle(
			"light",
			resolvedMode === "light",
		);
		document.documentElement.style.colorScheme =
			resolvedMode === "system" ? "" : resolvedMode;
	}, [controlledTheme, settings.mode]);

	const value = useMemo<ApplicationShellSettingsContextValue>(
		() => ({
			defaultSettings,
			resetSettings,
			setSettings,
			settings: {
				...settings,
				mode: controlledTheme ?? settings.mode,
			},
		}),
		[controlledTheme, defaultSettings, resetSettings, setSettings, settings],
	);

	return (
		<ApplicationShellSettingsContext.Provider value={value}>
			{children}
		</ApplicationShellSettingsContext.Provider>
	);
}
