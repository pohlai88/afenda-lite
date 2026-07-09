import { describe, expect, it, afterEach } from "vitest";

import {
  PREVIEW_UNAVAILABLE_FAILED_REASON,
  clientHomeHref,
  clientPreviewUnavailableHref,
  isPreviewClientConfigured,
  isPreviewClientSession,
  isPreviewUnavailableFailedReason,
  resolvePreviewUnavailableCopy,
} from "@/lib/preview-client";
import {
  CLIENT_HOME_HREF,
  CLIENT_PREVIEW_UNAVAILABLE_HREF,
} from "@/lib/routing/portal-routes";
import { resetServerEnvCache } from "@/lib/env/server";

const validEnv = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  NEON_AUTH_BASE_URL: "https://auth.example.test/neondb/auth",
  NEON_AUTH_COOKIE_SECRET: "x".repeat(32),
  CLIENT_DEFAULT_PASSWORD: "preview-pass",
};

describe("preview client helpers", () => {
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

  function withPreviewEnv(overrides: Record<string, string | undefined>) {
    Object.assign(process.env, validEnv, overrides);
    resetServerEnvCache();
  }
  it("detects failed preview reason", () => {
    expect(isPreviewUnavailableFailedReason(PREVIEW_UNAVAILABLE_FAILED_REASON)).toBe(
      true,
    );
    expect(isPreviewUnavailableFailedReason(undefined)).toBe(false);
  });

  it("resolves preview unavailable copy by reason", () => {
    const missing = resolvePreviewUnavailableCopy(undefined);
    const failed = resolvePreviewUnavailableCopy(PREVIEW_UNAVAILABLE_FAILED_REASON);

    expect(missing.title).toBeTruthy();
    expect(failed.description).not.toBe(missing.description);
  });

  it("builds preview gate hrefs with embed and reason", () => {
    expect(clientPreviewUnavailableHref()).toBe(CLIENT_PREVIEW_UNAVAILABLE_HREF);
    expect(
      clientPreviewUnavailableHref({
        embed: true,
        reason: PREVIEW_UNAVAILABLE_FAILED_REASON,
      }),
    ).toBe(`${CLIENT_PREVIEW_UNAVAILABLE_HREF}?embed=1&reason=failed`);
  });

  it("builds client home href with optional embed", () => {
    expect(clientHomeHref()).toBe(CLIENT_HOME_HREF);
    expect(clientHomeHref({ embed: true })).toBe(`${CLIENT_HOME_HREF}?embed=1`);
  });

  it("matches preview client session by configured email", () => {
    withPreviewEnv({ PREVIEW_CLIENT_EMAIL: "preview@example.com" });

    expect(isPreviewClientSession({ user: { email: "preview@example.com" } })).toBe(
      true,
    );
    expect(isPreviewClientSession({ user: { email: "other@example.com" } })).toBe(
      false,
    );
  });

  it("reports preview client configured only when env has email and password", () => {
    withPreviewEnv({
      PREVIEW_CLIENT_EMAIL: " preview@example.com ",
      PREVIEW_CLIENT_PASSWORD: "secret",
    });
    expect(isPreviewClientConfigured()).toBe(true);

    withPreviewEnv({ PREVIEW_CLIENT_PASSWORD: "secret" });
    delete process.env.PREVIEW_CLIENT_EMAIL;
    resetServerEnvCache();
    expect(isPreviewClientConfigured()).toBe(false);
  });
});
