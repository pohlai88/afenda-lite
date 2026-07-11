import type { FftEvent, FftOrder } from "@/modules/fft/domain/types";

export function canTransferOrder(
  order: Pick<FftOrder, "status" | "transferStatus">,
  event: Pick<FftEvent, "transferAllowed">,
): { allowed: boolean; reason?: string } {
  if (!event.transferAllowed) {
    return { allowed: false, reason: "transfer_not_allowed" };
  }

  const transferableStatuses = new Set(["confirmed", "partial", "full"]);
  if (!transferableStatuses.has(order.status)) {
    return { allowed: false, reason: "order_not_transferable" };
  }

  if (order.transferStatus === "requested") {
    return { allowed: false, reason: "transfer_pending" };
  }

  return { allowed: true };
}

export function resolveDepositStatusForEvent(
  event: Pick<FftEvent, "depositRequired">,
  submitted?: FftDepositStatusInput,
): "not_required" | "pending" | "paid" | "waived" {
  if (!event.depositRequired) {
    return "not_required";
  }
  return submitted ?? "pending";
}

type FftDepositStatusInput = "pending" | "paid" | "waived";
