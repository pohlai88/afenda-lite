import "server-only";

import { pool } from "@/lib/db";
import {
  projectDepositStatus,
  validateDepositAdjustment,
  type DepositAdjustmentType,
} from "@/lib/domain/trade/deposit";
import type {
  HotSalesDepositAdjustment,
  HotSalesDepositListItem,
  HotSalesDepositReceipt,
  HotSalesDepositRecord,
  HotSalesDepositStatus,
  HotSalesFinanceAuditEntry,
} from "@/lib/domain/trade/types";

function mapDepositRow(row: Record<string, unknown>): HotSalesDepositRecord {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    amount: row.amount != null ? Number(row.amount) : null,
    currency: String(row.currency),
    dueAt: row.due_at ? new Date(String(row.due_at)) : null,
    status: String(row.status),
    nonRefundable: Boolean(row.non_refundable),
    createdBy: String(row.created_by),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

function mapReceiptRow(row: Record<string, unknown>): HotSalesDepositReceipt {
  return {
    id: String(row.id),
    depositId: String(row.deposit_id),
    reference: row.reference != null ? String(row.reference) : null,
    paidAt: new Date(String(row.paid_at)),
    amount: Number(row.amount),
    recordedBy: String(row.recorded_by),
    createdAt: new Date(String(row.created_at)),
  };
}

function mapAdjustmentRow(row: Record<string, unknown>): HotSalesDepositAdjustment {
  return {
    id: String(row.id),
    depositId: String(row.deposit_id),
    adjustmentType: String(row.adjustment_type),
    reason: String(row.reason),
    amount: row.amount != null ? Number(row.amount) : null,
    actorId: String(row.actor_id),
    createdAt: new Date(String(row.created_at)),
  };
}

const TERMINAL_ADJUSTMENTS = new Set<DepositAdjustmentType>([
  "waive",
  "refund",
  "forfeit",
  "cancelled",
]);

export async function recordFinanceAudit(input: {
  depositId?: string;
  orderId?: string;
  action: string;
  actorId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
}) {
  await pool.query(
    `INSERT INTO hot_sales_finance_audit
      (deposit_id, order_id, action, actor_id, old_value, new_value, reason)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)`,
    [
      input.depositId ?? null,
      input.orderId ?? null,
      input.action,
      input.actorId ?? null,
      input.oldValue ? JSON.stringify(input.oldValue) : null,
      input.newValue ? JSON.stringify(input.newValue) : null,
      input.reason ?? null,
    ],
  );
}

export async function getDepositByOrderId(
  orderId: string,
): Promise<HotSalesDepositRecord | null> {
  const result = await pool.query(
    `SELECT * FROM hot_sales_deposit WHERE order_id = $1`,
    [orderId],
  );
  if (result.rows.length === 0) return null;
  return mapDepositRow(result.rows[0]);
}

export async function createDepositForOrder(input: {
  orderId: string;
  amount?: number | null;
  currency?: string;
  dueAt?: Date | null;
  nonRefundable?: boolean;
  createdBy: string;
}) {
  const result = await pool.query(
    `INSERT INTO hot_sales_deposit
      (order_id, amount, currency, due_at, non_refundable, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.orderId,
      input.amount ?? null,
      input.currency ?? "VND",
      input.dueAt ?? null,
      input.nonRefundable ?? false,
      input.createdBy,
    ],
  );
  const deposit = mapDepositRow(result.rows[0]);
  await recordFinanceAudit({
    depositId: deposit.id,
    orderId: input.orderId,
    action: "deposit.created",
    actorId: input.createdBy,
    newValue: { amount: deposit.amount, currency: deposit.currency },
  });
  return deposit;
}

async function loadDepositProjectionContext(orderId: string) {
  const orderResult = await pool.query(
    `SELECT o.deposit_status, e.deposit_required
     FROM hot_sales_order o
     JOIN hot_sales_event e ON e.id = o.event_id
     WHERE o.id = $1`,
    [orderId],
  );
  if (orderResult.rows.length === 0) {
    throw new Error("order_not_found");
  }
  const orderRow = orderResult.rows[0];

  const depositResult = await pool.query(
    `SELECT * FROM hot_sales_deposit WHERE order_id = $1`,
    [orderId],
  );
  const deposit =
    depositResult.rows.length > 0 ? mapDepositRow(depositResult.rows[0]) : null;

  let totalReceiptAmount = 0;
  let terminalAdjustment: DepositAdjustmentType | null = null;

  if (deposit) {
    const receipts = await pool.query(
      `SELECT amount FROM hot_sales_deposit_receipt WHERE deposit_id = $1`,
      [deposit.id],
    );
    totalReceiptAmount = receipts.rows.reduce(
      (sum, row) => sum + Number(row.amount),
      0,
    );

    const adjustments = await pool.query(
      `SELECT adjustment_type FROM hot_sales_deposit_adjustment
       WHERE deposit_id = $1
       ORDER BY created_at DESC`,
      [deposit.id],
    );
    for (const row of adjustments.rows) {
      const type = String(row.adjustment_type) as DepositAdjustmentType;
      if (TERMINAL_ADJUSTMENTS.has(type)) {
        terminalAdjustment = type;
        break;
      }
    }
  }

  const projected = projectDepositStatus({
    depositRequired: Boolean(orderRow.deposit_required),
    hasDepositRecord: deposit != null,
    depositAmount: deposit?.amount ?? null,
    totalReceiptAmount,
    terminalAdjustment,
    legacyStatus: String(orderRow.deposit_status) as HotSalesDepositStatus,
  });

  return { projected, deposit };
}

const DEPOSIT_ROW_STATUSES = new Set([
  "pending",
  "paid",
  "partially_paid",
  "waived",
  "forfeited",
  "refunded",
  "cancelled",
]);

export async function syncOrderDepositProjection(orderId: string) {
  const { projected, deposit } = await loadDepositProjectionContext(orderId);
  await pool.query(
    `UPDATE hot_sales_order SET deposit_status = $2, updated_at = NOW() WHERE id = $1`,
    [orderId, projected],
  );
  if (deposit && DEPOSIT_ROW_STATUSES.has(projected)) {
    await pool.query(
      `UPDATE hot_sales_deposit SET status = $2, updated_at = NOW() WHERE id = $1`,
      [deposit.id, projected],
    );
  }
  return projected;
}

export async function updateDepositDetails(input: {
  depositId: string;
  orderId: string;
  amount?: number | null;
  dueAt?: Date | null;
  nonRefundable?: boolean;
  actorId: string;
}) {
  const result = await pool.query(
    `UPDATE hot_sales_deposit SET
      amount = COALESCE($2, amount),
      due_at = COALESCE($3, due_at),
      non_refundable = COALESCE($4, non_refundable),
      updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [
      input.depositId,
      input.amount ?? null,
      input.dueAt ?? null,
      input.nonRefundable ?? null,
    ],
  );
  const deposit = mapDepositRow(result.rows[0]);
  await recordFinanceAudit({
    depositId: input.depositId,
    orderId: input.orderId,
    action: "deposit.details_updated",
    actorId: input.actorId,
    newValue: {
      amount: deposit.amount,
      nonRefundable: deposit.nonRefundable,
    },
  });
  await syncOrderDepositProjection(input.orderId);
  return deposit;
}

export async function recordDepositReceipt(input: {
  depositId: string;
  orderId: string;
  reference?: string;
  paidAt?: Date;
  amount: number;
  recordedBy: string;
}) {
  const result = await pool.query(
    `INSERT INTO hot_sales_deposit_receipt
      (deposit_id, reference, paid_at, amount, recorded_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.depositId,
      input.reference ?? null,
      input.paidAt ?? new Date(),
      input.amount,
      input.recordedBy,
    ],
  );
  const receipt = mapReceiptRow(result.rows[0]);
  await recordFinanceAudit({
    depositId: input.depositId,
    orderId: input.orderId,
    action: "deposit.receipt_recorded",
    actorId: input.recordedBy,
    newValue: { amount: receipt.amount, reference: receipt.reference },
  });
  await syncOrderDepositProjection(input.orderId);
  return receipt;
}

export async function recordDepositAdjustment(input: {
  depositId: string;
  orderId: string;
  adjustmentType: DepositAdjustmentType;
  reason: string;
  amount?: number | null;
  actorId: string;
}) {
  const validation = validateDepositAdjustment({
    adjustmentType: input.adjustmentType,
    reason: input.reason,
  });
  if (!validation.valid) {
    throw new Error(validation.error ?? "invalid_adjustment");
  }

  const depositResult = await pool.query(
    `SELECT non_refundable FROM hot_sales_deposit WHERE id = $1`,
    [input.depositId],
  );
  if (depositResult.rows.length === 0) throw new Error("deposit_not_found");
  if (
    input.adjustmentType === "refund" &&
    Boolean(depositResult.rows[0].non_refundable)
  ) {
    throw new Error("deposit_non_refundable");
  }

  const result = await pool.query(
    `INSERT INTO hot_sales_deposit_adjustment
      (deposit_id, adjustment_type, reason, amount, actor_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.depositId,
      input.adjustmentType,
      input.reason.trim(),
      input.amount ?? null,
      input.actorId,
    ],
  );
  const adjustment = mapAdjustmentRow(result.rows[0]);
  await recordFinanceAudit({
    depositId: input.depositId,
    orderId: input.orderId,
    action: `deposit.adjustment.${input.adjustmentType}`,
    actorId: input.actorId,
    reason: input.reason.trim(),
    newValue: { adjustmentType: input.adjustmentType, amount: input.amount ?? null },
  });
  await syncOrderDepositProjection(input.orderId);
  return adjustment;
}

export async function listDepositsForEvent(
  eventId: string,
): Promise<HotSalesDepositListItem[]> {
  const result = await pool.query(
    `SELECT d.*, o.order_number, o.customer_name, o.customer_code, o.deposit_status AS order_deposit_status
     FROM hot_sales_deposit d
     JOIN hot_sales_order o ON o.id = d.order_id
     WHERE o.event_id = $1
     ORDER BY o.order_number`,
    [eventId],
  );
  return result.rows.map((row) => ({
    ...mapDepositRow(row),
    orderNumber: String(row.order_number),
    customerName: String(row.customer_name),
    customerCode: row.customer_code != null ? String(row.customer_code) : null,
    orderDepositStatus: String(row.order_deposit_status) as HotSalesDepositStatus,
  }));
}

export async function listFinanceAuditForEvent(
  eventId: string,
): Promise<HotSalesFinanceAuditEntry[]> {
  const result = await pool.query(
    `SELECT a.*
     FROM hot_sales_finance_audit a
     LEFT JOIN hot_sales_order o ON o.id = a.order_id
     LEFT JOIN hot_sales_deposit d ON d.id = a.deposit_id
     LEFT JOIN hot_sales_order o2 ON o2.id = d.order_id
     WHERE o.event_id = $1 OR o2.event_id = $1
     ORDER BY a.created_at DESC
     LIMIT 200`,
    [eventId],
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    depositId: row.deposit_id != null ? String(row.deposit_id) : null,
    orderId: row.order_id != null ? String(row.order_id) : null,
    action: String(row.action),
    actorId: row.actor_id != null ? String(row.actor_id) : null,
    oldValue: row.old_value as Record<string, unknown> | null,
    newValue: row.new_value as Record<string, unknown> | null,
    reason: row.reason != null ? String(row.reason) : null,
    createdAt: new Date(String(row.created_at)),
  }));
}

export async function listReceiptsForDeposit(
  depositId: string,
): Promise<HotSalesDepositReceipt[]> {
  const result = await pool.query(
    `SELECT * FROM hot_sales_deposit_receipt WHERE deposit_id = $1 ORDER BY paid_at DESC`,
    [depositId],
  );
  return result.rows.map(mapReceiptRow);
}

export async function ensureDepositForOrder(input: {
  orderId: string;
  depositRequired: boolean;
  createdBy: string;
}) {
  if (!input.depositRequired) return null;
  const existing = await getDepositByOrderId(input.orderId);
  if (existing) return existing;
  const deposit = await createDepositForOrder({
    orderId: input.orderId,
    createdBy: input.createdBy,
  });
  await syncOrderDepositProjection(input.orderId);
  return deposit;
}
