import type { HotSalesEvent, HotSalesOrder, HotSalesProduct } from "@/lib/domain/trade/types";

export type EventSummary = {
  eventName: string;
  eventCode: string;
  status: string;
  opensAt: string;
  closesAt: string;
  productCount: number;
  orderCount: number;
  totalRequested: number;
  totalConfirmed: number;
  totalFulfilled: number;
  totalEstimatedSupport: number;
  totalFinalSupport: number;
  remainingSupply: number | null;
};

export function buildEventSummary(
  event: HotSalesEvent,
  products: HotSalesProduct[],
  orders: HotSalesOrder[],
): EventSummary {
  const totalRequested = orders.reduce((s, o) => s + o.requestedQuantity, 0);
  const totalConfirmed = orders.reduce(
    (s, o) => s + (o.confirmedQuantity ?? 0),
    0,
  );
  const totalFulfilled = orders.reduce(
    (s, o) => s + (o.fulfilledQuantity ?? 0),
    0,
  );
  const totalEstimatedSupport = orders.reduce(
    (s, o) => s + (o.estimatedSupport ?? 0),
    0,
  );
  const totalFinalSupport = orders.reduce(
    (s, o) => s + (o.finalSupport ?? 0),
    0,
  );

  const finalSupply = products.reduce(
    (s, p) => s + (p.finalConfirmedQuantity ?? 0),
    0,
  );
  const hasFinal = products.some((p) => p.finalConfirmedQuantity != null);

  return {
    eventName: event.eventName,
    eventCode: event.eventCode,
    status: event.status,
    opensAt: event.opensAt.toISOString(),
    closesAt: event.closesAt.toISOString(),
    productCount: products.length,
    orderCount: orders.length,
    totalRequested,
    totalConfirmed,
    totalFulfilled,
    totalEstimatedSupport,
    totalFinalSupport,
    remainingSupply: hasFinal ? finalSupply - totalConfirmed : null,
  };
}

export function eventSummaryToCsv(summary: EventSummary): string {
  const rows: Array<[string, string | number]> = [
    ["event_name", summary.eventName],
    ["event_code", summary.eventCode],
    ["status", summary.status],
    ["opens_at", summary.opensAt],
    ["closes_at", summary.closesAt],
    ["product_count", summary.productCount],
    ["order_count", summary.orderCount],
    ["total_requested", summary.totalRequested],
    ["total_confirmed", summary.totalConfirmed],
    ["total_fulfilled", summary.totalFulfilled],
    ["total_estimated_support", summary.totalEstimatedSupport],
    ["total_final_support", summary.totalFinalSupport],
    ["remaining_supply", summary.remainingSupply ?? ""],
  ];
  return ["metric,value", ...rows.map(([k, v]) => `${k},${JSON.stringify(String(v))}`)].join(
    "\n",
  );
}

export function allocationToCsv(orders: HotSalesOrder[]): string {
  const headers = [
    "order_number",
    "customer_name",
    "priority_rank",
    "registered_at",
    "requested_quantity",
    "confirmed_quantity",
    "fulfilled_quantity",
    "deposit_status",
    "status",
    "estimated_support",
    "allocation_run_id",
  ];
  const lines = [headers.join(",")];
  for (const o of orders) {
    lines.push(
      [
        o.orderNumber,
        `"${o.customerName.replace(/"/g, '""')}"`,
        o.priorityRank,
        o.registeredAt.toISOString(),
        o.requestedQuantity,
        o.confirmedQuantity ?? "",
        o.fulfilledQuantity ?? "",
        o.depositStatus,
        o.status,
        o.estimatedSupport ?? "",
        o.allocationRunId ?? "",
      ].join(","),
    );
  }
  return lines.join("\n");
}
