import { describe, expect, it } from "vitest";
import {
  calculateAllocation,
  sortOrdersForAllocation,
  validateManualAllocationQuantity,
} from "@/modules/trade/domain/allocation";
import {
  assertEventFieldEditable,
  canActivateScheduledEvent,
  canCloseEvent,
  canOpenEvent,
  canSubmitOrder,
} from "@/modules/trade/domain/events";
import { validateOrderAttrs, sanitizeFieldKey } from "@/modules/trade/domain/fields";
import type {
  AllocationInputOrder,
  HotSalesFieldDef,
  HotSalesProduct,
} from "@/modules/trade/domain/types";
import { formatCountdown, getCountdownParts } from "@/modules/trade/domain/countdown";
import { buildEventSummary, eventSummaryToCsv } from "@/modules/trade/domain/export";
import { calculateEstimatedSupport, canCompleteOrder } from "@/modules/trade/domain/support";
import { canTransferOrder } from "@/modules/trade/domain/transfer";

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

  it("AC-ORD-01..04: blocks before window start", () => {
    expect(
      canSubmitOrder(base, new Date("2026-07-09T07:00:00Z")).reason,
    ).toBe("event_not_started");
  });

  it("AC-ORD-01..04: blocks when event not open", () => {
    expect(
      canSubmitOrder(
        { ...base, status: "draft" },
        new Date("2026-07-09T10:00:00Z"),
      ).reason,
    ).toBe("event_not_open");
  });
});

describe("canOpenEvent / canCloseEvent (AC-EVT-01..04)", () => {
  const window = {
    opensAt: new Date("2026-07-09T08:00:00Z"),
    closesAt: new Date("2026-07-09T13:30:00Z"),
  };

  it("allows open from draft with valid window", () => {
    expect(canOpenEvent({ status: "draft", ...window }).allowed).toBe(true);
  });

  it("rejects open from open status", () => {
    expect(canOpenEvent({ status: "open", ...window }).allowed).toBe(false);
  });

  it("rejects invalid window", () => {
    expect(
      canOpenEvent({
        status: "draft",
        opensAt: window.closesAt,
        closesAt: window.opensAt,
      }).reason,
    ).toBe("invalid_window");
  });

  it("allows close only when open", () => {
    expect(canCloseEvent({ status: "open" }).allowed).toBe(true);
    expect(canCloseEvent({ status: "draft" }).allowed).toBe(false);
  });
});

describe("canActivateScheduledEvent (AC-EVT-05 / G7)", () => {
  const opensAt = new Date("2026-07-09T08:00:00Z");

  it("allows activate when scheduled and window started", () => {
    expect(
      canActivateScheduledEvent(
        { status: "scheduled", opensAt },
        new Date("2026-07-09T08:00:00Z"),
      ).allowed,
    ).toBe(true);
  });

  it("rejects non-scheduled status", () => {
    expect(
      canActivateScheduledEvent(
        { status: "draft", opensAt },
        new Date("2026-07-09T09:00:00Z"),
      ).reason,
    ).toBe("not_scheduled");
  });

  it("rejects before opensAt", () => {
    expect(
      canActivateScheduledEvent(
        { status: "scheduled", opensAt },
        new Date("2026-07-09T07:59:59Z"),
      ).reason,
    ).toBe("window_not_started");
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

  it("AC-SUP-01 / G2: final confirmed qty stays editable after close", () => {
    const result = assertEventFieldEditable(
      { status: "closed" },
      "finalConfirmedQuantity",
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("audit_required");
  });

  it("locks required custom fields while open", () => {
    expect(
      assertEventFieldEditable({ status: "open" }, "requiredCustomFields")
        .allowed,
    ).toBe(false);
  });

  it("AC-FLD-01 / G5: required custom fields locked after close", () => {
    expect(
      assertEventFieldEditable({ status: "closed" }, "requiredCustomFields")
        .reason,
    ).toBe("locked_after_close");
  });

  it("locks support after close", () => {
    expect(
      assertEventFieldEditable({ status: "closed" }, "supportAmount").allowed,
    ).toBe(false);
  });
});

describe("validateManualAllocationQuantity (AC-ALC-03 / G9)", () => {
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

  it("rejects negative quantity", () => {
    const result = validateManualAllocationQuantity({
      confirmedQuantity: -1,
      productFinalSupply: 500,
      productAlreadyAllocated: 0,
      otherOrdersAllocatedOnProduct: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("negative_quantity");
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

describe("sanitizeFieldKey (AC-FLD-01 / G5)", () => {
  it("accepts snake_case keys", () => {
    expect(sanitizeFieldKey("Farm_Code")).toBe("farm_code");
  });

  it("rejects invalid keys", () => {
    expect(sanitizeFieldKey("1bad")).toBeNull();
    expect(sanitizeFieldKey("has-dash")).toBeNull();
    expect(sanitizeFieldKey("")).toBeNull();
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

  it("allows completion with fulfilled quantity (G4)", () => {
    expect(
      canCompleteOrder({ fulfilledQuantity: 25, status: "full" }).allowed,
    ).toBe(true);
  });

  it("AC-ORD-05 / G4: rejects cancelled or already completed", () => {
    expect(
      canCompleteOrder({ fulfilledQuantity: 10, status: "cancelled" }).reason,
    ).toBe("order_cancelled");
    expect(
      canCompleteOrder({ fulfilledQuantity: 10, status: "completed" }).reason,
    ).toBe("order_already_completed");
  });

  it("AC-ORD-05 / G4: rejects negative fulfilled qty", () => {
    expect(
      canCompleteOrder({ fulfilledQuantity: -1, status: "full" }).reason,
    ).toBe("negative_fulfilled_quantity");
  });
});

describe("transfer (G3)", () => {
  it("allows transfer when event permits and order is allocated", () => {
    expect(
      canTransferOrder(
        { status: "full", transferStatus: null },
        { transferAllowed: true },
      ).allowed,
    ).toBe(true);
  });

  it("denies transfer when event disallows or order is not allocated", () => {
    expect(
      canTransferOrder(
        { status: "full", transferStatus: null },
        { transferAllowed: false },
      ).reason,
    ).toBe("transfer_not_allowed");
    expect(
      canTransferOrder(
        { status: "registered", transferStatus: null },
        { transferAllowed: true },
      ).reason,
    ).toBe("order_not_transferable");
  });

  it("AC-XFR-01: denies when a transfer is already pending", () => {
    expect(
      canTransferOrder(
        { status: "full", transferStatus: "requested" },
        { transferAllowed: true },
      ).reason,
    ).toBe("transfer_pending");
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
