"use client";

import { type ApplicationShellSettings, AppShell } from "@afenda/ui-system";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { MAIN_CONTENT_ID } from "@/features/auth/main-content";
import type { ShellNavItem } from "@/features/portal-chrome/nav-config";

type OperatorPlatformChromeProps = {
	navItems: ShellNavItem[];
	orgId: string;
	defaultSidebarOpen?: boolean;
	initialSettings: ApplicationShellSettings;
	children: ReactNode;
};

/** Thin operator adapter over the reusable application-shell block. */
export function OperatorPlatformChrome({
	children,
	defaultSidebarOpen = true,
	initialSettings,
	navItems,
	orgId,
}: OperatorPlatformChromeProps) {
	const pathname = usePathname();

	return (
		<AppShell
			brand="Afenda-Lite"
			currentPath={pathname}
			defaultSidebarOpen={defaultSidebarOpen}
			footerText={orgId}
			initialSettings={initialSettings}
			mainContentId={MAIN_CONTENT_ID}
			navigationLink={Link}
			navigationItems={navItems}
		>
			{children}
		</AppShell>
	);
}
