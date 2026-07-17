import { requireRole } from "@afenda/auth";
import type { ReactNode } from "react";

/**
 * Operator route group — `/admin` · `/fft` (ARCH-022).
 * Coarse `requireRole('operator')` fail-closed; living product shells enforce
 * Tier-2 codes such as `fft.access` and `org.roles.manage` (ARCH-023 · N11).
 */
export default async function OperatorLayout({
	children,
}: {
	children: ReactNode;
}) {
	await requireRole("operator");
	return children;
}
