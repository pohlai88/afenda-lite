import type { TradeNotificationPayload } from "@/lib/domain/trade/notification-types";

/** Stable idempotency key per ADR-003 — no silent duplicate sends. */
export function buildNotificationIdempotencyKey(input: {
  eventKey: string;
  entityId: string;
  recipientEmail: string;
  version?: string;
}): string {
  const email = input.recipientEmail.trim().toLowerCase();
  const version = input.version ?? "v1";
  return `${input.eventKey}:${input.entityId}:${email}:${version}`;
}

/** Replace {{var}} placeholders in template strings. */
export function renderNotificationTemplate(
  template: string,
  vars: TradeNotificationPayload,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key];
    return value != null ? String(value) : "";
  });
}

/** Minimal markdown → HTML for transactional mail. */
export function markdownToHtml(markdown: string): string {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div>${escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>")}</div>`;
}
