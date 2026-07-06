import { portalCopy } from "@/lib/portal-copy";

const { invite } = portalCopy;

export function buildAnonymousInviteUrl(token: string, origin?: string) {
  const base = origin ?? "";
  return `${base}/f/${token}`;
}

export function buildAnonymousEmailMessage(inviteUrl: string) {
  const subject = invite.emailSubject;
  const body = invite.emailBody(inviteUrl);

  return { subject, body, combined: `Subject: ${subject}\n\n${body}` };
}

export function buildAnonymousWhatsAppMessage(inviteUrl: string) {
  return invite.whatsApp(inviteUrl);
}

export function buildAnonymousQrCodeUrl(inviteUrl: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}`;
}
