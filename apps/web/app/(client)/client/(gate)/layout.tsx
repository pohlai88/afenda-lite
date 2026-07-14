import type { ReactNode } from "react";

/**
 * Client `(gate)` — blank chrome (ARCH-012).
 * No session `requireRole`; proxy bypasses these paths for anonymous entry.
 * Segment `loading`/`error` live under `preview-unavailable` only — a parent
 * error boundary ate `redirect()` from `login` and soft-served 200.
 */
export default function ClientGateLayout({
	children,
}: {
	children: ReactNode;
}) {
	return children;
}
