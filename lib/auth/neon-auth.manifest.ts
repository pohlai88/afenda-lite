import "server-only";

import manifest from "@/config/neon-auth.manifest.json";
import { readNeonAuthEnv } from "@/lib/auth/env";

export type NeonAuthManifest = typeof manifest;

/** Materialized Neon Auth branch configuration (sync via `npm run sync:neon-auth-manifest`). */
export function getNeonAuthManifest(): NeonAuthManifest {
  return manifest;
}

export function assertNeonAuthManifestMatchesEnv() {
  const env = readNeonAuthEnv();
  const configuredBaseUrl = env.baseUrl.replace(/\/$/, "");
  const manifestBaseUrl = manifest.integration.baseUrl.replace(/\/$/, "");

  if (configuredBaseUrl !== manifestBaseUrl) {
    throw new Error(
      `NEON_AUTH_BASE_URL (${configuredBaseUrl}) does not match materialized manifest (${manifestBaseUrl}). Run npm run sync:neon-auth-manifest after branch or auth URL changes.`,
    );
  }
}
