const ANONYMOUS_SENDER = "Feedback Team";

export function buildAnonymousInviteUrl(token: string, origin?: string) {
  const base = origin ?? "";
  return `${base}/f/${token}`;
}

export function buildAnonymousEmailMessage(inviteUrl: string) {
  const subject = "Anonymous feedback request";
  const body = [
    "Hello,",
    "",
    "You are invited to share feedback anonymously.",
    "We do not collect your name, email, or contact details.",
    "",
    inviteUrl,
    "",
    `— ${ANONYMOUS_SENDER}`,
  ].join("\n");

  return { subject, body, combined: `Subject: ${subject}\n\n${body}` };
}

export function buildAnonymousWhatsAppMessage(inviteUrl: string) {
  return [
    "Anonymous feedback request",
    "",
    "Your identity is not recorded. Please share your honest feedback:",
    inviteUrl,
  ].join("\n");
}

export function buildAnonymousQrCodeUrl(inviteUrl: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}`;
}
