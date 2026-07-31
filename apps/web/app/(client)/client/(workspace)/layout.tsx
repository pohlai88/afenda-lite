import { authServer } from "@afenda/auth";
import type { ReactNode } from "react";

import { MAIN_CONTENT_ID } from "@/features/auth/main-content";
import { ClientWorkspaceNav } from "@/features/portal-chrome/client-workspace-nav";

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
		<>
			<ClientWorkspaceNav />
			<main
				className="min-h-dvh bg-background"
				id={MAIN_CONTENT_ID}
				tabIndex={-1}
			>
				{children}
			</main>
		</>
	);
}
