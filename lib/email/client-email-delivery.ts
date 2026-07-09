import "server-only";

import { getServerEnv } from "@/lib/env/server";
import { portalCopy } from "@/lib/copy/portal-copy";

/**
 * Operator client registration email — Neon Auth organization invitations only.
 *
 * - Enabled when `NEON_AUTH_BASE_URL` is set (shared provider: auth@mail.myneon.app).
 * - Not MailerSend / custom SMTP (see AGENTS.md; MailerSend keys are stale in env manifest).
 * - Send path: `sendClientOnboardingEmail` → `inviteClientOrganizationMember`.
 */
export const NEON_AUTH_SHARED_SENDER_EMAIL = "auth@mail.myneon.app";

export type ClientEmailDeliveryStatus =
  | {
      enabled: true;
      provider: "neon-auth-organization";
      fromName: string;
      fromEmail: string;
    }
  | { enabled: false };

function isNeonAuthEmailConfigured() {
  return Boolean(getServerEnv().NEON_AUTH_BASE_URL);
}

export function isClientEmailDeliveryEnabled() {
  return isNeonAuthEmailConfigured();
}

export function getClientEmailDeliveryStatus(): ClientEmailDeliveryStatus {
  if (!isNeonAuthEmailConfigured()) {
    return { enabled: false };
  }

  return {
    enabled: true,
    provider: "neon-auth-organization",
    fromName: portalCopy.invite.sender,
    fromEmail: NEON_AUTH_SHARED_SENDER_EMAIL,
  };
}
