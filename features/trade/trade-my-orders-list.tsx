"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TradeCompleteOrderForm } from "@/features/trade/trade-allocation-controls";
import { TradeEmptyState } from "@/features/trade/trade-form-feedback";
import { TradeListPagination } from "@/features/trade/trade-list-pagination";
import {
  paginateItems,
  TRADE_ORDERS_PAGE_SIZE,
} from "@/features/trade/trade-orders-pagination-model";
import { TradeTransferRequestForm } from "@/features/trade/trade-transfer-forms";
import type { HotSalesOrder } from "@/modules/trade/domain/types";
import { tradeHref, type TradeLocale } from "@/modules/trade/i18n/trade";

/** Serializable order row for my-orders (RSC → client). */
export type TradeMyOrderListItem = {
  id: string;
  eventId: string;
  orderNumber: string;
  customerName: string;
  status: HotSalesOrder["status"];
  requestedQuantity: number;
  confirmedQuantity: number | null;
  fulfilledQuantity: number | null;
  transferStatus: HotSalesOrder["transferStatus"];
  depositStatus: HotSalesOrder["depositStatus"];
};

function toOrderForForms(row: TradeMyOrderListItem): HotSalesOrder {
  return {
    id: row.id,
    eventId: row.eventId,
    orderNumber: row.orderNumber,
    salespersonUserId: "",
    salespersonEmail: "",
    customerName: row.customerName,
    customerCode: null,
    priorityRank: 999,
    priorityGroup: null,
    productId: "",
    requestedQuantity: row.requestedQuantity,
    confirmedQuantity: row.confirmedQuantity,
    fulfilledQuantity: row.fulfilledQuantity,
    estimatedSupport: null,
    finalSupport: null,
    registeredAt: new Date(0),
    status: row.status,
    depositStatus: row.depositStatus,
    pickupStatus: "pending",
    transferStatus: row.transferStatus,
    allocationRunId: null,
    attrs: {},
    remarks: null,
  };
}

export function toTradeMyOrderListItems(
  orders: HotSalesOrder[],
): TradeMyOrderListItem[] {
  return orders.map((order) => ({
    id: order.id,
    eventId: order.eventId,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    status: order.status,
    requestedQuantity: order.requestedQuantity,
    confirmedQuantity: order.confirmedQuantity,
    fulfilledQuantity: order.fulfilledQuantity,
    transferStatus: order.transferStatus,
    depositStatus: order.depositStatus,
  }));
}

export function TradeMyOrdersList({
  orders,
  locale,
}: {
  orders: TradeMyOrderListItem[];
  locale: TradeLocale;
}) {
  const [page, setPage] = useState(1);
  const slice = useMemo(
    () => paginateItems(orders, page, TRADE_ORDERS_PAGE_SIZE),
    [orders, page],
  );

  if (orders.length === 0) {
    return (
      <TradeEmptyState
        title="No orders yet"
        description="Submit an order from an open event to see it here."
        testId="trade-my-orders-empty"
      />
    );
  }

  return (
    <div className="space-y-4" data-testid="trade-my-orders-list">
      <ul className="space-y-4">
        {slice.items.map((row) => {
          const order = toOrderForForms(row);
          return (
            <li
              key={row.id}
              className="space-y-2 rounded-lg border p-4"
              data-testid="trade-my-order-row"
              data-order-id={row.id}
              data-status={row.status}
              data-transfer-status={row.transferStatus ?? ""}
              data-customer={row.customerName}
            >
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium">{row.orderNumber}</p>
                  <p className="text-muted-foreground">
                    {row.customerName} · {row.status} · qty {row.requestedQuantity}
                    {row.confirmedQuantity != null
                      ? ` / confirmed ${row.confirmedQuantity}`
                      : ""}
                  </p>
                </div>
                <Link
                  className="underline"
                  href={tradeHref(`/events/${row.eventId}/order`)}
                >
                  Event order
                </Link>
              </div>
              <TradeTransferRequestForm locale={locale} order={order} />
              {row.status !== "completed" && row.status !== "cancelled" ? (
                <TradeCompleteOrderForm
                  locale={locale}
                  orderId={row.id}
                  defaultFulfilledQuantity={
                    row.confirmedQuantity ?? row.requestedQuantity
                  }
                />
              ) : null}
            </li>
          );
        })}
      </ul>
      <TradeListPagination
        page={slice.page}
        pageCount={slice.pageCount}
        total={slice.total}
        pageSize={slice.pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}
