import "server-only";

import productionManifest from "@/lib/auth/neon-auth.manifest.json";
import { readNeonAuthEnv } from "@/lib/auth/env";

export type NeonAuthManifest = typeof productionManifest;

/** Materialized Neon Auth branch configuration (sync via `npm run sync:neon-auth-manifest`). */
export function getNeonAuthManifest(): NeonAuthManifest {
  return productionManifest;
}

export function assertNeonAuthManifestMatchesEnv() {
  const env = readNeonAuthEnv();
  const manifest = getNeonAuthManifest();
  const configuredBaseUrl = env.baseUrl.replace(/\/$/, "");
  const manifestBaseUrl = manifest.integration.baseUrl.replace(/\/$/, "");

  if (configuredBaseUrl === manifestBaseUrl) {
    return;
  }

  const message =
    `NEON_AUTH_BASE_URL (${configuredBaseUrl}) does not match materialized manifest (${manifestBaseUrl}). ` +
    `Run npm run env:neon-production && npm run sync:neon-auth-manifest.`;

  if (process.env.NODE_ENV === "development") {
    console.warn(`[neon-auth] ${message}`);
    return;
  }

  throw new Error(message);
}
