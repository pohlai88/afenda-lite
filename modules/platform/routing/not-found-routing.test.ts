import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthSession, isAdminSession } = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isAdminSession: vi.fn(),
}));

vi.mock("@/modules/identity/auth/get-session", () => ({
  getAuthSession,
}));

vi.mock("@/modules/identity/admin", () => ({
  isAdminSession,
}));

import { resolveNotFoundDestination } from "@/modules/platform/routing/not-found-routing";
import {
  AUTH_SIGN_IN_HREF,
  CLIENT_HOME_HREF,
  ORGANIZATION_ADMIN_DASHBOARD_HREF,
} from "@/modules/platform/routing/portal-routes";

describe("resolveNotFoundDestination", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
    isAdminSession.mockReset();
  });

  it("routes organization admins back to dashboard", async () => {
    getAuthSession.mockResolvedValue({
      user: { id: "op-1", email: "admin@example.com" },
    });
    isAdminSession.mockReturnValue(true);

    await expect(resolveNotFoundDestination()).resolves.toEqual({
      backHref: ORGANIZATION_ADMIN_DASHBOARD_HREF,
      backLabel: expect.any(String),
    });
  });

  it("routes clients back to client home", async () => {
    getAuthSession.mockResolvedValue({
      user: { id: "client-1", email: "client@example.com" },
    });
    isAdminSession.mockReturnValue(false);

    await expect(resolveNotFoundDestination()).resolves.toEqual({
      backHref: CLIENT_HOME_HREF,
      backLabel: expect.any(String),
    });
  });

  it("routes anonymous users to sign in", async () => {
    getAuthSession.mockResolvedValue(null);
    isAdminSession.mockReturnValue(false);

    await expect(resolveNotFoundDestination()).resolves.toEqual({
      backHref: AUTH_SIGN_IN_HREF,
      backLabel: expect.any(String),
    });
  });
});
