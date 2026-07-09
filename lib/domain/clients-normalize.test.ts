import { describe, expect, it } from "vitest";
import { normalizeEmail } from "@/lib/domain/clients";

describe("normalizeEmail", () => {
  it("lowercases and trims email addresses", () => {
    expect(normalizeEmail("  Client@Example.COM  ")).toBe("client@example.com");
  });

  it("returns empty string for missing values", () => {
    expect(normalizeEmail(undefined)).toBe("");
    expect(normalizeEmail(null)).toBe("");
  });
});
