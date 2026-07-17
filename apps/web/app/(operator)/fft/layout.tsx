import { getSession } from "@afenda/auth";
import type { ReactNode } from "react";

import { requireFftAccess } from "@/modules/fft/auth/require-fft-access";

/**
 * FFT route group — Tier-2 `fft.access` under operator coarse role (N18).
 * Read shell only; no 2B–2D reopen (FFT-MOD-008).
 */
export default async function OperatorFftLayout({
	children,
}: {
	children: ReactNode;
}) {
	const session = await getSession();
	await requireFftAccess(session);
	return children;
}
