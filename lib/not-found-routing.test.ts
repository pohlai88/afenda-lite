import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthSession, isAdminSession } = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isAdminSession: vi.fn(),
}));

vi.mock("@/lib/auth/get-session", () => ({
  getAuthSession,
}));

vi.mock("@/lib/admin", () => ({
  isAdminSession,
}));

import { resolveNotFoundDestination } from "@/lib/not-found-routing";
import {
  AUTH_SIGN_IN_HREF,
  CLIENT_HOME_HREF,
  OPERATOR_DASHBOARD_HREF,
} from "@/lib/portal-routes";

describe("resolveNotFoundDestination", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
    isAdminSession.mockReset();
  });

  it("routes operators back to dashboard", async () => {
    getAuthSession.mockResolvedValue({
      user: { id: "op-1", email: "admin@example.com" },
    });
    isAdminSession.mockReturnValue(true);

    await expect(resolveNotFoundDestination()).resolves.toEqual({
      backHref: OPERATOR_DASHBOARD_HREF,
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
