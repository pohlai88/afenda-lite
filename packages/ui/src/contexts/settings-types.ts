import themeConfig from "../configs/themeConfig";
import type { FontKey } from "../utils/fonts";
import type { ThemePresetKey } from "../utils/theme-presets";

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

/** Derived from `themeConfig` so operators edit one SSOT file (archive AdminCN contract). */
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
