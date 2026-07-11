/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  CANONICAL_STUDIO_KIT,
  getCanonicalStudioEntry,
  listCanonicalBlocksByRole,
} from "./studio-canonical-kit";

describe("studio-canonical-kit", () => {
  it("pins one login layout reference (login-page-02)", () => {
    const login = listCanonicalBlocksByRole("layout-reference");
    expect(login).toHaveLength(1);
    expect(login[0]?.blockSlug).toBe("login-page-02");
  });

  it("includes empty-state-01 and account-settings-01 as installed kit members", () => {
    expect(getCanonicalStudioEntry("empty-state-01")?.localPath).toContain(
      "empty-state-01",
    );
    expect(getCanonicalStudioEntry("account-settings-01")?.role).toBe(
      "chrome-reference",
    );
  });

  it("does not treat Studio login form as portalAdoption for Neon", () => {
    const login = getCanonicalStudioEntry("login-page-02");
    expect(login?.portalAdoption).toMatch(/PortalAuthNeonView|Neon/i);
    expect(login?.role).toBe("layout-reference");
    expect(login?.portalAdoption.toLowerCase()).toMatch(
      /loginpage02chrome|demo loginform removed/,
    );
  });

  it("keeps kit entries unique by blockSlug", () => {
    const slugs = CANONICAL_STUDIO_KIT.map((e) => e.blockSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
