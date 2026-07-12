/**
 * P1 MVP AC evidence — permission-code gates (G1–G6 / G8–G9 related).
 * Actions call requireTradePermission with these codes; deny/allow here is the AC proof.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isAdminSession: vi.fn(),
  isFftRbacEnabled: vi.fn(),
  listSalesMembers: vi.fn(),
  listRoleAssignmentsForUser: vi.fn(),
  bootstrapPhase1RbacAssignments: vi.fn(),
  resolvePlatformOrgContext: vi.fn(),
  hasPlatformPermission: vi.fn(),
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

vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw new Error(`REDIRECT:${href}`);
  },
}));

import {
  requireTradePermission,
  type FftAccess,
} from "@/modules/fft/auth/fft-session";
import { hasFftEventManagePermission } from "@/modules/fft/auth/fft-phase2b";

const salesEventsRedirect = "REDIRECT:/fft/events";

const salesMembers = [
  {
    id: "m-sales",
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

function assignment(codes: string[]) {
  return [
    {
      roleId: "role-1",
      scopeType: "platform" as const,
      scopeId: null,
      permissionCodes: codes,
      active: true,
    },
  ];
}

describe("P1 AC permission gates (RBAC on)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isFftRbacEnabled.mockReturnValue(true);
    mocks.listSalesMembers.mockResolvedValue([]);
    mocks.bootstrapPhase1RbacAssignments.mockResolvedValue(undefined);
    mocks.resolvePlatformOrgContext.mockResolvedValue({
      organizationId: "org-1",
    });
    mocks.hasPlatformPermission.mockResolvedValue({ allowed: false });
  });

  const cases: Array<{ ac: string; code: string }> = [
    { ac: "AC-EVT-02", code: "event.create" },
    { ac: "AC-EVT-03", code: "event.edit" },
    { ac: "AC-EVT-04", code: "event.open_close" },
    { ac: "AC-SUP-01 / G2", code: "supply.manage" },
    { ac: "AC-FLD-01 / G5", code: "custom_field.manage" },
    { ac: "AC-PRI-01 / G1", code: "priority.manage" },
    { ac: "AC-XFR-02 / G3", code: "transfer.approve" },
    { ac: "AC-ALC-01", code: "allocation.preview" },
    { ac: "AC-ALC-02", code: "allocation.run" },
    { ac: "AC-ALC-03 / G9", code: "allocation.override" },
    { ac: "AC-AUD-01 / G6", code: "audit.view" },
    { ac: "AC-ADM-01 / G8", code: "export.orders" },
    { ac: "AC-ADM-02", code: "role.manage" },
  ];

  for (const { ac, code } of cases) {
    it(`${ac}: allows with ${code}, denies without`, async () => {
      mockSignedIn("ops@example.com", "ops-1");
      mocks.listRoleAssignmentsForUser.mockResolvedValue(assignment([code]));

      await expect(
        requireTradePermission(code, { eventId: "e1" }),
      ).resolves.toMatchObject({ userId: "ops-1", rbacEnabled: true });

      mocks.listRoleAssignmentsForUser.mockResolvedValue(
        assignment(["order.create", "order.view_own"]),
      );

      await expect(
        requireTradePermission(code, { eventId: "e1" }),
      ).rejects.toThrow(salesEventsRedirect);
    });
  }

  it("AC-XFR-01 / G3: transfer.request allow/deny", async () => {
    mockSignedIn("sales@example.com", "sales-1");
    mocks.listRoleAssignmentsForUser.mockResolvedValue(
      assignment(["transfer.request", "order.create"]),
    );

    await expect(
      requireTradePermission("transfer.request", { eventId: "e1" }),
    ).resolves.toMatchObject({ userId: "sales-1" });

    mocks.listRoleAssignmentsForUser.mockResolvedValue(
      assignment(["order.view_own"]),
    );

    await expect(
      requireTradePermission("transfer.request", { eventId: "e1" }),
    ).rejects.toThrow(salesEventsRedirect);
  });

  it("AC-ORD-01: order.create allow/deny", async () => {
    mockSignedIn("sales@example.com", "sales-1");
    mocks.listRoleAssignmentsForUser.mockResolvedValue(
      assignment(["order.create", "order.view_own"]),
    );

    await expect(
      requireTradePermission("order.create", { eventId: "e1" }),
    ).resolves.toMatchObject({ userId: "sales-1" });

    mocks.listRoleAssignmentsForUser.mockResolvedValue(
      assignment(["order.view_own"]),
    );

    await expect(
      requireTradePermission("order.create", { eventId: "e1" }),
    ).rejects.toThrow(salesEventsRedirect);
  });

  it("AC-ORD-02..04: order.view_own allow/deny", async () => {
    mockSignedIn("sales@example.com", "sales-1");
    mocks.listRoleAssignmentsForUser.mockResolvedValue(
      assignment(["order.view_own"]),
    );

    await expect(
      requireTradePermission("order.view_own", {
        eventId: "e1",
        resourceOwnerUserId: "sales-1",
      }),
    ).resolves.toMatchObject({ userId: "sales-1" });

    mocks.listRoleAssignmentsForUser.mockResolvedValue(
      assignment(["order.create"]),
    );

    await expect(
      requireTradePermission("order.view_own", {
        eventId: "e1",
        resourceOwnerUserId: "sales-1",
      }),
    ).rejects.toThrow(salesEventsRedirect);
  });

  it("AC-ORD-05 / G4: pickup.manage allow/deny (pickup-ops complete path)", async () => {
    mockSignedIn("ops@example.com", "ops-1");
    mocks.listRoleAssignmentsForUser.mockResolvedValue(
      assignment(["pickup.manage"]),
    );

    await expect(
      requireTradePermission("pickup.manage", { eventId: "e1" }),
    ).resolves.toMatchObject({ userId: "ops-1" });

    mocks.listRoleAssignmentsForUser.mockResolvedValue(
      assignment(["order.view_own"]),
    );

    await expect(
      requireTradePermission("pickup.manage", { eventId: "e1" }),
    ).rejects.toThrow(salesEventsRedirect);
  });

  it("AC-ALC-03 / G9: allocation.preview|run alone do not grant override", async () => {
    mockSignedIn("ops@example.com", "ops-1");
    mocks.listRoleAssignmentsForUser.mockResolvedValue(
      assignment(["allocation.preview", "allocation.run"]),
    );

    await expect(
      requireTradePermission("allocation.preview", { eventId: "e1" }),
    ).resolves.toMatchObject({ userId: "ops-1" });
    await expect(
      requireTradePermission("allocation.run", { eventId: "e1" }),
    ).resolves.toMatchObject({ userId: "ops-1" });

    await expect(
      requireTradePermission("allocation.override", { eventId: "e1" }),
    ).rejects.toThrow(salesEventsRedirect);
  });
});

describe("P1 AC-ALC-03 override panel helper (no full-page redirect)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isFftRbacEnabled.mockReturnValue(true);
    mocks.listSalesMembers.mockResolvedValue([]);
    mocks.bootstrapPhase1RbacAssignments.mockResolvedValue(undefined);
  });

  it("hides override when user has preview/run only", async () => {
    const access: FftAccess = {
      userId: "ops-1",
      email: "ops@example.com",
      isAdmin: false,
      rbacEnabled: true,
    };
    mocks.listRoleAssignmentsForUser.mockResolvedValue(
      assignment(["allocation.preview", "allocation.run"]),
    );
    await expect(
      hasFftEventManagePermission(access, "allocation.override", "e1"),
    ).resolves.toBe(false);
  });

  it("shows override when user has allocation.override", async () => {
    const access: FftAccess = {
      userId: "ops-1",
      email: "ops@example.com",
      isAdmin: false,
      rbacEnabled: true,
    };
    mocks.listRoleAssignmentsForUser.mockResolvedValue(
      assignment(["allocation.override"]),
    );
    await expect(
      hasFftEventManagePermission(access, "allocation.override", "e1"),
    ).resolves.toBe(true);
  });
});

describe("P1 AC-AUD-01 setup panel helper (no full-page redirect)", () => {
  it("hides audit when RBAC user lacks audit.view", async () => {
    const access: FftAccess = {
      userId: "sales-1",
      email: "sales@example.com",
      isAdmin: false,
      rbacEnabled: true,
    };
    mocks.listRoleAssignmentsForUser.mockResolvedValue(
      assignment(["order.create", "order.view_own"]),
    );

    await expect(
      hasFftEventManagePermission(access, "audit.view", "e1"),
    ).resolves.toBe(false);
  });

  it("shows audit when RBAC user has audit.view", async () => {
    const access: FftAccess = {
      userId: "viewer-1",
      email: "viewer@example.com",
      isAdmin: false,
      rbacEnabled: true,
    };
    mocks.listRoleAssignmentsForUser.mockResolvedValue(
      assignment(["audit.view"]),
    );

    await expect(
      hasFftEventManagePermission(access, "audit.view", "e1"),
    ).resolves.toBe(true);
  });

  it("shows audit for platform admin without reading assignments", async () => {
    vi.clearAllMocks();
    const access: FftAccess = {
      userId: "admin-1",
      email: "admin@example.com",
      isAdmin: true,
      rbacEnabled: true,
    };

    await expect(
      hasFftEventManagePermission(access, "audit.view", "e1"),
    ).resolves.toBe(true);
    expect(mocks.listRoleAssignmentsForUser).not.toHaveBeenCalled();
  });

  it("AC-AUD-01 / G6: RBAC off — admin sees audit, sales allowlist does not", async () => {
    const sales: FftAccess = {
      userId: "sales-1",
      email: "sales@example.com",
      isAdmin: false,
      rbacEnabled: false,
    };
    await expect(
      hasFftEventManagePermission(sales, "audit.view", "e1"),
    ).resolves.toBe(false);

    const admin: FftAccess = {
      userId: "admin-1",
      email: "admin@example.com",
      isAdmin: true,
      rbacEnabled: false,
    };
    await expect(
      hasFftEventManagePermission(admin, "audit.view", "e1"),
    ).resolves.toBe(true);
  });
});

describe("P1 AC gates (RBAC off — admin vs sales allowlist)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isFftRbacEnabled.mockReturnValue(false);
    mocks.listSalesMembers.mockResolvedValue(salesMembers);
    mocks.listRoleAssignmentsForUser.mockResolvedValue([]);
    mocks.resolvePlatformOrgContext.mockResolvedValue({
      organizationId: "org-1",
    });
    mocks.hasPlatformPermission.mockResolvedValue({ allowed: false });
  });

  it("denies allowlisted sales for supply.manage / priority.manage / export.orders", async () => {
    mockSignedIn("sales@example.com", "sales-1");

    for (const code of [
      "event.create",
      "event.edit",
      "event.open_close",
      "supply.manage",
      "priority.manage",
      "custom_field.manage",
      "export.orders",
      "role.manage",
      "transfer.approve",
      "allocation.preview",
      "allocation.override",
    ] as const) {
      await expect(requireTradePermission(code, { eventId: "e1" })).rejects.toThrow(
        salesEventsRedirect,
      );
    }
  });

  it("allows platform admin for MVP manage codes", async () => {
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
      requireTradePermission("supply.manage", { eventId: "e1" }),
    ).resolves.toMatchObject({ isAdmin: true });
  });
});
