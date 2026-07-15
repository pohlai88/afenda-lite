"use client";

import { useTheme } from "next-themes";
import { type ReactNode, useEffect } from "react";
import { FONT_CONFIG } from "../config/fonts";
import themeConfig from "../config/theme";
import { themePresets } from "../config/theme-presets";
import {
	RADIUS_VALUES,
	type Settings,
	SettingsStoreProvider,
	settingsSelectors,
	useSettingsStore,
} from "../stores/settings";

const PRESET_CSS_VARS = [
	"background",
	"foreground",
	"card",
	"card-foreground",
	"popover",
	"popover-foreground",
	"primary",
	"primary-foreground",
	"secondary",
	"secondary-foreground",
	"muted",
	"muted-foreground",
	"accent",
	"accent-foreground",
	"destructive",
	"border",
	"input",
	"ring",
	"chart-1",
	"chart-2",
	"chart-3",
	"chart-4",
	"chart-5",
	"sidebar",
	"sidebar-foreground",
	"sidebar-primary",
	"sidebar-primary-foreground",
	"sidebar-accent",
	"sidebar-accent-foreground",
	"sidebar-border",
	"sidebar-ring",
] as const;

function writeSettingsCookie(settings: Settings) {
	document.cookie = `${encodeURIComponent(themeConfig.settingsCookieName)}=${encodeURIComponent(JSON.stringify(settings))}; path=/; max-age=31536000; SameSite=Lax`;
}

function SettingsEffects() {
	const { setTheme, resolvedTheme } = useTheme();
	const settings = useSettingsStore(settingsSelectors.settings);

	useEffect(() => {
		setTheme(settings.mode);
		writeSettingsCookie(settings);
	}, [settings, setTheme]);

	useEffect(() => {
		const root = document.documentElement;
		if (settings.themePreset === "default") {
			for (const key of PRESET_CSS_VARS) root.style.removeProperty(`--${key}`);
			return;
		}
		const preset = themePresets[settings.themePreset];
		if (!preset) return;
		const mode = resolvedTheme === "dark" ? "dark" : "light";
		for (const [key, value] of Object.entries(preset.styles[mode])) {
			if (value !== undefined) root.style.setProperty(`--${key}`, value);
		}
	}, [resolvedTheme, settings.themePreset]);

	useEffect(() => {
		const root = document.documentElement;
		root.style.setProperty("--radius", RADIUS_VALUES[settings.radius]);
		if (settings.scale === "md") root.removeAttribute("data-theme-scale");
		else root.setAttribute("data-theme-scale", settings.scale);
		const variable = FONT_CONFIG[settings.font]?.variable;
		const font = variable
			? getComputedStyle(root).getPropertyValue(variable).trim()
			: "";
		if (font) root.style.setProperty("--font-sans", font);
	}, [settings.font, settings.radius, settings.scale]);

	return null;
}

export function SettingsProvider({
	children,
	initialSettings,
}: {
	children: ReactNode;
	initialSettings?: Partial<Settings>;
}) {
	return (
		<SettingsStoreProvider initialState={initialSettings}>
			<SettingsEffects />
			{children}
		</SettingsStoreProvider>
	);
}
