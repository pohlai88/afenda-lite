import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isAdminSession: vi.fn(),
  toAdminAuthenticatedSession: vi.fn(),
  toClientAuthenticatedSession: vi.fn(),
  toPreviewClientSession: vi.fn(),
  bootstrapClientAfterAuth: vi.fn(),
  getClientProfile: vi.fn(),
  isPlaygroundEmbedRequest: vi.fn(),
  isPlaygroundEnabled: vi.fn(),
  getPreviewClientUser: vi.fn(),
  authSignOut: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("@/modules/identity/auth/get-session", () => ({
  getAuthSession: mocks.getAuthSession,
}));

vi.mock("@/modules/identity/admin", () => ({
  isAdminSession: mocks.isAdminSession,
  toAdminAuthenticatedSession: mocks.toAdminAuthenticatedSession,
  ORG_ACCESS_DENIED_HREF: "/org/login?reason=access-denied",
}));

vi.mock("@/modules/identity/client-session", () => ({
  toClientAuthenticatedSession: mocks.toClientAuthenticatedSession,
  toPreviewClientSession: mocks.toPreviewClientSession,
  CLIENT_ONBOARDING_HREF: "/client/onboarding",
}));

vi.mock("@/modules/identity/auth/bootstrap-client-invite", () => ({
  bootstrapClientAfterAuth: mocks.bootstrapClientAfterAuth,
}));

vi.mock("@/modules/identity/domain/client-profile", () => ({
  getClientProfile: mocks.getClientProfile,
}));

vi.mock("@/modules/platform/playground-embed", () => ({
  isPlaygroundEmbedRequest: mocks.isPlaygroundEmbedRequest,
  isPlaygroundEnabled: mocks.isPlaygroundEnabled,
}));

vi.mock("@/modules/identity/preview-client", () => ({
  getPreviewClientUser: mocks.getPreviewClientUser,
  clientPreviewUnavailableHref: () => "/client/preview-unavailable",
}));

vi.mock("@/modules/identity/auth/server", () => ({
  auth: { signOut: mocks.authSignOut },
}));

vi.mock("@/modules/platform/audit", () => ({
  recordAuditEvent: mocks.recordAuditEvent,
}));

vi.mock("@/modules/platform/copy/portal-copy", () => ({
  portalCopy: {
    orgSignIn: { accessDenied: "Access denied." },
  },
}));

import {
  guardClientSession,
  rejectNonOrganizationAdminSignIn,
} from "@/modules/identity/auth/session";

const clientSession = {
  user: { id: "client-1", email: "client@example.com" },
};

describe("guardClientSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPlaygroundEmbedRequest.mockResolvedValue(false);
    mocks.isPlaygroundEnabled.mockReturnValue(false);
    mocks.bootstrapClientAfterAuth.mockResolvedValue(undefined);
    mocks.getClientProfile.mockResolvedValue({ onboardingComplete: true });
    mocks.isAdminSession.mockReturnValue(false);
  });

  it("denies unauthenticated callers", async () => {
    mocks.getAuthSession.mockResolvedValue(null);
    mocks.toClientAuthenticatedSession.mockReturnValue(null);

    await expect(guardClientSession()).resolves.toEqual({
      allowed: false,
      reason: "unauthenticated",
    });
  });

  it("denies organization-admin sessions on client routes", async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: { id: "op-1", email: "admin@example.com", role: "admin" },
    });
    mocks.toClientAuthenticatedSession.mockReturnValue(clientSession);
    mocks.isAdminSession.mockReturnValue(true);

    await expect(guardClientSession()).resolves.toEqual({
      allowed: false,
      reason: "organizationAdmin",
    });
  });

  it("bootstraps client profile and allows onboarded clients", async () => {
    mocks.getAuthSession.mockResolvedValue(clientSession);
    mocks.toClientAuthenticatedSession.mockReturnValue(clientSession);

    await expect(guardClientSession()).resolves.toEqual({
      allowed: true,
      session: clientSession,
    });

    expect(mocks.bootstrapClientAfterAuth).toHaveBeenCalledWith({
      userId: "client-1",
      email: "client@example.com",
    });
  });

  it("denies clients with incomplete onboarding when required", async () => {
    mocks.getAuthSession.mockResolvedValue(clientSession);
    mocks.toClientAuthenticatedSession.mockReturnValue(clientSession);
    mocks.getClientProfile.mockResolvedValue({ onboardingComplete: false });

    await expect(guardClientSession({ requireOnboarding: true })).resolves.toEqual({
      allowed: false,
      reason: "onboarding_incomplete",
    });
  });

  it("allows playground preview client in embed mode", async () => {
    mocks.isPlaygroundEmbedRequest.mockResolvedValue(true);
    mocks.isPlaygroundEnabled.mockReturnValue(true);
    mocks.getAuthSession.mockResolvedValue({
      user: { id: "op-1", email: "admin@example.com", role: "admin" },
    });
    mocks.isAdminSession.mockReturnValue(true);
    mocks.getPreviewClientUser.mockResolvedValue({
      id: "preview-1",
      email: "preview@example.com",
      name: "Preview Client",
    });
    mocks.toPreviewClientSession.mockReturnValue({
      user: { id: "preview-1", email: "preview@example.com" },
    });
    mocks.getClientProfile.mockResolvedValue({ onboardingComplete: true });

    await expect(guardClientSession({ requireOnboarding: true })).resolves.toEqual({
      allowed: true,
      session: { user: { id: "preview-1", email: "preview@example.com" } },
    });
  });

  it("denies preview embed when preview client is not configured", async () => {
    mocks.isPlaygroundEmbedRequest.mockResolvedValue(true);
    mocks.isPlaygroundEnabled.mockReturnValue(true);
    mocks.getAuthSession.mockResolvedValue({
      user: { id: "op-1", email: "admin@example.com", role: "admin" },
    });
    mocks.isAdminSession.mockReturnValue(true);
    mocks.getPreviewClientUser.mockResolvedValue(null);

    await expect(guardClientSession()).resolves.toEqual({
      allowed: false,
      reason: "preview_unavailable",
    });
  });
});

describe("rejectNonOrganizationAdminSignIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authSignOut.mockResolvedValue(undefined);
    mocks.recordAuditEvent.mockResolvedValue(undefined);
  });

  it("returns null when the signed-in user is an operator", async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: { email: "admin@example.com", role: "admin" },
    });
    mocks.isAdminSession.mockReturnValue(true);

    await expect(rejectNonOrganizationAdminSignIn("admin@example.com")).resolves.toBeNull();
    expect(mocks.authSignOut).not.toHaveBeenCalled();
  });

  it("signs out and returns access denied for non–organization-admins", async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: { email: "client@example.com" },
    });
    mocks.isAdminSession.mockReturnValue(false);

    await expect(rejectNonOrganizationAdminSignIn("client@example.com")).resolves.toEqual({
      error: "Access denied.",
    });

    expect(mocks.authSignOut).toHaveBeenCalledTimes(1);
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "auth.sign_in_failed",
        metadata: { surface: "org", reason: "access_denied" },
      }),
    );
  });
});
