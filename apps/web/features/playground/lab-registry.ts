export type LabMount = "header" | "main" | "chrome";

export type LabCategory = "composite" | "compose";

export type InteractionStep = {
	id: string;
	label: string;
};

export type PlaygroundLab = {
	id: string;
	title: string;
	description: string;
	category: LabCategory;
	mount: LabMount;
	packagePath: string;
	interactions: InteractionStep[];
	vibePromptSeeds: string[];
};

/**
 * Curated ready labs only — no auto-scan of `@afenda/ui` blocks.
 */
export const PLAYGROUND_LABS: readonly PlaygroundLab[] = [
	{
		id: "profile-dropdown",
		title: "Profile dropdown",
		description:
			"AdminCN header profile menu — open menu, navigate items, sign-out callback.",
		category: "composite",
		mount: "header",
		packagePath: "packages/ui/src/components/composite/profile-dropdown.tsx",
		interactions: [
			{ id: "open-menu", label: "Open the profile menu from the header" },
			{
				id: "read-identity",
				label: "Confirm fixture name and email in the menu",
			},
			{ id: "sign-out", label: "Click Sign out and see harness feedback" },
		],
		vibePromptSeeds: [
			"Focus ProfileDropdown in AdminShell header (profileSlot).",
			"Preserve accessibility of the dropdown trigger and destructive sign-out item.",
		],
	},
	{
		id: "notification-dropdown",
		title: "Notification dropdown",
		description:
			"AdminCN header notifications — open menu, switch Inbox/General tabs.",
		category: "composite",
		mount: "header",
		packagePath:
			"packages/ui/src/components/composite/notification-dropdown.tsx",
		interactions: [
			{ id: "open-menu", label: "Open the notification menu from the header" },
			{
				id: "switch-tabs",
				label: "Switch between Inbox and General tabs",
			},
			{
				id: "open-settings",
				label: "Confirm settings control is reachable from the menu",
			},
		],
		vibePromptSeeds: [
			"Focus NotificationDropdown in AdminShell header (notificationSlot).",
			"Keep tab switching and unread badge readable at header density.",
		],
	},
	{
		id: "activity-dialog",
		title: "Activity dialog",
		description:
			"AdminCN header activity sheet — open sheet and scan the activity feed.",
		category: "composite",
		mount: "header",
		packagePath: "packages/ui/src/components/composite/activity-dialog.tsx",
		interactions: [
			{ id: "open-sheet", label: "Open the activity sheet from the header" },
			{
				id: "scan-feed",
				label: "Confirm activity rows render in the sheet body",
			},
			{ id: "close-sheet", label: "Close the sheet and return focus" },
		],
		vibePromptSeeds: [
			"Focus ActivityDialog in AdminShell header (activitySlot).",
			"Preserve sheet focus trap and readable activity density.",
		],
	},
] as const;

/** Lab ids with an explicit interactive host on `/playground/lab/[labId]`. */
export const LAB_HOST_IDS = [
	"profile-dropdown",
	"notification-dropdown",
	"activity-dialog",
] as const;

export type LabHostId = (typeof LAB_HOST_IDS)[number];

export function listReadyLabs(): readonly PlaygroundLab[] {
	return PLAYGROUND_LABS;
}

export function getLabById(labId: string): PlaygroundLab | undefined {
	return PLAYGROUND_LABS.find((lab) => lab.id === labId);
}

export function hasLabHost(labId: string): labId is LabHostId {
	return (LAB_HOST_IDS as readonly string[]).includes(labId);
}

export function listPeerLabs(labId: string): readonly PlaygroundLab[] {
	const current = getLabById(labId);
	if (!current) return [];
	return PLAYGROUND_LABS.filter(
		(lab) =>
			lab.id !== current.id &&
			lab.mount === current.mount &&
			lab.category === current.category,
	);
}
