import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hasPlatformPermission: vi.fn(),
}));

vi.mock("@/modules/identity/domain/platform-rbac", () => ({
  hasPlatformPermission: mocks.hasPlatformPermission,
}));

import { hasFftModuleAccess } from "@/modules/fft/auth/fft-module-access";

describe("hasFftModuleAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasPlatformPermission.mockResolvedValue({ allowed: false });
  });

  it("allows when platform fft.access is present", async () => {
    mocks.hasPlatformPermission.mockResolvedValue({ allowed: true });
    await expect(
      hasFftModuleAccess({
        userId: "u1",
        email: "admin@example.com",
        organizationId: "org-1",
      }),
    ).resolves.toBe(true);
  });

  it("denies allowlist-only users without platform fft.access", async () => {
    await expect(
      hasFftModuleAccess({
        userId: "u1",
        email: "sales@example.com",
        organizationId: "org-1",
      }),
    ).resolves.toBe(false);
  });

  it("denies when platform lacks fft.access", async () => {
    await expect(
      hasFftModuleAccess({
        userId: "u1",
        email: "nobody@example.com",
        organizationId: "org-1",
      }),
    ).resolves.toBe(false);
  });
});
