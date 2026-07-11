import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isAdminSession: vi.fn(),
  isFftRbacEnabled: vi.fn(),
  listSalesMembers: vi.fn(),
  listRoleAssignmentsForUser: vi.fn(),
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

vi.mock("@/modules/fft/domain/store", () => ({
  listSalesMembers: mocks.listSalesMembers,
  listRoleAssignmentsForUser: mocks.listRoleAssignmentsForUser,
}));

import {
  hasFftModuleAccess,
  resolveShellAccess,
} from "@/modules/platform/shell/access";

describe("resolveShellAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isFftRbacEnabled.mockReturnValue(false);
    mocks.listSalesMembers.mockResolvedValue([]);
    mocks.listRoleAssignmentsForUser.mockResolvedValue([]);
  });

  it("returns null when unauthenticated", async () => {
    mocks.getAuthSession.mockResolvedValue(null);
    await expect(resolveShellAccess()).resolves.toBeNull();
  });

  it("grants declarations to every member; Feed Farm Trade only with allowlist", async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: { id: "u1", email: "member@example.com" },
    });
    mocks.isAdminSession.mockReturnValue(false);

    await expect(resolveShellAccess()).resolves.toEqual({
      modules: ["declarations"],
      isOrgAdmin: false,
    });

    mocks.listSalesMembers.mockResolvedValue([
      {
        id: "m1",
        userId: "u1",
        email: "member@example.com",
        active: true,
      },
    ]);

    await expect(resolveShellAccess()).resolves.toEqual({
      modules: ["declarations", "fft"],
      isOrgAdmin: false,
    });
  });

  it("marks org admin without granting Feed Farm Trade by default", async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
    });
    mocks.isAdminSession.mockReturnValue(true);

    await expect(resolveShellAccess()).resolves.toEqual({
      modules: ["declarations"],
      isOrgAdmin: true,
    });
  });
});

describe("hasFftModuleAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isFftRbacEnabled.mockReturnValue(false);
    mocks.listSalesMembers.mockResolvedValue([]);
  });

  it("allows allowlisted email", async () => {
    mocks.listSalesMembers.mockResolvedValue([
      {
        id: "m1",
        userId: "u1",
        email: "sales@example.com",
        active: true,
      },
    ]);
    await expect(
      hasFftModuleAccess({
        userId: "u1",
        email: "sales@example.com",
      }),
    ).resolves.toBe(true);
  });

  it("allows RBAC assignment when flag on", async () => {
    mocks.isFftRbacEnabled.mockReturnValue(true);
    mocks.listRoleAssignmentsForUser.mockResolvedValue([
      {
        roleId: "r1",
        scopeType: "platform",
        scopeId: null,
        permissionCodes: ["event.view"],
        active: true,
      },
    ]);
    await expect(
      hasFftModuleAccess({
        userId: "u1",
        email: "rbac@example.com",
      }),
    ).resolves.toBe(true);
  });
});
