import type { HotSalesEvent, HotSalesOrder } from "@/lib/domain/trade/types";

export function canTransferOrder(
  order: Pick<HotSalesOrder, "status" | "transferStatus">,
  event: Pick<HotSalesEvent, "transferAllowed">,
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
  event: Pick<HotSalesEvent, "depositRequired">,
  submitted?: HotSalesDepositStatusInput,
): "not_required" | "pending" | "paid" | "waived" {
  if (!event.depositRequired) {
    return "not_required";
  }
  return submitted ?? "pending";
}

type HotSalesDepositStatusInput = "pending" | "paid" | "waived";
