import { requireRole } from "@afenda/auth";
import type { ReactNode } from "react";

import { OperatorPlatformShell } from "@/features/portal-chrome/operator-platform-shell";

/**
 * Operator route group — `/admin` · `/fft` (ARCH-022).
 * Coarse `requireRole('operator')` fail-closed; shared ERP platform shell (N16)
 * composes Identity nav ports; vertical pages enforce Tier-2 codes (ARCH-023 · N11).
 */
export default async function OperatorLayout({
	children,
}: {
	children: ReactNode;
}) {
	await requireRole("operator");
	return <OperatorPlatformShell>{children}</OperatorPlatformShell>;
}
