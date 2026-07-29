import { env } from "@afenda/env";
import { createNeonAuth } from "@neondatabase/auth/next/server";

type NeonAuthClient = ReturnType<typeof createNeonAuth>;

let neonAuth: NeonAuthClient | undefined;

/** Package-internal Neon Auth singleton. Not a public export. */
export function getNeonAuth(): NeonAuthClient {
	if (!neonAuth) {
		neonAuth = createNeonAuth({
			baseUrl: env.NEON_AUTH_BASE_URL,
			cookies: { secret: env.NEON_AUTH_COOKIE_SECRET },
		});
	}
	return neonAuth;
}
