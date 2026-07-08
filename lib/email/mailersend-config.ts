import "server-only";

import { getServerEnv } from "@/lib/env/server";
import { portalCopy } from "@/lib/portal-copy";

export function isMailerSendConfigured() {
  const env = getServerEnv();
  return Boolean(env.MAILERSEND_API_KEY && env.MAILERSEND_FROM_EMAIL);
}

export function getMailerSendConfig() {
  const env = getServerEnv();
  const apiKey = env.MAILERSEND_API_KEY;
  const fromEmail = env.MAILERSEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    return null;
  }

  return {
    apiKey,
    fromEmail,
    fromName: env.MAILERSEND_FROM_NAME ?? portalCopy.invite.sender,
  };
}
