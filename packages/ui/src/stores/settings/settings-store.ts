import { createStore } from "zustand/vanilla";
import type { FontKey } from "../../config/fonts";
import themeConfig from "../../config/theme";
import type { ThemePresetKey } from "../../config/theme-presets";

export type Mode = "light" | "dark" | "system";
export type Layout = "compact" | "full";
export type Scale = "sm" | "md" | "lg";
export type Collapsible = "none" | "icon" | "offcanvas";
export type Variant = "default" | "inset" | "floating";
export type Radius = "none" | "sm" | "md" | "lg";
export type { FontKey, ThemePresetKey };

export type Settings = {
	mode: Mode;
	themePreset: ThemePresetKey;
	font: FontKey;
	radius: Radius;
	layout: Layout;
	scale: Scale;
	variant: Variant;
	collapsible: Collapsible;
	sidebarOpen: boolean;
};

export const initialSettings: Settings = {
	mode: themeConfig.mode,
	themePreset: themeConfig.themePreset,
	font: themeConfig.font,
	radius: themeConfig.radius,
	scale: themeConfig.scale,
	layout: themeConfig.layout,
	variant: themeConfig.sidebarVariant,
	collapsible: themeConfig.sidebarCollapsible,
	sidebarOpen: themeConfig.sidebarOpen,
};

export const RADIUS_VALUES: Record<Radius, string> = {
	none: "0rem",
	sm: "0.45rem",
	md: "0.625rem",
	lg: "0.875rem",
};

export type SettingsStore = {
	settings: Settings;
	updateSettings: (settings: Partial<Settings>) => void;
	replaceSettings: (settings: Settings) => void;
	resetSettings: () => void;
};

export type SettingsStoreApi = ReturnType<typeof createSettingsStore>;

export function createSettingsStore(initial?: Partial<Settings>) {
	const bootstrap = { ...initialSettings, ...initial };

	return createStore<SettingsStore>()((set) => ({
		settings: bootstrap,
		updateSettings: (settings) =>
			set((state) => ({ settings: { ...state.settings, ...settings } })),
		replaceSettings: (settings) => set({ settings }),
		resetSettings: () => set({ settings: initialSettings }),
	}));
}
