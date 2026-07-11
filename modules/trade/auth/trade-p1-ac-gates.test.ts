/**
 * P1 MVP AC evidence — permission-code gates (G1–G6 / G8–G9 related).
 * Actions call requireTradePermission with these codes; deny/allow here is the AC proof.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isAdminSession: vi.fn(),
  isHotSalesRbacEnabled: vi.fn(),
  listSalesMembers: vi.fn(),
  listRoleAssignmentsForUser: vi.fn(),
  bootstrapPhase1RbacAssignments: vi.fn(),
}));

vi.mock("@/modules/identity/auth/get-session", () => ({
  getAuthSession: mocks.getAuthSession,
}));

vi.mock("@/modules/identity/admin", () => ({
  isAdminSession: mocks.isAdminSession,
}));

vi.mock("@/modules/platform/env/accessors", () => ({
  isHotSalesRbacEnabled: mocks.isHotSalesRbacEnabled,
}));

vi.mock("@/modules/trade/domain/store", () => ({
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
  type TradeAccess,
} from "@/modules/trade/auth/trade-session";
import { hasTradeEventManagePermission } from "@/modules/trade/auth/trade-phase2b";

const salesEventsRedirect = "REDIRECT:/trade/events";

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
    mocks.isHotSalesRbacEnabled.mockReturnValue(true);
    mocks.listSalesMembers.mockResolvedValue([]);
    mocks.bootstrapPhase1RbacAssignments.mockResolvedValue(undefined);
  });

  const cases: Array<{ ac: string; code: string }> = [
    { ac: "AC-SUP-01 / G2", code: "supply.manage" },
    { ac: "AC-FLD-01 / G5", code: "custom_field.manage" },
    { ac: "AC-PRI-01 / G1", code: "priority.manage" },
    { ac: "AC-XFR-02 / G3", code: "transfer.approve" },
    { ac: "AC-ALC-01", code: "allocation.preview" },
    { ac: "AC-ALC-02", code: "allocation.run" },
    { ac: "AC-ALC-03 / G9", code: "allocation.override" },
    { ac: "AC-AUD-01 / G6", code: "audit.view" },
    { ac: "AC-ADM-01 / G8", code: "export.orders" },
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
});

describe("P1 AC-AUD-01 setup panel helper (no full-page redirect)", () => {
  it("hides audit when RBAC user lacks audit.view", async () => {
    const access: TradeAccess = {
      userId: "sales-1",
      email: "sales@example.com",
      isAdmin: false,
      rbacEnabled: true,
    };
    mocks.listRoleAssignmentsForUser.mockResolvedValue(
      assignment(["order.create", "order.view_own"]),
    );

    await expect(
      hasTradeEventManagePermission(access, "audit.view", "e1"),
    ).resolves.toBe(false);
  });

  it("shows audit when RBAC user has audit.view", async () => {
    const access: TradeAccess = {
      userId: "viewer-1",
      email: "viewer@example.com",
      isAdmin: false,
      rbacEnabled: true,
    };
    mocks.listRoleAssignmentsForUser.mockResolvedValue(
      assignment(["audit.view"]),
    );

    await expect(
      hasTradeEventManagePermission(access, "audit.view", "e1"),
    ).resolves.toBe(true);
  });

  it("shows audit for platform admin without reading assignments", async () => {
    vi.clearAllMocks();
    const access: TradeAccess = {
      userId: "admin-1",
      email: "admin@example.com",
      isAdmin: true,
      rbacEnabled: true,
    };

    await expect(
      hasTradeEventManagePermission(access, "audit.view", "e1"),
    ).resolves.toBe(true);
    expect(mocks.listRoleAssignmentsForUser).not.toHaveBeenCalled();
  });
});

describe("P1 AC gates (RBAC off — admin vs sales allowlist)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isHotSalesRbacEnabled.mockReturnValue(false);
    mocks.listSalesMembers.mockResolvedValue(salesMembers);
    mocks.listRoleAssignmentsForUser.mockResolvedValue([]);
  });

  it("denies allowlisted sales for supply.manage / priority.manage / export.orders", async () => {
    mockSignedIn("sales@example.com", "sales-1");

    for (const code of [
      "supply.manage",
      "priority.manage",
      "custom_field.manage",
      "export.orders",
      "transfer.approve",
      "allocation.preview",
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
