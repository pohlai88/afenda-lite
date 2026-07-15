/*
 * Cookie caveat (AdminCN / ARCH-018):
 * Values stored under `settingsCookieName` override these defaults at runtime.
 * To see config edits while developing: reset Theme Customizer, or clear the cookie
 * and reload. Cookie wins over this object for mode, layout, radius, scale, font,
 * themePreset, and sidebar chrome.
 */

const themeConfig = {
	templateName: "Afenda-Lite",
	homePageUrl: "/client/dashboard",
	settingsCookieName: "afenda-ui-settings",
	mode: "system", // 'system' | 'light' | 'dark'
	themePreset: "default", // ThemePresetKey
	font: "geist", // FontKey
	radius: "md", // 'none' | 'sm' | 'md' | 'lg'
	scale: "md", // 'sm' | 'md' | 'lg'
	layout: "compact", // 'compact' | 'full'
	sidebarVariant: "default", // 'default' | 'inset' | 'floating'
	sidebarCollapsible: "icon", // 'offcanvas' | 'icon' | 'none'
	sidebarOpen: true,
} as const;

export default themeConfig;
