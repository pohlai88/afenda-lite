import type { FftEvent, FftEventStatus } from "@/modules/fft/domain/types";

const OPEN_STATUSES: FftEventStatus[] = ["open"];

export function isEventOpen(event: Pick<FftEvent, "status">): boolean {
  return OPEN_STATUSES.includes(event.status);
}

export function canSubmitOrder(
  event: Pick<FftEvent, "status" | "opensAt" | "closesAt">,
  now: Date,
): { allowed: boolean; reason?: string } {
  if (!isEventOpen(event)) {
    return { allowed: false, reason: "event_not_open" };
  }

  const ts = now.getTime();
  if (ts < event.opensAt.getTime()) {
    return { allowed: false, reason: "event_not_started" };
  }
  if (ts > event.closesAt.getTime()) {
    return { allowed: false, reason: "event_closed" };
  }

  return { allowed: true };
}

export type EventEditableField =
  | "eventName"
  | "description"
  | "opensAt"
  | "closesAt"
  | "products"
  | "finalConfirmedQuantity"
  | "requiredCustomFields"
  | "supportAmount"
  | "allocationMethod";

export function assertEventFieldEditable(
  event: Pick<FftEvent, "status">,
  field: EventEditableField,
): { allowed: boolean; reason?: string } {
  const { status } = event;

  if (status === "draft" || status === "scheduled") {
    return { allowed: true };
  }

  if (status === "open") {
    switch (field) {
      case "eventName":
      case "description":
      case "finalConfirmedQuantity":
        return { allowed: true };
      case "closesAt":
        return { allowed: true, reason: "admin_override_required" };
      case "products":
        return { allowed: true, reason: "limited_no_delete_with_orders" };
      case "requiredCustomFields":
      case "supportAmount":
      case "allocationMethod":
      case "opensAt":
        return { allowed: false, reason: "locked_while_open" };
      default:
        return { allowed: false, reason: "locked_while_open" };
    }
  }

  if (
    status === "closed" ||
    status === "allocating" ||
    status === "confirmed" ||
    status === "completed"
  ) {
    switch (field) {
      case "eventName":
      case "description":
      case "finalConfirmedQuantity":
        return { allowed: true, reason: "audit_required" };
      default:
        return { allowed: false, reason: "locked_after_close" };
    }
  }

  return { allowed: false, reason: "event_not_editable" };
}

export function canOpenEvent(
  event: Pick<FftEvent, "status" | "opensAt" | "closesAt">,
): { allowed: boolean; reason?: string } {
  if (event.status !== "draft" && event.status !== "scheduled") {
    return { allowed: false, reason: "invalid_status_transition" };
  }
  if (event.closesAt.getTime() <= event.opensAt.getTime()) {
    return { allowed: false, reason: "invalid_window" };
  }
  return { allowed: true };
}

export function canCloseEvent(
  event: Pick<FftEvent, "status">,
): { allowed: boolean; reason?: string } {
  if (event.status !== "open") {
    return { allowed: false, reason: "invalid_status_transition" };
  }
  return { allowed: true };
}

/** Promote scheduled → open once the ordering window has started (G7). */
export function canActivateScheduledEvent(
  event: Pick<FftEvent, "status" | "opensAt">,
  now: Date = new Date(),
): { allowed: boolean; reason?: string } {
  if (event.status !== "scheduled") {
    return { allowed: false, reason: "not_scheduled" };
  }
  if (now.getTime() < event.opensAt.getTime()) {
    return { allowed: false, reason: "window_not_started" };
  }
  return { allowed: true };
}
