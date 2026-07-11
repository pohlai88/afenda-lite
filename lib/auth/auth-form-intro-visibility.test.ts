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

  it("hides duplicate vault heading when Neon AuthView owns the card title", () => {
    expect(resolveShowVaultHeading({ path: "sign-in" })).toBe(false);
    expect(resolveShowVaultHeading({ path: "email-otp" })).toBe(false);
    expect(resolveShowVaultHeading({ path: "magic-link" })).toBe(false);
    expect(resolveShowVaultHeading({ path: "sign-up" })).toBe(false);
  });
});
