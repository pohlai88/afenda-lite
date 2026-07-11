/** P2-AC-02 — client-side order list pagination (UI only). */

export const FFT_ORDERS_PAGE_SIZE = 20;

export type TradePageSlice<T> = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
  items: T[];
};

/** 1-based page; clamps into range. Empty list → page 1, pageCount 1, items []. */
export function paginateItems<T>(
  items: readonly T[],
  page: number,
  pageSize: number = FFT_ORDERS_PAGE_SIZE,
): TradePageSlice<T> {
  const size = Math.max(1, Math.floor(pageSize));
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (safePage - 1) * size;
  return {
    page: safePage,
    pageSize: size,
    pageCount,
    total,
    items: items.slice(start, start + size),
  };
}
