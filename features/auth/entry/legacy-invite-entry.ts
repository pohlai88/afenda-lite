import "server-only";

/**
 * S6 legacy client invitation entry (`/invite/[token]`).
 *
 * **Not** S5 secure declaration links (`/f/[token]` → `survey_invite_tokens`).
 * **Not** org join (`/join?invitationId=` → Neon Auth accept-invitation).
 *
 * @see features/auth/entry/secure-link-entry.ts for declaration share tokens (S5)
 * @see docs/architecture/slices/s6-client-identity.md
 */
import type { Metadata } from "next";
import {
  getClientInvitationByToken,
  type ClientInvitation,
} from "@/modules/declarations/domain/clients";
import {
  CLIENT_CHECK_EMAIL_REASON,
  CLIENT_INVITE_EXPIRED_REASON,
  CLIENT_INVITE_INVALID_REASON,
  CLIENT_LOGIN_REQUIRED_REASON,
  redirectClientSignInEntry,
} from "@/features/auth/entry/client-sign-in-entry";
import { PORTAL_NAME, portalCopy } from "@/modules/platform/copy/portal-copy";

export const legacyInvitePageMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.inviteRedirect.title}`,
  description: portalCopy.metadata.inviteRedirect.description,
  robots: { index: false, follow: false },
};

export type LegacyInviteRedirectReason =
  | typeof CLIENT_CHECK_EMAIL_REASON
  | typeof CLIENT_INVITE_EXPIRED_REASON
  | typeof CLIENT_INVITE_INVALID_REASON
  | typeof CLIENT_LOGIN_REQUIRED_REASON;

export function resolveLegacyInviteRedirectReason(
  invitation: ClientInvitation | null,
): LegacyInviteRedirectReason {
  if (!invitation) {
    return CLIENT_INVITE_INVALID_REASON;
  }

  if (invitation.status === "expired") {
    return CLIENT_INVITE_EXPIRED_REASON;
  }

  if (invitation.status === "accepted") {
    return CLIENT_LOGIN_REQUIRED_REASON;
  }

  return CLIENT_CHECK_EMAIL_REASON;
}

/** Legacy `/invite/[token]` — validate token, then session-aware client sign-in dispatch. */
export async function runLegacyInviteTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<never> {
  const { token } = await params;
  const trimmed = token?.trim();
  const invitation = trimmed
    ? await getClientInvitationByToken(trimmed)
    : null;
  const reason = resolveLegacyInviteRedirectReason(invitation);

  return redirectClientSignInEntry({ reason });
}
