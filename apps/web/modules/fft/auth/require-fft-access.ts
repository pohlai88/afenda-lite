import { AUTH_FORBIDDEN_PATH, type Session } from "@afenda/auth";
import { redirect } from "next/navigation";

import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

/**
 * Feed Farm Trade module entry — platform `fft.access` only (FFT-MOD-008 Phase 2A
 * freeze envelope). Fail-closed to AUTH_FORBIDDEN_PATH; no Trade RBAC / 2B–2D.
 */
export async function requireFftAccess(session: Session): Promise<void> {
	if (!(await sessionHasPermission(session, "fft.access"))) {
		redirect(AUTH_FORBIDDEN_PATH);
	}
}
