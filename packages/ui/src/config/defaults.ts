import { type NavItem, navItems } from "./navigation";
import themeConfig from "./theme";

export type ThemeConfig = {
	templateName: string;
	homePageUrl: string;
	settingsCookieName: string;
	mode: "light" | "dark" | "system";
	themePreset: string;
	font: string;
	radius: "none" | "sm" | "md" | "lg";
	scale: "sm" | "md" | "lg";
	layout: "compact" | "full";
	sidebarVariant: "default" | "inset" | "floating";
	sidebarCollapsible: "none" | "icon" | "offcanvas";
	sidebarOpen: boolean;
};

export function defineThemeConfig<const T extends ThemeConfig>(config: T): T {
	return config;
}

export function defineNavigation<const T extends readonly NavItem[]>(
	items: T,
): T {
	return items;
}

export const defaultThemeConfig = defineThemeConfig(themeConfig);
export const defaultNavigation = defineNavigation(navItems);
