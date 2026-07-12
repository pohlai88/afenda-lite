import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isAdminSession: vi.fn(),
  resolvePlatformOrgContext: vi.fn(),
  requireAnyPlatformPermission: vi.fn(),
  hasFftModuleAccess: vi.fn(),
}));

vi.mock("@/modules/identity/auth/get-session", () => ({
  getAuthSession: mocks.getAuthSession,
}));

vi.mock("@/modules/identity/admin", () => ({
  isAdminSession: mocks.isAdminSession,
}));

vi.mock("@/modules/identity/domain/platform-rbac-access", () => ({
  resolvePlatformOrgContext: mocks.resolvePlatformOrgContext,
  requireAnyPlatformPermission: mocks.requireAnyPlatformPermission,
}));

vi.mock("@/modules/fft/auth/fft-module-access", () => ({
  hasFftModuleAccess: mocks.hasFftModuleAccess,
}));

import { resolveShellAccess } from "@/features/portal-chrome/resolve-shell-access";

describe("resolveShellAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolvePlatformOrgContext.mockResolvedValue({
      organizationId: "org-1",
    });
    mocks.requireAnyPlatformPermission.mockResolvedValue({
      check: { allowed: false },
    });
    mocks.hasFftModuleAccess.mockResolvedValue(false);
  });

  it("returns null when unauthenticated", async () => {
    mocks.getAuthSession.mockResolvedValue(null);
    await expect(resolveShellAccess()).resolves.toBeNull();
  });

  it("grants declarations to every member; FFT only via hasFftModuleAccess", async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: { id: "u1", email: "member@example.com" },
    });
    mocks.isAdminSession.mockReturnValue(false);

    await expect(resolveShellAccess()).resolves.toEqual({
      modules: ["declarations"],
      isOrgAdmin: false,
    });
    expect(mocks.hasFftModuleAccess).toHaveBeenCalledWith({
      userId: "u1",
      email: "member@example.com",
      organizationId: "org-1",
      neonAdminBootstrap: false,
    });

    mocks.hasFftModuleAccess.mockResolvedValue(true);

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
    expect(mocks.hasFftModuleAccess).toHaveBeenCalledWith({
      userId: "admin-1",
      email: "admin@example.com",
      organizationId: "org-1",
      neonAdminBootstrap: true,
    });
  });
});
