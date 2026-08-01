"use client";

import { authBrowser, type Role } from "@afenda/auth/client";
import { type ApplicationShellSettings, AppShell } from "@afenda/ui-system";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useMemo } from "react";

import { MAIN_CONTENT_ID } from "@/features/auth/main-content";
import {
	SHELL_ROLE_PRESENTATION,
	type ShellNavItem,
} from "@/features/portal-chrome/nav-config";
import {
	buildWorkspaceCommandGroups,
	buildWorkspaceNavigation,
	findActiveWorkspaceItem,
} from "@/features/portal-chrome/workspace-platform-model";

export type WorkspacePlatformScope = "client" | "operator";

interface WorkspacePlatformChromeProps {
	children: ReactNode;
	defaultSidebarOpen?: boolean;
	initialSettings: ApplicationShellSettings;
	navItems: readonly ShellNavItem[];
	orgId: string;
	role: Role;
	scope: WorkspacePlatformScope;
}

/**
 * Permanent browser adapter over the shared AppShell for every authenticated
 * ERP workspace. Route authorization and nav filtering remain server-owned.
 */
export function WorkspacePlatformChrome({
	children,
	defaultSidebarOpen = true,
	initialSettings,
	navItems,
	orgId,
	role,
	scope,
}: WorkspacePlatformChromeProps) {
	const pathname = usePathname();
	const router = useRouter();
	const sections = useMemo(
		() => buildWorkspaceNavigation(navItems),
		[navItems],
	);
	const commandGroups = useMemo(
		() => buildWorkspaceCommandGroups(navItems, sections),
		[navItems, sections],
	);
	const activeItem = useMemo(
		() => findActiveWorkspaceItem(navItems, pathname),
		[navItems, pathname],
	);
	const rolePresentation = SHELL_ROLE_PRESENTATION[role];
	const homeHref = scope === "operator" ? "/admin" : "/client";
	const handleCommand = useCallback(
		(commandId: string) => {
			const destination = navItems.find((item) => item.id === commandId);
			if (destination) {
				router.push(destination.href);
			}
		},
		[navItems, router],
	);
	const handleProfileAction = useCallback(
		(actionId: string) => {
			if (actionId === "sign-out") {
				router.push(authBrowser.paths.signOut);
			}
		},
		[router],
	);

	return (
		<AppShell
			brand="Afenda-Lite"
			commandMenu={{ groups: commandGroups, onCommand: handleCommand }}
			defaultSidebarOpen={defaultSidebarOpen}
			footerText={`Organization ${orgId}`}
			header={{ title: activeItem?.label ?? "Workspace" }}
			initialSettings={initialSettings}
			mainContentId={MAIN_CONTENT_ID}
			navConfig={{ currentPath: pathname, linkComponent: Link, sections }}
			profile={{
				name: `${rolePresentation.label} workspace`,
				initials: rolePresentation.initials,
				actions: [{ id: "sign-out", label: "Sign out" }],
				onAction: handleProfileAction,
			}}
			themeConfig={{
				brand: {
					name: "Afenda-Lite",
					homeHref,
					subtitle: `${rolePresentation.label} workspace`,
				},
				sidebar: { groupLabelStyle: "uppercase" },
			}}
		>
			{children}
		</AppShell>
	);
}
