import { requireRole } from "@afenda/auth";
import type { ReactNode } from "react";

/**
 * Operator route group — `/admin` · `/fft` (ARCH-022).
 * Coarse `requireRole('operator')` fail-closed; Tier-2 codes (e.g. `fft.access`)
 * stay for later permission-wired surfaces (ARCH-023 · ARCH-026).
 */
export default async function OperatorLayout({
	children,
}: {
	children: ReactNode;
}) {
	await requireRole("operator");
	return children;
}
