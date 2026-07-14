import type { NextRequest, NextResponse } from "next/server";

import { AUTH_LOGIN_PATH } from "./auth-paths";
import { getNeonAuth } from "./session";

export { AUTH_LOGIN_PATH };

export type SessionProxy = (
	request: NextRequest,
) => Promise<NextResponse<unknown>>;

/**
 * Neon Auth session gate for Next.js `apps/web/proxy.ts` (Node runtime).
 * Keeps `@neondatabase/auth` usage inside `@afenda/auth` (ARCH-026).
 */
export function createSessionProxy(): SessionProxy {
	return getNeonAuth().middleware({ loginUrl: AUTH_LOGIN_PATH });
}
