/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it } from "vitest";
import { isGuardianAuthShellEnabled } from "./guardian-auth-shell";

describe("guardian-auth-shell", () => {
  const original = process.env.GUARDIAN_AUTH_SHELL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.GUARDIAN_AUTH_SHELL;
    } else {
      process.env.GUARDIAN_AUTH_SHELL = original;
    }
  });

  it("enables Guardian shell by default", () => {
    delete process.env.GUARDIAN_AUTH_SHELL;
    expect(isGuardianAuthShellEnabled()).toBe(true);
  });

  it("disables Guardian shell when explicitly false", () => {
    process.env.GUARDIAN_AUTH_SHELL = "false";
    expect(isGuardianAuthShellEnabled()).toBe(false);
  });

  it("enables Guardian shell when explicitly true", () => {
    process.env.GUARDIAN_AUTH_SHELL = "true";
    expect(isGuardianAuthShellEnabled()).toBe(true);
  });
});
