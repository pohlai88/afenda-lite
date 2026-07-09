import { describe, expect, it } from "vitest";

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
} from "@/lib/portal-routes";

describe("preview client helpers", () => {
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
    const originalEmail = process.env.PREVIEW_CLIENT_EMAIL;
    process.env.PREVIEW_CLIENT_EMAIL = "preview@example.com";

    expect(isPreviewClientSession({ user: { email: "preview@example.com" } })).toBe(
      true,
    );
    expect(isPreviewClientSession({ user: { email: "other@example.com" } })).toBe(
      false,
    );

    process.env.PREVIEW_CLIENT_EMAIL = originalEmail;
  });

  it("reports preview client configured only when env has email and password", () => {
    const originalEmail = process.env.PREVIEW_CLIENT_EMAIL;
    const originalPassword = process.env.PREVIEW_CLIENT_PASSWORD;

    process.env.PREVIEW_CLIENT_EMAIL = " preview@example.com ";
    process.env.PREVIEW_CLIENT_PASSWORD = "secret";
    expect(isPreviewClientConfigured()).toBe(true);

    process.env.PREVIEW_CLIENT_EMAIL = "";
    expect(isPreviewClientConfigured()).toBe(false);

    process.env.PREVIEW_CLIENT_EMAIL = originalEmail;
    process.env.PREVIEW_CLIENT_PASSWORD = originalPassword;
  });
});
