import { getSession } from "@afenda/auth";
import { SIDEBAR_COOKIE_NAME } from "@afenda/ui-system";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { OperatorPlatformChrome } from "@/features/portal-chrome/operator-platform-chrome";
import { resolveOperatorShellNav } from "@/features/portal-chrome/resolve-shell-access";

type OperatorPlatformShellProps = {
	children: ReactNode;
};

/**
 * Shared ERP operator platform shell (N16 · ARCH-015/018).
 * Composes Identity permission ports for nav access; vertical pages supply body.
 * Reads sidebar cookie on the server so `defaultOpen` matches first paint.
 */
export async function OperatorPlatformShell({
	children,
}: OperatorPlatformShellProps) {
	const [session, cookieStore] = await Promise.all([getSession(), cookies()]);
	const navItems = await resolveOperatorShellNav(session);
	const sidebarCookie = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value;
	const defaultSidebarOpen = sidebarCookie !== "false";

	return (
		<OperatorPlatformChrome
			defaultSidebarOpen={defaultSidebarOpen}
			navItems={navItems}
			orgId={session.orgId}
		>
			{children}
		</OperatorPlatformChrome>
	);
}
