/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it } from "vitest";
import { isGuardianAuthShellEnabled } from "@/lib/env/accessors";
import { resetServerEnvCache } from "@/lib/env/server";

const validEnv = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  NEON_AUTH_BASE_URL: "https://auth.example.test/neondb/auth",
  NEON_AUTH_COOKIE_SECRET: "x".repeat(32),
  CLIENT_DEFAULT_PASSWORD: "preview-pass",
};

describe("guardian-auth-shell", () => {
  const snapshot = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshot)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, snapshot);
    resetServerEnvCache();
  });

  it("enables Guardian shell by default", () => {
    Object.assign(process.env, validEnv);
    delete process.env.GUARDIAN_AUTH_SHELL;
    resetServerEnvCache();
    expect(isGuardianAuthShellEnabled()).toBe(true);
  });

  it("disables Guardian shell when explicitly false", () => {
    Object.assign(process.env, validEnv, { GUARDIAN_AUTH_SHELL: "false" });
    resetServerEnvCache();
    expect(isGuardianAuthShellEnabled()).toBe(false);
  });

  it("enables Guardian shell when explicitly true", () => {
    Object.assign(process.env, validEnv, { GUARDIAN_AUTH_SHELL: "true" });
    resetServerEnvCache();
    expect(isGuardianAuthShellEnabled()).toBe(true);
  });
});
