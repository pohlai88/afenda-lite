"use client";

import { createAuthClient } from "@neondatabase/auth/next";

/**
 * Browser auth client — uses same-origin `/api/auth/*` route handlers.
 * Server-side Neon Auth config lives in `lib/auth/server.ts` (`NEON_AUTH_*`).
 */
export const authClient = createAuthClient();
