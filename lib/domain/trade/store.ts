import "server-only";

import { pool } from "@/lib/db";
import {
  mapAllocationRunRow,
  mapEventRow,
  mapFieldDefRow,
  mapOrderRow,
  mapPriorityRow,
  mapProductRow,
  mapSalesMemberRow,
  resolvePriorityForCustomer,
} from "@/lib/domain/trade/mappers";
import { buildGp2PigletTemplate } from "@/lib/domain/trade/templates";
import type {
  HotSalesAllocationMode,
  HotSalesEvent,
  HotSalesFieldDef,
  HotSalesOrder,
  HotSalesProduct,
} from "@/lib/domain/trade/types";

export async function recordHotSalesAudit(input: {
  eventId?: string;
  orderId?: string;
  action: string;
  actorId?: string;
  actorRole?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
}) {
  await pool.query(
    `INSERT INTO hot_sales_audit
      (event_id, order_id, action, actor_id, actor_role, old_value, new_value, reason)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)`,
    [
      input.eventId ?? null,
      input.orderId ?? null,
      input.action,
      input.actorId ?? null,
      input.actorRole ?? null,
      JSON.stringify(input.oldValue ?? {}),
      JSON.stringify(input.newValue ?? {}),
      input.reason ?? null,
    ],
  );
}

export async function listEvents(options?: {
  includeTemplates?: boolean;
}): Promise<HotSalesEvent[]> {
  const includeTemplates = options?.includeTemplates ?? true;
  const result = includeTemplates
    ? await pool.query(`SELECT * FROM hot_sales_event ORDER BY created_at DESC`)
    : await pool.query(
        `SELECT * FROM hot_sales_event WHERE is_template = FALSE ORDER BY created_at DESC`,
      );
  return result.rows.map(mapEventRow);
}

export async function getEventById(id: string): Promise<HotSalesEvent | null> {
  const result = await pool.query(`SELECT * FROM hot_sales_event WHERE id = $1`, [id]);
  return result.rows[0] ? mapEventRow(result.rows[0]) : null;
}

export async function listProductsForEvent(eventId: string): Promise<HotSalesProduct[]> {
  const result = await pool.query(
    `SELECT * FROM hot_sales_product WHERE event_id = $1 ORDER BY sort_order, product_name`,
    [eventId],
  );
  return result.rows.map(mapProductRow);
}

export async function listFieldDefsForEvent(eventId: string): Promise<HotSalesFieldDef[]> {
  const result = await pool.query(
    `SELECT * FROM hot_sales_field_def WHERE event_id = $1 ORDER BY display_order`,
    [eventId],
  );
  return result.rows.map(mapFieldDefRow);
}

export async function listSalesMembers() {
  const result = await pool.query(
    `SELECT * FROM hot_sales_sales_member WHERE active = TRUE ORDER BY email`,
  );
  return result.rows.map(mapSalesMemberRow);
}

export async function listOrdersForEvent(eventId: string): Promise<HotSalesOrder[]> {
  const result = await pool.query(
    `SELECT * FROM hot_sales_order WHERE event_id = $1 ORDER BY registered_at ASC`,
    [eventId],
  );
  return result.rows.map(mapOrderRow);
}

export async function listOrdersForSalesperson(
  eventId: string,
  salespersonUserId: string,
): Promise<HotSalesOrder[]> {
  const result = await pool.query(
    `SELECT * FROM hot_sales_order
     WHERE event_id = $1 AND salesperson_user_id = $2
     ORDER BY registered_at DESC`,
    [eventId, salespersonUserId],
  );
  return result.rows.map(mapOrderRow);
}

export async function listAllOrdersForSalesperson(
  salespersonUserId: string,
): Promise<HotSalesOrder[]> {
  const result = await pool.query(
    `SELECT * FROM hot_sales_order
     WHERE salesperson_user_id = $1
     ORDER BY registered_at DESC`,
    [salespersonUserId],
  );
  return result.rows.map(mapOrderRow);
}

export async function listPrioritiesForEvent(eventId: string) {
  const result = await pool.query(
    `SELECT * FROM hot_sales_customer_priority WHERE event_id = $1 ORDER BY priority_rank`,
    [eventId],
  );
  return result.rows.map(mapPriorityRow);
}

export async function listAuditForEvent(eventId: string) {
  const result = await pool.query(
    `SELECT * FROM hot_sales_audit WHERE event_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [eventId],
  );
  return result.rows;
}

function generateEventCode(name: string): string {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  const suffix = Date.now().toString(36).toUpperCase();
  return `${slug || "EVENT"}-${suffix}`;
}

export async function createEvent(input: {
  eventName: string;
  eventType: string;
  opensAt: Date;
  closesAt: Date;
  timezone: string;
  createdBy: string;
  sourceLocation?: string;
  descriptionEn?: string;
  descriptionVi?: string;
  isTemplate?: boolean;
}): Promise<HotSalesEvent> {
  const eventCode = generateEventCode(input.eventName);
  const result = await pool.query(
    `INSERT INTO hot_sales_event
      (event_code, event_name, event_type, description_en, description_vi,
       opens_at, closes_at, timezone, source_location, is_template, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
     RETURNING *`,
    [
      eventCode,
      input.eventName,
      input.eventType,
      input.descriptionEn ?? null,
      input.descriptionVi ?? null,
      input.opensAt,
      input.closesAt,
      input.timezone,
      input.sourceLocation ?? null,
      input.isTemplate ?? false,
      input.createdBy,
    ],
  );
  return mapEventRow(result.rows[0]);
}

export async function updateEvent(
  id: string,
  patch: Partial<{
    eventName: string;
    descriptionEn: string;
    descriptionVi: string;
    opensAt: Date;
    closesAt: Date;
    status: string;
    sourceLocation: string;
    supportAmountPerUnit: number;
    supportUnitLabel: string;
    transferAllowed: boolean;
    depositRequired: boolean;
    depositRefundable: boolean;
    standaloneProgram: boolean;
  }>,
  updatedBy: string,
) {
  const sets: string[] = ["updated_by = $2", "updated_at = NOW()"];
  const values: unknown[] = [id, updatedBy];
  let idx = 3;

  const fieldMap: Record<string, string> = {
    eventName: "event_name",
    descriptionEn: "description_en",
    descriptionVi: "description_vi",
    opensAt: "opens_at",
    closesAt: "closes_at",
    status: "status",
    sourceLocation: "source_location",
    supportAmountPerUnit: "support_amount_per_unit",
    supportUnitLabel: "support_unit_label",
    transferAllowed: "transfer_allowed",
    depositRequired: "deposit_required",
    depositRefundable: "deposit_refundable",
    standaloneProgram: "standalone_program",
  };

  for (const [key, column] of Object.entries(fieldMap)) {
    const val = patch[key as keyof typeof patch];
    if (val !== undefined) {
      sets.push(`${column} = $${idx++}`);
      values.push(val);
    }
  }

  const result = await pool.query(
    `UPDATE hot_sales_event SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    values,
  );
  return mapEventRow(result.rows[0]);
}

export async function cloneEventFromTemplate(
  sourceEventId: string,
  createdBy: string,
  overrides?: { eventName?: string; opensAt?: Date; closesAt?: Date },
): Promise<HotSalesEvent> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const source = await client.query(`SELECT * FROM hot_sales_event WHERE id = $1`, [
      sourceEventId,
    ]);
    if (!source.rows[0]) {
      throw new Error("source_event_not_found");
    }
    const src = source.rows[0];

    const newEvent = await client.query(
      `INSERT INTO hot_sales_event
        (event_code, event_name, event_type, description_en, description_vi,
         opens_at, closes_at, timezone, source_location, allocation_method,
         standalone_program, combination_allowed, transfer_allowed,
         deposit_required, deposit_refundable, support_type, support_amount_per_unit,
         support_unit_label, is_template, cloned_from_id, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, FALSE, $19, $20, $20)
       RETURNING *`,
      [
        generateEventCode(overrides?.eventName ?? `${src.event_name} Copy`),
        overrides?.eventName ?? `${src.event_name} Copy`,
        src.event_type,
        src.description_en,
        src.description_vi,
        overrides?.opensAt ?? src.opens_at,
        overrides?.closesAt ?? src.closes_at,
        src.timezone,
        src.source_location,
        src.allocation_method,
        src.standalone_program,
        src.combination_allowed,
        src.transfer_allowed,
        src.deposit_required,
        src.deposit_refundable,
        src.support_type,
        src.support_amount_per_unit,
        src.support_unit_label,
        sourceEventId,
        createdBy,
      ],
    );
    const eventId = newEvent.rows[0].id;

    const products = await client.query(
      `SELECT * FROM hot_sales_product WHERE event_id = $1`,
      [sourceEventId],
    );
    for (const p of products.rows) {
      await client.query(
        `INSERT INTO hot_sales_product
          (event_id, product_name, product_code, source, batch, category, weight, unit,
           tentative_quantity, final_confirmed_quantity, support_amount_per_unit, pickup_location, sort_order, attrs)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)`,
        [
          eventId,
          p.product_name,
          p.product_code,
          p.source,
          p.batch,
          p.category,
          p.weight,
          p.unit,
          p.tentative_quantity,
          null,
          p.support_amount_per_unit,
          p.pickup_location,
          p.sort_order,
          JSON.stringify(p.attrs ?? {}),
        ],
      );
    }

    const fields = await client.query(
      `SELECT * FROM hot_sales_field_def WHERE event_id = $1`,
      [sourceEventId],
    );
    for (const f of fields.rows) {
      await client.query(
        `INSERT INTO hot_sales_field_def
          (event_id, entity_type, field_key, field_type, required, default_value,
           label_en, label_vi, help_text_en, help_text_vi, dropdown_options,
           visible_to_roles, editable_by_roles, display_order, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14, $15)`,
        [
          eventId,
          f.entity_type,
          f.field_key,
          f.field_type,
          f.required,
          f.default_value,
          f.label_en,
          f.label_vi,
          f.help_text_en,
          f.help_text_vi,
          JSON.stringify(f.dropdown_options),
          JSON.stringify(f.visible_to_roles),
          JSON.stringify(f.editable_by_roles),
          f.display_order,
          f.active,
        ],
      );
    }

    const priorities = await client.query(
      `SELECT * FROM hot_sales_customer_priority WHERE event_id = $1`,
      [sourceEventId],
    );
    for (const pr of priorities.rows) {
      await client.query(
        `INSERT INTO hot_sales_customer_priority
          (event_id, customer_name, customer_code, priority_rank, priority_group,
           salesperson_user_id, max_allocation, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          eventId,
          pr.customer_name,
          pr.customer_code,
          pr.priority_rank,
          pr.priority_group,
          pr.salesperson_user_id,
          pr.max_allocation,
          pr.remarks,
        ],
      );
    }

    await client.query("COMMIT");
    return mapEventRow(newEvent.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function ensureGp2PigletTemplate(createdBy: string): Promise<HotSalesEvent> {
  const existing = await pool.query(
    `SELECT * FROM hot_sales_event WHERE is_template = TRUE AND event_code = 'GP2-PIGLET-TEMPLATE' LIMIT 1`,
  );
  if (existing.rows[0]) {
    return mapEventRow(existing.rows[0]);
  }

  const template = buildGp2PigletTemplate();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const eventResult = await client.query(
      `INSERT INTO hot_sales_event
        (event_code, event_name, event_type, description_en, description_vi,
         opens_at, closes_at, timezone, status, source_location, allocation_method,
         standalone_program, combination_allowed, transfer_allowed,
         deposit_required, deposit_refundable, support_type, support_amount_per_unit,
         support_unit_label, is_template, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, TRUE, $19, $19)
       RETURNING *`,
      [
        template.event.eventCode,
        template.event.eventName,
        template.event.eventType,
        template.event.descriptionEn,
        template.event.descriptionVi,
        template.event.opensAt,
        template.event.closesAt,
        template.event.timezone,
        template.event.sourceLocation,
        template.event.allocationMethod,
        template.event.standaloneProgram,
        template.event.combinationAllowed,
        template.event.transferAllowed,
        template.event.depositRequired,
        template.event.depositRefundable,
        template.event.supportType,
        template.event.supportAmountPerUnit,
        template.event.supportUnitLabel,
        createdBy,
      ],
    );
    const eventId = eventResult.rows[0].id;

    for (const p of template.products) {
      await client.query(
        `INSERT INTO hot_sales_product
          (event_id, product_name, product_code, source, batch, category, weight, unit,
           tentative_quantity, support_amount_per_unit, pickup_location, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          eventId,
          p.productName,
          p.productCode,
          p.source,
          p.batch,
          p.category,
          p.weight,
          p.unit,
          p.tentativeQuantity,
          p.supportAmountPerUnit,
          p.pickupLocation,
          p.sortOrder,
        ],
      );
    }

    for (const f of template.fieldDefs) {
      await client.query(
        `INSERT INTO hot_sales_field_def
          (event_id, entity_type, field_key, field_type, required, default_value,
           label_en, label_vi, help_text_en, help_text_vi, dropdown_options,
           visible_to_roles, editable_by_roles, display_order, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14, $15)`,
        [
          eventId,
          f.entityType,
          f.fieldKey,
          f.fieldType,
          f.required,
          f.defaultValue,
          f.labelEn,
          f.labelVi,
          f.helpTextEn,
          f.helpTextVi,
          JSON.stringify(f.dropdownOptions),
          JSON.stringify(f.visibleToRoles),
          JSON.stringify(f.editableByRoles),
          f.displayOrder,
          f.active,
        ],
      );
    }

    await client.query("COMMIT");
    return mapEventRow(eventResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function upsertProduct(input: {
  eventId: string;
  id?: string;
  productName: string;
  productCode?: string;
  source?: string;
  batch?: string;
  category?: string;
  weight?: string;
  unit: string;
  tentativeQuantity?: number;
  finalConfirmedQuantity?: number;
  supportAmountPerUnit?: number;
  pickupLocation?: string;
  sortOrder?: number;
}) {
  if (input.id) {
    const result = await pool.query(
      `UPDATE hot_sales_product SET
        product_name = $2, product_code = $3, source = $4, batch = $5, category = $6,
        weight = $7, unit = $8, tentative_quantity = $9, final_confirmed_quantity = $10,
        support_amount_per_unit = $11, pickup_location = $12, sort_order = $13, updated_at = NOW()
       WHERE id = $1 AND event_id = $14 RETURNING *`,
      [
        input.id,
        input.productName,
        input.productCode ?? null,
        input.source ?? null,
        input.batch ?? null,
        input.category ?? null,
        input.weight ?? null,
        input.unit,
        input.tentativeQuantity ?? null,
        input.finalConfirmedQuantity ?? null,
        input.supportAmountPerUnit ?? null,
        input.pickupLocation ?? null,
        input.sortOrder ?? 0,
        input.eventId,
      ],
    );
    return mapProductRow(result.rows[0]);
  }

  const result = await pool.query(
    `INSERT INTO hot_sales_product
      (event_id, product_name, product_code, source, batch, category, weight, unit,
       tentative_quantity, final_confirmed_quantity, support_amount_per_unit, pickup_location, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
    [
      input.eventId,
      input.productName,
      input.productCode ?? null,
      input.source ?? null,
      input.batch ?? null,
      input.category ?? null,
      input.weight ?? null,
      input.unit,
      input.tentativeQuantity ?? null,
      input.finalConfirmedQuantity ?? null,
      input.supportAmountPerUnit ?? null,
      input.pickupLocation ?? null,
      input.sortOrder ?? 0,
    ],
  );
  return mapProductRow(result.rows[0]);
}

export async function upsertFieldDef(input: {
  eventId: string;
  id?: string;
  fieldKey: string;
  fieldType: string;
  required: boolean;
  labelEn: string;
  labelVi: string;
  dropdownOptions?: string[];
  displayOrder?: number;
}) {
  if (input.id) {
    const result = await pool.query(
      `UPDATE hot_sales_field_def SET
        field_key = $2, field_type = $3, required = $4, label_en = $5, label_vi = $6,
        dropdown_options = $7::jsonb, display_order = $8
       WHERE id = $1 AND event_id = $9 RETURNING *`,
      [
        input.id,
        input.fieldKey,
        input.fieldType,
        input.required,
        input.labelEn,
        input.labelVi,
        JSON.stringify(input.dropdownOptions ?? null),
        input.displayOrder ?? 0,
        input.eventId,
      ],
    );
    return mapFieldDefRow(result.rows[0]);
  }

  const result = await pool.query(
    `INSERT INTO hot_sales_field_def
      (event_id, field_key, field_type, required, label_en, label_vi, dropdown_options, display_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8) RETURNING *`,
    [
      input.eventId,
      input.fieldKey,
      input.fieldType,
      input.required,
      input.labelEn,
      input.labelVi,
      JSON.stringify(input.dropdownOptions ?? null),
      input.displayOrder ?? 0,
    ],
  );
  return mapFieldDefRow(result.rows[0]);
}

export async function importPriorityCsv(
  eventId: string,
  rows: Array<{
    customerName: string;
    customerCode?: string;
    priorityRank: number;
    priorityGroup?: string;
  }>,
) {
  await pool.query(`DELETE FROM hot_sales_customer_priority WHERE event_id = $1`, [
    eventId,
  ]);
  for (const row of rows) {
    await pool.query(
      `INSERT INTO hot_sales_customer_priority
        (event_id, customer_name, customer_code, priority_rank, priority_group)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        eventId,
        row.customerName,
        row.customerCode ?? null,
        row.priorityRank,
        row.priorityGroup ?? null,
      ],
    );
  }
}

export async function upsertSalesMember(email: string, userId?: string) {
  await pool.query(
    `INSERT INTO hot_sales_sales_member (email, user_id, active)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (email) DO UPDATE SET user_id = COALESCE(EXCLUDED.user_id, hot_sales_sales_member.user_id), active = TRUE`,
    [email.trim().toLowerCase(), userId ?? null],
  );
}

async function nextOrderNumber(eventId: string): Promise<string> {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM hot_sales_order WHERE event_id = $1`,
    [eventId],
  );
  const count = (result.rows[0]?.count ?? 0) + 1;
  return `HS-${String(count).padStart(5, "0")}`;
}

export async function getOrderById(orderId: string): Promise<HotSalesOrder | null> {
  const result = await pool.query(`SELECT * FROM hot_sales_order WHERE id = $1`, [
    orderId,
  ]);
  return result.rows[0] ? mapOrderRow(result.rows[0]) : null;
}

export type HotSalesTransferRow = {
  id: string;
  orderId: string;
  originalCustomerName: string;
  originalCustomerCode: string | null;
  newCustomerName: string;
  newCustomerCode: string | null;
  transferQuantity: number;
  reason: string;
  status: string;
  requestedBy: string;
  requestedAt: Date;
  approvedBy: string | null;
  approvedAt: Date | null;
  orderNumber: string;
};

export async function listTransfersForEvent(
  eventId: string,
): Promise<HotSalesTransferRow[]> {
  const result = await pool.query(
    `SELECT t.*, o.order_number
     FROM hot_sales_transfer t
     JOIN hot_sales_order o ON o.id = t.order_id
     WHERE o.event_id = $1
     ORDER BY t.requested_at DESC`,
    [eventId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    orderId: row.order_id,
    originalCustomerName: row.original_customer_name,
    originalCustomerCode: row.original_customer_code,
    newCustomerName: row.new_customer_name,
    newCustomerCode: row.new_customer_code,
    transferQuantity: Number(row.transfer_quantity),
    reason: row.reason,
    status: row.status,
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    orderNumber: row.order_number,
  }));
}

export async function createOrder(input: {
  eventId: string;
  salespersonUserId: string;
  salespersonEmail: string;
  customerName: string;
  customerCode?: string;
  productId: string;
  requestedQuantity: number;
  attrs: Record<string, unknown>;
  remarks?: string;
  depositStatus: string;
  registeredAt: Date;
}) {
  const priorities = await listPrioritiesForEvent(input.eventId);
  const { priorityRank, priorityGroup } = resolvePriorityForCustomer(
    priorities,
    input.customerCode ?? null,
    input.customerName,
  );

  const orderNumber = await nextOrderNumber(input.eventId);
  const result = await pool.query(
    `INSERT INTO hot_sales_order
      (event_id, order_number, salesperson_user_id, salesperson_email,
       customer_name, customer_code, priority_rank, priority_group, product_id,
       requested_quantity, status, deposit_status, attrs, remarks, registered_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'registered', $11, $12::jsonb, $13, $14)
     RETURNING *`,
    [
      input.eventId,
      orderNumber,
      input.salespersonUserId,
      input.salespersonEmail,
      input.customerName,
      input.customerCode ?? null,
      priorityRank,
      priorityGroup,
      input.productId,
      input.requestedQuantity,
      input.depositStatus,
      JSON.stringify(input.attrs),
      input.remarks ?? null,
      input.registeredAt,
    ],
  );
  return mapOrderRow(result.rows[0]);
}

export async function runAllocationForEvent(input: {
  eventId: string;
  runBy: string;
  mode: HotSalesAllocationMode;
  reason?: string;
  summary: Record<string, unknown>;
  results: Array<{
    orderId: string;
    confirmedQuantity: number;
    status: string;
    estimatedSupport: number | null;
  }>;
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const runResult = await client.query(
      `INSERT INTO hot_sales_allocation_run (event_id, run_by, mode, reason, result_summary)
       VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING *`,
      [
        input.eventId,
        input.runBy,
        input.mode,
        input.reason ?? null,
        JSON.stringify(input.summary),
      ],
    );
    const runId = runResult.rows[0].id;

    for (const r of input.results) {
      await client.query(
        `UPDATE hot_sales_order SET
          confirmed_quantity = $2,
          status = $3,
          estimated_support = $4,
          allocation_run_id = $5,
          updated_at = NOW()
         WHERE id = $1`,
        [r.orderId, r.confirmedQuantity, r.status, r.estimatedSupport, runId],
      );
    }

    const productTotals = new Map<string, number>();
    for (const r of input.results) {
      const orderRow = await client.query(
        `SELECT product_id FROM hot_sales_order WHERE id = $1`,
        [r.orderId],
      );
      const productId = orderRow.rows[0]?.product_id as string;
      if (productId) {
        productTotals.set(
          productId,
          (productTotals.get(productId) ?? 0) + r.confirmedQuantity,
        );
      }
    }
    for (const [productId, qty] of productTotals) {
      await client.query(
        `UPDATE hot_sales_product SET allocated_quantity = $2, updated_at = NOW() WHERE id = $1`,
        [productId, qty],
      );
    }

    await client.query(
      `UPDATE hot_sales_event SET status = 'allocating', updated_at = NOW() WHERE id = $1`,
      [input.eventId],
    );

    await client.query("COMMIT");
    return mapAllocationRunRow(runResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function recomputeProductAllocatedQuantity(productId: string) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(confirmed_quantity), 0)::numeric AS total
     FROM hot_sales_order
     WHERE product_id = $1
       AND status IN ('partial', 'full', 'confirmed', 'completed')
       AND confirmed_quantity IS NOT NULL`,
    [productId],
  );
  const total = Number(result.rows[0]?.total ?? 0);
  await pool.query(
    `UPDATE hot_sales_product SET allocated_quantity = $2, updated_at = NOW() WHERE id = $1`,
    [productId, total],
  );
  return total;
}

export async function manualAdjustOrder(input: {
  orderId: string;
  confirmedQuantity: number;
  status: string;
  estimatedSupport: number | null;
  reason: string;
  actorId: string;
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const before = await client.query(`SELECT * FROM hot_sales_order WHERE id = $1`, [
      input.orderId,
    ]);
    if (!before.rows[0]) {
      throw new Error("order_not_found");
    }
    const result = await client.query(
      `UPDATE hot_sales_order SET
        confirmed_quantity = $2, status = $3, estimated_support = $4, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [input.orderId, input.confirmedQuantity, input.status, input.estimatedSupport],
    );
    const productId = result.rows[0].product_id as string;
    const sum = await client.query(
      `SELECT COALESCE(SUM(confirmed_quantity), 0)::numeric AS total
       FROM hot_sales_order
       WHERE product_id = $1
         AND status IN ('partial', 'full', 'confirmed', 'completed')
         AND confirmed_quantity IS NOT NULL`,
      [productId],
    );
    await client.query(
      `UPDATE hot_sales_product SET allocated_quantity = $2, updated_at = NOW() WHERE id = $1`,
      [productId, Number(sum.rows[0]?.total ?? 0)],
    );
    await client.query(
      `INSERT INTO hot_sales_audit
        (event_id, order_id, action, actor_id, actor_role, old_value, new_value, reason)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)`,
      [
        result.rows[0].event_id,
        input.orderId,
        "allocation.manual_adjust",
        input.actorId,
        "admin",
        JSON.stringify(before.rows[0] ?? {}),
        JSON.stringify(result.rows[0]),
        input.reason,
      ],
    );
    await client.query("COMMIT");
    return mapOrderRow(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createTransferRequest(input: {
  orderId: string;
  newCustomerName: string;
  newCustomerCode?: string;
  transferQuantity: number;
  reason: string;
  requestedBy: string;
}) {
  const orderResult = await pool.query(`SELECT * FROM hot_sales_order WHERE id = $1`, [
    input.orderId,
  ]);
  const order = orderResult.rows[0];
  if (!order) throw new Error("order_not_found");

  await pool.query(
    `INSERT INTO hot_sales_transfer
      (order_id, original_customer_name, original_customer_code, new_customer_name,
       new_customer_code, transfer_quantity, reason, requested_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      input.orderId,
      order.customer_name,
      order.customer_code,
      input.newCustomerName,
      input.newCustomerCode ?? null,
      input.transferQuantity,
      input.reason,
      input.requestedBy,
    ],
  );

  await pool.query(
    `UPDATE hot_sales_order SET transfer_status = 'requested', updated_at = NOW() WHERE id = $1`,
    [input.orderId],
  );
}

export async function approveTransfer(input: {
  orderId: string;
  transferId: string;
  approvedBy: string;
}) {
  const transfer = await pool.query(`SELECT * FROM hot_sales_transfer WHERE id = $1`, [
    input.transferId,
  ]);
  const t = transfer.rows[0];
  if (!t) throw new Error("transfer_not_found");

  await pool.query(
    `UPDATE hot_sales_transfer SET status = 'approved', approved_by = $2, approved_at = NOW() WHERE id = $1`,
    [input.transferId, input.approvedBy],
  );
  await pool.query(
    `UPDATE hot_sales_order SET
      customer_name = $2, customer_code = $3, transfer_status = 'approved', updated_at = NOW()
     WHERE id = $1`,
    [input.orderId, t.new_customer_name, t.new_customer_code],
  );
}

export async function rejectTransfer(input: {
  orderId: string;
  transferId: string;
  approvedBy: string;
}) {
  await pool.query(
    `UPDATE hot_sales_transfer SET status = 'rejected', approved_by = $2, approved_at = NOW() WHERE id = $1`,
    [input.transferId, input.approvedBy],
  );
  await pool.query(
    `UPDATE hot_sales_order SET transfer_status = 'rejected', updated_at = NOW() WHERE id = $1`,
    [input.orderId],
  );
}

export async function completeOrder(input: {
  orderId: string;
  fulfilledQuantity: number;
  finalSupport: number;
}) {
  const result = await pool.query(
    `UPDATE hot_sales_order SET
      fulfilled_quantity = $2, final_support = $3, status = 'completed',
      pickup_status = 'picked_up', updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [input.orderId, input.fulfilledQuantity, input.finalSupport],
  );
  return mapOrderRow(result.rows[0]);
}

export function ordersToCsv(orders: HotSalesOrder[]): string {
  const headers = [
    "order_number",
    "customer_name",
    "customer_code",
    "priority_rank",
    "requested_quantity",
    "confirmed_quantity",
    "fulfilled_quantity",
    "status",
    "deposit_status",
    "registered_at",
  ];
  const lines = [headers.join(",")];
  for (const o of orders) {
    lines.push(
      [
        o.orderNumber,
        `"${o.customerName.replace(/"/g, '""')}"`,
        o.customerCode ?? "",
        o.priorityRank,
        o.requestedQuantity,
        o.confirmedQuantity ?? "",
        o.fulfilledQuantity ?? "",
        o.status,
        o.depositStatus,
        o.registeredAt.toISOString(),
      ].join(","),
    );
  }
  return lines.join("\n");
}
