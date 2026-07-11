import { describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/modules/platform/routing/portal-session-routing", () => ({
  getAuthenticatedLandingHref: vi.fn(),
}));

import {
  redirectAuthAcceptInvitationToJoin,
  redirectInvitationIdToJoin,
  runClientInvitationJoinPage,
} from "@/features/auth/entry/client-invitation-entry";
import { getAuthenticatedLandingHref } from "@/modules/platform/routing/portal-session-routing";

describe("client invitation entry", () => {
  it("redirects authenticated users without invitationId to their landing", async () => {
    vi.mocked(getAuthenticatedLandingHref).mockResolvedValue("/client/home");
    redirect.mockImplementation(() => {
      throw new Error("redirect");
    });

    await expect(
      runClientInvitationJoinPage({
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("redirect");

    expect(redirect).toHaveBeenCalledWith("/client/home");
  });

  it("does not redirect when invitationId is present", async () => {
    vi.mocked(getAuthenticatedLandingHref).mockResolvedValue("/client/home");
    redirect.mockClear();

    await expect(
      runClientInvitationJoinPage({
        searchParams: Promise.resolve({ invitationId: " neon-invite " }),
      }),
    ).resolves.toEqual({ invitationId: "neon-invite" });

    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects legacy accept-invitation to canonical join url", () => {
    redirect.mockImplementation(() => {
      throw new Error("redirect");
    });

    expect(() => redirectAuthAcceptInvitationToJoin("abc-123")).toThrow("redirect");
    expect(redirect).toHaveBeenCalledWith("/join?invitationId=abc-123");
  });

  it("redirects root invitationId query to join", async () => {
    redirect.mockImplementation(() => {
      throw new Error("redirect");
    });

    await expect(
      redirectInvitationIdToJoin({
        searchParams: Promise.resolve({ invitationId: " invite-1 " }),
      }),
    ).rejects.toThrow("redirect");

    expect(redirect).toHaveBeenCalledWith("/join?invitationId=invite-1");
  });
});
