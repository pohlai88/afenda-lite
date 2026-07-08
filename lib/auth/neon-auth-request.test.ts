import { describe, expect, it } from "vitest";
import { extractNeonAuthCookieHeader } from "@/lib/auth/neon-auth-request";

describe("extractNeonAuthCookieHeader", () => {
  it("keeps only Neon Auth session cookies", () => {
    const header = extractNeonAuthCookieHeader(
      "other=value; __Secure-neon-auth.session_token=abc123; another=1",
    );

    expect(header).toBe("__Secure-neon-auth.session_token=abc123");
  });

  it("returns empty string when no Neon Auth cookies are present", () => {
    expect(extractNeonAuthCookieHeader("other=value")).toBe("");
    expect(extractNeonAuthCookieHeader("")).toBe("");
  });
});
