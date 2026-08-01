import { authServer } from "@afenda/auth";
import type { ReactNode } from "react";

import { WorkspacePlatformShell } from "@/features/portal-chrome/workspace-platform-shell";

export const dynamic = "force-dynamic";

/**
 * Authenticated client workspace — fail-closed coarse shell gate (ARCH-012).
 * Segment `loading`/`error` live under `dashboard/` so this segment's index
 * `redirect()` is not soft-caught (same rule as `(gate)/login`).
 */
export default async function ClientWorkspaceLayout({
	children,
}: {
	children: ReactNode;
}) {
	await authServer.session.requireRole("client");
	return (
		<WorkspacePlatformShell scope="client">{children}</WorkspacePlatformShell>
	);
}
