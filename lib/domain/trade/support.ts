import type { HotSalesEvent, HotSalesOrder, HotSalesProduct } from "@/lib/domain/trade/types";

export function getSupportRate(
  product: HotSalesProduct,
  event: HotSalesEvent,
): number {
  return (
    product.supportAmountPerUnit ??
    event.supportAmountPerUnit ??
    0
  );
}

export function calculateEstimatedSupport(
  confirmedQuantity: number | null,
  supportRate: number,
): number | null {
  if (confirmedQuantity === null || confirmedQuantity === undefined) {
    return null;
  }
  return confirmedQuantity * supportRate;
}

export function calculateFinalSupport(
  fulfilledQuantity: number | null,
  supportRate: number,
): number | null {
  if (fulfilledQuantity === null || fulfilledQuantity === undefined) {
    return null;
  }
  return fulfilledQuantity * supportRate;
}

export function canCompleteOrder(
  order: Pick<HotSalesOrder, "fulfilledQuantity" | "status">,
): { allowed: boolean; reason?: string } {
  if (
    order.fulfilledQuantity === null ||
    order.fulfilledQuantity === undefined ||
    Number.isNaN(order.fulfilledQuantity)
  ) {
    return { allowed: false, reason: "fulfilled_quantity_required" };
  }
  if (order.fulfilledQuantity < 0) {
    return { allowed: false, reason: "negative_fulfilled_quantity" };
  }
  if (order.status === "cancelled") {
    return { allowed: false, reason: "order_cancelled" };
  }
  return { allowed: true };
}

export function calculateSupportForOrder(
  order: Pick<HotSalesOrder, "confirmedQuantity" | "fulfilledQuantity" | "status">,
  product: HotSalesProduct,
  event: HotSalesEvent,
): { estimatedSupport: number | null; finalSupport: number | null } {
  const rate = getSupportRate(product, event);
  const estimatedSupport = calculateEstimatedSupport(order.confirmedQuantity, rate);
  const finalSupport =
    order.status === "completed"
      ? calculateFinalSupport(order.fulfilledQuantity, rate)
      : calculateFinalSupport(order.fulfilledQuantity, rate);

  return { estimatedSupport, finalSupport };
}
