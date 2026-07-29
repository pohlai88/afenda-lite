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
			data-slot="app-shell-header"
			className="flex min-h-14 items-center gap-3 rounded-xl border bg-card px-4"
		>
			<SidebarTrigger />
			<Breadcrumb />
			<h1 className="min-w-0 flex-1 truncate font-medium text-sm">
				{header.title}
			</h1>
			<div
				data-slot="app-shell-command-area"
				className="flex items-center gap-1"
			>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label="Open command menu"
				>
					<SearchIcon />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label={`Open notifications (${unreadCount} unread)`}
				>
					<BellIcon />
				</Button>
				{showModeToggle ? (
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label="Toggle color mode"
					>
						<MoonIcon />
					</Button>
				) : null}
				{showThemeCustomiser ? <ThemeCustomiser /> : null}
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label={`Open profile menu for ${profileName ?? "account"}`}
				>
					<UserCircleIcon />
				</Button>
			</div>
		</header>
	);
}
