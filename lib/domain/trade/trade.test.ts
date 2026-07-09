import { describe, expect, it } from "vitest";
import {
  calculateAllocation,
  sortOrdersForAllocation,
  validateManualAllocationQuantity,
} from "@/lib/domain/trade/allocation";
import {
  assertEventFieldEditable,
  canSubmitOrder,
} from "@/lib/domain/trade/events";
import { validateOrderAttrs } from "@/lib/domain/trade/fields";
import type {
  AllocationInputOrder,
  HotSalesFieldDef,
  HotSalesProduct,
} from "@/lib/domain/trade/types";
import { formatCountdown, getCountdownParts } from "@/lib/domain/trade/countdown";
import { buildEventSummary, eventSummaryToCsv } from "@/lib/domain/trade/export";
import { calculateEstimatedSupport, canCompleteOrder } from "@/lib/domain/trade/support";

function makeOrder(
  partial: Partial<AllocationInputOrder> & Pick<AllocationInputOrder, "id">,
): AllocationInputOrder {
  return {
    productId: "p1",
    priorityRank: 999,
    registeredAt: new Date("2026-07-09T10:00:00Z"),
    requestedQuantity: 100,
    status: "registered",
    ...partial,
  };
}

describe("sortOrdersForAllocation", () => {
  it("sorts by priority_rank, registered_at, order_id", () => {
    const orders = [
      makeOrder({
        id: "b",
        priorityRank: 2,
        registeredAt: new Date("2026-07-09T10:00:00Z"),
      }),
      makeOrder({
        id: "a",
        priorityRank: 1,
        registeredAt: new Date("2026-07-09T11:00:00Z"),
      }),
      makeOrder({
        id: "c",
        priorityRank: 2,
        registeredAt: new Date("2026-07-09T09:00:00Z"),
      }),
    ];

    const sorted = sortOrdersForAllocation(orders);
    expect(sorted.map((o) => o.id)).toEqual(["a", "c", "b"]);
  });

  it("uses order_id as tie-breaker when priority and time match", () => {
    const time = new Date("2026-07-09T10:00:00Z");
    const orders = [
      makeOrder({ id: "z", priorityRank: 1, registeredAt: time }),
      makeOrder({ id: "a", priorityRank: 1, registeredAt: time }),
    ];
    expect(sortOrdersForAllocation(orders).map((o) => o.id)).toEqual(["a", "z"]);
  });
});

describe("calculateAllocation", () => {
  const products: HotSalesProduct[] = [
    {
      id: "p1",
      eventId: "e1",
      productName: "Test",
      productCode: null,
      source: null,
      batch: null,
      category: null,
      weight: null,
      unit: "piece",
      tentativeQuantity: 1000,
      finalConfirmedQuantity: 1250,
      allocatedQuantity: 0,
      fulfilledQuantity: 0,
      supportAmountPerUnit: null,
      pickupLocation: null,
      sortOrder: 0,
      attrs: {},
    },
  ];

  it("allocates P1 before P2 and FCFS within group", () => {
    const orders = [
      makeOrder({
        id: "o3",
        priorityRank: 2,
        registeredAt: new Date("2026-07-09T15:10:00Z"),
        requestedQuantity: 700,
      }),
      makeOrder({
        id: "o2",
        priorityRank: 1,
        registeredAt: new Date("2026-07-09T15:20:00Z"),
        requestedQuantity: 500,
      }),
      makeOrder({
        id: "o1",
        priorityRank: 1,
        registeredAt: new Date("2026-07-09T15:05:00Z"),
        requestedQuantity: 300,
      }),
    ];

    const summary = calculateAllocation(products, orders);
    const byId = Object.fromEntries(
      summary.results.map((r) => [r.orderId, r]),
    );

    expect(byId.o1?.confirmedQuantity).toBe(300);
    expect(byId.o1?.status).toBe("full");
    expect(byId.o2?.confirmedQuantity).toBe(500);
    expect(byId.o3?.confirmedQuantity).toBe(450);
    expect(byId.o3?.status).toBe("partial");
    expect(summary.totalAllocated).toBe(1250);
  });
});

describe("canSubmitOrder", () => {
  const base = {
    status: "open" as const,
    opensAt: new Date("2026-07-09T08:00:00Z"),
    closesAt: new Date("2026-07-09T13:30:00Z"),
  };

  it("allows during open window", () => {
    expect(
      canSubmitOrder(base, new Date("2026-07-09T10:00:00Z")).allowed,
    ).toBe(true);
  });

  it("blocks after close", () => {
    expect(
      canSubmitOrder(base, new Date("2026-07-09T14:00:00Z")).allowed,
    ).toBe(false);
  });
});

describe("assertEventFieldEditable", () => {
  it("locks allocation method while open", () => {
    expect(
      assertEventFieldEditable({ status: "open" }, "allocationMethod").allowed,
    ).toBe(false);
  });

  it("locks support amount while open", () => {
    expect(
      assertEventFieldEditable({ status: "open" }, "supportAmount").allowed,
    ).toBe(false);
  });

  it("locks opensAt while open", () => {
    expect(assertEventFieldEditable({ status: "open" }, "opensAt").allowed).toBe(
      false,
    );
  });

  it("allows closesAt override while open with reason flag", () => {
    const result = assertEventFieldEditable({ status: "open" }, "closesAt");
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("admin_override_required");
  });

  it("limits products while open", () => {
    const result = assertEventFieldEditable({ status: "open" }, "products");
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("limited_no_delete_with_orders");
  });

  it("locks products after close", () => {
    expect(
      assertEventFieldEditable({ status: "closed" }, "products").allowed,
    ).toBe(false);
  });

  it("locks required custom fields while open", () => {
    expect(
      assertEventFieldEditable({ status: "open" }, "requiredCustomFields")
        .allowed,
    ).toBe(false);
  });

  it("locks support after close", () => {
    expect(
      assertEventFieldEditable({ status: "closed" }, "supportAmount").allowed,
    ).toBe(false);
  });
});

describe("validateManualAllocationQuantity", () => {
  it("rejects oversell beyond remaining supply", () => {
    const result = validateManualAllocationQuantity({
      confirmedQuantity: 200,
      productFinalSupply: 500,
      productAlreadyAllocated: 400,
      otherOrdersAllocatedOnProduct: 400,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("exceeds_supply_cap");
  });

  it("allows quantity within remaining supply", () => {
    const result = validateManualAllocationQuantity({
      confirmedQuantity: 100,
      productFinalSupply: 500,
      productAlreadyAllocated: 400,
      otherOrdersAllocatedOnProduct: 400,
    });
    expect(result.valid).toBe(true);
  });
});

describe("validateOrderAttrs", () => {
  const defs: HotSalesFieldDef[] = [
    {
      id: "1",
      eventId: "e1",
      entityType: "order",
      fieldKey: "notes",
      fieldType: "text",
      required: true,
      defaultValue: null,
      labelEn: "Notes",
      labelVi: "Ghi chú",
      helpTextEn: null,
      helpTextVi: null,
      dropdownOptions: null,
      visibleToRoles: ["sales"],
      editableByRoles: ["sales"],
      displayOrder: 0,
      active: true,
    },
  ];

  it("requires configured fields", () => {
    const result = validateOrderAttrs(defs, {});
    expect(result.valid).toBe(false);
    expect(result.errors.notes).toBe("required");
  });
});

describe("support", () => {
  it("calculates estimated support from confirmed qty", () => {
    expect(calculateEstimatedSupport(300, 100_000)).toBe(30_000_000);
  });

  it("blocks completion without fulfilled quantity", () => {
    expect(canCompleteOrder({ fulfilledQuantity: null, status: "confirmed" }).allowed).toBe(
      false,
    );
  });
});

describe("countdown", () => {
  it("formats remaining time", () => {
    const parts = getCountdownParts(
      new Date("2026-07-09T14:00:00Z"),
      new Date("2026-07-09T13:00:00Z"),
    );
    expect(parts.expired).toBe(false);
    expect(parts.hours).toBe(1);
    expect(formatCountdown(parts, "en")).toBe("01:00:00");
  });

  it("marks expired when past close", () => {
    const parts = getCountdownParts(
      new Date("2026-07-09T12:00:00Z"),
      new Date("2026-07-09T13:00:00Z"),
    );
    expect(parts.expired).toBe(true);
    expect(formatCountdown(parts, "vi")).toBe("Đã hết hạn");
  });
});

describe("event summary export", () => {
  it("aggregates order totals", () => {
    const summary = buildEventSummary(
      {
        id: "e1",
        eventCode: "E1",
        eventName: "Test",
        eventType: "hot_sales",
        descriptionEn: null,
        descriptionVi: null,
        opensAt: new Date("2026-07-09T08:00:00Z"),
        closesAt: new Date("2026-07-09T13:30:00Z"),
        timezone: "Asia/Ho_Chi_Minh",
        status: "open",
        sourceLocation: null,
        allocationMethod: "priority_fcfs",
        standaloneProgram: true,
        combinationAllowed: false,
        transferAllowed: true,
        depositRequired: false,
        depositRefundable: false,
        supportType: "fixed_per_unit",
        supportAmountPerUnit: 100_000,
        supportUnitLabel: "unit",
        isTemplate: false,
        clonedFromId: null,
        createdBy: "u1",
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      [
        {
          id: "p1",
          eventId: "e1",
          productName: "P",
          productCode: null,
          source: null,
          batch: null,
          category: null,
          weight: null,
          unit: "piece",
          tentativeQuantity: 100,
          finalConfirmedQuantity: 80,
          allocatedQuantity: 50,
          fulfilledQuantity: 0,
          supportAmountPerUnit: null,
          pickupLocation: null,
          sortOrder: 0,
          attrs: {},
        },
      ],
      [
        {
          id: "o1",
          eventId: "e1",
          orderNumber: "HS-00001",
          salespersonUserId: "u1",
          salespersonEmail: "a@b.com",
          customerName: "C",
          customerCode: null,
          priorityRank: 1,
          priorityGroup: "P1",
          productId: "p1",
          requestedQuantity: 60,
          confirmedQuantity: 50,
          fulfilledQuantity: null,
          estimatedSupport: 5_000_000,
          finalSupport: null,
          registeredAt: new Date(),
          status: "partial",
          depositStatus: "not_required",
          pickupStatus: "pending",
          transferStatus: "none",
          allocationRunId: null,
          attrs: {},
          remarks: null,
        },
      ],
    );

    expect(summary.totalRequested).toBe(60);
    expect(summary.totalConfirmed).toBe(50);
    expect(summary.remainingSupply).toBe(30);
    expect(eventSummaryToCsv(summary)).toContain("total_confirmed");
  });
});
