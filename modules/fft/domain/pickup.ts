export const PICKUP_ASSIGNMENT_STATUSES = [
  "pending_schedule",
  "scheduled",
  "ready_for_pickup",
  "partially_picked_up",
  "picked_up",
  "no_show",
  "cancelled",
  "exception",
] as const;

export type PickupAssignmentStatus = (typeof PICKUP_ASSIGNMENT_STATUSES)[number];

export const PICKUP_EXCEPTION_TYPES = [
  "no_show",
  "partial",
  "cancel",
  "override",
] as const;

export type PickupExceptionType = (typeof PICKUP_EXCEPTION_TYPES)[number];

const TERMINAL_PICKUP = new Set<PickupAssignmentStatus>([
  "picked_up",
  "no_show",
  "cancelled",
]);

export function computeFulfilledQuantity(quantities: number[]): number {
  return quantities.reduce((sum, n) => sum + n, 0);
}

export function derivePickupAssignmentStatus(input: {
  totalFulfilled: number;
  confirmedQuantity: number | null;
  hasNoShowException: boolean;
  hasCancelException: boolean;
  hasOverrideException: boolean;
  scheduledWindowId: string | null;
}): PickupAssignmentStatus {
  if (input.hasCancelException) return "cancelled";
  if (input.hasNoShowException) return "no_show";
  if (input.hasOverrideException) return "exception";

  const confirmed = input.confirmedQuantity ?? 0;
  if (input.totalFulfilled > 0) {
    if (confirmed > 0 && input.totalFulfilled >= confirmed) return "picked_up";
    return "partially_picked_up";
  }
  if (input.scheduledWindowId) return "scheduled";
  return "pending_schedule";
}

/** Map assignment status to order.pickup_status projection. */
export function projectPickupStatus(status: PickupAssignmentStatus): string {
  switch (status) {
    case "pending_schedule":
      return "pending_schedule";
    case "scheduled":
      return "scheduled";
    case "ready_for_pickup":
      return "ready_for_pickup";
    case "partially_picked_up":
      return "partially_picked_up";
    case "picked_up":
      return "picked_up";
    case "no_show":
      return "no_show";
    case "cancelled":
      return "cancelled";
    case "exception":
      return "exception";
    default:
      return "pending";
  }
}

export function canMutateAfterPickedUp(currentStatus: PickupAssignmentStatus): boolean {
  return !TERMINAL_PICKUP.has(currentStatus);
}

export function validatePickupException(input: {
  exceptionType: PickupExceptionType;
  reason?: string;
}): { valid: boolean; error?: string } {
  if (!input.reason?.trim()) {
    return { valid: false, error: "reason_required" };
  }
  return { valid: true };
}

export function canRecordFulfillment(input: {
  assignmentStatus: PickupAssignmentStatus;
  quantity: number;
  allowOverride?: boolean;
}): { allowed: boolean; reason?: string } {
  if (input.quantity <= 0) {
    return { allowed: false, reason: "invalid_quantity" };
  }
  if (input.allowOverride) return { allowed: true };
  if (
    input.assignmentStatus === "picked_up" ||
    input.assignmentStatus === "no_show" ||
    input.assignmentStatus === "cancelled"
  ) {
    return { allowed: false, reason: "terminal_status_requires_override" };
  }
  return { allowed: true };
}
