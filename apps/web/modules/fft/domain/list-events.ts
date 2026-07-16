import { fftEvent, withOrg } from "@afenda/db";

/**
 * Trade (`fft`) — org-scoped event list shell (ARCH-028 S7.3 shape only).
 * No Feed Farm Trade 2B–2D product reopen.
 * Hard tenancy via `withOrg` (N9 / ARCH-023) — empty orgId fails closed.
 */
export async function listEvents(orgId: string) {
	return withOrg(fftEvent, orgId);
}
