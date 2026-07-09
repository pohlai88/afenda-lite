import { afterEach, describe, expect, it } from "vitest";
import {
  getAppBaseUrl,
  isGuardianAuthShellEnabled,
  isPlaygroundEnabled,
  resolveAppBaseUrl,
} from "@/lib/env/accessors";
import { resetServerEnvCache, validateServerEnv } from "@/lib/env/server";

const validEnv = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  NEON_AUTH_BASE_URL: "https://auth.example.test/neondb/auth",
  NEON_AUTH_COOKIE_SECRET: "x".repeat(32),
  CLIENT_DEFAULT_PASSWORD: "preview-pass",
} as const;

function withEnv(
  overrides: Record<string, string | undefined>,
  run: () => void,
) {
  const snapshot = { ...process.env };
  Object.assign(process.env, validEnv, overrides);
  resetServerEnvCache();
  try {
    run();
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshot)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, snapshot);
    resetServerEnvCache();
  }
}

describe("validateServerEnv", () => {
  afterEach(() => {
    resetServerEnvCache();
  });

  it("accepts a minimal valid production env bag", () => {
    withEnv({}, () => {
      expect(validateServerEnv().NEON_AUTH_BASE_URL).toBe(validEnv.NEON_AUTH_BASE_URL);
    });
  });

  it("rejects missing DATABASE_URL", () => {
    withEnv({ DATABASE_URL: "" }, () => {
      expect(() => validateServerEnv()).toThrow(/DATABASE_URL/i);
    });
  });

  it("rejects short NEON_AUTH_COOKIE_SECRET", () => {
    withEnv({ NEON_AUTH_COOKIE_SECRET: "short" }, () => {
      expect(() => validateServerEnv()).toThrow(/NEON_AUTH_COOKIE_SECRET/i);
    });
  });
});

describe("env accessors", () => {
  it("resolves APP_URL before VERCEL_URL", () => {
    expect(
      resolveAppBaseUrl({
        APP_URL: "https://iam-check.vercel.app/",
        VERCEL_URL: "preview.vercel.app",
      }),
    ).toBe("https://iam-check.vercel.app");
  });

  it("falls back to localhost when no URL is configured", () => {
    expect(
      resolveAppBaseUrl({ APP_URL: undefined, VERCEL_URL: undefined }),
    ).toBe("http://localhost:3000");
  });

  it("reads playground and guardian flags from validated env", () => {
    withEnv(
      {
        PLAYGROUND_ENABLED: "true",
        GUARDIAN_AUTH_SHELL: "false",
        APP_URL: "https://iam-check.vercel.app",
      },
      () => {
        expect(isPlaygroundEnabled()).toBe(true);
        expect(isGuardianAuthShellEnabled()).toBe(false);
        expect(getAppBaseUrl()).toBe("https://iam-check.vercel.app");
      },
    );
  });

  it("enables Guardian shell by default when flag is unset", () => {
    withEnv({}, () => {
      expect(isGuardianAuthShellEnabled()).toBe(true);
    });
  });
});
