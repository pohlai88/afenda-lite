import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/portal-session-routing", () => ({
  getAuthenticatedLandingHref: vi.fn(),
}));

vi.mock("@/lib/playground", () => ({
  appendPlaygroundEmbedQuery: vi.fn((href: string) => href),
  resolvePlaygroundEmbedActive: vi.fn(),
}));

import {
  CLIENT_CHECK_EMAIL_REASON,
  CLIENT_INVITE_EXPIRED_REASON,
  CLIENT_LOGIN_REQUIRED_REASON,
  clientSignInAuthHref,
  clientSignInEntryHref,
  resolveClientAuthReasonNotice,
} from "@/lib/client-sign-in-entry";
import { AUTH_SIGN_IN_HREF, CLIENT_SIGN_IN_ENTRY_HREF } from "@/lib/portal-routes";

describe("client sign-in entry href builders", () => {
  it("builds named client login entry with optional reason", () => {
    expect(clientSignInEntryHref()).toBe(CLIENT_SIGN_IN_ENTRY_HREF);
    expect(clientSignInEntryHref(CLIENT_LOGIN_REQUIRED_REASON)).toBe(
      `${CLIENT_SIGN_IN_ENTRY_HREF}?reason=login-required`,
    );
  });

  it("builds Neon Auth href with reason and returnTo", () => {
    expect(clientSignInAuthHref()).toBe(AUTH_SIGN_IN_HREF);
    expect(clientSignInAuthHref(CLIENT_CHECK_EMAIL_REASON)).toBe(
      `${AUTH_SIGN_IN_HREF}?reason=check-email`,
    );
    expect(clientSignInAuthHref(undefined, "/client/onboarding")).toBe(
      `${AUTH_SIGN_IN_HREF}?returnTo=%2Fclient%2Fonboarding`,
    );
  });

  it("rejects unsafe returnTo on client auth href", () => {
    expect(clientSignInAuthHref(undefined, "//evil.example")).toBe(AUTH_SIGN_IN_HREF);
  });

  it("resolves client auth reason notices", () => {
    expect(resolveClientAuthReasonNotice(CLIENT_LOGIN_REQUIRED_REASON)).toBeTruthy();
    expect(resolveClientAuthReasonNotice(CLIENT_INVITE_EXPIRED_REASON)).toBeTruthy();
    expect(resolveClientAuthReasonNotice("unknown")).toBeNull();
  });
});
