"use client";

import { AcceptInvitationCard } from "@neondatabase/auth-ui";

/**
 * Neon Auth accept-invitation UI for `/join?invitationId=…` (GUIDE-018 I1.3).
 * Reads `invitationId` from the URL; unauthenticated users redirect to login
 * with `redirectTo` preserved via Neon Auth UI `useAuthenticate`.
 * Cinematic chrome is owned by AuthIslandLayout.
 */
export function JoinShell() {
	return <AcceptInvitationCard />;
}
