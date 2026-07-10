import "server-only";

import { pool } from "@/lib/db";
import { recordHotSalesAudit } from "@/lib/domain/trade/store";
import {
  computeFulfilledQuantity,
  derivePickupAssignmentStatus,
  canRecordFulfillment,
  projectPickupStatus,
  validatePickupException,
  type PickupExceptionType,
} from "@/lib/domain/trade/pickup";
import type {
  HotSalesFulfillmentRecord,
  HotSalesPickupAssignment,
  HotSalesPickupListItem,
  HotSalesPickupWindow,
} from "@/lib/domain/trade/types";

function mapWindowRow(row: Record<string, unknown>): HotSalesPickupWindow {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    startsAt: new Date(String(row.starts_at)),
    endsAt: new Date(String(row.ends_at)),
    location: row.location != null ? String(row.location) : null,
    capacity: row.capacity != null ? Number(row.capacity) : null,
    createdAt: new Date(String(row.created_at)),
  };
}

function mapAssignmentRow(row: Record<string, unknown>): HotSalesPickupAssignment {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    windowId: row.window_id != null ? String(row.window_id) : null,
    status: String(row.status),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function createPickupWindow(input: {
  eventId: string;
  startsAt: Date;
  endsAt: Date;
  location?: string;
  capacity?: number;
}) {
  const result = await pool.query(
    `INSERT INTO hot_sales_pickup_window (event_id, starts_at, ends_at, location, capacity)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      input.eventId,
      input.startsAt,
      input.endsAt,
      input.location ?? null,
      input.capacity ?? null,
    ],
  );
  return mapWindowRow(result.rows[0]);
}

export async function ensurePickupAssignment(orderId: string) {
  const existing = await pool.query(
    `SELECT * FROM hot_sales_pickup_assignment WHERE order_id = $1`,
    [orderId],
  );
  if (existing.rows.length > 0) {
    return mapAssignmentRow(existing.rows[0]);
  }
  const result = await pool.query(
    `INSERT INTO hot_sales_pickup_assignment (order_id, status)
     VALUES ($1, 'pending_schedule') RETURNING *`,
    [orderId],
  );
  return mapAssignmentRow(result.rows[0]);
}

async function loadPickupContext(orderId: string) {
  const orderResult = await pool.query(
    `SELECT confirmed_quantity FROM hot_sales_order WHERE id = $1`,
    [orderId],
  );
  if (orderResult.rows.length === 0) throw new Error("order_not_found");
  const confirmedQuantity =
    orderResult.rows[0].confirmed_quantity != null
      ? Number(orderResult.rows[0].confirmed_quantity)
      : null;

  const assignmentResult = await pool.query(
    `SELECT * FROM hot_sales_pickup_assignment WHERE order_id = $1`,
    [orderId],
  );
  const assignment =
    assignmentResult.rows.length > 0
      ? mapAssignmentRow(assignmentResult.rows[0])
      : null;

  let totalFulfilled = 0;
  let hasNoShowException = false;
  let hasCancelException = false;
  let hasOverrideException = false;

  if (assignment) {
    const fulfillments = await pool.query(
      `SELECT quantity FROM hot_sales_fulfillment_record WHERE order_id = $1`,
      [orderId],
    );
    totalFulfilled = computeFulfilledQuantity(
      fulfillments.rows.map((r) => Number(r.quantity)),
    );

    const exceptions = await pool.query(
      `SELECT exception_type FROM hot_sales_pickup_exception WHERE order_id = $1`,
      [orderId],
    );
    for (const row of exceptions.rows) {
      const type = String(row.exception_type);
      if (type === "no_show") hasNoShowException = true;
      if (type === "cancel") hasCancelException = true;
      if (type === "override") hasOverrideException = true;
    }
  }

  const assignmentStatus = assignment
    ? derivePickupAssignmentStatus({
        totalFulfilled,
        confirmedQuantity,
        hasNoShowException,
        hasCancelException,
        hasOverrideException,
        scheduledWindowId: assignment.windowId,
      })
    : "pending_schedule";

  return { assignment, assignmentStatus, totalFulfilled, confirmedQuantity };
}

export async function syncOrderPickupProjection(orderId: string) {
  const { assignment, assignmentStatus, totalFulfilled } =
    await loadPickupContext(orderId);
  const pickupStatus = projectPickupStatus(assignmentStatus);

  await pool.query(
    `UPDATE hot_sales_order SET
      fulfilled_quantity = $2,
      pickup_status = $3,
      updated_at = NOW()
     WHERE id = $1`,
    [orderId, totalFulfilled > 0 ? totalFulfilled : null, pickupStatus],
  );

  if (assignment) {
    await pool.query(
      `UPDATE hot_sales_pickup_assignment SET status = $2, updated_at = NOW() WHERE id = $1`,
      [assignment.id, assignmentStatus],
    );

    if (assignmentStatus === "picked_up") {
      await pool.query(
        `UPDATE hot_sales_order SET status = 'completed', updated_at = NOW()
         WHERE id = $1 AND status IN ('confirmed', 'partial', 'full')`,
        [orderId],
      );
    }
  }

  return { assignmentStatus, totalFulfilled, pickupStatus };
}

export async function schedulePickup(input: {
  orderId: string;
  windowId: string;
  actorId: string;
}) {
  const assignment = await ensurePickupAssignment(input.orderId);
  await pool.query(
    `UPDATE hot_sales_pickup_assignment
     SET window_id = $2, status = 'scheduled', updated_at = NOW()
     WHERE id = $1`,
    [assignment.id, input.windowId],
  );
  await recordHotSalesAudit({
    orderId: input.orderId,
    action: "pickup.scheduled",
    actorId: input.actorId,
    newValue: { windowId: input.windowId },
  });
  return syncOrderPickupProjection(input.orderId);
}

export async function recordFulfillment(input: {
  orderId: string;
  quantity: number;
  actorId: string;
  finalSupport?: number;
  /** Set when recording absolute qty from legacy complete-order (avoids double-count). */
  absoluteQuantity?: number;
}) {
  const assignment = await ensurePickupAssignment(input.orderId);
  const ctx = await loadPickupContext(input.orderId);

  const gate = canRecordFulfillment({
    assignmentStatus: ctx.assignmentStatus,
    quantity: input.quantity,
    allowOverride: ctx.assignmentStatus === "exception",
  });
  if (!gate.allowed) {
    throw new Error(gate.reason ?? "fulfillment_denied");
  }

  const qtyToRecord =
    input.absoluteQuantity != null
      ? Math.max(0, input.absoluteQuantity - ctx.totalFulfilled)
      : input.quantity;

  if (qtyToRecord <= 0 && input.absoluteQuantity == null) {
    throw new Error("invalid_quantity");
  }
  if (qtyToRecord <= 0 && input.absoluteQuantity != null) {
    return syncOrderPickupProjection(input.orderId);
  }

  await pool.query(
    `INSERT INTO hot_sales_fulfillment_record
      (assignment_id, order_id, quantity, actor_id)
     VALUES ($1, $2, $3, $4)`,
    [assignment.id, input.orderId, qtyToRecord, input.actorId],
  );

  if (input.finalSupport != null) {
    await pool.query(
      `UPDATE hot_sales_order SET final_support = $2, updated_at = NOW() WHERE id = $1`,
      [input.orderId, input.finalSupport],
    );
  }

  await recordHotSalesAudit({
    orderId: input.orderId,
    action: "pickup.fulfillment_recorded",
    actorId: input.actorId,
    newValue: { quantity: qtyToRecord },
  });

  return syncOrderPickupProjection(input.orderId);
}

export async function recordPickupException(input: {
  orderId: string;
  exceptionType: PickupExceptionType;
  reason: string;
  actorId: string;
}) {
  const validation = validatePickupException({
    exceptionType: input.exceptionType,
    reason: input.reason,
  });
  if (!validation.valid) throw new Error(validation.error ?? "invalid_exception");

  const assignment = await ensurePickupAssignment(input.orderId);
  await pool.query(
    `INSERT INTO hot_sales_pickup_exception
      (assignment_id, order_id, exception_type, reason, actor_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      assignment.id,
      input.orderId,
      input.exceptionType,
      input.reason.trim(),
      input.actorId,
    ],
  );
  await recordHotSalesAudit({
    orderId: input.orderId,
    action: `pickup.exception.${input.exceptionType}`,
    actorId: input.actorId,
    reason: input.reason.trim(),
  });
  return syncOrderPickupProjection(input.orderId);
}

export async function listPickupWindowsForEvent(
  eventId: string,
): Promise<HotSalesPickupWindow[]> {
  const result = await pool.query(
    `SELECT * FROM hot_sales_pickup_window WHERE event_id = $1 ORDER BY starts_at`,
    [eventId],
  );
  return result.rows.map(mapWindowRow);
}

export async function listPickupQueueForEvent(
  eventId: string,
): Promise<HotSalesPickupListItem[]> {
  const result = await pool.query(
    `SELECT o.id AS order_id, o.order_number, o.customer_name, o.confirmed_quantity,
            o.fulfilled_quantity, o.pickup_status, o.status AS order_status,
            a.id AS assignment_id, a.status AS assignment_status, a.window_id
     FROM hot_sales_order o
     LEFT JOIN hot_sales_pickup_assignment a ON a.order_id = o.id
     WHERE o.event_id = $1
       AND o.status IN ('confirmed', 'partial', 'full', 'completed')
     ORDER BY o.order_number`,
    [eventId],
  );
  return result.rows.map((row) => ({
    orderId: String(row.order_id),
    orderNumber: String(row.order_number),
    customerName: String(row.customer_name),
    confirmedQuantity:
      row.confirmed_quantity != null ? Number(row.confirmed_quantity) : null,
    fulfilledQuantity:
      row.fulfilled_quantity != null ? Number(row.fulfilled_quantity) : null,
    pickupStatus: String(row.pickup_status),
    orderStatus: String(row.order_status),
    assignmentId: row.assignment_id != null ? String(row.assignment_id) : null,
    assignmentStatus: row.assignment_status != null ? String(row.assignment_status) : null,
    windowId: row.window_id != null ? String(row.window_id) : null,
  }));
}

export async function listFulfillmentRecordsForOrder(
  orderId: string,
): Promise<HotSalesFulfillmentRecord[]> {
  const result = await pool.query(
    `SELECT * FROM hot_sales_fulfillment_record WHERE order_id = $1 ORDER BY recorded_at DESC`,
    [orderId],
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    assignmentId: String(row.assignment_id),
    orderId: String(row.order_id),
    quantity: Number(row.quantity),
    actorId: String(row.actor_id),
    recordedAt: new Date(String(row.recorded_at)),
  }));
}

export async function getPickupFulfilledTotal(orderId: string): Promise<number> {
  const ctx = await loadPickupContext(orderId);
  return ctx.totalFulfilled;
}
