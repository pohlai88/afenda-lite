import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("@/modules/platform/db", () => ({
  pool: { query: mocks.query },
}));

import {
  getOrganizationUser,
  listOrganizationUsers,
} from "@/modules/identity/domain/organization-users";

describe("organization-users membership scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists users via neon_auth.member join for the org", async () => {
    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: "u1",
          email: "a@example.com",
          name: "A",
          role: "user",
          emailVerified: true,
          banned: false,
          banReason: null,
          createdAt: new Date("2026-01-01"),
        },
      ],
    });

    const users = await listOrganizationUsers("org-1");
    expect(users).toHaveLength(1);
    expect(users[0]?.email).toBe("a@example.com");
    const sql = String(mocks.query.mock.calls[0]?.[0] ?? "");
    expect(sql).toContain("neon_auth.member");
    expect(sql).toContain('m."organizationId"');
    expect(mocks.query.mock.calls[0]?.[1]).toEqual(["org-1"]);
  });

  it("returns null for cross-org getOrganizationUser", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [] });
    const userId = "11111111-1111-4111-8111-111111111111";
    await expect(getOrganizationUser(userId, "org-1")).resolves.toBeNull();
    const sql = String(mocks.query.mock.calls[0]?.[0] ?? "");
    expect(sql).toContain("neon_auth.member");
    expect(mocks.query.mock.calls[0]?.[1]).toEqual([userId, "org-1"]);
  });
});
