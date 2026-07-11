import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/modules/platform/routing/portal-session-routing", () => ({
  getAuthenticatedLandingHref: vi.fn(),
}));

vi.mock("@/modules/platform/playground-embed", () => ({
  resolvePlaygroundEmbedActive: vi.fn(),
}));

import { redirect } from "next/navigation";
import {
  CLIENT_CHECK_EMAIL_REASON,
  CLIENT_INVITE_EXPIRED_REASON,
  CLIENT_LOGIN_REQUIRED_REASON,
  clientSignInAuthHref,
  clientSignInEntryHref,
  clientSignUpAuthHref,
  redirectClientSignInEntry,
  resolveClientAuthReasonNotice,
  runClientSignInEntryPage,
} from "@/features/auth/entry/client-sign-in-entry";
import {
  AUTH_SIGN_IN_HREF,
  AUTH_SIGN_UP_HREF,
  CLIENT_SIGN_IN_ENTRY_HREF,
} from "@/modules/platform/routing/portal-routes";
import { getAuthenticatedLandingHref } from "@/modules/platform/routing/portal-session-routing";
import { resolvePlaygroundEmbedActive } from "@/modules/platform/playground-embed";

const mockRedirect = vi.mocked(redirect);
const mockLanding = vi.mocked(getAuthenticatedLandingHref);
const mockResolveEmbed = vi.mocked(resolvePlaygroundEmbedActive);

describe("client sign-in entry href builders", () => {
  it("builds named client login entry with optional reason", () => {
    expect(clientSignInEntryHref()).toBe(CLIENT_SIGN_IN_ENTRY_HREF);
    expect(clientSignInEntryHref(CLIENT_LOGIN_REQUIRED_REASON)).toBe(
      `${CLIENT_SIGN_IN_ENTRY_HREF}?reason=login-required`,
    );
  });

  it("builds Neon Auth href with reason and returnTo", () => {
    expect(clientSignInAuthHref()).toBe(AUTH_SIGN_IN_HREF);
    expect(clientSignInAuthHref(CLIENT_CHECK_EMAIL_REASON)).toBe(
      `${AUTH_SIGN_IN_HREF}?reason=check-email`,
    );
    expect(clientSignInAuthHref(undefined, "/client/onboarding")).toBe(
      `${AUTH_SIGN_IN_HREF}?returnTo=%2Fclient%2Fonboarding`,
    );
  });

  it("rejects unsafe returnTo on client auth href", () => {
    expect(clientSignInAuthHref(undefined, "//evil.example")).toBe(AUTH_SIGN_IN_HREF);
  });

  it("builds sign-up href with the same safe query policy", () => {
    expect(clientSignUpAuthHref()).toBe(AUTH_SIGN_UP_HREF);
    expect(clientSignUpAuthHref(undefined, "/client/onboarding")).toBe(
      `${AUTH_SIGN_UP_HREF}?returnTo=%2Fclient%2Fonboarding`,
    );
    expect(clientSignUpAuthHref(undefined, "//evil.example")).toBe(
      AUTH_SIGN_UP_HREF,
    );
  });

  it("resolves client auth reason notices", () => {
    expect(resolveClientAuthReasonNotice(CLIENT_LOGIN_REQUIRED_REASON)).toBeTruthy();
    expect(resolveClientAuthReasonNotice(CLIENT_INVITE_EXPIRED_REASON)).toBeTruthy();
    expect(resolveClientAuthReasonNotice("unknown")).toBeNull();
  });
});

describe("redirectClientSignInEntry / runClientSignInEntryPage", () => {
  beforeEach(() => {
    mockRedirect.mockReset();
    mockLanding.mockReset();
    mockResolveEmbed.mockReset();
    mockRedirect.mockImplementation((href: string) => {
      throw new Error(`REDIRECT:${href}`);
    });
  });

  it("forwards playground embed to Neon sign-in with embed=1", async () => {
    mockLanding.mockResolvedValue(null);

    await expect(redirectClientSignInEntry({ embed: true })).rejects.toThrow(
      `REDIRECT:${AUTH_SIGN_IN_HREF}?embed=1`,
    );
  });

  it("preserves reason when embedding to Neon sign-in", async () => {
    mockLanding.mockResolvedValue(null);

    await expect(
      redirectClientSignInEntry({
        embed: true,
        reason: CLIENT_LOGIN_REQUIRED_REASON,
      }),
    ).rejects.toThrow(
      `REDIRECT:${AUTH_SIGN_IN_HREF}?reason=login-required&embed=1`,
    );
  });

  it("sends authenticated non-embed users to their landing", async () => {
    mockLanding.mockResolvedValue("/dashboard");

    await expect(redirectClientSignInEntry({ embed: false })).rejects.toThrow(
      "REDIRECT:/dashboard",
    );
  });

  it("runs the page handler with embed resolved from searchParams", async () => {
    mockResolveEmbed.mockResolvedValue(true);
    mockLanding.mockResolvedValue(null);

    await expect(
      runClientSignInEntryPage({
        searchParams: Promise.resolve({ embed: "1" }),
      }),
    ).rejects.toThrow(`REDIRECT:${AUTH_SIGN_IN_HREF}?embed=1`);

    expect(mockResolveEmbed).toHaveBeenCalledWith({ embed: "1" });
  });
});
