/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { resolveShowVaultHeading } from "@/lib/auth/auth-form-intro-visibility";

describe("auth-form-intro-visibility", () => {
  it("shows org operator heading on org sign-in", () => {
    expect(
      resolveShowVaultHeading({ path: "sign-in", from: "org" }),
    ).toBe(true);
  });

  it("hides duplicate client vault heading on default sign-in", () => {
    expect(resolveShowVaultHeading({ path: "sign-in" })).toBe(false);
  });

  it("shows distinct headings on email-otp and magic-link", () => {
    expect(resolveShowVaultHeading({ path: "email-otp" })).toBe(true);
    expect(resolveShowVaultHeading({ path: "magic-link" })).toBe(true);
    expect(resolveShowVaultHeading({ path: "sign-up" })).toBe(false);
  });
});
