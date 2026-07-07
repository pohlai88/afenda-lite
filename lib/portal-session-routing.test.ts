import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthSession, isAdminSession, bootstrapClientAfterAuth, getClientProfile } =
  vi.hoisted(() => ({
    getAuthSession: vi.fn(),
    isAdminSession: vi.fn(),
    bootstrapClientAfterAuth: vi.fn(),
    getClientProfile: vi.fn(),
  }));

vi.mock("@/lib/auth/get-session", () => ({
  getAuthSession,
}));

vi.mock("@/lib/admin", () => ({
  isAdminSession,
}));

vi.mock("@/lib/auth/bootstrap-client-invite", () => ({
  bootstrapClientAfterAuth,
}));

vi.mock("@/lib/clients", () => ({
  getClientProfile,
}));

import {
  getAuthenticatedLandingHref,
  resolveClientLandingHref,
} from "@/lib/portal-session-routing";
import {
  CLIENT_ONBOARDING_HREF,
  OPERATOR_DASHBOARD_HREF,
} from "@/lib/portal-routes";

describe("resolveClientLandingHref", () => {
  beforeEach(() => {
    getClientProfile.mockReset();
  });

  it("routes incomplete onboarding to wizard", async () => {
    getClientProfile.mockResolvedValue({ onboardingComplete: false });

    await expect(resolveClientLandingHref("user-1")).resolves.toBe(
      CLIENT_ONBOARDING_HREF,
    );
  });

  it("routes completed onboarding to client home", async () => {
    getClientProfile.mockResolvedValue({ onboardingComplete: true });

    await expect(resolveClientLandingHref("user-1")).resolves.toBe("/client");
  });
});

describe("getAuthenticatedLandingHref", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
    isAdminSession.mockReset();
    bootstrapClientAfterAuth.mockReset();
    getClientProfile.mockReset();
    bootstrapClientAfterAuth.mockResolvedValue(undefined);
  });

  it("returns null when unauthenticated", async () => {
    getAuthSession.mockResolvedValue(null);

    await expect(getAuthenticatedLandingHref()).resolves.toBeNull();
  });

  it("returns null for embed requests", async () => {
    getAuthSession.mockResolvedValue({
      user: { id: "user-1", email: "client@example.com" },
    });

    await expect(getAuthenticatedLandingHref({ embed: true })).resolves.toBeNull();
  });

  it("routes operators to dashboard", async () => {
    getAuthSession.mockResolvedValue({
      user: { id: "op-1", email: "admin@example.com" },
    });
    isAdminSession.mockReturnValue(true);

    await expect(getAuthenticatedLandingHref()).resolves.toBe(
      OPERATOR_DASHBOARD_HREF,
    );
  });

  it("bootstraps client and resolves onboarding landing", async () => {
    getAuthSession.mockResolvedValue({
      user: { id: "client-1", email: "client@example.com" },
    });
    isAdminSession.mockReturnValue(false);
    getClientProfile.mockResolvedValue({ onboardingComplete: false });

    await expect(getAuthenticatedLandingHref()).resolves.toBe(
      CLIENT_ONBOARDING_HREF,
    );

    expect(bootstrapClientAfterAuth).toHaveBeenCalledWith({
      userId: "client-1",
      email: "client@example.com",
    });
  });
});
