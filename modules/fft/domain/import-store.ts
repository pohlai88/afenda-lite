import "server-only";

import { pool } from "@/modules/platform/db";
import {
  ensureDepositForOrder,
  getDepositByOrderId,
  recordDepositReceipt,
} from "@/modules/fft/domain/deposit-store";
import type {
  BulkOrderImportRow,
  CustomerPriorityImportRow,
  DepositRecordImportRow,
  FftImportBatch,
  FftImportRow,
  FftImportType,
  PickupConfirmationImportRow,
  ProductSupplyImportRow,
} from "@/modules/fft/domain/import-types";
import { canSubmitOrder } from "@/modules/fft/domain/events";
import { recordFulfillment } from "@/modules/fft/domain/pickup-store";
import { resolveDepositStatusForEvent } from "@/modules/fft/domain/transfer";
import {
  createOrder,
  getEventById,
  importPriorityCsv,
  listOrdersForEvent,
  listProductsForEvent,
  upsertProduct,
} from "@/modules/fft/domain/store";
import { isFftDepositEnabled } from "@/modules/platform/env/accessors";

function mapBatchRow(row: Record<string, unknown>): FftImportBatch {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    importType: String(row.import_type) as FftImportType,
    filename: String(row.filename),
    status: String(row.status) as FftImportBatch["status"],
    actorId: String(row.actor_id),
    rowCount: Number(row.row_count),
    validCount: Number(row.valid_count),
    errorCount: Number(row.error_count),
    committedAt: row.committed_at ? new Date(String(row.committed_at)) : null,
    createdAt: new Date(String(row.created_at)),
  };
}

function mapImportRow(row: Record<string, unknown>): FftImportRow {
  const errors = row.validation_errors;
  return {
    id: String(row.id),
    batchId: String(row.batch_id),
    rowNumber: Number(row.row_number),
    payloadJson: (row.payload_json ?? {}) as Record<string, unknown>,
    validationErrors: Array.isArray(errors)
      ? errors.map(String)
      : JSON.parse(String(errors ?? "[]")),
    writeStatus: String(row.write_status) as FftImportRow["writeStatus"],
    createdAt: new Date(String(row.created_at)),
  };
}

export async function createImportBatch(input: {
  eventId: string;
  importType: FftImportType;
  filename: string;
  actorId: string;
  rows: Array<{
    rowNumber: number;
    payload: Record<string, unknown>;
    validationErrors: string[];
  }>;
}): Promise<FftImportBatch> {
  const validCount = input.rows.filter((r) => r.validationErrors.length === 0).length;
  const errorCount = input.rows.length - validCount;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const batchResult = await client.query(
      `INSERT INTO fft_import_batch
        (event_id, import_type, filename, status, actor_id, row_count, valid_count, error_count)
       VALUES ($1, $2, $3, 'dry_run', $4, $5, $6, $7)
       RETURNING *`,
      [
        input.eventId,
        input.importType,
        input.filename,
        input.actorId,
        input.rows.length,
        validCount,
        errorCount,
      ],
    );
    const batch = mapBatchRow(batchResult.rows[0]);

    for (const row of input.rows) {
      await client.query(
        `INSERT INTO fft_import_row
          (batch_id, row_number, payload_json, validation_errors, write_status)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)`,
        [
          batch.id,
          row.rowNumber,
          JSON.stringify(row.payload),
          JSON.stringify(row.validationErrors),
          row.validationErrors.length === 0 ? "pending" : "skipped",
        ],
      );
    }

    await client.query("COMMIT");
    return batch;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getImportBatchById(
  batchId: string,
): Promise<FftImportBatch | null> {
  const result = await pool.query(
    `SELECT * FROM fft_import_batch WHERE id = $1`,
    [batchId],
  );
  return result.rows[0] ? mapBatchRow(result.rows[0]) : null;
}

export async function listImportRowsForBatch(
  batchId: string,
): Promise<FftImportRow[]> {
  const result = await pool.query(
    `SELECT * FROM fft_import_row WHERE batch_id = $1 ORDER BY row_number`,
    [batchId],
  );
  return result.rows.map(mapImportRow);
}

export async function cancelImportBatch(batchId: string): Promise<void> {
  await pool.query(
    `UPDATE fft_import_batch SET status = 'cancelled' WHERE id = $1 AND status = 'dry_run'`,
    [batchId],
  );
}

function resolveProductId(
  products: Awaited<ReturnType<typeof listProductsForEvent>>,
  payload: { productCode?: string; productName?: string },
): string | null {
  const code = payload.productCode?.trim().toLowerCase();
  const name = payload.productName?.trim().toLowerCase();
  const match = products.find((prod) => {
    if (code && prod.productCode?.trim().toLowerCase() === code) return true;
    if (name && prod.productName.trim().toLowerCase() === name) return true;
    return false;
  });
  return match?.id ?? null;
}

export async function commitImportBatch(
  batchId: string,
  ctx: {
    actorEmail: string;
    organizationId: string;
    onDepositPending?: (order: {
      id: string;
      orderNumber: string;
      salespersonEmail: string;
    }) => void;
  },
): Promise<{
  committedCount: number;
  skippedCount: number;
}> {
  const batch = await getImportBatchById(batchId);
  if (!batch) throw new Error("batch_not_found");
  if (batch.status !== "dry_run") throw new Error("batch_not_dry_run");

  const rows = await listImportRowsForBatch(batchId);
  const validRows = rows.filter((r) => r.validationErrors.length === 0);
  const committedRowIds = new Set<string>();

  let committedCount = 0;
  let skippedCount = rows.length - validRows.length;

  if (batch.importType === "customer_priority") {
    const priorityRows = validRows.map((r) => {
      const p = r.payloadJson as CustomerPriorityImportRow;
      return {
        customerName: String(p.customerName ?? ""),
        customerCode: p.customerCode ? String(p.customerCode) : undefined,
        priorityRank: Number(p.priorityRank ?? 999),
        priorityGroup: p.priorityGroup ? String(p.priorityGroup) : undefined,
      };
    });
    await importPriorityCsv(batch.eventId, priorityRows);
    committedCount = priorityRows.length;
    for (const row of validRows) committedRowIds.add(row.id);
  } else if (batch.importType === "product_supply") {
    const products = await listProductsForEvent(batch.eventId);
    for (const row of validRows) {
      const p = row.payloadJson as ProductSupplyImportRow;
      const productId = resolveProductId(products, p);
      if (!productId) {
        skippedCount += 1;
        continue;
      }
      const match = products.find((prod) => prod.id === productId)!;
      await upsertProduct({
        eventId: batch.eventId,
        id: match.id,
        productName: match.productName,
        productCode: match.productCode ?? undefined,
        source: match.source ?? undefined,
        batch: match.batch ?? undefined,
        category: match.category ?? undefined,
        weight: match.weight ?? undefined,
        unit: p.unit ?? match.unit,
        tentativeQuantity: p.tentativeQuantity ?? match.tentativeQuantity ?? undefined,
        finalConfirmedQuantity:
          p.finalConfirmedQuantity ?? match.finalConfirmedQuantity ?? undefined,
        supportAmountPerUnit: match.supportAmountPerUnit ?? undefined,
        pickupLocation: match.pickupLocation ?? undefined,
        sortOrder: match.sortOrder,
      });
      committedCount += 1;
      committedRowIds.add(row.id);
    }
  } else if (batch.importType === "bulk_order") {
    const event = await getEventById(batch.eventId, ctx.organizationId);
    if (!event) throw new Error("event_not_found");
    const products = await listProductsForEvent(batch.eventId);
    const depositStatus = resolveDepositStatusForEvent(event);
    const now = new Date();

    for (const row of validRows) {
      const p = row.payloadJson as BulkOrderImportRow;
      const productId = resolveProductId(products, p);
      if (!productId) {
        skippedCount += 1;
        continue;
      }
      const order = await createOrder({
        eventId: batch.eventId,
        salespersonUserId: batch.actorId,
        salespersonEmail: ctx.actorEmail,
        customerName: p.customerName,
        customerCode: p.customerCode,
        productId,
        requestedQuantity: p.requestedQuantity,
        attrs: {},
        remarks: p.remarks,
        depositStatus,
        registeredAt: now,
      });
      if (isFftDepositEnabled() && event.depositRequired) {
        await ensureDepositForOrder({
          orderId: order.id,
          depositRequired: true,
          createdBy: batch.actorId,
        });
        ctx.onDepositPending?.({
          id: order.id,
          orderNumber: order.orderNumber,
          salespersonEmail: order.salespersonEmail,
        });
      }
      committedCount += 1;
      committedRowIds.add(row.id);
    }
  } else if (batch.importType === "deposit_record") {
    const event = await getEventById(batch.eventId, ctx.organizationId);
    if (!event) throw new Error("event_not_found");
    const orderMap = await buildOrderNumberMap(batch.eventId);

    for (const row of validRows) {
      const p = row.payloadJson as DepositRecordImportRow;
      const order = orderMap.get(p.orderNumber.trim().toLowerCase());
      if (!order) {
        skippedCount += 1;
        continue;
      }
      let deposit = await getDepositByOrderId(order.id);
      if (!deposit) {
        deposit = await ensureDepositForOrder({
          orderId: order.id,
          depositRequired: event.depositRequired,
          createdBy: batch.actorId,
        });
      }
      if (!deposit) {
        skippedCount += 1;
        continue;
      }
      await recordDepositReceipt({
        depositId: deposit.id,
        orderId: order.id,
        reference: p.reference,
        paidAt: p.paidAt ? new Date(p.paidAt) : new Date(),
        amount: p.amount,
        recordedBy: batch.actorId,
      });
      committedCount += 1;
      committedRowIds.add(row.id);
    }
  } else if (batch.importType === "pickup_confirmation") {
    const orderMap = await buildOrderNumberMap(batch.eventId);

    for (const row of validRows) {
      const p = row.payloadJson as PickupConfirmationImportRow;
      const order = orderMap.get(p.orderNumber.trim().toLowerCase());
      if (!order) {
        skippedCount += 1;
        continue;
      }
      try {
        await recordFulfillment({
          orderId: order.id,
          quantity: p.fulfilledQuantity,
          absoluteQuantity: p.fulfilledQuantity,
          finalSupport: p.finalSupport,
          actorId: batch.actorId,
        });
        committedCount += 1;
        committedRowIds.add(row.id);
      } catch {
        skippedCount += 1;
      }
    }
  } else {
    throw new Error("import_type_not_supported");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of validRows) {
      await client.query(
        `UPDATE fft_import_row SET write_status = $2 WHERE id = $1`,
        [row.id, committedRowIds.has(row.id) ? "committed" : "failed"],
      );
    }
    for (const row of rows.filter((r) => r.validationErrors.length > 0)) {
      await client.query(
        `UPDATE fft_import_row SET write_status = 'skipped' WHERE id = $1`,
        [row.id],
      );
    }
    await client.query(
      `UPDATE fft_import_batch
       SET status = 'committed', committed_at = NOW(), valid_count = $2, error_count = $3
       WHERE id = $1`,
      [batchId, committedCount, skippedCount],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    await pool.query(
      `UPDATE fft_import_batch SET status = 'failed' WHERE id = $1`,
      [batchId],
    );
    throw error;
  } finally {
    client.release();
  }

  return { committedCount, skippedCount };
}

export async function buildProductLookupForEvent(eventId: string) {
  const products = await listProductsForEvent(eventId);
  const productIdByCode = new Map<string, string>();
  const productIdByName = new Map<string, string>();
  for (const p of products) {
    if (p.productCode) {
      productIdByCode.set(p.productCode.trim().toLowerCase(), p.id);
    }
    productIdByName.set(p.productName.trim().toLowerCase(), p.id);
  }
  return {
    existingProductCodes: new Set(productIdByCode.keys()),
    existingProductNames: new Set(productIdByName.keys()),
    productIdByCode,
    productIdByName,
  };
}

export async function buildOrderNumberMap(eventId: string) {
  const orders = await listOrdersForEvent(eventId);
  const map = new Map<string, { id: string }>();
  for (const o of orders) {
    map.set(o.orderNumber.trim().toLowerCase(), { id: o.id });
  }
  return map;
}

export async function buildOrderLookupForEvent(eventId: string) {
  const orders = await listOrdersForEvent(eventId);
  return {
    existingOrderNumbers: new Set(
      orders.map((o) => o.orderNumber.trim().toLowerCase()),
    ),
  };
}

export async function buildBulkOrderValidationContext(
  eventId: string,
  organizationId: string,
) {
  const event = await getEventById(eventId, organizationId);
  const productLookup = await buildProductLookupForEvent(eventId);
  const gate = event ? canSubmitOrder(event, new Date()) : { allowed: false };
  return {
    ...productLookup,
    eventOpenForOrders: gate.allowed,
  };
}
