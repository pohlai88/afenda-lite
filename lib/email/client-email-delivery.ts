import "server-only";

import { getServerEnv } from "@/lib/env/server";
import { getMailerSendConfig } from "@/lib/email/mailersend-config";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";

/** Neon Auth shared SMTP sender when using the managed email provider. */
export const NEON_AUTH_SHARED_SENDER_EMAIL = "auth@mail.myneon.app";

export type ClientEmailDeliveryStatus =
  | {
      enabled: true;
      provider: "neon-auth-organization";
      fromName: string;
      fromEmail: string;
    }
  | {
      enabled: true;
      provider: "mailersend";
      fromName: string;
      fromEmail: string;
    }
  | { enabled: false };

export function isNeonAuthEmailConfigured() {
  const env = getServerEnv();
  return Boolean(env.NEON_AUTH_BASE_URL);
}

export function isClientEmailDeliveryEnabled() {
  return isNeonAuthEmailConfigured();
}

export function getClientEmailDeliveryStatus(): ClientEmailDeliveryStatus {
  if (isNeonAuthEmailConfigured()) {
    return {
      enabled: true,
      provider: "neon-auth-organization",
      fromName: portalCopy.invite.sender || PORTAL_NAME,
      fromEmail: NEON_AUTH_SHARED_SENDER_EMAIL,
    };
  }

  const mailerSend = getMailerSendConfig();
  if (mailerSend) {
    return {
      enabled: true,
      provider: "mailersend",
      fromName: mailerSend.fromName,
      fromEmail: mailerSend.fromEmail,
    };
  }

  return { enabled: false };
}
