import "server-only";

import { EmailParams, MailerSend, Recipient, Sender } from "mailersend";

import { getMailerSendConfig } from "@/lib/email/mailersend-config";
import { portalCopy } from "@/lib/portal-copy";

function textToHtml(text: string) {
  const escaped = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  return `<pre style="font-family: ui-sans-serif, system-ui, sans-serif; white-space: pre-wrap; line-height: 1.5;">${escaped}</pre>`;
}

export async function sendClientAccessEmail(input: {
  toEmail: string;
  toName: string;
  text: string;
}) {
  return sendClientAccessEmailViaMailerSend(input);
}

export async function sendClientAccessEmailViaMailerSend(input: {
  toEmail: string;
  toName: string;
  text: string;
}) {
  const config = getMailerSendConfig();
  if (!config) {
    return { ok: false as const, error: "MailerSend is not configured." };
  }

  const mailerSend = new MailerSend({ apiKey: config.apiKey });
  const sentFrom = new Sender(config.fromEmail, config.fromName);
  const recipients = [new Recipient(input.toEmail, input.toName)];

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject(portalCopy.clientAccess.emailSubject)
    .setText(input.text)
    .setHtml(textToHtml(input.text));

  try {
    await mailerSend.email.send(emailParams);
    return { ok: true as const };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "MailerSend request failed.";
    return { ok: false as const, error: message };
  }
}
