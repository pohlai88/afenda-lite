import { describe, expect, it } from "vitest";
import {
  AUTH_SIGN_IN_HREF,
  AUTH_SIGN_UP_HREF,
  authSignInHref,
  authSignUpHref,
  buildClientJoinHref,
  clientPostAuthHref,
  clientSignInAuthHref,
  clientSignUpAuthHref,
  sanitizeReturnToPath,
} from "@/modules/platform/routing/portal-routes";

describe("sanitizeReturnToPath", () => {
  it("allows public and client return paths", () => {
    expect(sanitizeReturnToPath("/survey/demo-slug")).toBe("/survey/demo-slug");
    expect(sanitizeReturnToPath("/f/token")).toBe("/f/token");
    expect(sanitizeReturnToPath("/client/declare/abc")).toBe(
      "/client/declare/abc",
    );
    expect(sanitizeReturnToPath("/invite/legacy")).toBe("/invite/legacy");
    expect(sanitizeReturnToPath("/join?invitationId=abc")).toBe(
      "/join?invitationId=abc",
    );
  });

  it("rejects protocol-relative and off-prefix paths", () => {
    expect(sanitizeReturnToPath("//evil.example")).toBeNull();
    expect(sanitizeReturnToPath("/dashboard")).toBeNull();
    expect(sanitizeReturnToPath("https://evil.example")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(sanitizeReturnToPath(undefined)).toBeNull();
    expect(sanitizeReturnToPath("   ")).toBeNull();
  });
});

describe("buildClientJoinHref", () => {
  it("encodes invitation id in join url", () => {
    expect(buildClientJoinHref("abc-123")).toBe("/join?invitationId=abc-123");
  });
});

describe("authSignInHref", () => {
  it("builds query strings for auth ingress", () => {
    expect(authSignInHref()).toBe(AUTH_SIGN_IN_HREF);
    expect(authSignInHref({ from: "org", reason: "access-denied" })).toBe(
      "/auth/sign-in?from=org&reason=access-denied",
    );
  });
});

describe("authSignUpHref", () => {
  it("builds query strings for sign-up ingress", () => {
    expect(authSignUpHref()).toBe(AUTH_SIGN_UP_HREF);
    expect(authSignUpHref({ reason: "login-required" })).toBe(
      "/auth/sign-up?reason=login-required",
    );
  });
});

describe("client auth hrefs", () => {
  it("shares reason and safe returnTo policy across sign-in and sign-up", () => {
    expect(
      clientSignInAuthHref("login-required", "/client/onboarding"),
    ).toBe(
      "/auth/sign-in?reason=login-required&returnTo=%2Fclient%2Fonboarding",
    );
    expect(
      clientSignUpAuthHref("login-required", "/client/onboarding"),
    ).toBe(
      "/auth/sign-up?reason=login-required&returnTo=%2Fclient%2Fonboarding",
    );
  });

  it("drops unsafe returnTo paths", () => {
    expect(clientSignInAuthHref(undefined, "//evil.example")).toBe(
      AUTH_SIGN_IN_HREF,
    );
    expect(clientSignUpAuthHref(undefined, "//evil.example")).toBe(
      AUTH_SIGN_UP_HREF,
    );
  });
});

describe("clientPostAuthHref", () => {
  it("routes incomplete onboarding to wizard", () => {
    expect(clientPostAuthHref(false)).toBe("/client/onboarding");
    expect(clientPostAuthHref(true)).toBe("/client");
  });
});
