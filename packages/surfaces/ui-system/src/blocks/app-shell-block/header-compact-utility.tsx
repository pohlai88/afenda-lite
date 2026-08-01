"use client";

import { BellIcon } from "lucide-react";
import { CommandMenu } from "../../app-shell/command-menu";
import { NotificationDropdown } from "../../app-shell/notification-dropdown";
import { ProfileDropdown } from "../../app-shell/profile-dropdown";
import { Button } from "../../components/ui/button";
import type {
	AppShellCommandMenuConfig,
	AppShellNotificationsConfig,
	AppShellProfileConfig,
	AppShellUtilityId,
} from "./header-utility-policy";
import { ColorModeToggle, ThemeCustomiser } from "./theme-customiser";

function NotificationUtility({
	notifications,
	unreadCount,
}: Readonly<{
	notifications: AppShellNotificationsConfig;
	unreadCount: number;
}>) {
	return (
		<NotificationDropdown
			{...notifications}
			trigger={
				<Button
					aria-label={`Open notifications (${unreadCount} unread)`}
					className="relative"
					size="icon-sm"
					type="button"
					variant="ghost"
				>
					<BellIcon />
					{unreadCount > 0 ? (
						<span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-destructive" />
					) : null}
				</Button>
			}
		/>
	);
}

export function AppShellCompactUtility({
	commandMenu,
	enableShortcut,
	id,
	notifications,
	profile,
	unreadCount,
}: Readonly<{
	commandMenu?: AppShellCommandMenuConfig;
	enableShortcut: boolean;
	id: AppShellUtilityId;
	notifications?: AppShellNotificationsConfig;
	profile?: AppShellProfileConfig;
	unreadCount: number;
}>) {
	switch (id) {
		case "command-menu":
			return commandMenu ? (
				<CommandMenu {...commandMenu} enableSlashShortcut={enableShortcut} />
			) : null;
		case "notifications":
			return notifications ? (
				<NotificationUtility
					notifications={notifications}
					unreadCount={unreadCount}
				/>
			) : null;
		case "color-mode":
			return <ColorModeToggle />;
		case "appearance":
			return <ThemeCustomiser />;
		case "profile":
			return profile ? <ProfileDropdown {...profile} /> : null;
		default:
			return null;
	}
}
