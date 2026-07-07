import { createNeonAuth } from "@neondatabase/auth/next/server";
import { getServerEnv } from "@/lib/env/server";

const env = getServerEnv();

export const auth = createNeonAuth({
  baseUrl: env.NEON_AUTH_BASE_URL,
  cookies: {
    secret: env.NEON_AUTH_COOKIE_SECRET,
  },
});
