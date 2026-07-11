import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/modules/platform/routing/portal-session-routing", () => ({
  getAuthenticatedLandingHref: vi.fn(),
}));

vi.mock("@/modules/platform/playground-embed", () => ({
  isPlaygroundEmbedRequest: vi.fn(),
}));

import {
  AUTH_ADMIN_LEGACY_HREF,
  ORG_ACCESS_DENIED_REASON,
  ORG_SIGN_IN_FROM_PARAM,
  isOrgAccessDeniedReason,
  isOrgSignInFrom,
  orgSignInAuthHref,
  orgSignInEntryHref,
} from "@/features/auth/entry/org-sign-in-entry";

describe("org sign-in entry href builders", () => {
  it("marks org auth ingress from param", () => {
    expect(isOrgSignInFrom(ORG_SIGN_IN_FROM_PARAM)).toBe(true);
    expect(isOrgSignInFrom("client")).toBe(false);
  });

  it("detects access denied reason", () => {
    expect(isOrgAccessDeniedReason(ORG_ACCESS_DENIED_REASON)).toBe(true);
    expect(isOrgAccessDeniedReason("login-required")).toBe(false);
  });

  it("builds org login entry with reason and returnTo", () => {
    expect(orgSignInEntryHref()).toBe("/org/login");
    expect(
      orgSignInEntryHref({
        reason: ORG_ACCESS_DENIED_REASON,
        returnTo: "/dashboard",
      }),
    ).toBe("/org/login?reason=access-denied");
  });

  it("rejects unsafe returnTo on org login entry", () => {
    expect(
      orgSignInEntryHref({
        returnTo: "//evil.example",
      }),
    ).toBe("/org/login");
  });

  it("builds Neon Auth href with org from param", () => {
    expect(orgSignInAuthHref()).toBe("/auth/sign-in?from=org");
    expect(orgSignInAuthHref(ORG_ACCESS_DENIED_REASON)).toBe(
      "/auth/sign-in?from=org&reason=access-denied",
    );
    expect(orgSignInAuthHref(undefined, "/survey/demo")).toBe(
      "/auth/sign-in?from=org&returnTo=%2Fsurvey%2Fdemo",
    );
  });

  it("documents legacy admin alias path", () => {
    expect(AUTH_ADMIN_LEGACY_HREF).toBe("/auth/admin");
  });
});
