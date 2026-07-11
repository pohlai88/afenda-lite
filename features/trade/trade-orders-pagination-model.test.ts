import { describe, expect, it } from "vitest";
import {
  paginateItems,
  TRADE_ORDERS_PAGE_SIZE,
} from "@/features/trade/trade-orders-pagination-model";

describe("paginateItems (P2-AC-02)", () => {
  const rows = Array.from({ length: 45 }, (_, i) => ({ id: String(i + 1) }));

  it("uses default page size of 20", () => {
    const slice = paginateItems(rows, 1);
    expect(slice.pageSize).toBe(TRADE_ORDERS_PAGE_SIZE);
    expect(slice.items).toHaveLength(20);
    expect(slice.pageCount).toBe(3);
    expect(slice.total).toBe(45);
  });

  it("returns middle and last pages", () => {
    expect(paginateItems(rows, 2).items.map((r) => r.id)[0]).toBe("21");
    expect(paginateItems(rows, 3).items).toHaveLength(5);
  });

  it("clamps out-of-range pages", () => {
    expect(paginateItems(rows, 0).page).toBe(1);
    expect(paginateItems(rows, 99).page).toBe(3);
  });

  it("handles empty lists", () => {
    const empty = paginateItems([], 3);
    expect(empty).toEqual({
      page: 1,
      pageSize: TRADE_ORDERS_PAGE_SIZE,
      pageCount: 1,
      total: 0,
      items: [],
    });
  });
});
