import type { HotSalesDepositStatus } from "@/lib/domain/trade/types";

export const DEPOSIT_ADJUSTMENT_TYPES = [
  "waive",
  "refund",
  "forfeit",
  "correction",
  "cancelled",
] as const;

export type DepositAdjustmentType = (typeof DEPOSIT_ADJUSTMENT_TYPES)[number];

const ADJUSTMENT_REQUIRES_REASON = new Set<DepositAdjustmentType>([
  "waive",
  "refund",
  "forfeit",
  "correction",
  "cancelled",
]);

export type DepositProjectionInput = {
  depositRequired: boolean;
  hasDepositRecord: boolean;
  depositAmount: number | null;
  totalReceiptAmount: number;
  /** Most recent terminal adjustment type, if any. */
  terminalAdjustment: DepositAdjustmentType | null;
  /** Phase 1 column value when no deposit record exists. */
  legacyStatus?: HotSalesDepositStatus;
};

export function validateDepositAdjustment(input: {
  adjustmentType: DepositAdjustmentType;
  reason?: string;
}): { valid: boolean; error?: string } {
  if (
    ADJUSTMENT_REQUIRES_REASON.has(input.adjustmentType) &&
    !input.reason?.trim()
  ) {
    return { valid: false, error: "reason_required" };
  }
  return { valid: true };
}

/** Derive order.deposit_status projection from deposit SoT (ADR-002). */
export function projectDepositStatus(
  input: DepositProjectionInput,
): HotSalesDepositStatus {
  if (!input.depositRequired && !input.hasDepositRecord) {
    return "not_required";
  }

  if (!input.hasDepositRecord) {
    return input.legacyStatus ?? (input.depositRequired ? "pending" : "not_required");
  }

  if (input.terminalAdjustment === "waive") return "waived";
  if (input.terminalAdjustment === "forfeit") return "forfeited";
  if (input.terminalAdjustment === "refund") return "refunded";
  if (input.terminalAdjustment === "cancelled") return "cancelled";

  const due = input.depositAmount ?? 0;
  const paid = input.totalReceiptAmount;

  if (due <= 0) {
    return paid > 0 ? "paid" : "pending";
  }
  if (paid >= due) return "paid";
  if (paid > 0) return "partially_paid";
  return "pending";
}

export function sumReceiptAmounts(amounts: number[]): number {
  return amounts.reduce((sum, n) => sum + n, 0);
}
