import { requireRole } from "@afenda/auth";
import type { ReactNode } from "react";

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
	await requireRole("client");
	return children;
}
