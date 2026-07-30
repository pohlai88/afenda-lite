"use client";

import { type ApplicationShellSettings, AppShell } from "@afenda/ui-system";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { MAIN_CONTENT_ID } from "@/features/auth/main-content";
import type { ShellNavItem } from "@/features/portal-chrome/nav-config";

interface OperatorPlatformChromeProps {
	children: ReactNode;
	defaultSidebarOpen?: boolean;
	initialSettings: ApplicationShellSettings;
	navItems: ShellNavItem[];
	orgId: string;
}

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
			navigationItems={navItems}
			navigationLink={Link}
		>
			{children}
		</AppShell>
	);
}
