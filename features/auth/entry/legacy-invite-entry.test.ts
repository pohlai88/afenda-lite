import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/modules/declarations/domain/clients", () => ({
  getClientInvitationByToken: vi.fn(),
}));

vi.mock("@/modules/platform/routing/portal-session-routing", () => ({
  getAuthenticatedLandingHref: vi.fn(),
}));

vi.mock("@/modules/platform/playground-embed", () => ({
  appendPlaygroundEmbedQuery: vi.fn((href: string) => href),
  resolvePlaygroundEmbedActive: vi.fn(),
}));

import {
  resolveLegacyInviteRedirectReason,
  type LegacyInviteRedirectReason,
} from "@/features/auth/entry/legacy-invite-entry";
import type { ClientInvitation } from "@/modules/declarations/domain/clients";
import {
  CLIENT_CHECK_EMAIL_REASON,
  CLIENT_INVITE_EXPIRED_REASON,
  CLIENT_INVITE_INVALID_REASON,
  CLIENT_LOGIN_REQUIRED_REASON,
} from "@/modules/identity/auth/auth-entry-params";

function invitation(
  status: ClientInvitation["status"],
): ClientInvitation {
  return {
    id: "inv-1",
    email: "client@example.com",
    fullName: "Test Client",
    token: "tok",
    invitedBy: "admin-1",
    status,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    expiresAt: new Date("2026-12-31T00:00:00.000Z"),
  };
}

describe("resolveLegacyInviteRedirectReason", () => {
  it.each([
    [null, CLIENT_INVITE_INVALID_REASON],
    [invitation("expired"), CLIENT_INVITE_EXPIRED_REASON],
    [invitation("accepted"), CLIENT_LOGIN_REQUIRED_REASON],
    [invitation("pending"), CLIENT_CHECK_EMAIL_REASON],
  ] as const)(
    "maps invitation → %s",
    (row, expected: LegacyInviteRedirectReason) => {
      expect(resolveLegacyInviteRedirectReason(row)).toBe(expected);
    },
  );
});
