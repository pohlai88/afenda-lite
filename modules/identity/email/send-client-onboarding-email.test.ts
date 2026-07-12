import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("@/modules/identity/portal-organization", () => ({
  ensurePortalOrganization: vi.fn(),
  inviteClientOrganizationMember: vi.fn(),
}));

import {
  ensurePortalOrganization,
  inviteClientOrganizationMember,
} from "@/modules/identity/portal-organization";
import { sendClientOnboardingEmail } from "@/modules/identity/email/send-client-onboarding-email";

const mockedEnsureOrg = vi.mocked(ensurePortalOrganization);
const mockedInvite = vi.mocked(inviteClientOrganizationMember);

afterEach(() => {
  vi.clearAllMocks();
});

describe("sendClientOnboardingEmail", () => {
  it("invites the member via Neon Auth organization API", async () => {
    mockedEnsureOrg.mockResolvedValue({
      id: "org-1",
      name: "afenda-lite",
      slug: "afenda-lite",
    });
    mockedInvite.mockResolvedValue({ ok: true, data: { id: "inv-1" } });

    await expect(
      sendClientOnboardingEmail({ toEmail: "client@example.com" }),
    ).resolves.toEqual({ ok: true, provider: "neon-auth-organization" });

    expect(mockedInvite).toHaveBeenCalledWith({
      email: "client@example.com",
      organizationId: "org-1",
    });
  });

  it("returns invite API errors with status", async () => {
    mockedEnsureOrg.mockResolvedValue({
      id: "org-1",
      name: "afenda-lite",
      slug: "afenda-lite",
    });
    mockedInvite.mockResolvedValue({
      ok: false,
      error: "Unauthorized",
      status: 401,
    });

    await expect(
      sendClientOnboardingEmail({ toEmail: "client@example.com" }),
    ).resolves.toEqual({
      ok: false,
      error: "Unauthorized",
      status: 401,
    });
  });

  it("returns organization bootstrap failures", async () => {
    mockedEnsureOrg.mockRejectedValue(new Error("Could not load organizations"));

    await expect(
      sendClientOnboardingEmail({ toEmail: "client@example.com" }),
    ).resolves.toEqual({
      ok: false,
      error: "Could not load organizations",
    });
  });
});
