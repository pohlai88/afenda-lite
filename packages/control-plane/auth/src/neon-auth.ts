import { env } from "@afenda/env";
import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";

let neonAuth: NeonAuth | undefined;

/** Package-internal Neon Auth singleton. Not a public export. */
export function getNeonAuth(): NeonAuth {
	if (!neonAuth) {
		neonAuth = createNeonAuth({
			baseUrl: env.NEON_AUTH_BASE_URL,
			cookies: { secret: env.NEON_AUTH_COOKIE_SECRET },
		});
	}
	return neonAuth;
}
