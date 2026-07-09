import type {
  AllocationInputOrder,
  AllocationResult,
  AllocationSummary,
  HotSalesProduct,
} from "@/lib/domain/trade/types";

const ALLOCATABLE_STATUSES = new Set([
  "registered",
  "pending_allocation",
  "partial",
  "full",
  "rejected",
]);

export function sortOrdersForAllocation(
  orders: AllocationInputOrder[],
): AllocationInputOrder[] {
  return [...orders].sort((a, b) => {
    if (a.priorityRank !== b.priorityRank) {
      return a.priorityRank - b.priorityRank;
    }
    const timeDiff = a.registeredAt.getTime() - b.registeredAt.getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return a.id.localeCompare(b.id);
  });
}

export function calculateAllocation(
  products: HotSalesProduct[],
  orders: AllocationInputOrder[],
): AllocationSummary {
  const productSupply = new Map<string, number>();
  for (const product of products) {
    const supply = product.finalConfirmedQuantity ?? 0;
    productSupply.set(product.id, supply);
  }

  const results: AllocationResult[] = [];
  let totalRequested = 0;
  let totalAllocated = 0;
  let totalRejected = 0;

  const eligible = orders.filter((o) => ALLOCATABLE_STATUSES.has(o.status));
  const sorted = sortOrdersForAllocation(eligible);

  for (const order of sorted) {
    totalRequested += order.requestedQuantity;
    const remaining = productSupply.get(order.productId) ?? 0;

    if (remaining <= 0) {
      results.push({
        orderId: order.id,
        confirmedQuantity: 0,
        status: "rejected",
      });
      totalRejected += order.requestedQuantity;
      continue;
    }

    if (order.requestedQuantity <= remaining) {
      const qty = order.requestedQuantity;
      productSupply.set(order.productId, remaining - qty);
      results.push({
        orderId: order.id,
        confirmedQuantity: qty,
        status: "full",
      });
      totalAllocated += qty;
      continue;
    }

    const partialQty = remaining;
    productSupply.set(order.productId, 0);
    results.push({
      orderId: order.id,
      confirmedQuantity: partialQty,
      status: "partial",
    });
    totalAllocated += partialQty;
    totalRejected += order.requestedQuantity - partialQty;
  }

  return {
    totalRequested,
    totalAllocated,
    totalRejected,
    results,
  };
}

export function validateManualAllocationQuantity(input: {
  confirmedQuantity: number;
  productFinalSupply: number;
  productAlreadyAllocated: number;
  excludingOrderId?: string;
  otherOrdersAllocatedOnProduct: number;
}): { valid: boolean; reason?: string } {
  const { confirmedQuantity, productFinalSupply, otherOrdersAllocatedOnProduct } =
    input;

  if (confirmedQuantity < 0) {
    return { valid: false, reason: "negative_quantity" };
  }

  const maxAllowed = productFinalSupply - otherOrdersAllocatedOnProduct;
  if (confirmedQuantity > maxAllowed) {
    return { valid: false, reason: "exceeds_supply_cap" };
  }

  return { valid: true };
}
