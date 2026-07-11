import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isFftRbacEnabled: vi.fn(),
  listSalesMembers: vi.fn(),
  listRoleAssignmentsForUser: vi.fn(),
}));

vi.mock("@/modules/platform/env/accessors", () => ({
  isFftRbacEnabled: mocks.isFftRbacEnabled,
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
