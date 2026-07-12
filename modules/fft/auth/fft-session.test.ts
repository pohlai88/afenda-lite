import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  getAuthSession: vi.fn(),
  isAdminSession: vi.fn(),
  isFftRbacEnabled: vi.fn(),
  listSalesMembers: vi.fn(),
  listRoleAssignmentsForUser: vi.fn(),
  bootstrapPhase1RbacAssignments: vi.fn(),
  resolvePlatformOrgContext: vi.fn(),
  hasPlatformPermission: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/modules/identity/auth/get-session", () => ({
  getAuthSession: mocks.getAuthSession,
}));

vi.mock("@/modules/identity/admin", () => ({
  isAdminSession: mocks.isAdminSession,
}));

vi.mock("@/modules/platform/env/accessors", () => ({
  isFftRbacEnabled: mocks.isFftRbacEnabled,
}));

vi.mock("@/modules/identity/domain/platform-rbac-access", () => ({
  resolvePlatformOrgContext: mocks.resolvePlatformOrgContext,
}));

vi.mock("@/modules/identity/domain/platform-rbac", () => ({
  hasPlatformPermission: mocks.hasPlatformPermission,
}));

vi.mock("@/modules/fft/domain/store", () => ({
  listSalesMembers: mocks.listSalesMembers,
  listRoleAssignmentsForUser: mocks.listRoleAssignmentsForUser,
  bootstrapPhase1RbacAssignments: mocks.bootstrapPhase1RbacAssignments,
}));

import {
  hasTradePermission,
  requireFftAccess,
  requireFftAdmin,
  requireTradePermission,
} from "@/modules/fft/auth/fft-session";
import { fftDefaultHref } from "@/modules/fft/i18n/fft-i18n";

const salesEventsRedirect = `REDIRECT:${fftDefaultHref("/events")}`;

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

describe("FFT_RBAC_ENABLED=false — Phase 1 Admin + allowlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isFftRbacEnabled.mockReturnValue(false);
    mocks.listSalesMembers.mockResolvedValue(salesMembers);
    mocks.listRoleAssignmentsForUser.mockResolvedValue([]);
    mocks.bootstrapPhase1RbacAssignments.mockResolvedValue(undefined);
    mocks.resolvePlatformOrgContext.mockResolvedValue({
      organizationId: "org-1",
    });
    mocks.hasPlatformPermission.mockResolvedValue({ allowed: false });
  });

  describe("requireFftAccess", () => {
    it("allows neon admin via platform fft.access without allowlist", async () => {
      mockSignedIn("admin@example.com", "admin-1", { isAdmin: true });
      mocks.hasPlatformPermission.mockResolvedValue({ allowed: true });
      mocks.listSalesMembers.mockResolvedValue([]);

      await expect(requireFftAccess()).resolves.toEqual({
        userId: "admin-1",
        email: "admin@example.com",
        isAdmin: true,
        rbacEnabled: false,
        organizationId: "org-1",
      });
      expect(mocks.resolvePlatformOrgContext).toHaveBeenCalledWith({
        userId: "admin-1",
        ensureOrgAdminAssignment: true,
      });
    });

    it("denies neon admin when platform denies and not allowlisted", async () => {
      mockSignedIn("admin@example.com", "admin-1", { isAdmin: true });
      mocks.listSalesMembers.mockResolvedValue([]);

      await expect(requireFftAccess()).rejects.toThrow(
        "REDIRECT:/auth/sign-in?reason=fft-access-denied",
      );
    });

    it("allows allowlisted sales without RBAC assignments lookup", async () => {
      mockSignedIn("sales@example.com", "sales-1");

      await expect(requireFftAccess()).resolves.toEqual({
        userId: "sales-1",
        email: "sales@example.com",
        isAdmin: false,
        rbacEnabled: false,
        organizationId: "org-1",
      });

      expect(mocks.bootstrapPhase1RbacAssignments).not.toHaveBeenCalled();
    });

    it("allows org admin when allowlisted for Feed Farm Trade", async () => {
      mocks.listSalesMembers.mockResolvedValue([
        ...salesMembers,
        {
          id: "m-admin",
          userId: "admin-1",
          email: "admin@example.com",
          active: true,
        },
      ]);
      mockSignedIn("admin@example.com", "admin-1", { isAdmin: true });

      await expect(requireFftAccess()).resolves.toEqual({
        userId: "admin-1",
        email: "admin@example.com",
        isAdmin: true,
        rbacEnabled: false,
        organizationId: "org-1",
      });
    });

    it("denies non-allowlisted user with trade-access-denied redirect", async () => {
      mockSignedIn("stranger@example.com");

      await expect(requireFftAccess()).rejects.toThrow(
        "REDIRECT:/auth/sign-in?reason=fft-access-denied",
      );
    });
  });

  describe("requireFftAdmin", () => {
    it("allows Phase 1 admin when allowlisted", async () => {
      mocks.listSalesMembers.mockResolvedValue([
        ...salesMembers,
        {
          id: "m-admin",
          userId: "admin-1",
          email: "admin@example.com",
          active: true,
        },
      ]);
      mockSignedIn("admin@example.com", "admin-1", { isAdmin: true });

      await expect(requireFftAdmin()).resolves.toEqual({
        userId: "admin-1",
        email: "admin@example.com",
      });
    });

    it("redirects allowlisted sales away from admin routes", async () => {
      mockSignedIn("sales@example.com", "sales-1");

      await expect(requireFftAdmin()).rejects.toThrow(
        salesEventsRedirect,
      );
    });
  });

  describe("requireTradePermission", () => {
    it("allows admin to create events (Phase 1 admin-only create)", async () => {
      mocks.listSalesMembers.mockResolvedValue([
        ...salesMembers,
        {
          id: "m-admin",
          userId: "admin-1",
          email: "admin@example.com",
          active: true,
        },
      ]);
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

  describe("hasTradePermission", () => {
    it("allows sales deposit view but keeps pickup and deposit writes admin-only", async () => {
      const salesAccess = {
        userId: "sales-1",
        email: "sales@example.com",
        isAdmin: false,
        rbacEnabled: false,
      };

      await expect(
        hasTradePermission(salesAccess, "deposit.view", { eventId: "e1" }),
      ).resolves.toBe(true);
      await expect(
        hasTradePermission(salesAccess, "deposit.manage", { eventId: "e1" }),
      ).resolves.toBe(false);
      await expect(
        hasTradePermission(salesAccess, "pickup.view", { eventId: "e1" }),
      ).resolves.toBe(false);
    });

    it("allows an admin to view and manage local ops when RBAC is off", async () => {
      const adminAccess = {
        userId: "admin-1",
        email: "admin@example.com",
        isAdmin: true,
        rbacEnabled: false,
      };

      await expect(
        hasTradePermission(adminAccess, "deposit.manage", { eventId: "e1" }),
      ).resolves.toBe(true);
      await expect(
        hasTradePermission(adminAccess, "pickup.manage", { eventId: "e1" }),
      ).resolves.toBe(true);
    });
  });
});

describe("FFT_RBAC_ENABLED=true — dual-read (sanity)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isFftRbacEnabled.mockReturnValue(true);
    mocks.listSalesMembers.mockResolvedValue(salesMembers);
    mocks.bootstrapPhase1RbacAssignments.mockResolvedValue(undefined);
    mocks.resolvePlatformOrgContext.mockResolvedValue({
      organizationId: "org-1",
    });
    mocks.hasPlatformPermission.mockResolvedValue({ allowed: false });
  });

  it("bootstraps allowlisted admin on dual-read path", async () => {
    mocks.listSalesMembers.mockResolvedValue([
      ...salesMembers,
      {
        id: "m-admin",
        userId: "admin-1",
        email: "admin@example.com",
        active: true,
      },
    ]);
    mockSignedIn("admin@example.com", "admin-1", { isAdmin: true });

    await expect(requireFftAccess()).resolves.toMatchObject({
      rbacEnabled: true,
    });

    expect(mocks.bootstrapPhase1RbacAssignments).toHaveBeenCalledWith({
      userId: "admin-1",
      email: "admin@example.com",
      isAdmin: true,
      organizationId: "org-1",
    });
  });

  it("denies org admin without Feed Farm Trade permission on dual-read path", async () => {
    mocks.listSalesMembers.mockResolvedValue(salesMembers);
    mockSignedIn("admin@example.com", "admin-1", { isAdmin: true });
    mocks.listRoleAssignmentsForUser.mockResolvedValue([]);

    await expect(requireFftAccess()).rejects.toThrow(
      "REDIRECT:/auth/sign-in?reason=fft-access-denied",
    );
  });

  it("requires RBAC assignments when not on allowlist", async () => {
    mockSignedIn("stranger@example.com");
    mocks.listRoleAssignmentsForUser.mockResolvedValue([]);

    await expect(requireFftAccess()).rejects.toThrow(
      "REDIRECT:/auth/sign-in?reason=fft-access-denied",
    );
  });
});
describe("FFT_RBAC_ENABLED=true — action guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isFftRbacEnabled.mockReturnValue(true);
    mocks.listSalesMembers.mockResolvedValue([]);
    mocks.bootstrapPhase1RbacAssignments.mockResolvedValue(undefined);
    mocks.hasPlatformPermission.mockResolvedValue({ allowed: false });
    mocks.resolvePlatformOrgContext.mockResolvedValue({
      organizationId: "org-1",
    });
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

    it("bypasses assignment checks for platform admin session with Feed Farm Trade access", async () => {
      mocks.listSalesMembers.mockResolvedValue([
        {
          id: "m-admin",
          userId: "admin-1",
          email: "admin@example.com",
          active: true,
        },
      ]);
      mockSignedIn("admin@example.com", "admin-1", { isAdmin: true });

      await expect(
        requireTradePermission("allocation.override"),
      ).resolves.toMatchObject({ isAdmin: true });
    });
  });

  describe("requireFftAdmin", () => {
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

      await expect(requireFftAdmin()).resolves.toEqual({
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

      await expect(requireFftAdmin()).rejects.toThrow(
        salesEventsRedirect,
      );
    });
  });
});
