"use client";

import { AcceptInvitationCard } from "@neondatabase/auth-ui";

import { AuthSurfaceChrome } from "@/features/auth/auth-surface-chrome";

/**
 * Neon Auth accept-invitation UI for `/join?invitationId=…` (GUIDE-018 I1.3).
 * Reads `invitationId` from the URL; unauthenticated users redirect to login
 * with `redirectTo` preserved via Neon Auth UI `useAuthenticate`.
 */
export function JoinShell() {
	return (
		<AuthSurfaceChrome>
			<AcceptInvitationCard />
		</AuthSurfaceChrome>
	);
}
