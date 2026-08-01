import { authServer } from "@afenda/auth";
import {
	APPLICATION_SHELL_SETTINGS_COOKIE,
	parseApplicationShellSettings,
	SIDEBAR_COOKIE_NAME,
} from "@afenda/ui-system";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import {
	resolveClientShellNav,
	resolveOperatorShellNav,
} from "@/features/portal-chrome/resolve-shell-access";
import {
	WorkspacePlatformChrome,
	type WorkspacePlatformScope,
} from "@/features/portal-chrome/workspace-platform-chrome";

interface WorkspacePlatformShellProps {
	children: ReactNode;
	scope: WorkspacePlatformScope;
}

/**
 * Canonical authenticated ERP shell. Both client and operator workspaces share
 * one frame; scope selects only the permission-filtered navigation catalogue.
 */
export async function WorkspacePlatformShell({
	children,
	scope,
}: WorkspacePlatformShellProps) {
	const [session, cookieStore] = await Promise.all([
		authServer.session.get(),
		cookies(),
	]);
	const navItems =
		scope === "operator"
			? await resolveOperatorShellNav(session)
			: await resolveClientShellNav(session);
	const sidebarCookie = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value;
	const defaultSidebarOpen = sidebarCookie !== "false";
	const initialSettings = parseApplicationShellSettings(
		cookieStore.get(APPLICATION_SHELL_SETTINGS_COOKIE)?.value,
	);

	return (
		<WorkspacePlatformChrome
			defaultSidebarOpen={defaultSidebarOpen}
			initialSettings={initialSettings}
			navItems={navItems}
			orgId={session.orgId}
			role={session.role}
			scope={scope}
		>
			{children}
		</WorkspacePlatformChrome>
	);
}
