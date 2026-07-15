import type { SettingsStore } from "./settings-store";

export const settingsSelectors = {
	settings: (state: SettingsStore) => state.settings,
	mode: (state: SettingsStore) => state.settings.mode,
	themePreset: (state: SettingsStore) => state.settings.themePreset,
	layout: (state: SettingsStore) => state.settings.layout,
	sidebar: (state: SettingsStore) => ({
		open: state.settings.sidebarOpen,
		variant: state.settings.variant,
		collapsible: state.settings.collapsible,
	}),
	updateSettings: (state: SettingsStore) => state.updateSettings,
	resetSettings: (state: SettingsStore) => state.resetSettings,
} as const;
