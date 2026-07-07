import { describe, expect, it } from "vitest";
import {
  AUTH_SIGN_IN_HREF,
  authSignInHref,
  clientPostAuthHref,
  sanitizeReturnToPath,
} from "@/lib/portal-routes";

describe("sanitizeReturnToPath", () => {
  it("allows public and client return paths", () => {
    expect(sanitizeReturnToPath("/survey/demo-slug")).toBe("/survey/demo-slug");
    expect(sanitizeReturnToPath("/f/token")).toBe("/f/token");
    expect(sanitizeReturnToPath("/client/declare/abc")).toBe(
      "/client/declare/abc",
    );
    expect(sanitizeReturnToPath("/invite/legacy")).toBe("/invite/legacy");
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

describe("authSignInHref", () => {
  it("builds query strings for auth ingress", () => {
    expect(authSignInHref()).toBe(AUTH_SIGN_IN_HREF);
    expect(authSignInHref({ from: "org", reason: "access-denied" })).toBe(
      "/auth/sign-in?from=org&reason=access-denied",
    );
  });
});

describe("clientPostAuthHref", () => {
  it("routes incomplete onboarding to wizard", () => {
    expect(clientPostAuthHref(false)).toBe("/client/onboarding");
    expect(clientPostAuthHref(true)).toBe("/client");
  });
});
