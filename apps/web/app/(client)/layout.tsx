import type { ReactNode } from "react";

/**
 * Client route-group marker only.
 * Coarse `requireRole('client')` lives on `(workspace)` so `(gate)`
 * surfaces (`/client/login`, `/client/preview-unavailable`) stay public
 * per ARCH-012 §3.12 + session-gate bypasses.
 */
export default function ClientGroupLayout({
	children,
}: {
	children: ReactNode;
}) {
	return children;
}
