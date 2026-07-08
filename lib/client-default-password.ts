import "server-only";

import { getServerEnv } from "@/lib/env/server";

/** Temporary shared password for MVP client provisioning (Neon Auth sends onboarding email). */
export function getClientDefaultPassword() {
  const password = getServerEnv().CLIENT_DEFAULT_PASSWORD;
  if (!password) {
    throw new Error(
      "CLIENT_DEFAULT_PASSWORD is not configured. Set it in Vercel and .env so provisioned clients can sign in.",
    );
  }
  return password;
}
