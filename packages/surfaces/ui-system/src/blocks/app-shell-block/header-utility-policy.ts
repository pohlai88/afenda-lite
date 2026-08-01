import type { CommandMenuGroup } from "../../app-shell/command-menu";
import type { NotificationDropdownItem } from "../../app-shell/notification-dropdown";

export const APP_SHELL_UTILITY_IDS = [
	"command-menu",
	"notifications",
	"color-mode",
	"appearance",
	"profile",
] as const;

export type AppShellUtilityId = (typeof APP_SHELL_UTILITY_IDS)[number];
export type AppShellUtilityPriority = "primary" | "secondary";
export type AppShellUtilityPriorities = Readonly<
	Partial<Record<AppShellUtilityId, AppShellUtilityPriority>>
>;

export type AppShellCommandMenuConfig = Readonly<{
	groups: readonly CommandMenuGroup[];
	onCommand?: (id: string) => void;
}>;

export type AppShellNotificationsConfig = Readonly<{
	emptyMessage?: string;
	notifications: readonly NotificationDropdownItem[];
	onDecision?: (id: string, decision: "accept" | "decline") => void;
}>;

export type AppShellProfileConfig = Readonly<{
	actions?: readonly { id: string; label: string }[];
	initials?: string;
	name: string;
	onAction?: (id: string) => void;
}>;

export type AppShellHeaderConfig = Readonly<{
	title: string;
	showModeToggle?: boolean;
	showThemeCustomiser?: boolean;
	utilityPriorities?: AppShellUtilityPriorities;
}>;

export type AppShellUtilityAvailability = Readonly<{
	commandMenu: boolean;
	notifications: boolean;
	modeToggle: boolean;
	profile: boolean;
	themeCustomiser: boolean;
}>;

const AVAILABILITY_KEY: Readonly<
	Record<AppShellUtilityId, keyof AppShellUtilityAvailability>
> = {
	"command-menu": "commandMenu",
	notifications: "notifications",
	"color-mode": "modeToggle",
	appearance: "themeCustomiser",
	profile: "profile",
};

export function availableAppShellUtilityIds(
	availability: AppShellUtilityAvailability,
): AppShellUtilityId[] {
	return APP_SHELL_UTILITY_IDS.filter(
		(id) => availability[AVAILABILITY_KEY[id]],
	);
}

export function resolveAppShellUtilityPolicy(
	availableIds: readonly AppShellUtilityId[],
	priorities: AppShellUtilityPriorities | undefined,
): Readonly<{
	primaryId: AppShellUtilityId | undefined;
	secondaryIds: AppShellUtilityId[];
}> {
	const available = new Set(availableIds);
	const orderedAvailableIds = APP_SHELL_UTILITY_IDS.filter((id) =>
		available.has(id),
	);
	const primaryId =
		orderedAvailableIds.find((id) => priorities?.[id] === "primary") ??
		orderedAvailableIds[0];
	return {
		primaryId,
		secondaryIds: orderedAvailableIds.filter((id) => id !== primaryId),
	};
}
