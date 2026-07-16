import { handleSyncSessionCookiesRequest } from "@afenda/auth";

/**
 * Cookie-safe Neon Auth session mint / refresh for RSC entry surfaces.
 * Companion to N8 ensure-active-organization — applies Set-Cookie that RSC
 * cannot write when `auth.getSession()` refreshes or mints session_data.
 */
export async function GET(request: Request): Promise<Response> {
	return handleSyncSessionCookiesRequest(request);
}
