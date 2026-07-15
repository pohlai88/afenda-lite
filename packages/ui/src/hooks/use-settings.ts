"use client";

import { settingsSelectors, useSettingsStore } from "../stores/settings";

export function useSettings() {
	const settings = useSettingsStore(settingsSelectors.settings);
	const updateSettings = useSettingsStore(settingsSelectors.updateSettings);
	const resetSettings = useSettingsStore(settingsSelectors.resetSettings);
	return { settings, updateSettings, resetSettings };
}
