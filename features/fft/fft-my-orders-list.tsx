"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TradeCompleteOrderForm } from "@/features/fft/fft-allocation-controls";
import { TradeEmptyState } from "@/features/fft/fft-form-feedback";
import { TradeListPagination } from "@/features/fft/fft-list-pagination";
import {
  paginateItems,
  FFT_ORDERS_PAGE_SIZE,
} from "@/features/fft/fft-orders-pagination-model";
import { FftTransferRequestForm } from "@/features/fft/fft-transfer-forms";
import type { FftOrder } from "@/modules/fft/domain/types";
import { fftHref, type FftLocale } from "@/modules/fft/i18n/fft-i18n";

/** Serializable order row for my-orders (RSC → client). */
export type TradeMyOrderListItem = {
  id: string;
  eventId: string;
  orderNumber: string;
  customerName: string;
  status: FftOrder["status"];
  requestedQuantity: number;
  confirmedQuantity: number | null;
  fulfilledQuantity: number | null;
  transferStatus: FftOrder["transferStatus"];
  depositStatus: FftOrder["depositStatus"];
};

function toOrderForForms(row: TradeMyOrderListItem): FftOrder {
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
  orders: FftOrder[],
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

export function FftMyOrdersList({
  orders,
  locale,
}: {
  orders: TradeMyOrderListItem[];
  locale: FftLocale;
}) {
  const [page, setPage] = useState(1);
  const slice = useMemo(
    () => paginateItems(orders, page, FFT_ORDERS_PAGE_SIZE),
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
    <div className="space-y-4" data-testid="fft-my-orders-list">
      <ul className="space-y-4">
        {slice.items.map((row) => {
          const order = toOrderForForms(row);
          return (
            <li
              key={row.id}
              className="space-y-2 rounded-lg border p-4"
              data-testid="fft-my-order-row"
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
                  href={fftHref(`/events/${row.eventId}/order`)}
                >
                  Event order
                </Link>
              </div>
              <FftTransferRequestForm locale={locale} order={order} />
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
