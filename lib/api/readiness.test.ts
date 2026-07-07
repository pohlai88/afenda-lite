import { afterEach, describe, expect, it, vi } from "vitest";
import {
  evaluateReadinessStatus,
  probeAuthStatus,
  probeReadinessEnv,
} from "@/lib/api/readiness";

describe("probeReadinessEnv", () => {
  it("trims env values and drops empty strings", () => {
    expect(
      probeReadinessEnv({
        DATABASE_URL: "  postgres://example  ",
        NEON_AUTH_BASE_URL: "https://auth.example.test/neondb/auth",
        NEON_AUTH_COOKIE_SECRET: "x".repeat(32),
      }),
    ).toEqual({
      databaseUrl: "postgres://example",
      neonAuthBaseUrl: "https://auth.example.test/neondb/auth",
      neonAuthCookieSecret: "x".repeat(32),
    });
  });

  it("treats short auth cookie secrets as missing", () => {
    expect(
      probeReadinessEnv({
        DATABASE_URL: "postgres://example",
        NEON_AUTH_BASE_URL: "https://auth.example.test/neondb/auth",
        NEON_AUTH_COOKIE_SECRET: "too-short",
      }).neonAuthCookieSecret,
    ).toBeUndefined();
  });
});

describe("probeAuthStatus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns missing when auth env is incomplete", async () => {
    await expect(
      probeAuthStatus({
        databaseUrl: "postgres://example",
        neonAuthBaseUrl: undefined,
        neonAuthCookieSecret: "x".repeat(32),
      }),
    ).resolves.toBe("missing");
  });

  it("returns configured when JWKS probe succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true } satisfies Partial<Response>),
    );

    await expect(
      probeAuthStatus({
        databaseUrl: "postgres://example",
        neonAuthBaseUrl: "https://auth.example.test/neondb/auth",
        neonAuthCookieSecret: "x".repeat(32),
      }),
    ).resolves.toBe("configured");
  });

  it("returns degraded when JWKS probe fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false } satisfies Partial<Response>),
    );

    await expect(
      probeAuthStatus({
        databaseUrl: "postgres://example",
        neonAuthBaseUrl: "https://auth.example.test/neondb/auth",
        neonAuthCookieSecret: "x".repeat(32),
      }),
    ).resolves.toBe("degraded");
  });
});

describe("evaluateReadinessStatus", () => {
  const baseEnv = {
    databaseUrl: "postgres://example",
    neonAuthBaseUrl: "https://auth.example.test/neondb/auth",
    neonAuthCookieSecret: "x".repeat(32),
  };

  const connectedStorage = "Database connected";
  const poolerConnection = { pooler: true, ssl: "verify-full" };
  const directConnection = { pooler: false, ssl: "verify-full" };

  it("returns ready when dependencies and auth probe are healthy", () => {
    expect(
      evaluateReadinessStatus({
        env: baseEnv,
        storage: connectedStorage,
        connection: poolerConnection,
        auth: "configured",
        nodeEnv: "production",
      }),
    ).toBe("ready");
  });

  it("returns degraded when production requires a pooler URL", () => {
    expect(
      evaluateReadinessStatus({
        env: baseEnv,
        storage: connectedStorage,
        connection: directConnection,
        auth: "configured",
        nodeEnv: "production",
      }),
    ).toBe("degraded");
  });

  it("allows direct connections outside production", () => {
    expect(
      evaluateReadinessStatus({
        env: baseEnv,
        storage: connectedStorage,
        connection: directConnection,
        auth: "configured",
        nodeEnv: "development",
      }),
    ).toBe("ready");
  });

  it("returns degraded when database storage is unavailable", () => {
    expect(
      evaluateReadinessStatus({
        env: baseEnv,
        storage: "Database not connected",
        connection: poolerConnection,
        auth: "configured",
        nodeEnv: "production",
      }),
    ).toBe("degraded");
  });

  it("returns degraded when auth is missing or degraded", () => {
    expect(
      evaluateReadinessStatus({
        env: baseEnv,
        storage: connectedStorage,
        connection: poolerConnection,
        auth: "missing",
        nodeEnv: "production",
      }),
    ).toBe("degraded");

    expect(
      evaluateReadinessStatus({
        env: baseEnv,
        storage: connectedStorage,
        connection: poolerConnection,
        auth: "degraded",
        nodeEnv: "production",
      }),
    ).toBe("degraded");
  });
});
