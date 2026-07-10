import { describe, expect, it } from "vitest";
import { buildServerEnvSchema } from "@/lib/env/build-schema";
import {
  ENV_VAR_MANIFEST,
  deriveLocalOnlyKeys,
  deriveRuntimeEnvKeys,
  deriveSecretKeys,
  deriveStaleVercelKeys,
  deriveSyncRequiredEmailKeys,
  deriveVercelProductionKeys,
} from "@/lib/env/manifest";

describe("ENV_VAR_MANIFEST", () => {
  it("has unique keys", () => {
    const keys = ENV_VAR_MANIFEST.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("never marks stale keys for Vercel production sync", () => {
    for (const key of deriveStaleVercelKeys()) {
      expect(deriveVercelProductionKeys()).not.toContain(key);
    }
  });

  it("never marks local-only keys for Vercel production sync", () => {
    for (const key of deriveLocalOnlyKeys()) {
      expect(deriveVercelProductionKeys()).not.toContain(key);
    }
  });

  it("builds the same runtime schema as lib/env/schema.ts", () => {
    const builtSchema = buildServerEnvSchema(ENV_VAR_MANIFEST);
    expect(Object.keys(builtSchema.shape).sort()).toEqual(
      deriveRuntimeEnvKeys().sort(),
    );
  });

  it("lists runtime keys matching schema fields", () => {
    expect(deriveRuntimeEnvKeys().sort()).toEqual(
      Object.keys(buildServerEnvSchema(ENV_VAR_MANIFEST).shape).sort(),
    );
  });

  it("includes expected sync email keys", () => {
    expect(deriveSyncRequiredEmailKeys()).toEqual([
      "SHARED_ADMIN_EMAIL",
      "PREVIEW_CLIENT_EMAIL",
      "HOT_SALES_EMAIL_FROM",
    ]);
  });

  it("marks credentials as secret", () => {
    expect(deriveSecretKeys().has("DATABASE_URL")).toBe(true);
    expect(deriveSecretKeys().has("NEON_AUTH_COOKIE_SECRET")).toBe(true);
    expect(deriveSecretKeys().has("APP_URL")).toBe(false);
  });
});
