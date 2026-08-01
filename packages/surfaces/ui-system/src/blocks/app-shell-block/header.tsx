"use client";

import { BellIcon } from "lucide-react";

import {
	CommandMenu,
	type CommandMenuGroup,
} from "../../app-shell/command-menu";
import {
	NotificationDropdown,
	type NotificationDropdownItem,
} from "../../app-shell/notification-dropdown";
import { ProfileDropdown } from "../../app-shell/profile-dropdown";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { SidebarTrigger } from "../../components/ui/sidebar";
import { ColorModeToggle, ThemeCustomiser } from "./theme-customiser";

export type AppShellHeaderConfig = Readonly<{
	title: string;
	showModeToggle?: boolean;
	showThemeCustomiser?: boolean;
}>;

export function AppShellHeader({
	commandMenu,
	header,
	notifications,
	profile,
	unreadCount = 0,
}: Readonly<{
	commandMenu?: {
		groups: readonly CommandMenuGroup[];
		onCommand?: (id: string) => void;
	};
	header: AppShellHeaderConfig;
	notifications?: {
		emptyMessage?: string;
		notifications: readonly NotificationDropdownItem[];
		onDecision?: (id: string, decision: "accept" | "decline") => void;
	};
	profile?: {
		actions?: readonly { id: string; label: string }[];
		initials?: string;
		name: string;
		onAction?: (id: string) => void;
	};
	unreadCount?: number;
}>) {
	const showModeToggle = header.showModeToggle !== false;
	const showThemeCustomiser = header.showThemeCustomiser !== false;

	return (
		<header
			className="sticky top-0 z-40 mx-3 mt-3 flex min-h-14 items-center gap-3 rounded-xl border bg-card/95 px-3 shadow-xs backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:mx-6 sm:px-4"
			data-slot="app-shell-header"
		>
			<SidebarTrigger />
			<Breadcrumb />
			<span className="min-w-0 flex-1 truncate font-medium text-sm">
				{header.title}
			</span>
			<div
				className="flex items-center gap-1"
				data-slot="app-shell-command-area"
			>
				{commandMenu ? <CommandMenu {...commandMenu} /> : null}
				{notifications ? (
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
				) : null}
				{showModeToggle ? <ColorModeToggle /> : null}
				{showThemeCustomiser ? <ThemeCustomiser /> : null}
				{profile ? <ProfileDropdown {...profile} /> : null}
			</div>
		</header>
	);
}
