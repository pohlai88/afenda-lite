import { createNeonAuth } from "@neondatabase/auth/next/server";
import { readNeonAuthEnv } from "@/lib/auth/env";

const neonAuthEnv = readNeonAuthEnv();

export const auth = createNeonAuth({
  baseUrl: neonAuthEnv.baseUrl,
  cookies: {
    secret: neonAuthEnv.cookieSecret,
  },
});
