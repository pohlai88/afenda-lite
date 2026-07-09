"use client";

import { createAuthClient } from "@neondatabase/auth/next";
import { AUTH_SIGN_IN_HREF } from "@/lib/portal-routes";

/**
 * Browser auth client — uses same-origin `/api/auth/*` route handlers.
 * Server-side Neon Auth config lives in `lib/auth/server.ts` (`NEON_AUTH_*`).
 */
export const authClient = createAuthClient();

/** Sign out and hard-navigate to the canonical auth entry (matches `proxy.ts` loginUrl). */
export async function signOutToAuthEntry() {
  await authClient.signOut();
  window.location.href = AUTH_SIGN_IN_HREF;
}
