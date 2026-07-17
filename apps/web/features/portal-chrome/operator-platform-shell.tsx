import { getSession } from "@afenda/auth";
import type { ReactNode } from "react";

import { OperatorPlatformChrome } from "@/features/portal-chrome/operator-platform-chrome";
import { resolveOperatorShellNav } from "@/features/portal-chrome/resolve-shell-access";

type OperatorPlatformShellProps = {
	children: ReactNode;
};

/**
 * Shared ERP operator platform shell (N16 · ARCH-015/018).
 * Composes Identity permission ports for nav access; vertical pages supply body.
 */
export async function OperatorPlatformShell({
	children,
}: OperatorPlatformShellProps) {
	const session = await getSession();
	const navItems = await resolveOperatorShellNav(session);

	return (
		<OperatorPlatformChrome navItems={navItems} orgId={session.orgId}>
			{children}
		</OperatorPlatformChrome>
	);
}
