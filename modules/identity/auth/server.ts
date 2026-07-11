/** S1 Neon Auth server instance — used by `get-session`, `session`, `proxy`, and API route. */
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { readNeonAuthEnv } from "@/modules/identity/auth/env";

const neonAuthEnv = readNeonAuthEnv();

export const auth = createNeonAuth({
  baseUrl: neonAuthEnv.baseUrl,
  cookies: {
    secret: neonAuthEnv.cookieSecret,
  },
});
