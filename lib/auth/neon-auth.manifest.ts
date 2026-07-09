import "server-only";

import manifest from "@/lib/auth/neon-auth.manifest.json";
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

  if (configuredBaseUrl === manifestBaseUrl) {
    return;
  }

  const message =
    `NEON_AUTH_BASE_URL (${configuredBaseUrl}) does not match materialized manifest (${manifestBaseUrl}). ` +
    `Run npm run sync:neon-auth-manifest after production branch or auth URL changes.`;

  // Local Option A / SPEC-B: env points at a dev Neon branch while the committed
  // manifest stays production SSOT. Warn in development; fail closed in production.
  if (process.env.NODE_ENV === "development") {
    console.warn(`[neon-auth] ${message}`);
    return;
  }

  throw new Error(message);
}
