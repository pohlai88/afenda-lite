"use client";

import { useMemo, useRef } from "react";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { SidebarTrigger } from "../../components/ui/sidebar";
import { AppShellCompactUtility } from "./header-compact-utility";
import { AppShellUtilityOverflow } from "./header-utility-overflow";
import type {
	AppShellCommandMenuConfig,
	AppShellHeaderConfig,
	AppShellNotificationsConfig,
	AppShellProfileConfig,
} from "./header-utility-policy";
import {
	availableAppShellUtilityIds,
	resolveAppShellUtilityPolicy,
} from "./header-utility-policy";

export type {
	AppShellHeaderConfig,
	AppShellUtilityId,
	AppShellUtilityPriorities,
	AppShellUtilityPriority,
} from "./header-utility-policy";
export { APP_SHELL_UTILITY_IDS } from "./header-utility-policy";

export function AppShellHeader({
	commandMenu,
	header,
	notifications,
	profile,
	unreadCount = 0,
}: Readonly<{
	commandMenu?: AppShellCommandMenuConfig;
	header: AppShellHeaderConfig;
	notifications?: AppShellNotificationsConfig;
	profile?: AppShellProfileConfig;
	unreadCount?: number;
}>) {
	const showModeToggle = header.showModeToggle !== false;
	const showThemeCustomiser = header.showThemeCustomiser !== false;
	const overflowTriggerRef = useRef<HTMLButtonElement>(null);
	const availableUtilityIds = useMemo(
		() =>
			availableAppShellUtilityIds({
				commandMenu: commandMenu !== undefined,
				modeToggle: showModeToggle,
				notifications: notifications !== undefined,
				profile: profile !== undefined,
				themeCustomiser: showThemeCustomiser,
			}),
		[commandMenu, notifications, profile, showModeToggle, showThemeCustomiser],
	);
	const { primaryId, secondaryIds } = resolveAppShellUtilityPolicy(
		availableUtilityIds,
		header.utilityPriorities,
	);
	const utilityProps = {
		...(commandMenu === undefined ? {} : { commandMenu }),
		...(notifications === undefined ? {} : { notifications }),
		...(profile === undefined ? {} : { profile }),
		unreadCount,
	};

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
				className="hidden items-center gap-1 sm:flex"
				data-slot="app-shell-command-area"
			>
				{availableUtilityIds.map((id) => (
					<span className="contents" key={id}>
						<AppShellCompactUtility
							{...utilityProps}
							enableShortcut={true}
							id={id}
						/>
					</span>
				))}
			</div>
			<div
				className="flex items-center gap-1 sm:hidden"
				data-slot="app-shell-mobile-utilities"
			>
				{primaryId ? (
					<AppShellCompactUtility
						{...utilityProps}
						enableShortcut={false}
						id={primaryId}
					/>
				) : null}
				{secondaryIds.length > 0 ? (
					<AppShellUtilityOverflow
						{...utilityProps}
						secondaryIds={secondaryIds}
						triggerRef={overflowTriggerRef}
					/>
				) : null}
			</div>
		</header>
	);
}
