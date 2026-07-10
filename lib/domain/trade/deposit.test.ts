import { describe, expect, it } from "vitest";
import {
  projectDepositStatus,
  validateDepositAdjustment,
} from "@/lib/domain/trade/deposit";

describe("validateDepositAdjustment", () => {
  it("requires reason for waive, refund, forfeit, cancelled", () => {
    for (const type of ["waive", "refund", "forfeit", "cancelled"] as const) {
      expect(validateDepositAdjustment({ adjustmentType: type }).valid).toBe(false);
      expect(
        validateDepositAdjustment({ adjustmentType: type, reason: "ops approved" }).valid,
      ).toBe(true);
    }
  });

  it("allows correction without reason", () => {
    expect(validateDepositAdjustment({ adjustmentType: "correction" }).valid).toBe(
      false,
    );
    expect(
      validateDepositAdjustment({ adjustmentType: "correction", reason: "fix typo" })
        .valid,
    ).toBe(true);
  });
});

describe("projectDepositStatus", () => {
  it("returns not_required when deposit not required and no record", () => {
    expect(
      projectDepositStatus({
        depositRequired: false,
        hasDepositRecord: false,
        depositAmount: null,
        totalReceiptAmount: 0,
        terminalAdjustment: null,
      }),
    ).toBe("not_required");
  });

  it("uses legacy status when no deposit record", () => {
    expect(
      projectDepositStatus({
        depositRequired: true,
        hasDepositRecord: false,
        depositAmount: null,
        totalReceiptAmount: 0,
        terminalAdjustment: null,
        legacyStatus: "paid",
      }),
    ).toBe("paid");
  });

  it("projects pending → paid and partially_paid", () => {
    const base = {
      depositRequired: true,
      hasDepositRecord: true,
      depositAmount: 100,
      terminalAdjustment: null as const,
    };
    expect(
      projectDepositStatus({ ...base, totalReceiptAmount: 0 }),
    ).toBe("pending");
    expect(
      projectDepositStatus({ ...base, totalReceiptAmount: 40 }),
    ).toBe("partially_paid");
    expect(
      projectDepositStatus({ ...base, totalReceiptAmount: 100 }),
    ).toBe("paid");
  });

  it("terminal adjustments override receipt totals", () => {
    expect(
      projectDepositStatus({
        depositRequired: true,
        hasDepositRecord: true,
        depositAmount: 100,
        totalReceiptAmount: 100,
        terminalAdjustment: "waive",
      }),
    ).toBe("waived");
    expect(
      projectDepositStatus({
        depositRequired: true,
        hasDepositRecord: true,
        depositAmount: 100,
        totalReceiptAmount: 100,
        terminalAdjustment: "refund",
      }),
    ).toBe("refunded");
    expect(
      projectDepositStatus({
        depositRequired: true,
        hasDepositRecord: true,
        depositAmount: 100,
        totalReceiptAmount: 0,
        terminalAdjustment: "forfeit",
      }),
    ).toBe("forfeited");
  });
});
