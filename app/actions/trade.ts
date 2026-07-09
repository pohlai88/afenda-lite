"use server";

import { revalidatePath } from "next/cache";
import { requireTradeAccess, requireTradeAdmin } from "@/lib/auth/trade-session";
import {
  calculateAllocation,
  validateManualAllocationQuantity,
} from "@/lib/domain/trade/allocation";
import {
  assertEventFieldEditable,
  canCloseEvent,
  canOpenEvent,
  canSubmitOrder,
} from "@/lib/domain/trade/events";
import {
  applyFieldDefaults,
  sanitizeFieldKey,
  validateOrderAttrs,
} from "@/lib/domain/trade/fields";
import {
  allocationToCsv,
  buildEventSummary,
  eventSummaryToCsv,
} from "@/lib/domain/trade/export";
import {
  calculateEstimatedSupport,
  calculateFinalSupport,
  canCompleteOrder,
  getSupportRate,
} from "@/lib/domain/trade/support";
import { canTransferOrder, resolveDepositStatusForEvent } from "@/lib/domain/trade/transfer";
import {
  approveTransfer,
  cloneEventFromTemplate,
  completeOrder,
  createEvent,
  createOrder,
  createTransferRequest,
  ensureGp2PigletTemplate,
  getEventById,
  getOrderById,
  importPriorityCsv,
  listFieldDefsForEvent,
  listOrdersForEvent,
  listProductsForEvent,
  listTransfersForEvent,
  manualAdjustOrder,
  ordersToCsv,
  recordHotSalesAudit,
  rejectTransfer,
  runAllocationForEvent,
  updateEvent,
  upsertFieldDef,
  upsertProduct,
  upsertSalesMember,
} from "@/lib/domain/trade/store";
import { isTradeLocale, type TradeLocale } from "@/lib/i18n/trade";

function revalidateTrade(locale: TradeLocale, eventId?: string) {
  revalidatePath(`/trade/${locale}/events`);
  revalidatePath(`/trade/${locale}/my-orders`);
  revalidatePath(`/trade/${locale}/admin/events`);
  if (eventId) {
    revalidatePath(`/trade/${locale}/admin/events/${eventId}/setup`);
    revalidatePath(`/trade/${locale}/admin/events/${eventId}/allocation`);
    revalidatePath(`/trade/${locale}/events/${eventId}/order`);
  }
}

export async function createTradeEventAction(
  locale: string,
  formData: FormData,
) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  const admin = await requireTradeAdmin();

  const eventName = String(formData.get("eventName") ?? "").trim();
  const eventType = String(formData.get("eventType") ?? "hot_sales").trim();
  const opensAt = new Date(String(formData.get("opensAt")));
  const closesAt = new Date(String(formData.get("closesAt")));
  const timezone = String(formData.get("timezone") ?? "Asia/Ho_Chi_Minh");
  const sourceLocation = String(formData.get("sourceLocation") ?? "").trim() || undefined;

  if (!eventName || Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime())) {
    return { error: "invalid_input" };
  }

  const event = await createEvent({
    eventName,
    eventType,
    opensAt,
    closesAt,
    timezone,
    sourceLocation,
    createdBy: admin.userId,
  });

  await recordHotSalesAudit({
    eventId: event.id,
    action: "event.created",
    actorId: admin.userId,
    actorRole: "admin",
    newValue: { eventName: event.eventName },
  });

  revalidateTrade(locale);
  return { eventId: event.id };
}

export async function ensurePigletTemplateAction(locale: string) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  const admin = await requireTradeAdmin();
  const event = await ensureGp2PigletTemplate(admin.userId);
  revalidateTrade(locale);
  return { eventId: event.id };
}

export async function cloneTradeEventAction(locale: string, sourceEventId: string) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  const admin = await requireTradeAdmin();
  const event = await cloneEventFromTemplate(sourceEventId, admin.userId);
  await recordHotSalesAudit({
    eventId: event.id,
    action: "event.cloned",
    actorId: admin.userId,
    actorRole: "admin",
    newValue: { clonedFromId: sourceEventId },
  });
  revalidateTrade(locale, event.id);
  return { eventId: event.id };
}

export async function openTradeEventAction(locale: string, eventId: string) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  const admin = await requireTradeAdmin();
  const event = await getEventById(eventId);
  if (!event) return { error: "not_found" };

  const check = canOpenEvent(event);
  if (!check.allowed) return { error: check.reason };

  // Future window → scheduled; otherwise open for ordering immediately.
  const nextStatus =
    Date.now() < event.opensAt.getTime() ? "scheduled" : "open";

  await updateEvent(eventId, { status: nextStatus }, admin.userId);
  await recordHotSalesAudit({
    eventId,
    action: nextStatus === "scheduled" ? "event.scheduled" : "event.opened",
    actorId: admin.userId,
    actorRole: "admin",
    newValue: { status: nextStatus },
  });
  revalidateTrade(locale, eventId);
  return { ok: true };
}

/** Promote scheduled → open once the window has started (admin-triggered). */
export async function activateScheduledTradeEventAction(
  locale: string,
  eventId: string,
) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  const admin = await requireTradeAdmin();
  const event = await getEventById(eventId);
  if (!event) return { error: "not_found" };
  if (event.status !== "scheduled") return { error: "not_scheduled" };
  if (Date.now() < event.opensAt.getTime()) {
    return { error: "window_not_started" };
  }

  await updateEvent(eventId, { status: "open" }, admin.userId);
  await recordHotSalesAudit({
    eventId,
    action: "event.opened",
    actorId: admin.userId,
    actorRole: "admin",
  });
  revalidateTrade(locale, eventId);
  return { ok: true };
}

export async function closeTradeEventAction(locale: string, eventId: string) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  const admin = await requireTradeAdmin();
  const event = await getEventById(eventId);
  if (!event) return { error: "not_found" };

  const check = canCloseEvent(event);
  if (!check.allowed) return { error: check.reason };

  await updateEvent(eventId, { status: "closed" }, admin.userId);
  await recordHotSalesAudit({
    eventId,
    action: "event.closed",
    actorId: admin.userId,
    actorRole: "admin",
  });
  revalidateTrade(locale, eventId);
  return { ok: true };
}

export async function saveTradeEventSetupAction(
  locale: string,
  eventId: string,
  formData: FormData,
) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  const admin = await requireTradeAdmin();
  const event = await getEventById(eventId);
  if (!event) return { error: "not_found" };

  const overrideReason = String(formData.get("overrideReason") ?? "").trim();
  const patch: Parameters<typeof updateEvent>[1] = {
    eventName: String(formData.get("eventName") ?? event.eventName),
    descriptionEn: String(formData.get("descriptionEn") ?? "") || undefined,
    descriptionVi: String(formData.get("descriptionVi") ?? "") || undefined,
    sourceLocation: String(formData.get("sourceLocation") ?? "") || undefined,
    transferAllowed: formData.get("transferAllowed") === "on",
    depositRequired: formData.get("depositRequired") === "on",
    depositRefundable: formData.get("depositRefundable") === "on",
    standaloneProgram: formData.get("standaloneProgram") === "on",
  };

  const supportRaw = formData.get("supportAmountPerUnit");
  if (supportRaw !== null && supportRaw !== "") {
    const nextSupport = Number(supportRaw);
    const supportChanged =
      event.supportAmountPerUnit === null
        ? true
        : nextSupport !== event.supportAmountPerUnit;
    if (supportChanged) {
      const lock = assertEventFieldEditable(event, "supportAmount");
      if (!lock.allowed) {
        // Open: allow override with reason + audit. Closed+: hard lock.
        if (event.status === "open" && !overrideReason) {
          return { error: "override_reason_required" };
        }
        if (event.status !== "open") {
          return { error: lock.reason ?? "support_locked" };
        }
        await recordHotSalesAudit({
          eventId,
          action: "event.support_override",
          actorId: admin.userId,
          actorRole: "admin",
          oldValue: { supportAmountPerUnit: event.supportAmountPerUnit },
          newValue: { supportAmountPerUnit: nextSupport },
          reason: overrideReason,
        });
      }
      patch.supportAmountPerUnit = nextSupport;
    }
  }

  const supportUnitLabel = String(formData.get("supportUnitLabel") ?? "");
  if (supportUnitLabel) {
    patch.supportUnitLabel = supportUnitLabel;
  }

  const opensAtRaw = formData.get("opensAt");
  const closesAtRaw = formData.get("closesAt");
  if (opensAtRaw) {
    const lock = assertEventFieldEditable(event, "opensAt");
    if (!lock.allowed) return { error: lock.reason ?? "opens_at_locked" };
    patch.opensAt = new Date(String(opensAtRaw));
  }
  if (closesAtRaw) {
    const lock = assertEventFieldEditable(event, "closesAt");
    if (!lock.allowed) return { error: lock.reason ?? "closes_at_locked" };
    if (lock.reason === "admin_override_required") {
      if (!overrideReason) return { error: "override_reason_required" };
      await recordHotSalesAudit({
        eventId,
        action: "event.closes_at_override",
        actorId: admin.userId,
        actorRole: "admin",
        oldValue: { closesAt: event.closesAt.toISOString() },
        newValue: { closesAt: String(closesAtRaw) },
        reason: overrideReason,
      });
    }
    patch.closesAt = new Date(String(closesAtRaw));
  }

  await updateEvent(eventId, patch, admin.userId);
  revalidateTrade(locale, eventId);
  return { ok: true };
}

export async function saveTradeProductAction(
  locale: string,
  eventId: string,
  formData: FormData,
) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  const admin = await requireTradeAdmin();
  const event = await getEventById(eventId);
  if (!event) return { error: "not_found" };

  const id = String(formData.get("id") ?? "") || undefined;
  const productLock = assertEventFieldEditable(event, "products");
  const finalQtyLock = assertEventFieldEditable(event, "finalConfirmedQuantity");

  // Closed/allocating: product catalog locked; only final confirmed qty may change.
  if (!productLock.allowed) {
    if (!id) return { error: "products_locked" };
    if (!finalQtyLock.allowed && finalQtyLock.reason !== "audit_required") {
      return { error: productLock.reason ?? "products_locked" };
    }
    const finalConfirmedQuantity = formData.get("finalConfirmedQuantity")
      ? Number(formData.get("finalConfirmedQuantity"))
      : undefined;
    if (finalConfirmedQuantity === undefined || Number.isNaN(finalConfirmedQuantity)) {
      return { error: "final_confirmed_quantity_required" };
    }
    const existing = (await listProductsForEvent(eventId)).find((p) => p.id === id);
    if (!existing) return { error: "product_not_found" };
    await upsertProduct({
      eventId,
      id,
      productName: existing.productName,
      productCode: existing.productCode ?? undefined,
      source: existing.source ?? undefined,
      batch: existing.batch ?? undefined,
      category: existing.category ?? undefined,
      weight: existing.weight ?? undefined,
      unit: existing.unit,
      tentativeQuantity: existing.tentativeQuantity ?? undefined,
      finalConfirmedQuantity,
      supportAmountPerUnit: existing.supportAmountPerUnit ?? undefined,
      pickupLocation: existing.pickupLocation ?? undefined,
    });
    await recordHotSalesAudit({
      eventId,
      action: "product.final_qty_updated",
      actorId: admin.userId,
      actorRole: "admin",
      newValue: { productId: id, finalConfirmedQuantity },
      reason: "final_confirmed_quantity_update",
    });
    revalidateTrade(locale, eventId);
    return { ok: true };
  }

  // Open: limited — no new products; only final confirmed qty on existing rows.
  if (productLock.reason === "limited_no_delete_with_orders") {
    if (!id) return { error: "cannot_add_product_while_open" };
    const finalConfirmedQuantity = formData.get("finalConfirmedQuantity")
      ? Number(formData.get("finalConfirmedQuantity"))
      : undefined;
    if (finalConfirmedQuantity === undefined) {
      return { error: "final_confirmed_quantity_required" };
    }
    const existing = (await listProductsForEvent(eventId)).find((p) => p.id === id);
    if (!existing) return { error: "product_not_found" };
    await upsertProduct({
      eventId,
      id,
      productName: existing.productName,
      productCode: existing.productCode ?? undefined,
      source: existing.source ?? undefined,
      batch: existing.batch ?? undefined,
      category: existing.category ?? undefined,
      weight: existing.weight ?? undefined,
      unit: existing.unit,
      tentativeQuantity: existing.tentativeQuantity ?? undefined,
      finalConfirmedQuantity,
      supportAmountPerUnit: existing.supportAmountPerUnit ?? undefined,
      pickupLocation: existing.pickupLocation ?? undefined,
    });
    await recordHotSalesAudit({
      eventId,
      action: "product.final_qty_updated",
      actorId: admin.userId,
      actorRole: "admin",
      newValue: { productId: id, finalConfirmedQuantity },
    });
    revalidateTrade(locale, eventId);
    return { ok: true };
  }

  await upsertProduct({
    eventId,
    id,
    productName: String(formData.get("productName") ?? ""),
    productCode: String(formData.get("productCode") ?? "") || undefined,
    source: String(formData.get("source") ?? "") || undefined,
    batch: String(formData.get("batch") ?? "") || undefined,
    category: String(formData.get("category") ?? "") || undefined,
    weight: String(formData.get("weight") ?? "") || undefined,
    unit: String(formData.get("unit") ?? "piece"),
    tentativeQuantity: formData.get("tentativeQuantity")
      ? Number(formData.get("tentativeQuantity"))
      : undefined,
    finalConfirmedQuantity: formData.get("finalConfirmedQuantity")
      ? Number(formData.get("finalConfirmedQuantity"))
      : undefined,
    supportAmountPerUnit: formData.get("supportAmountPerUnit")
      ? Number(formData.get("supportAmountPerUnit"))
      : undefined,
    pickupLocation: String(formData.get("pickupLocation") ?? "") || undefined,
  });

  revalidateTrade(locale, eventId);
  return { ok: true };
}

export async function saveTradeFieldDefAction(
  locale: string,
  eventId: string,
  formData: FormData,
) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  const admin = await requireTradeAdmin();
  const event = await getEventById(eventId);
  if (!event) return { error: "not_found" };

  const fieldKey = sanitizeFieldKey(String(formData.get("fieldKey") ?? ""));
  if (!fieldKey) return { error: "invalid_field_key" };

  const fieldId = String(formData.get("id") ?? "") || undefined;
  const required = formData.get("required") === "on";
  const fieldType = String(formData.get("fieldType") ?? "text");
  const existingDefs = await listFieldDefsForEvent(eventId);
  const existing = fieldId
    ? existingDefs.find((f) => f.id === fieldId)
    : existingDefs.find((f) => f.fieldKey === fieldKey);

  if (event.status === "open" || event.status === "closed" || event.status === "allocating") {
    const lock = assertEventFieldEditable(event, "requiredCustomFields");
    if (!lock.allowed) {
      // New required field while open/closed
      if (!existing && required) return { error: lock.reason };
      // Promote optional → required
      if (existing && !existing.required && required) return { error: lock.reason };
      // Change type of an existing required field
      if (existing?.required && existing.fieldType !== fieldType) {
        return { error: lock.reason };
      }
    }
  }

  await upsertFieldDef({
    eventId,
    id: fieldId,
    fieldKey,
    fieldType,
    required,
    labelEn: String(formData.get("labelEn") ?? fieldKey),
    labelVi: String(formData.get("labelVi") ?? fieldKey),
    dropdownOptions: String(formData.get("dropdownOptions") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  });

  await recordHotSalesAudit({
    eventId,
    action: "field_def.saved",
    actorId: admin.userId,
    actorRole: "admin",
    newValue: { fieldKey },
  });

  revalidateTrade(locale, eventId);
  return { ok: true };
}

export async function importPriorityCsvAction(
  locale: string,
  eventId: string,
  csvText: string,
) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  const admin = await requireTradeAdmin();

  const lines = csvText.trim().split(/\r?\n/).slice(1);
  const rows = lines
    .map((line) => line.split(",").map((c) => c.trim().replace(/^"|"$/g, "")))
    .filter((cols) => cols.length >= 2)
    .map((cols) => ({
      customerName: cols[0] ?? "",
      customerCode: cols[1] || undefined,
      priorityRank: Number(cols[2] ?? 999),
      priorityGroup: cols[3] || undefined,
    }));

  await importPriorityCsv(eventId, rows);
  await recordHotSalesAudit({
    eventId,
    action: "priority.imported",
    actorId: admin.userId,
    actorRole: "admin",
    newValue: { count: rows.length },
  });

  revalidateTrade(locale, eventId);
  return { ok: true, count: rows.length };
}

export async function addSalesMemberAction(locale: string, email: string) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  await requireTradeAdmin();
  await upsertSalesMember(email);
  revalidateTrade(locale);
  return { ok: true };
}

export async function submitTradeOrderAction(
  locale: string,
  eventId: string,
  formData: FormData,
) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  const access = await requireTradeAccess();
  const event = await getEventById(eventId);
  if (!event) return { error: "not_found" };

  const now = new Date();
  const gate = canSubmitOrder(event, now);
  if (!gate.allowed) return { error: gate.reason };

  const fieldDefs = await listFieldDefsForEvent(eventId);
  const attrs: Record<string, unknown> = {};
  for (const def of fieldDefs) {
    const raw = formData.get(`attr_${def.fieldKey}`);
    if (raw !== null && raw !== "") {
      if (def.fieldType === "number" || def.fieldType === "currency") {
        attrs[def.fieldKey] = Number(raw);
      } else if (def.fieldType === "boolean") {
        attrs[def.fieldKey] = raw === "true" || raw === "on";
      } else {
        attrs[def.fieldKey] = String(raw);
      }
    }
  }

  const validatedAttrs = applyFieldDefaults(fieldDefs, attrs);
  const validation = validateOrderAttrs(fieldDefs, validatedAttrs);
  if (!validation.valid) return { error: "validation_failed", details: validation.errors };

  const depositStatus = resolveDepositStatusForEvent(
    event,
    (formData.get("depositStatus") as "pending" | "paid" | "waived") ?? undefined,
  );

  const order = await createOrder({
    eventId,
    salespersonUserId: access.userId,
    salespersonEmail: access.email,
    customerName: String(formData.get("customerName") ?? "").trim(),
    customerCode: String(formData.get("customerCode") ?? "").trim() || undefined,
    productId: String(formData.get("productId") ?? ""),
    requestedQuantity: Number(formData.get("requestedQuantity")),
    attrs: validatedAttrs,
    remarks: String(formData.get("remarks") ?? "").trim() || undefined,
    depositStatus,
    registeredAt: now,
  });

  await recordHotSalesAudit({
    eventId,
    orderId: order.id,
    action: "order.registered",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "sales",
    newValue: { orderNumber: order.orderNumber },
  });

  revalidateTrade(locale, eventId);
  return { ok: true, orderId: order.id };
}

export async function runTradeAllocationAction(
  locale: string,
  eventId: string,
  reason?: string,
) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  const admin = await requireTradeAdmin();

  const [event, products, orders] = await Promise.all([
    getEventById(eventId),
    listProductsForEvent(eventId),
    listOrdersForEvent(eventId),
  ]);
  if (!event) return { error: "not_found" };

  const summary = calculateAllocation(products, orders);
  const productById = new Map(products.map((p) => [p.id, p]));

  const results = summary.results.map((r) => {
    const order = orders.find((o) => o.id === r.orderId)!;
    const product = productById.get(order.productId)!;
    const rate = getSupportRate(product, event);
    return {
      orderId: r.orderId,
      confirmedQuantity: r.confirmedQuantity,
      status:
        r.status === "full"
          ? "full"
          : r.status === "partial"
            ? "partial"
            : "rejected",
      estimatedSupport: calculateEstimatedSupport(r.confirmedQuantity, rate),
    };
  });

  await runAllocationForEvent({
    eventId,
    runBy: admin.userId,
    mode: reason ? "rerun" : "auto",
    reason,
    summary: {
      totalRequested: summary.totalRequested,
      totalAllocated: summary.totalAllocated,
      totalRejected: summary.totalRejected,
    },
    results,
  });

  await recordHotSalesAudit({
    eventId,
    action: "allocation.run",
    actorId: admin.userId,
    actorRole: "admin",
    reason,
    newValue: summary,
  });

  revalidateTrade(locale, eventId);
  return { ok: true, summary };
}

export async function previewTradeAllocationAction(
  locale: string,
  eventId: string,
) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  await requireTradeAdmin();

  const [products, orders] = await Promise.all([
    listProductsForEvent(eventId),
    listOrdersForEvent(eventId),
  ]);
  return calculateAllocation(products, orders);
}

export async function manualAdjustTradeOrderAction(
  locale: string,
  orderId: string,
  confirmedQuantity: number,
  reason: string,
) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  const admin = await requireTradeAdmin();
  if (!reason.trim()) return { error: "reason_required" };

  const order = await getOrderById(orderId);
  if (!order) return { error: "not_found" };
  const eventId = order.eventId;

  const [event, products, siblingOrders] = await Promise.all([
    getEventById(eventId),
    listProductsForEvent(eventId),
    listOrdersForEvent(eventId),
  ]);
  if (!event) return { error: "not_found" };

  const product = products.find((p) => p.id === order.productId);
  if (!product) return { error: "product_not_found" };

  const otherAllocated = siblingOrders
    .filter((o) => o.productId === order.productId && o.id !== orderId)
    .reduce((sum, o) => sum + (o.confirmedQuantity ?? 0), 0);

  const cap = validateManualAllocationQuantity({
    confirmedQuantity,
    productFinalSupply: product.finalConfirmedQuantity ?? 0,
    productAlreadyAllocated: product.allocatedQuantity,
    excludingOrderId: orderId,
    otherOrdersAllocatedOnProduct: otherAllocated,
  });
  if (!cap.valid) return { error: cap.reason };

  const rate = getSupportRate(product, event);
  const status =
    confirmedQuantity <= 0
      ? "rejected"
      : confirmedQuantity >= order.requestedQuantity
        ? "full"
        : "partial";

  await manualAdjustOrder({
    orderId,
    confirmedQuantity,
    status,
    estimatedSupport: calculateEstimatedSupport(confirmedQuantity, rate),
    reason,
    actorId: admin.userId,
  });

  revalidateTrade(locale, eventId);
  return { ok: true };
}

export async function requestTransferAction(
  locale: string,
  orderId: string,
  formData: FormData,
) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  const access = await requireTradeAccess();

  const order = await getOrderById(orderId);
  if (!order) return { error: "not_found" };
  if (!access.isAdmin && order.salespersonUserId !== access.userId) {
    return { error: "forbidden" };
  }

  const event = await getEventById(order.eventId);
  if (!event) return { error: "not_found" };

  const check = canTransferOrder(order, event);
  if (!check.allowed) return { error: check.reason };

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "reason_required" };

  await createTransferRequest({
    orderId,
    newCustomerName: String(formData.get("newCustomerName") ?? "").trim(),
    newCustomerCode: String(formData.get("newCustomerCode") ?? "").trim() || undefined,
    transferQuantity: Number(formData.get("transferQuantity")),
    reason,
    requestedBy: access.userId,
  });

  await recordHotSalesAudit({
    eventId: event.id,
    orderId,
    action: "transfer.requested",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "sales",
    reason,
  });

  revalidateTrade(locale, event.id);
  return { ok: true };
}

export async function approveTransferAction(
  locale: string,
  orderId: string,
  transferId: string,
) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  const admin = await requireTradeAdmin();
  const order = await getOrderById(orderId);
  if (!order) return { error: "not_found" };

  await approveTransfer({
    orderId,
    transferId,
    approvedBy: admin.userId,
  });
  await recordHotSalesAudit({
    eventId: order.eventId,
    orderId,
    action: "transfer.approved",
    actorId: admin.userId,
    actorRole: "admin",
    newValue: { transferId },
  });
  revalidateTrade(locale, order.eventId);
  return { ok: true };
}

export async function rejectTransferAction(
  locale: string,
  orderId: string,
  transferId: string,
) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  const admin = await requireTradeAdmin();
  const order = await getOrderById(orderId);
  if (!order) return { error: "not_found" };

  await rejectTransfer({
    orderId,
    transferId,
    approvedBy: admin.userId,
  });
  await recordHotSalesAudit({
    eventId: order.eventId,
    orderId,
    action: "transfer.rejected",
    actorId: admin.userId,
    actorRole: "admin",
    newValue: { transferId },
  });
  revalidateTrade(locale, order.eventId);
  return { ok: true };
}

export async function exportOrdersCsvAction(locale: string, eventId: string) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  await requireTradeAdmin();
  const orders = await listOrdersForEvent(eventId);
  return ordersToCsv(orders);
}

export async function exportEventSummaryCsvAction(locale: string, eventId: string) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  await requireTradeAdmin();
  const [event, products, orders] = await Promise.all([
    getEventById(eventId),
    listProductsForEvent(eventId),
    listOrdersForEvent(eventId),
  ]);
  if (!event) throw new Error("not_found");
  return eventSummaryToCsv(buildEventSummary(event, products, orders));
}

export async function exportAllocationCsvAction(locale: string, eventId: string) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  await requireTradeAdmin();
  const orders = await listOrdersForEvent(eventId);
  return allocationToCsv(orders);
}

export async function completeTradeOrderAction(
  locale: string,
  orderId: string,
  fulfilledQuantity: number,
) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  const admin = await requireTradeAdmin();

  const order = await getOrderById(orderId);
  if (!order) return { error: "not_found" };

  const gate = canCompleteOrder({
    fulfilledQuantity,
    status: order.status,
  });
  if (!gate.allowed) return { error: gate.reason };

  const [event, products] = await Promise.all([
    getEventById(order.eventId),
    listProductsForEvent(order.eventId),
  ]);
  const product = products.find((p) => p.id === order.productId);
  if (!event || !product) return { error: "not_found" };

  const rate = getSupportRate(product, event);
  await completeOrder({
    orderId,
    fulfilledQuantity,
    finalSupport: calculateFinalSupport(fulfilledQuantity, rate) ?? 0,
  });
  await recordHotSalesAudit({
    eventId: order.eventId,
    orderId,
    action: "order.completed",
    actorId: admin.userId,
    actorRole: "admin",
    newValue: { fulfilledQuantity },
  });

  revalidateTrade(locale, order.eventId);
  return { ok: true };
}

export async function listEventTransfersAction(locale: string, eventId: string) {
  if (!isTradeLocale(locale)) throw new Error("invalid_locale");
  await requireTradeAdmin();
  return listTransfersForEvent(eventId);
}
