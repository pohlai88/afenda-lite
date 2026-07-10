import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  getAuthSession: vi.fn(),
  isAdminSession: vi.fn(),
  isHotSalesRbacEnabled: vi.fn(),
  listSalesMembers: vi.fn(),
  listRoleAssignmentsForUser: vi.fn(),
  bootstrapPhase1RbacAssignments: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth/get-session", () => ({
  getAuthSession: mocks.getAuthSession,
}));

vi.mock("@/lib/admin", () => ({
  isAdminSession: mocks.isAdminSession,
}));

vi.mock("@/lib/env/accessors", () => ({
  isHotSalesRbacEnabled: mocks.isHotSalesRbacEnabled,
}));

vi.mock("@/lib/domain/trade/store", () => ({
  listSalesMembers: mocks.listSalesMembers,
  listRoleAssignmentsForUser: mocks.listRoleAssignmentsForUser,
  bootstrapPhase1RbacAssignments: mocks.bootstrapPhase1RbacAssignments,
}));

import {
  requireTradeAccess,
  requireTradeAdmin,
  requireTradePermission,
} from "@/lib/auth/trade-session";
import { tradeDefaultHref } from "@/lib/i18n/trade";

const salesEventsRedirect = `REDIRECT:${tradeDefaultHref("/events")}`;

const salesMembers = [
  {
    id: "m1",
    userId: "sales-1",
    email: "sales@example.com",
    active: true,
  },
];

function mockSignedIn(
  email: string,
  id = "user-1",
  overrides: { isAdmin?: boolean } = {},
) {
  mocks.getAuthSession.mockResolvedValue({
    user: { id, email, name: email, role: overrides.isAdmin ? "admin" : "user" },
  });
  mocks.isAdminSession.mockReturnValue(overrides.isAdmin ?? false);
}

describe("HOT_SALES_RBAC_ENABLED=false — Phase 1 Admin + allowlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isHotSalesRbacEnabled.mockReturnValue(false);
    mocks.listSalesMembers.mockResolvedValue(salesMembers);
    mocks.listRoleAssignmentsForUser.mockResolvedValue([]);
    mocks.bootstrapPhase1RbacAssignments.mockResolvedValue(undefined);
  });

  describe("requireTradeAccess", () => {
    it("allows admin without RBAC assignments lookup", async () => {
      mockSignedIn("admin@example.com", "admin-1", { isAdmin: true });

      await expect(requireTradeAccess()).resolves.toEqual({
        userId: "admin-1",
        email: "admin@example.com",
        isAdmin: true,
        rbacEnabled: false,
      });

      expect(mocks.listRoleAssignmentsForUser).not.toHaveBeenCalled();
      expect(mocks.bootstrapPhase1RbacAssignments).not.toHaveBeenCalled();
    });

    it("allows allowlisted sales without RBAC assignments lookup", async () => {
      mockSignedIn("sales@example.com", "sales-1");

      await expect(requireTradeAccess()).resolves.toEqual({
        userId: "sales-1",
        email: "sales@example.com",
        isAdmin: false,
        rbacEnabled: false,
      });

      expect(mocks.listRoleAssignmentsForUser).not.toHaveBeenCalled();
      expect(mocks.bootstrapPhase1RbacAssignments).not.toHaveBeenCalled();
    });

    it("denies non-allowlisted user with trade-access-denied redirect", async () => {
      mockSignedIn("stranger@example.com");

      await expect(requireTradeAccess()).rejects.toThrow(
        "REDIRECT:/auth/sign-in?reason=trade-access-denied",
      );
    });
  });

  describe("requireTradeAdmin", () => {
    it("allows Phase 1 admin", async () => {
      mockSignedIn("admin@example.com", "admin-1", { isAdmin: true });

      await expect(requireTradeAdmin()).resolves.toEqual({
        userId: "admin-1",
        email: "admin@example.com",
      });
    });

    it("redirects allowlisted sales away from admin routes", async () => {
      mockSignedIn("sales@example.com", "sales-1");

      await expect(requireTradeAdmin()).rejects.toThrow(
        salesEventsRedirect,
      );
    });
  });

  describe("requireTradePermission", () => {
    it("allows admin to create events (Phase 1 admin-only create)", async () => {
      mockSignedIn("admin@example.com", "admin-1", { isAdmin: true });

      await expect(
        requireTradePermission("event.create"),
      ).resolves.toMatchObject({
        userId: "admin-1",
        isAdmin: true,
        rbacEnabled: false,
      });
    });

    it("denies allowlisted sales from event.create", async () => {
      mockSignedIn("sales@example.com", "sales-1");

      await expect(requireTradePermission("event.create")).rejects.toThrow(
        salesEventsRedirect,
      );
    });

    it("allows allowlisted sales for Phase 1 sales permissions", async () => {
      mockSignedIn("sales@example.com", "sales-1");

      await expect(
        requireTradePermission("order.create", { eventId: "e1" }),
      ).resolves.toMatchObject({
        userId: "sales-1",
        rbacEnabled: false,
      });
    });

    it("denies allowlisted sales from sensitive admin permissions", async () => {
      mockSignedIn("sales@example.com", "sales-1");

      await expect(requireTradePermission("role.manage")).rejects.toThrow(
        salesEventsRedirect,
      );
    });
  });
});

describe("HOT_SALES_RBAC_ENABLED=true — dual-read (sanity)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isHotSalesRbacEnabled.mockReturnValue(true);
    mocks.listSalesMembers.mockResolvedValue(salesMembers);
    mocks.bootstrapPhase1RbacAssignments.mockResolvedValue(undefined);
  });

  it("bootstraps allowlisted admin on dual-read path", async () => {
    mockSignedIn("admin@example.com", "admin-1", { isAdmin: true });

    await expect(requireTradeAccess()).resolves.toMatchObject({
      rbacEnabled: true,
    });

    expect(mocks.bootstrapPhase1RbacAssignments).toHaveBeenCalledWith({
      userId: "admin-1",
      email: "admin@example.com",
      isAdmin: true,
    });
  });

  it("requires RBAC assignments when not on allowlist", async () => {
    mockSignedIn("stranger@example.com");
    mocks.listRoleAssignmentsForUser.mockResolvedValue([]);

    await expect(requireTradeAccess()).rejects.toThrow(
      "REDIRECT:/auth/sign-in?reason=trade-access-denied",
    );
  });
});

describe("HOT_SALES_RBAC_ENABLED=true — action guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isHotSalesRbacEnabled.mockReturnValue(true);
    mocks.listSalesMembers.mockResolvedValue([]);
    mocks.bootstrapPhase1RbacAssignments.mockResolvedValue(undefined);
  });

  describe("requireTradePermission", () => {
    it("allows authorized user with matching permission", async () => {
      mockSignedIn("rbac-user@example.com", "user-1");
      mocks.listRoleAssignmentsForUser.mockResolvedValue([
        {
          roleId: "role-admin",
          scopeType: "platform",
          scopeId: null,
          permissionCodes: ["event.create", "event.edit", "role.manage"],
          active: true,
        },
      ]);

      await expect(requireTradePermission("event.create")).resolves.toMatchObject({
        userId: "user-1",
        rbacEnabled: true,
      });
    });

    it("denies unauthorized user missing permission", async () => {
      mockSignedIn("rbac-user@example.com", "user-1");
      mocks.listRoleAssignmentsForUser.mockResolvedValue([
        {
          roleId: "role-sales",
          scopeType: "own",
          scopeId: null,
          permissionCodes: ["order.create", "order.view_own"],
          active: true,
        },
      ]);

      await expect(requireTradePermission("allocation.run")).rejects.toThrow(
        salesEventsRedirect,
      );
    });

    it("allows sales own-scope self-service permissions when RBAC is enabled", async () => {
      mockSignedIn("sales@example.com", "sales-1");
      mocks.listSalesMembers.mockResolvedValue([]);
      mocks.listRoleAssignmentsForUser.mockResolvedValue([
        {
          roleId: "role-sales",
          scopeType: "own",
          scopeId: null,
          permissionCodes: ["order.create", "order.view_own"],
          active: true,
        },
      ]);

      await expect(
        requireTradePermission("order.create", { eventId: "e1" }),
      ).resolves.toMatchObject({
        userId: "sales-1",
        rbacEnabled: true,
      });
    });

    it("denies sensitive permission without explicit grant", async () => {
      mockSignedIn("rbac-user@example.com", "user-1");
      mocks.listRoleAssignmentsForUser.mockResolvedValue([
        {
          roleId: "role-sales",
          scopeType: "own",
          scopeId: null,
          permissionCodes: ["order.create", "order.view_own"],
          active: true,
        },
      ]);

      await expect(requireTradePermission("role.manage")).rejects.toThrow(
        salesEventsRedirect,
      );
    });

    it("allows sensitive permission when explicitly granted", async () => {
      mockSignedIn("rbac-user@example.com", "user-1");
      mocks.listRoleAssignmentsForUser.mockResolvedValue([
        {
          roleId: "role-governance",
          scopeType: "platform",
          scopeId: null,
          permissionCodes: ["role.manage"],
          active: true,
        },
      ]);

      await expect(requireTradePermission("role.manage")).resolves.toMatchObject({
        userId: "user-1",
      });
    });

    it("denies team-scoped permission when actor team membership is unknown", async () => {
      mockSignedIn("rbac-user@example.com", "user-1");
      mocks.listRoleAssignmentsForUser.mockResolvedValue([
        {
          roleId: "role-team",
          scopeType: "team",
          scopeId: "team-1",
          permissionCodes: ["allocation.run"],
          active: true,
        },
      ]);

      await expect(
        requireTradePermission("allocation.run", { eventId: "event-1" }),
      ).rejects.toThrow(salesEventsRedirect);
    });

    it("allows team-scoped permission when actor belongs to the team", async () => {
      mockSignedIn("rbac-user@example.com", "user-1");
      mocks.listRoleAssignmentsForUser.mockResolvedValue([
        {
          roleId: "role-team",
          scopeType: "team",
          scopeId: "team-1",
          permissionCodes: ["allocation.run"],
          active: true,
        },
      ]);

      await expect(
        requireTradePermission("allocation.run", {
          eventId: "event-1",
          actorTeamIds: ["team-1"],
        }),
      ).resolves.toMatchObject({ userId: "user-1" });
    });

    it("denies bu-scoped permission when actor bu membership is unknown", async () => {
      mockSignedIn("rbac-user@example.com", "user-1");
      mocks.listRoleAssignmentsForUser.mockResolvedValue([
        {
          roleId: "role-bu",
          scopeType: "bu",
          scopeId: "bu-1",
          permissionCodes: ["event.edit"],
          active: true,
        },
      ]);

      await expect(requireTradePermission("event.edit")).rejects.toThrow(
        salesEventsRedirect,
      );
    });

    it("allows bu-scoped permission when actor belongs to the bu", async () => {
      mockSignedIn("rbac-user@example.com", "user-1");
      mocks.listRoleAssignmentsForUser.mockResolvedValue([
        {
          roleId: "role-bu",
          scopeType: "bu",
          scopeId: "bu-1",
          permissionCodes: ["event.edit"],
          active: true,
        },
      ]);

      await expect(
        requireTradePermission("event.edit", { actorBuIds: ["bu-1"] }),
      ).resolves.toMatchObject({ userId: "user-1" });
    });

    it("bypasses assignment checks for platform admin session", async () => {
      mockSignedIn("admin@example.com", "admin-1", { isAdmin: true });

      await expect(
        requireTradePermission("allocation.override"),
      ).resolves.toMatchObject({ isAdmin: true });

      expect(mocks.listRoleAssignmentsForUser).not.toHaveBeenCalled();
    });
  });

  describe("requireTradeAdmin", () => {
    it("allows RBAC user with event.edit assignment", async () => {
      mockSignedIn("ops@example.com", "user-1");
      mocks.listRoleAssignmentsForUser.mockResolvedValue([
        {
          roleId: "role-setup",
          scopeType: "platform",
          scopeId: null,
          permissionCodes: ["event.edit"],
          active: true,
        },
      ]);

      await expect(requireTradeAdmin()).resolves.toEqual({
        userId: "user-1",
        email: "ops@example.com",
      });
    });

    it("denies RBAC user without event.edit assignment", async () => {
      mockSignedIn("ops@example.com", "user-1");
      mocks.listRoleAssignmentsForUser.mockResolvedValue([
        {
          roleId: "role-sales",
          scopeType: "own",
          scopeId: null,
          permissionCodes: ["order.create"],
          active: true,
        },
      ]);

      await expect(requireTradeAdmin()).rejects.toThrow(
        salesEventsRedirect,
      );
    });
  });
});
