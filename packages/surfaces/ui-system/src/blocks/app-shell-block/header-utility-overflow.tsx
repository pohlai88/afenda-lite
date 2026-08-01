"use client";

import {
	BellIcon,
	EllipsisIcon,
	MoonIcon,
	SearchIcon,
	Settings2Icon,
	UserCircleIcon,
} from "lucide-react";
import { type RefObject, useCallback, useState } from "react";
import { CommandMenu } from "../../app-shell/command-menu";
import { NotificationDropdown } from "../../app-shell/notification-dropdown";
import { Button } from "../../components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { useApplicationShellSettings } from "./application-shell-settings-provider";
import type {
	AppShellCommandMenuConfig,
	AppShellNotificationsConfig,
	AppShellProfileConfig,
	AppShellUtilityId,
} from "./header-utility-policy";
import { ThemeCustomiser } from "./theme-customiser";

type MobileOverlay = "appearance" | "command-menu" | "notifications" | null;

function ProfileOverflowAction({
	action,
	onAction,
}: Readonly<{
	action: Readonly<{ id: string; label: string }>;
	onAction: (id: string) => void;
}>) {
	const handleSelect = useCallback(
		() => onAction(action.id),
		[action.id, onAction],
	);
	return (
		<DropdownMenuItem onSelect={handleSelect}>{action.label}</DropdownMenuItem>
	);
}

function ProfileOverflowItems({
	profile,
}: Readonly<{
	profile: AppShellProfileConfig;
}>) {
	if (!(profile.actions && profile.actions.length > 0 && profile.onAction)) {
		return (
			<DropdownMenuItem disabled>
				<UserCircleIcon />
				Signed in as {profile.name}
			</DropdownMenuItem>
		);
	}
	return (
		<>
			<DropdownMenuSeparator />
			<DropdownMenuLabel className="flex items-center gap-2 whitespace-normal">
				<UserCircleIcon />
				{profile.name}
			</DropdownMenuLabel>
			{profile.actions.map((action) => (
				<ProfileOverflowAction
					action={action}
					key={action.id}
					onAction={profile.onAction}
				/>
			))}
		</>
	);
}

function OverflowMenuItems({
	handleUtilitySelect,
	profile,
	secondaryIds,
	settingsMode,
	unreadCount,
}: Readonly<{
	handleUtilitySelect: (event: Event) => void;
	profile?: AppShellProfileConfig;
	secondaryIds: readonly AppShellUtilityId[];
	settingsMode: "dark" | "light" | "system";
	unreadCount: number;
}>) {
	return (
		<>
			{secondaryIds.includes("command-menu") ? (
				<DropdownMenuItem
					data-utility-id="command-menu"
					onSelect={handleUtilitySelect}
				>
					<SearchIcon />
					Command menu
				</DropdownMenuItem>
			) : null}
			{secondaryIds.includes("notifications") ? (
				<DropdownMenuItem
					className="whitespace-normal"
					data-utility-id="notifications"
					onSelect={handleUtilitySelect}
				>
					<BellIcon />
					Notifications ({unreadCount} unread)
				</DropdownMenuItem>
			) : null}
			{secondaryIds.includes("color-mode") ? (
				<DropdownMenuItem
					className="whitespace-normal"
					data-utility-id="color-mode"
					onSelect={handleUtilitySelect}
				>
					<MoonIcon />
					Use {settingsMode === "dark" ? "light" : "dark"} color mode
				</DropdownMenuItem>
			) : null}
			{secondaryIds.includes("appearance") ? (
				<DropdownMenuItem
					data-utility-id="appearance"
					onSelect={handleUtilitySelect}
				>
					<Settings2Icon />
					Customize appearance
				</DropdownMenuItem>
			) : null}
			{secondaryIds.includes("profile") && profile ? (
				<ProfileOverflowItems profile={profile} />
			) : null}
		</>
	);
}

export function AppShellUtilityOverflow({
	commandMenu,
	notifications,
	profile,
	secondaryIds,
	triggerRef,
	unreadCount,
}: Readonly<{
	commandMenu?: AppShellCommandMenuConfig;
	notifications?: AppShellNotificationsConfig;
	profile?: AppShellProfileConfig;
	secondaryIds: readonly AppShellUtilityId[];
	triggerRef: RefObject<HTMLButtonElement | null>;
	unreadCount: number;
}>) {
	const { setSettings, settings } = useApplicationShellSettings();
	const [mobileOverlay, setMobileOverlay] = useState<MobileOverlay>(null);
	const handleUtilitySelect = useCallback(
		(event: Event) => {
			const utilityId = (event.currentTarget as HTMLElement | null)?.dataset
				.utilityId as AppShellUtilityId | undefined;
			if (
				utilityId === "command-menu" ||
				utilityId === "notifications" ||
				utilityId === "appearance"
			) {
				queueMicrotask(() => setMobileOverlay(utilityId));
				return;
			}
			if (utilityId === "color-mode") {
				setSettings({
					...settings,
					mode: settings.mode === "dark" ? "light" : "dark",
				});
			}
		},
		[setSettings, settings],
	);
	const handleCommandOpenChange = useCallback((open: boolean) => {
		setMobileOverlay(open ? "command-menu" : null);
	}, []);
	const handleNotificationsOpenChange = useCallback((open: boolean) => {
		setMobileOverlay(open ? "notifications" : null);
	}, []);
	const handleAppearanceOpenChange = useCallback((open: boolean) => {
		setMobileOverlay(open ? "appearance" : null);
	}, []);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						aria-label={`Open workspace utilities (${secondaryIds.length} secondary)`}
						ref={triggerRef}
						size="icon-sm"
						type="button"
						variant="ghost"
					>
						<EllipsisIcon />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					aria-label="Workspace utilities"
					className="w-64 max-w-[calc(100vw-2rem)]"
				>
					<DropdownMenuLabel>Workspace utilities</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<OverflowMenuItems
						handleUtilitySelect={handleUtilitySelect}
						{...(profile === undefined ? {} : { profile })}
						secondaryIds={secondaryIds}
						settingsMode={settings.mode}
						unreadCount={unreadCount}
					/>
				</DropdownMenuContent>
			</DropdownMenu>
			{commandMenu ? (
				<CommandMenu
					{...commandMenu}
					enableSlashShortcut={false}
					onOpenChange={handleCommandOpenChange}
					open={mobileOverlay === "command-menu"}
					restoreFocusRef={triggerRef}
					showTrigger={false}
				/>
			) : null}
			{notifications ? (
				<NotificationDropdown
					{...notifications}
					onOpenChange={handleNotificationsOpenChange}
					open={mobileOverlay === "notifications"}
					restoreFocusRef={triggerRef}
				/>
			) : null}
			{secondaryIds.includes("appearance") ? (
				<ThemeCustomiser
					onOpenChange={handleAppearanceOpenChange}
					open={mobileOverlay === "appearance"}
					restoreFocusRef={triggerRef}
					showTrigger={false}
				/>
			) : null}
		</>
	);
}
