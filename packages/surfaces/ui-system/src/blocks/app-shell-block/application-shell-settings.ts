export const APPLICATION_SHELL_SETTINGS_COOKIE = "application_shell_settings";

export type AppShellColorMode = "light" | "dark" | "system";
export type AppShellContentLayout = "comfortable" | "compact" | "full";
export type AppShellSidebarVariant = "sidebar" | "floating" | "inset";
export type AppShellSidebarCollapsible = "offcanvas" | "icon" | "none";

export type ApplicationShellSettings = Readonly<{
	mode: AppShellColorMode;
	layout: AppShellContentLayout;
	sidebarVariant: AppShellSidebarVariant;
	sidebarCollapsible: AppShellSidebarCollapsible;
	sidebarOpen: boolean;
}>;

export const DEFAULT_APPLICATION_SHELL_SETTINGS: ApplicationShellSettings = {
	mode: "system",
	layout: "comfortable",
	sidebarVariant: "sidebar",
	sidebarCollapsible: "offcanvas",
	sidebarOpen: true,
};

export function isApplicationShellSettings(
	value: unknown,
): value is ApplicationShellSettings {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const candidate = value as Partial<ApplicationShellSettings>;
	return (
		(candidate.mode === "light" ||
			candidate.mode === "dark" ||
			candidate.mode === "system") &&
		(candidate.layout === "comfortable" ||
			candidate.layout === "compact" ||
			candidate.layout === "full") &&
		(candidate.sidebarVariant === "sidebar" ||
			candidate.sidebarVariant === "floating" ||
			candidate.sidebarVariant === "inset") &&
		(candidate.sidebarCollapsible === "offcanvas" ||
			candidate.sidebarCollapsible === "icon" ||
			candidate.sidebarCollapsible === "none") &&
		typeof candidate.sidebarOpen === "boolean"
	);
}

export function parseApplicationShellSettings(
	value: string | null | undefined,
): ApplicationShellSettings {
	if (value === null || value === undefined || value.trim() === "") {
		return DEFAULT_APPLICATION_SHELL_SETTINGS;
	}
	try {
		const parsed: unknown = JSON.parse(decodeURIComponent(value));
		return isApplicationShellSettings(parsed)
			? parsed
			: DEFAULT_APPLICATION_SHELL_SETTINGS;
	} catch {
		return DEFAULT_APPLICATION_SHELL_SETTINGS;
	}
}
