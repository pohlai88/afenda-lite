"use client";

import { BellIcon, MoonIcon, SearchIcon, UserCircleIcon } from "lucide-react";

import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { SidebarTrigger } from "../../components/ui/sidebar";
import { ThemeCustomiser } from "./theme-customiser";

export type AppShellHeaderConfig = Readonly<{
	title: string;
	showModeToggle?: boolean;
	showThemeCustomiser?: boolean;
}>;

export function AppShellHeader({
	header,
	profileName,
	unreadCount = 0,
}: Readonly<{
	header: AppShellHeaderConfig;
	profileName?: string;
	unreadCount?: number;
}>) {
	const showModeToggle = header.showModeToggle !== false;
	const showThemeCustomiser = header.showThemeCustomiser !== false;

	return (
		<header
			className="flex min-h-14 items-center gap-3 rounded-xl border bg-card px-4"
			data-slot="app-shell-header"
		>
			<SidebarTrigger />
			<Breadcrumb />
			<h1 className="min-w-0 flex-1 truncate font-medium text-sm">
				{header.title}
			</h1>
			<div
				className="flex items-center gap-1"
				data-slot="app-shell-command-area"
			>
				<Button
					aria-label="Open command menu"
					size="icon-sm"
					type="button"
					variant="ghost"
				>
					<SearchIcon />
				</Button>
				<Button
					aria-label={`Open notifications (${unreadCount} unread)`}
					size="icon-sm"
					type="button"
					variant="ghost"
				>
					<BellIcon />
				</Button>
				{showModeToggle ? (
					<Button
						aria-label="Toggle color mode"
						size="icon-sm"
						type="button"
						variant="ghost"
					>
						<MoonIcon />
					</Button>
				) : null}
				{showThemeCustomiser ? <ThemeCustomiser /> : null}
				<Button
					aria-label={`Open profile menu for ${profileName ?? "account"}`}
					size="icon-sm"
					type="button"
					variant="ghost"
				>
					<UserCircleIcon />
				</Button>
			</div>
		</header>
	);
}
