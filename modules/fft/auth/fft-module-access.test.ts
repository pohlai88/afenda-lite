import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isFftRbacEnabled: vi.fn(),
  listSalesMembers: vi.fn(),
  listRoleAssignmentsForUser: vi.fn(),
  hasPlatformPermission: vi.fn(),
}));

vi.mock("@/modules/platform/env/accessors", () => ({
  isFftRbacEnabled: mocks.isFftRbacEnabled,
}));

vi.mock("@/modules/identity/domain/platform-rbac", () => ({
  hasPlatformPermission: mocks.hasPlatformPermission,
}));

vi.mock("@/modules/fft/domain/store", () => ({
  listSalesMembers: mocks.listSalesMembers,
  listRoleAssignmentsForUser: mocks.listRoleAssignmentsForUser,
}));

import { hasFftModuleAccess } from "@/modules/fft/auth/fft-module-access";

describe("hasFftModuleAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isFftRbacEnabled.mockReturnValue(false);
    mocks.listSalesMembers.mockResolvedValue([]);
    mocks.hasPlatformPermission.mockResolvedValue({ allowed: false });
  });

  it("allows platform fft.access first", async () => {
    mocks.hasPlatformPermission.mockResolvedValue({ allowed: true });
    await expect(
      hasFftModuleAccess({
        userId: "u1",
        email: "admin@example.com",
        organizationId: "org-1",
      }),
    ).resolves.toBe(true);
    expect(mocks.hasPlatformPermission).toHaveBeenCalledWith({
      userId: "u1",
      organizationId: "org-1",
      code: "fft.access",
      neonAdminBootstrap: false,
    });
    expect(mocks.listSalesMembers).not.toHaveBeenCalled();
  });

  it("allows allowlisted email as bridge", async () => {
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
        organizationId: "org-1",
      }),
    ).resolves.toBe(true);
    expect(mocks.listSalesMembers).toHaveBeenCalledWith("org-1");
  });

  it("allows RBAC assignment when flag on as bridge", async () => {
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
        organizationId: "org-1",
      }),
    ).resolves.toBe(true);
    expect(mocks.listRoleAssignmentsForUser).toHaveBeenCalledWith(
      "u1",
      "org-1",
    );
  });

  it("denies when no platform access, allowlist, or assignment", async () => {
    await expect(
      hasFftModuleAccess({
        userId: "u1",
        email: "nobody@example.com",
        organizationId: "org-1",
      }),
    ).resolves.toBe(false);
  });
});
