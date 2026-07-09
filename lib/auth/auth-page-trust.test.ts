/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  AUTH_ENTRY_PATHS,
  resolveAuthPageTrustNoticeFlags,
} from "@/lib/auth/auth-page-trust";
import { portalCopy } from "@/lib/copy/portal-copy";

describe("auth-page-trust", () => {
  it("lists authenticated redirect entry paths", () => {
    expect([...AUTH_ENTRY_PATHS]).toEqual([
      "sign-in",
      "sign-up",
      "forgot-password",
    ]);
  });

  it("shows org access denied notice on operator sign-in", () => {
    const flags = resolveAuthPageTrustNoticeFlags({
      path: "sign-in",
      from: "org",
      reason: "access-denied",
    });

    expect(flags.showAccessDenied).toBe(true);
    expect(flags.reasonNotice).toBeNull();
  });

  it("shows client invite-invalid reason on client sign-in", () => {
    const flags = resolveAuthPageTrustNoticeFlags({
      path: "sign-in",
      reason: "invite-invalid",
    });

    expect(flags.showAccessDenied).toBe(false);
    expect(flags.reasonNotice).toContain(portalCopy.signIn.inviteInvalidHint);
  });

  it("shows OTP trust notice on sign-up and email-otp", () => {
    expect(
      resolveAuthPageTrustNoticeFlags({ path: "sign-up" }).showOtpTrustNotice,
    ).toBe(true);
    expect(
      resolveAuthPageTrustNoticeFlags({ path: "email-otp" }).showOtpTrustNotice,
    ).toBe(true);
    expect(
      resolveAuthPageTrustNoticeFlags({ path: "sign-in" }).showOtpTrustNotice,
    ).toBe(false);
  });

  it("shows password reset trust notice on forgot and reset paths", () => {
    expect(
      resolveAuthPageTrustNoticeFlags({ path: "forgot-password" })
        .showPasswordResetTrustNotice,
    ).toBe(true);
    expect(
      resolveAuthPageTrustNoticeFlags({ path: "reset-password" })
        .showPasswordResetTrustNotice,
    ).toBe(true);
  });

  it("shows magic-link trust notice only on magic-link path", () => {
    expect(
      resolveAuthPageTrustNoticeFlags({ path: "magic-link" })
        .showMagicLinkTrustNotice,
    ).toBe(true);
    expect(
      resolveAuthPageTrustNoticeFlags({ path: "sign-in" })
        .showMagicLinkTrustNotice,
    ).toBe(false);
  });

  it("shows organization trust notice on accept-invitation", () => {
    expect(
      resolveAuthPageTrustNoticeFlags({ path: "accept-invitation" })
        .showOrganizationTrustNotice,
    ).toBe(true);
  });
});
