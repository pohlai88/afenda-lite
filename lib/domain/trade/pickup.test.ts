import { describe, expect, it } from "vitest";
import {
  computeFulfilledQuantity,
  derivePickupAssignmentStatus,
  validatePickupException,
  canRecordFulfillment,
} from "@/lib/domain/trade/pickup";

describe("computeFulfilledQuantity", () => {
  it("sums fulfillment records", () => {
    expect(computeFulfilledQuantity([10, 5, 2])).toBe(17);
  });
});

describe("derivePickupAssignmentStatus", () => {
  const base = {
    hasNoShowException: false,
    hasCancelException: false,
    hasOverrideException: false,
    scheduledWindowId: null as string | null,
  };

  it("detects partial and full pickup", () => {
    expect(
      derivePickupAssignmentStatus({
        ...base,
        totalFulfilled: 0,
        confirmedQuantity: 100,
      }),
    ).toBe("pending_schedule");
    expect(
      derivePickupAssignmentStatus({
        ...base,
        totalFulfilled: 40,
        confirmedQuantity: 100,
      }),
    ).toBe("partially_picked_up");
    expect(
      derivePickupAssignmentStatus({
        ...base,
        totalFulfilled: 100,
        confirmedQuantity: 100,
      }),
    ).toBe("picked_up");
  });

  it("exceptions override quantity", () => {
    expect(
      derivePickupAssignmentStatus({
        ...base,
        totalFulfilled: 0,
        confirmedQuantity: 100,
        hasNoShowException: true,
      }),
    ).toBe("no_show");
  });

  it("preserves scheduled when window assigned and no fulfillment", () => {
    expect(
      derivePickupAssignmentStatus({
        ...base,
        totalFulfilled: 0,
        confirmedQuantity: 100,
        scheduledWindowId: "win-1",
      }),
    ).toBe("scheduled");
  });
});

describe("validatePickupException", () => {
  it("requires reason", () => {
    expect(validatePickupException({ exceptionType: "no_show" }).valid).toBe(false);
    expect(
      validatePickupException({ exceptionType: "no_show", reason: "customer absent" })
        .valid,
    ).toBe(true);
  });
});

describe("canRecordFulfillment", () => {
  it("blocks terminal status without override", () => {
    expect(
      canRecordFulfillment({ assignmentStatus: "picked_up", quantity: 1 }).allowed,
    ).toBe(false);
  });

  it("allows when exception override active", () => {
    expect(
      canRecordFulfillment({
        assignmentStatus: "exception",
        quantity: 1,
        allowOverride: true,
      }).allowed,
    ).toBe(true);
  });
});
