import "server-only";

import ciManifest from "@/lib/auth/neon-auth.manifest.ci.json";
import productionManifest from "@/lib/auth/neon-auth.manifest.json";
import { readNeonAuthEnv } from "@/lib/auth/env";

export type NeonAuthManifest = typeof productionManifest;

export type NeonAuthManifestProfile = "production" | "ci";

/** Active manifest profile — CI sets NEON_AUTH_MANIFEST_PROFILE=ci for localhost Playwright. */
export function getNeonAuthManifestProfile(): NeonAuthManifestProfile {
  return process.env.NEON_AUTH_MANIFEST_PROFILE === "ci" ? "ci" : "production";
}

/** Materialized Neon Auth branch configuration (sync via `npm run sync:neon-auth-manifest`). */
export function getNeonAuthManifest(): NeonAuthManifest {
  return getNeonAuthManifestProfile() === "ci" ? ciManifest : productionManifest;
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
    `Run npm run sync:neon-auth-manifest after production branch or auth URL changes ` +
    `(or npm run sync:neon-auth-manifest:ci for the CI branch).`;

  if (process.env.NODE_ENV === "development") {
    console.warn(`[neon-auth] ${message}`);
    return;
  }

  throw new Error(message);
}
