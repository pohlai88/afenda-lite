import { describe, expect, it } from "vitest";
import {
  buildNeonAuthJwksUrl,
  probeNeonAuthEnv,
  readNeonAuthEnv,
} from "@/lib/auth/env";

describe("probeNeonAuthEnv", () => {
  it("trims auth env values and drops short cookie secrets", () => {
    expect(
      probeNeonAuthEnv({
        NEON_AUTH_BASE_URL: " https://auth.example.test/neondb/auth ",
        NEON_AUTH_COOKIE_SECRET: "x".repeat(32),
      }),
    ).toEqual({
      baseUrl: "https://auth.example.test/neondb/auth",
      cookieSecret: "x".repeat(32),
    });
  });

  it("treats short cookie secrets as missing", () => {
    expect(
      probeNeonAuthEnv({
        NEON_AUTH_BASE_URL: "https://auth.example.test/neondb/auth",
        NEON_AUTH_COOKIE_SECRET: "too-short",
      }).cookieSecret,
    ).toBeUndefined();
  });
});

describe("readNeonAuthEnv", () => {
  it("returns validated auth config", () => {
    expect(
      readNeonAuthEnv({
        NEON_AUTH_BASE_URL: "https://auth.example.test/neondb/auth",
        NEON_AUTH_COOKIE_SECRET: "x".repeat(32),
      }),
    ).toEqual({
      baseUrl: "https://auth.example.test/neondb/auth",
      cookieSecret: "x".repeat(32),
    });
  });

  it("throws when auth env is incomplete", () => {
    expect(() =>
      readNeonAuthEnv({
        NEON_AUTH_BASE_URL: "",
        NEON_AUTH_COOKIE_SECRET: "x".repeat(32),
      }),
    ).toThrow("NEON_AUTH_BASE_URL is required");
  });
});

describe("buildNeonAuthJwksUrl", () => {
  it("resolves JWKS under the Neon Auth base URL", () => {
    const expected =
      "https://auth.example.test/neondb/auth/.well-known/jwks.json";

    expect(
      buildNeonAuthJwksUrl(
        "https://auth.example.test/neondb/auth",
      ).toString(),
    ).toBe(expected);

    expect(
      buildNeonAuthJwksUrl(
        "https://auth.example.test/neondb/auth/",
      ).toString(),
    ).toBe(expected);
  });
});
