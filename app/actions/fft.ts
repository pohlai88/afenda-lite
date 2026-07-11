"use server";

import { revalidatePath } from "next/cache";
import { requireFftAdmin, requireTradePermission } from "@/modules/fft/auth/fft-session";
import { resolveFftOrganizationContext } from "@/features/fft/fft-organization-context";
import { assertImportRowLimit } from "@/modules/fft/domain/import-validators";
import { enqueueErpSyncJob } from "@/modules/fft/domain/erp-sync-store";
import { notifyDepositPending, notifyTradeStakeholder } from "@/modules/fft/domain/fft-notify";
import { toFftActionErrorMessage } from "@/modules/fft/domain/fft-action-result";
import { isFftErpSyncEnabled, isFftDepositEnabled, isFftPickupOpsEnabled } from "@/modules/platform/env/accessors";
import {
  assertFftDepositFeatureAction,
  assertFftPickupFeatureAction,
} from "@/modules/fft/auth/fft-phase2b";
import { assertFftErpSyncFeatureAction } from "@/modules/fft/auth/fft-phase2d";
import {
  ensureDepositForOrder,
  listDepositsForEvent,
  listFinanceAuditForEvent,
  recordDepositAdjustment,
  recordDepositReceipt,
  updateDepositDetails,
} from "@/modules/fft/domain/deposit-store";
import {
  cancelImportBatch,
  commitImportBatch,
  createImportBatch,
  getImportBatchById,
  listImportRowsForBatch,
} from "@/modules/fft/domain/import-store";
import { buildImportTemplateWorkbook, parseImportWorkbook } from "@/modules/fft/domain/import-parse";
import { validateImportRowsForDryRun } from "@/modules/fft/domain/import-dry-run";
import {
  assertImportFeatureGate,
  importPermissionForType,
  parseImportType,
} from "@/modules/fft/domain/import-guards";
import {
  createPickupWindow,
  recordFulfillment,
  recordPickupException,
  schedulePickup,
} from "@/modules/fft/domain/pickup-store";
import {
  FFT_SCOPE_TYPES,
  type FftScopeType,
} from "@/modules/fft/domain/rbac-catalog";
import {
  calculateAllocation,
  validateManualAllocationQuantity,
} from "@/modules/fft/domain/allocation";
import {
  assertEventFieldEditable,
  canActivateScheduledEvent,
  canCloseEvent,
  canOpenEvent,
  canSubmitOrder,
} from "@/modules/fft/domain/events";
import {
  applyFieldDefaults,
  sanitizeFieldKey,
  validateOrderAttrs,
} from "@/modules/fft/domain/fields";
import { parseAndValidatePriorityCsv } from "@/modules/fft/domain/priority-csv";
import {
  allocationToCsv,
  buildEventSummary,
  eventSummaryToCsv,
} from "@/modules/fft/domain/export";
import {
  calculateEstimatedSupport,
  calculateFinalSupport,
  canCompleteOrder,
  getSupportRate,
} from "@/modules/fft/domain/support";
import { canTransferOrder, resolveDepositStatusForEvent } from "@/modules/fft/domain/transfer";
import {
  approveTransfer,
  cloneEventFromTemplate,
  completeOrder,
  createCustomRole,
  createEvent,
  createOrder,
  createTransferRequest,
  duplicateRole,
  ensureGp2PigletTemplate,
  ensureRoleAssignment,
  getEventById,
  getOrderById,
  importPriorityCsv,
  listFieldDefsForEvent,
  listOrdersForEvent,
  listProductsForEvent,
  listTransfersForEvent,
  manualAdjustOrder,
  ordersToCsv,
  recordFftAudit,
  rejectTransfer,
  revokeRoleAssignment,
  runAllocationForEvent,
  seedFftRbacCatalog,
  setRoleActive,
  setRolePermissions,
  updateEvent,
  upsertFieldDef,
  upsertProduct,
  upsertSalesMember,
} from "@/modules/fft/domain/store";
import { type FftLocale } from "@/modules/fft/i18n/fft-i18n";
import {
  parseFftEventId,
  parseFftLocale,
  parseFftOrderId,
} from "@/modules/fft/schemas/fft-schemas";

async function getScopedEvent(eventId: string, userId?: string) {
  const org = await resolveFftOrganizationContext(userId);
  return getEventById(eventId, org.organizationId);
}

/** Zod-backed locale gate — returns action error shape (no throws). */
function gateFftLocale(
  locale: string,
): FftLocale | { error: "invalid_locale" } {
  const parsed = parseFftLocale(locale);
  if (!parsed.success) return { error: "invalid_locale" };
  return parsed.data;
}

function gateFftEventId(
  eventId: string,
): string | { error: "invalid_event_id" } {
  const parsed = parseFftEventId(eventId);
  if (!parsed.success) return { error: "invalid_event_id" };
  return parsed.data;
}

function gateFftOrderId(
  orderId: string,
): string | { error: "invalid_order_id" } {
  const parsed = parseFftOrderId(orderId);
  if (!parsed.success) return { error: "invalid_order_id" };
  return parsed.data;
}

function revalidateFft(_locale: FftLocale | string, eventId?: string) {
  revalidatePath("/fft/events");
  revalidatePath("/fft/my-orders");
  revalidatePath("/fft/admin/events");
  revalidatePath("/fft/admin/rbac");
  revalidatePath("/fft/admin/events/new");
  if (eventId) {
    revalidatePath(`/fft/admin/events/${eventId}/setup`);
    revalidatePath(`/fft/admin/events/${eventId}/allocation`);
    revalidatePath(`/fft/admin/events/${eventId}/imports`);
    revalidatePath(`/fft/events/${eventId}/order`);
  }
}

export async function createFftEventAction(
  locale: string,
  formData: FormData,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const access = await requireTradePermission("event.create");

  const eventName = String(formData.get("eventName") ?? "").trim();
  const eventType = String(formData.get("eventType") ?? "hot_sales").trim();
  const opensAt = new Date(String(formData.get("opensAt")));
  const closesAt = new Date(String(formData.get("closesAt")));
  const timezone = String(formData.get("timezone") ?? "Asia/Ho_Chi_Minh");
  const sourceLocation = String(formData.get("sourceLocation") ?? "").trim() || undefined;

  if (!eventName || Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime())) {
    return { error: "invalid_input" };
  }

  const org = await resolveFftOrganizationContext(access.userId);
  const event = await createEvent({
    eventName,
    eventType,
    opensAt,
    closesAt,
    timezone,
    sourceLocation,
    createdBy: access.userId,
    organizationId: org.organizationId,
  });

  await recordFftAudit({
    eventId: event.id,
    action: "event.created",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "ops",
    newValue: { eventName: event.eventName },
  });

  revalidateFft(gatedLocale);
  return { eventId: event.id };
}

export async function ensurePigletTemplateAction(locale: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const admin = await requireFftAdmin();
  const event = await ensureGp2PigletTemplate(admin.userId);
  revalidateFft(gatedLocale);
  return { eventId: event.id };
}

export async function cloneFftEventAction(locale: string, sourceEventId: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedSourceId = gateFftEventId(sourceEventId);
  if (typeof gatedSourceId === "object") return gatedSourceId;

  const admin = await requireFftAdmin();
  try {
    const event = await cloneEventFromTemplate(gatedSourceId, admin.userId);
    await recordFftAudit({
      eventId: event.id,
      action: "event.cloned",
      actorId: admin.userId,
      actorRole: "admin",
      newValue: { clonedFromId: gatedSourceId },
    });
    revalidateFft(gatedLocale, event.id);
    return { eventId: event.id };
  } catch (error) {
    if (error instanceof Error && error.message === "source_event_not_found") {
      return { error: "not_found" as const };
    }
    throw error;
  }
}

export async function openFftEventAction(locale: string, eventId: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") return gatedEventId;
  const admin = await requireTradePermission("event.open_close", {
    eventId: gatedEventId,
  });
  const event = await getScopedEvent(gatedEventId);
  if (!event) return { error: "not_found" };

  const check = canOpenEvent(event);
  if (!check.allowed) return { error: check.reason };

  // Future window → scheduled; otherwise open for ordering immediately.
  const nextStatus =
    Date.now() < event.opensAt.getTime() ? "scheduled" : "open";

  await updateEvent(gatedEventId, { status: nextStatus }, admin.userId);
  await recordFftAudit({
    eventId: gatedEventId,
    action: nextStatus === "scheduled" ? "event.scheduled" : "event.opened",
    actorId: admin.userId,
    actorRole: "admin",
    newValue: { status: nextStatus },
  });
  if (nextStatus === "open") {
    notifyTradeStakeholder(gatedLocale, {
      eventKey: "event.opened",
      entityId: gatedEventId,
      recipientEmail: admin.email,
      vars: { eventName: event.eventName },
    });
  }
  revalidateFft(gatedLocale, gatedEventId);
  return { ok: true };
}

/** Promote scheduled → open once the window has started (admin-triggered / G7). */
export async function activateScheduledFftEventAction(
  locale: string,
  eventId: string,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") return gatedEventId;

  const admin = await requireTradePermission("event.open_close", {
    eventId: gatedEventId,
  });
  const event = await getScopedEvent(gatedEventId);
  if (!event) return { error: "not_found" };

  const check = canActivateScheduledEvent(event);
  if (!check.allowed) return { error: check.reason };

  await updateEvent(gatedEventId, { status: "open" }, admin.userId);
  await recordFftAudit({
    eventId: gatedEventId,
    action: "event.opened",
    actorId: admin.userId,
    actorRole: "admin",
  });
  notifyTradeStakeholder(gatedLocale, {
    eventKey: "event.opened",
    entityId: gatedEventId,
    recipientEmail: admin.email,
    vars: { eventName: event.eventName },
  });
  revalidateFft(gatedLocale, gatedEventId);
  return { ok: true };
}

export async function closeFftEventAction(locale: string, eventId: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") return gatedEventId;

  const admin = await requireTradePermission("event.open_close", {
    eventId: gatedEventId,
  });
  const event = await getScopedEvent(gatedEventId);
  if (!event) return { error: "not_found" };

  const check = canCloseEvent(event);
  if (!check.allowed) return { error: check.reason };

  await updateEvent(gatedEventId, { status: "closed" }, admin.userId);
  await recordFftAudit({
    eventId: gatedEventId,
    action: "event.closed",
    actorId: admin.userId,
    actorRole: "admin",
  });
  notifyTradeStakeholder(gatedLocale, {
    eventKey: "event.closed",
    entityId: gatedEventId,
    recipientEmail: admin.email,
    vars: { eventName: event.eventName },
  });
  revalidateFft(gatedLocale, gatedEventId);
  return { ok: true };
}

export async function saveFftEventSetupAction(
  locale: string,
  eventId: string,
  formData: FormData,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") return gatedEventId;

  const admin = await requireTradePermission("event.edit", {
    eventId: gatedEventId,
  });
  const event = await getScopedEvent(gatedEventId);
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
        await recordFftAudit({
          eventId: gatedEventId,
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
      await recordFftAudit({
        eventId: gatedEventId,
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

  await updateEvent(gatedEventId, patch, admin.userId);
  revalidateFft(gatedLocale, gatedEventId);
  return { ok: true };
}

export async function saveTradeProductAction(
  locale: string,
  eventId: string,
  formData: FormData,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") return gatedEventId;

  const access = await requireTradePermission("supply.manage", {
    eventId: gatedEventId,
  });
  const event = await getScopedEvent(gatedEventId);
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
    if (finalConfirmedQuantity < 0) {
      return { error: "invalid_supply_quantity" };
    }
    const existing = (await listProductsForEvent(gatedEventId)).find(
      (p) => p.id === id,
    );
    if (!existing) return { error: "product_not_found" };
    await upsertProduct({
      eventId: gatedEventId,
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
    await recordFftAudit({
      eventId: gatedEventId,
      action: "product.final_qty_updated",
      actorId: access.userId,
      actorRole: access.isAdmin ? "admin" : "ops",
      newValue: { productId: id, finalConfirmedQuantity },
      reason: "final_confirmed_quantity_update",
    });
    revalidateFft(gatedLocale, gatedEventId);
    return { ok: true };
  }

  // Open: limited — no new products; only final confirmed qty on existing rows.
  if (productLock.reason === "limited_no_delete_with_orders") {
    if (!id) return { error: "cannot_add_product_while_open" };
    const finalConfirmedQuantity = formData.get("finalConfirmedQuantity")
      ? Number(formData.get("finalConfirmedQuantity"))
      : undefined;
    if (
      finalConfirmedQuantity === undefined ||
      Number.isNaN(finalConfirmedQuantity)
    ) {
      return { error: "final_confirmed_quantity_required" };
    }
    if (finalConfirmedQuantity < 0) {
      return { error: "invalid_supply_quantity" };
    }
    const existing = (await listProductsForEvent(gatedEventId)).find(
      (p) => p.id === id,
    );
    if (!existing) return { error: "product_not_found" };
    await upsertProduct({
      eventId: gatedEventId,
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
    await recordFftAudit({
      eventId: gatedEventId,
      action: "product.final_qty_updated",
      actorId: access.userId,
      actorRole: access.isAdmin ? "admin" : "ops",
      newValue: { productId: id, finalConfirmedQuantity },
    });
    revalidateFft(gatedLocale, gatedEventId);
    return { ok: true };
  }

  const productName = String(formData.get("productName") ?? "").trim();
  if (!productName) {
    return { error: "product_name_required" };
  }

  const tentativeQuantity = formData.get("tentativeQuantity")
    ? Number(formData.get("tentativeQuantity"))
    : undefined;
  const finalConfirmedQuantity = formData.get("finalConfirmedQuantity")
    ? Number(formData.get("finalConfirmedQuantity"))
    : undefined;
  if (
    (tentativeQuantity !== undefined &&
      (Number.isNaN(tentativeQuantity) || tentativeQuantity < 0)) ||
    (finalConfirmedQuantity !== undefined &&
      (Number.isNaN(finalConfirmedQuantity) || finalConfirmedQuantity < 0))
  ) {
    return { error: "invalid_supply_quantity" };
  }

  await upsertProduct({
    eventId: gatedEventId,
    id,
    productName,
    productCode: String(formData.get("productCode") ?? "") || undefined,
    source: String(formData.get("source") ?? "") || undefined,
    batch: String(formData.get("batch") ?? "") || undefined,
    category: String(formData.get("category") ?? "") || undefined,
    weight: String(formData.get("weight") ?? "") || undefined,
    unit: String(formData.get("unit") ?? "piece"),
    tentativeQuantity,
    finalConfirmedQuantity,
    supportAmountPerUnit: formData.get("supportAmountPerUnit")
      ? Number(formData.get("supportAmountPerUnit"))
      : undefined,
    pickupLocation: String(formData.get("pickupLocation") ?? "") || undefined,
  });

  revalidateFft(gatedLocale, gatedEventId);
  return { ok: true };
}

export async function saveTradeFieldDefAction(
  locale: string,
  eventId: string,
  formData: FormData,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") return gatedEventId;

  const access = await requireTradePermission("custom_field.manage", {
    eventId: gatedEventId,
  });
  const event = await getScopedEvent(gatedEventId);
  if (!event) return { error: "not_found" };

  const fieldKey = sanitizeFieldKey(String(formData.get("fieldKey") ?? ""));
  if (!fieldKey) return { error: "invalid_field_key" };

  const allowedFieldTypes = new Set([
    "text",
    "number",
    "currency",
    "date",
    "datetime",
    "select",
    "boolean",
    "long_text",
  ]);
  const fieldType = String(formData.get("fieldType") ?? "text");
  if (!allowedFieldTypes.has(fieldType)) {
    return { error: "invalid_field_type" };
  }

  const labelEn = String(formData.get("labelEn") ?? "").trim() || fieldKey;
  const labelVi = String(formData.get("labelVi") ?? "").trim() || fieldKey;

  const fieldId = String(formData.get("id") ?? "") || undefined;
  const required = formData.get("required") === "on";
  const existingDefs = await listFieldDefsForEvent(gatedEventId);
  const existing = fieldId
    ? existingDefs.find((f) => f.id === fieldId)
    : existingDefs.find((f) => f.fieldKey === fieldKey);

  if (
    event.status === "open" ||
    event.status === "closed" ||
    event.status === "allocating"
  ) {
    const lock = assertEventFieldEditable(event, "requiredCustomFields");
    if (!lock.allowed) {
      // New required field while open/closed
      if (!existing && required) return { error: lock.reason };
      // Promote optional → required
      if (existing && !existing.required && required) {
        return { error: lock.reason };
      }
      // Change type of an existing required field
      if (existing?.required && existing.fieldType !== fieldType) {
        return { error: lock.reason };
      }
    }
  }

  await upsertFieldDef({
    eventId: gatedEventId,
    id: fieldId,
    fieldKey,
    fieldType,
    required,
    labelEn,
    labelVi,
    dropdownOptions: String(formData.get("dropdownOptions") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  });

  await recordFftAudit({
    eventId: gatedEventId,
    action: "field_def.saved",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "ops",
    newValue: { fieldKey },
  });

  revalidateFft(gatedLocale, gatedEventId);
  return { ok: true };
}

export async function importPriorityCsvAction(
  locale: string,
  eventId: string,
  csvText: string,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") return gatedEventId;

  const access = await requireTradePermission("priority.manage", {
    eventId: gatedEventId,
  });
  const event = await getScopedEvent(gatedEventId);
  if (!event) return { error: "not_found" };

  const parsed = parseAndValidatePriorityCsv(csvText);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  await importPriorityCsv(gatedEventId, parsed.rows);
  await recordFftAudit({
    eventId: gatedEventId,
    action: "priority.imported",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "ops",
    newValue: { count: parsed.rows.length },
  });

  revalidateFft(gatedLocale, gatedEventId);
  return { ok: true, count: parsed.rows.length };
}

export async function addSalesMemberAction(locale: string, email: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;

  await requireFftAdmin();
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return { error: "invalid_email" };
  }
  const org = await resolveFftOrganizationContext();
  await upsertSalesMember(normalized, undefined, org.organizationId);
  revalidateFft(gatedLocale);
  return { ok: true };
}

export async function submitFftOrderAction(
  locale: string,
  eventId: string,
  formData: FormData,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") return gatedEventId;

  const access = await requireTradePermission("order.create", {
    eventId: gatedEventId,
  });
  const event = await getScopedEvent(gatedEventId);
  if (!event) return { error: "not_found" };

  const now = new Date();
  const gate = canSubmitOrder(event, now);
  if (!gate.allowed) return { error: gate.reason };

  const customerName = String(formData.get("customerName") ?? "").trim();
  const productId = String(formData.get("productId") ?? "").trim();
  const requestedQuantity = Number(formData.get("requestedQuantity"));
  if (!customerName) return { error: "customer_name_required" };
  if (!productId) return { error: "product_required" };
  if (!Number.isFinite(requestedQuantity) || requestedQuantity < 1) {
    return { error: "invalid_quantity" };
  }

  const products = await listProductsForEvent(gatedEventId);
  if (!products.some((p) => p.id === productId)) {
    return { error: "product_not_found" };
  }

  const fieldDefs = await listFieldDefsForEvent(gatedEventId);
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
  if (!validation.valid) {
    return { error: "validation_failed", details: validation.errors };
  }

  const depositStatus = resolveDepositStatusForEvent(
    event,
    (formData.get("depositStatus") as "pending" | "paid" | "waived") ??
      undefined,
  );

  const order = await createOrder({
    eventId: gatedEventId,
    salespersonUserId: access.userId,
    salespersonEmail: access.email,
    customerName,
    customerCode: String(formData.get("customerCode") ?? "").trim() || undefined,
    productId,
    requestedQuantity,
    attrs: validatedAttrs,
    remarks: String(formData.get("remarks") ?? "").trim() || undefined,
    depositStatus,
    registeredAt: now,
  });

  if (isFftDepositEnabled() && event.depositRequired) {
    await ensureDepositForOrder({
      orderId: order.id,
      depositRequired: true,
      createdBy: access.userId,
    });
    notifyDepositPending(gatedLocale, order);
  }

  await recordFftAudit({
    eventId: gatedEventId,
    orderId: order.id,
    action: "order.registered",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "sales",
    newValue: { orderNumber: order.orderNumber },
  });

  notifyTradeStakeholder(gatedLocale, {
    eventKey: "order.submitted",
    entityId: order.id,
    recipientEmail: access.email,
    vars: {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
    },
  });

  if (isFftErpSyncEnabled()) {
    await enqueueErpSyncJob({
      jobType: "order",
      entityId: order.id,
      actorId: access.userId,
    });
  }

  revalidateFft(gatedLocale, gatedEventId);
  return { ok: true, orderId: order.id };
}

export async function runFftAllocationAction(
  locale: string,
  eventId: string,
  reason?: string,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") return gatedEventId;

  const admin = await requireTradePermission("allocation.run", {
    eventId: gatedEventId,
  });

  const [event, products, orders] = await Promise.all([
    getScopedEvent(gatedEventId),
    listProductsForEvent(gatedEventId),
    listOrdersForEvent(gatedEventId),
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
    eventId: gatedEventId,
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

  await recordFftAudit({
    eventId: gatedEventId,
    action: "allocation.run",
    actorId: admin.userId,
    actorRole: "admin",
    reason,
    newValue: summary,
  });

  for (const r of results) {
    const order = orders.find((o) => o.id === r.orderId);
    if (!order?.salespersonEmail) continue;
    if (r.status !== "rejected" && r.confirmedQuantity <= 0) continue;
    const eventKey =
      r.status === "full"
        ? "allocation.completed"
        : r.status === "partial"
          ? "allocation.partial"
          : "order.rejected";
    if (r.status === "rejected" || r.confirmedQuantity > 0) {
      notifyTradeStakeholder(gatedLocale, {
        eventKey,
        entityId: order.id,
        recipientEmail: order.salespersonEmail,
        vars: {
          orderNumber: order.orderNumber,
          confirmedQuantity: r.confirmedQuantity,
        },
        version: r.status,
      });
    }
  }

  revalidateFft(gatedLocale, gatedEventId);
  return { ok: true, summary };
}

export async function previewFftAllocationAction(
  locale: string,
  eventId: string,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") return gatedEventId;

  await requireTradePermission("allocation.preview", {
    eventId: gatedEventId,
  });

  const [event, products, orders] = await Promise.all([
    getScopedEvent(gatedEventId),
    listProductsForEvent(gatedEventId),
    listOrdersForEvent(gatedEventId),
  ]);
  if (!event) return { error: "not_found" };

  return calculateAllocation(products, orders);
}

export async function manualAdjustFftOrderAction(
  locale: string,
  orderId: string,
  confirmedQuantity: number,
  reason: string,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedOrderId = gateFftOrderId(orderId);
  if (typeof gatedOrderId === "object") return gatedOrderId;

  if (!Number.isFinite(confirmedQuantity)) {
    return { error: "confirmed_quantity_required" };
  }
  if (!reason.trim()) return { error: "reason_required" };

  const order = await getOrderById(gatedOrderId);
  if (!order) return { error: "not_found" };

  // G9: distinct from allocation.preview / allocation.run — never substitute those codes.
  const admin = await requireTradePermission("allocation.override", {
    eventId: order.eventId,
  });

  const [event, products, siblingOrders] = await Promise.all([
    getScopedEvent(order.eventId),
    listProductsForEvent(order.eventId),
    listOrdersForEvent(order.eventId),
  ]);
  if (!event) return { error: "not_found" };

  const product = products.find((p) => p.id === order.productId);
  if (!product) return { error: "product_not_found" };

  const otherAllocated = siblingOrders
    .filter((o) => o.productId === order.productId && o.id !== gatedOrderId)
    .reduce((sum, o) => sum + (o.confirmedQuantity ?? 0), 0);

  const cap = validateManualAllocationQuantity({
    confirmedQuantity,
    productFinalSupply: product.finalConfirmedQuantity ?? 0,
    productAlreadyAllocated: product.allocatedQuantity,
    excludingOrderId: gatedOrderId,
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
    orderId: gatedOrderId,
    confirmedQuantity,
    status,
    estimatedSupport: calculateEstimatedSupport(confirmedQuantity, rate),
    reason: reason.trim(),
    actorId: admin.userId,
  });

  revalidateFft(gatedLocale, order.eventId);
  return { ok: true };
}

export async function requestTransferAction(
  locale: string,
  orderId: string,
  formData: FormData,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedOrderId = gateFftOrderId(orderId);
  if (typeof gatedOrderId === "object") return gatedOrderId;

  const order = await getOrderById(gatedOrderId);
  if (!order) return { error: "not_found" };

  const access = await requireTradePermission("transfer.request", {
    eventId: order.eventId,
  });
  if (!access.isAdmin && order.salespersonUserId !== access.userId) {
    return { error: "forbidden" };
  }

  const event = await getScopedEvent(order.eventId);
  if (!event) return { error: "not_found" };

  const check = canTransferOrder(order, event);
  if (!check.allowed) return { error: check.reason };

  const newCustomerName = String(formData.get("newCustomerName") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const transferQuantity = Number(formData.get("transferQuantity"));
  if (!newCustomerName) return { error: "new_customer_name_required" };
  if (!reason) return { error: "reason_required" };
  if (!Number.isFinite(transferQuantity) || transferQuantity < 1) {
    return { error: "invalid_transfer_quantity" };
  }

  const maxQty = order.confirmedQuantity ?? order.requestedQuantity;
  if (transferQuantity > maxQty) {
    return { error: "transfer_quantity_exceeds_order" };
  }

  await createTransferRequest({
    orderId: gatedOrderId,
    newCustomerName,
    newCustomerCode:
      String(formData.get("newCustomerCode") ?? "").trim() || undefined,
    transferQuantity,
    reason,
    requestedBy: access.userId,
  });

  await recordFftAudit({
    eventId: event.id,
    orderId: gatedOrderId,
    action: "transfer.requested",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "sales",
    reason,
  });

  notifyTradeStakeholder(gatedLocale, {
    eventKey: "transfer.requested",
    entityId: gatedOrderId,
    recipientEmail: order.salespersonEmail,
    vars: { orderNumber: order.orderNumber },
  });

  revalidateFft(gatedLocale, event.id);
  return { ok: true };
}

export async function approveTransferAction(
  locale: string,
  orderId: string,
  transferId: string,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedOrderId = gateFftOrderId(orderId);
  if (typeof gatedOrderId === "object") return gatedOrderId;

  const order = await getOrderById(gatedOrderId);
  if (!order) return { error: "not_found" };

  const access = await requireTradePermission("transfer.approve", {
    eventId: order.eventId,
  });

  await approveTransfer({
    orderId: gatedOrderId,
    transferId,
    approvedBy: access.userId,
  });
  await recordFftAudit({
    eventId: order.eventId,
    orderId: gatedOrderId,
    action: "transfer.approved",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "ops",
    newValue: { transferId },
  });
  notifyTradeStakeholder(gatedLocale, {
    eventKey: "transfer.approved",
    entityId: gatedOrderId,
    recipientEmail: order.salespersonEmail,
    vars: { orderNumber: order.orderNumber },
  });
  revalidateFft(gatedLocale, order.eventId);
  return { ok: true };
}

export async function rejectTransferAction(
  locale: string,
  orderId: string,
  transferId: string,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedOrderId = gateFftOrderId(orderId);
  if (typeof gatedOrderId === "object") return gatedOrderId;

  const order = await getOrderById(gatedOrderId);
  if (!order) return { error: "not_found" };

  const access = await requireTradePermission("transfer.approve", {
    eventId: order.eventId,
  });

  await rejectTransfer({
    orderId: gatedOrderId,
    transferId,
    approvedBy: access.userId,
  });
  await recordFftAudit({
    eventId: order.eventId,
    orderId: gatedOrderId,
    action: "transfer.rejected",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "ops",
    newValue: { transferId },
  });
  notifyTradeStakeholder(gatedLocale, {
    eventKey: "transfer.rejected",
    entityId: gatedOrderId,
    recipientEmail: order.salespersonEmail,
    vars: { orderNumber: order.orderNumber },
  });
  revalidateFft(gatedLocale, order.eventId);
  return { ok: true };
}

export async function exportOrdersCsvAction(locale: string, eventId: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") return gatedEventId;

  await requireTradePermission("export.orders", { eventId: gatedEventId });
  const orders = await listOrdersForEvent(gatedEventId);
  return ordersToCsv(orders);
}

export async function exportEventSummaryCsvAction(locale: string, eventId: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") return gatedEventId;

  await requireTradePermission("export.orders", { eventId: gatedEventId });
  const [event, products, orders] = await Promise.all([
    getScopedEvent(gatedEventId),
    listProductsForEvent(gatedEventId),
    listOrdersForEvent(gatedEventId),
  ]);
  if (!event) return { error: "not_found" as const };
  return eventSummaryToCsv(buildEventSummary(event, products, orders));
}

export async function exportAllocationCsvAction(locale: string, eventId: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") return gatedEventId;

  await requireTradePermission("export.orders", { eventId: gatedEventId });
  const orders = await listOrdersForEvent(gatedEventId);
  return allocationToCsv(orders);
}

export async function completeFftOrderAction(
  locale: string,
  orderId: string,
  fulfilledQuantity: number,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  const gatedOrderId = gateFftOrderId(orderId);
  if (typeof gatedOrderId === "object") return gatedOrderId;

  if (!Number.isFinite(fulfilledQuantity)) {
    return { error: "fulfilled_quantity_required" };
  }

  const order = await getOrderById(gatedOrderId);
  if (!order) return { error: "not_found" };

  const pickupOps = isFftPickupOpsEnabled();
  const access = pickupOps
    ? await requireTradePermission("pickup.manage", {
        eventId: order.eventId,
      })
    : await requireFftAdmin();

  const gate = canCompleteOrder({
    fulfilledQuantity,
    status: order.status,
  });
  if (!gate.allowed) return { error: gate.reason };

  const [event, products] = await Promise.all([
    getScopedEvent(order.eventId),
    listProductsForEvent(order.eventId),
  ]);
  const product = products.find((p) => p.id === order.productId);
  if (!event || !product) return { error: "not_found" };

  const rate = getSupportRate(product, event);
  const finalSupport = calculateFinalSupport(fulfilledQuantity, rate) ?? 0;

  if (pickupOps) {
    try {
      await recordFulfillment({
        orderId: gatedOrderId,
        quantity: fulfilledQuantity,
        actorId: access.userId,
        finalSupport,
        absoluteQuantity: fulfilledQuantity,
      });
    } catch (err) {
      const message = toFftActionErrorMessage(err, "fulfillment_failed");
      return { error: message };
    }
  } else {
    await completeOrder({
      orderId: gatedOrderId,
      fulfilledQuantity,
      finalSupport,
    });
  }

  await recordFftAudit({
    eventId: order.eventId,
    orderId: gatedOrderId,
    action: "order.completed",
    actorId: access.userId,
    actorRole:
      "isAdmin" in access && access.isAdmin
        ? "admin"
        : pickupOps
          ? "ops"
          : "admin",
    newValue: { fulfilledQuantity },
  });

  revalidateFft(gatedLocale, order.eventId);
  return { ok: true };
}

export async function listEventTransfersAction(locale: string, eventId: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  await requireFftAdmin();
  return listTransfersForEvent(eventId);
}

export async function seedFftRbacCatalogAction(locale: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const access = await requireTradePermission("role.manage");
  await seedFftRbacCatalog(access.userId);
  revalidateFft(gatedLocale);
  return { ok: true };
}

export async function createTradeRoleAction(
  locale: string,
  name: string,
  permissionCodes: string[],
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const access = await requireTradePermission("role.manage");
  if (!name.trim()) return { error: "invalid_name" };
  const roleId = await createCustomRole({
    name,
    permissionCodes,
    actorId: access.userId,
  });
  revalidateFft(gatedLocale);
  return { ok: true, roleId };
}

export async function setTradeRolePermissionsAction(
  locale: string,
  roleId: string,
  permissionCodes: string[],
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const access = await requireTradePermission("role.manage");
  await setRolePermissions({
    roleId,
    permissionCodes,
    actorId: access.userId,
  });
  revalidateFft(gatedLocale);
  return { ok: true };
}

export async function setTradeRoleActiveAction(
  locale: string,
  roleId: string,
  active: boolean,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const access = await requireTradePermission("role.manage");
  await setRoleActive({ roleId, active, actorId: access.userId });
  revalidateFft(gatedLocale);
  return { ok: true };
}

export async function duplicateTradeRoleAction(
  locale: string,
  sourceRoleId: string,
  name: string,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const access = await requireTradePermission("role.manage");
  const roleId = await duplicateRole({
    sourceRoleId,
    name,
    actorId: access.userId,
  });
  revalidateFft(gatedLocale);
  return { ok: true, roleId };
}

export async function assignTradeRoleAction(
  locale: string,
  input: {
    userId: string;
    userEmail?: string;
    roleId: string;
    scopeType: FftScopeType;
    scopeId?: string | null;
  },
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const access = await requireTradePermission("role.manage");
  if (!input.userId || !input.roleId) return { error: "invalid_input" };
  if (!FFT_SCOPE_TYPES.includes(input.scopeType)) {
    return { error: "invalid_scope" };
  }
  if (
    (input.scopeType === "team" ||
      input.scopeType === "event" ||
      input.scopeType === "bu") &&
    !input.scopeId
  ) {
    return { error: "scope_id_required" };
  }
  await ensureRoleAssignment({
    userId: input.userId,
    userEmail: input.userEmail,
    roleId: input.roleId,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    actorId: access.userId,
  });
  revalidateFft(gatedLocale);
  return { ok: true };
}

export async function revokeTradeRoleAssignmentAction(
  locale: string,
  assignmentId: string,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const access = await requireTradePermission("role.manage");
  await revokeRoleAssignment({
    assignmentId,
    actorId: access.userId,
  });
  revalidateFft(gatedLocale);
  return { ok: true };
}

export async function listEventDepositsAction(locale: string, eventId: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const disabled = assertFftDepositFeatureAction();
  if (disabled) return disabled;
  await requireTradePermission("deposit.view", { eventId });
  const [deposits, audit] = await Promise.all([
    listDepositsForEvent(eventId),
    listFinanceAuditForEvent(eventId),
  ]);
  return { deposits, audit };
}

export async function recordDepositReceiptAction(
  locale: string,
  eventId: string,
  formData: FormData,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const disabled = assertFftDepositFeatureAction();
  if (disabled) return disabled;
  const access = await requireTradePermission("deposit.manage", { eventId });
  const depositId = String(formData.get("depositId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const amount = Number(formData.get("amount"));
  if (!depositId || !orderId || !Number.isFinite(amount) || amount <= 0) {
    return { error: "invalid_input" };
  }
  await recordDepositReceipt({
    depositId,
    orderId,
    reference: String(formData.get("reference") ?? "").trim() || undefined,
    amount,
    recordedBy: access.userId,
  });
  const order = await getOrderById(orderId);
  if (order) {
    notifyTradeStakeholder(gatedLocale, {
      eventKey: "deposit.confirmed",
      entityId: orderId,
      recipientEmail: order.salespersonEmail,
      vars: {
        orderNumber: order.orderNumber,
        amount,
      },
    });
    if (isFftErpSyncEnabled()) {
      await enqueueErpSyncJob({
        jobType: "deposit_summary",
        entityId: orderId,
        actorId: access.userId,
      });
    }
  }
  revalidateFft(gatedLocale, eventId);
  return { ok: true };
}

export async function recordDepositAdjustmentAction(
  locale: string,
  eventId: string,
  formData: FormData,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const disabled = assertFftDepositFeatureAction();
  if (disabled) return disabled;
  const access = await requireTradePermission("deposit.manage", { eventId });
  const depositId = String(formData.get("depositId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const adjustmentType = String(formData.get("adjustmentType") ?? "") as
    | "waive"
    | "refund"
    | "forfeit"
    | "correction"
    | "cancelled";
  const reason = String(formData.get("reason") ?? "").trim();
  if (!depositId || !orderId || !adjustmentType) {
    return { error: "invalid_input" };
  }
  try {
    await recordDepositAdjustment({
      depositId,
      orderId,
      adjustmentType,
      reason,
      amount: formData.get("amount") ? Number(formData.get("amount")) : null,
      actorId: access.userId,
    });
  } catch (err) {
    const message = toFftActionErrorMessage(err, "adjustment_failed");
    return { error: message };
  }
  revalidateFft(gatedLocale, eventId);
  return { ok: true };
}

export async function updateDepositDetailsAction(
  locale: string,
  eventId: string,
  formData: FormData,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const disabled = assertFftDepositFeatureAction();
  if (disabled) return disabled;
  const access = await requireTradePermission("deposit.manage", { eventId });
  const depositId = String(formData.get("depositId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  if (!depositId || !orderId) return { error: "invalid_input" };
  await updateDepositDetails({
    depositId,
    orderId,
    amount: formData.get("amount") ? Number(formData.get("amount")) : undefined,
    nonRefundable: formData.get("nonRefundable") === "on",
    actorId: access.userId,
  });
  revalidateFft(gatedLocale, eventId);
  return { ok: true };
}

export async function createPickupWindowAction(
  locale: string,
  eventId: string,
  formData: FormData,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const disabled = assertFftPickupFeatureAction();
  if (disabled) return disabled;
  await requireTradePermission("pickup.manage", { eventId });
  const startsAt = new Date(String(formData.get("startsAt") ?? ""));
  const endsAt = new Date(String(formData.get("endsAt") ?? ""));
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { error: "invalid_dates" };
  }
  await createPickupWindow({
    eventId,
    startsAt,
    endsAt,
    location: String(formData.get("location") ?? "").trim() || undefined,
    capacity: formData.get("capacity") ? Number(formData.get("capacity")) : undefined,
  });
  revalidateFft(gatedLocale, eventId);
  return { ok: true };
}

export async function schedulePickupAction(
  locale: string,
  eventId: string,
  formData: FormData,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const disabled = assertFftPickupFeatureAction();
  if (disabled) return disabled;
  const access = await requireTradePermission("pickup.manage", { eventId });
  const orderId = String(formData.get("orderId") ?? "");
  const windowId = String(formData.get("windowId") ?? "");
  if (!orderId || !windowId) return { error: "invalid_input" };
  await schedulePickup({ orderId, windowId, actorId: access.userId });
  const order = await getOrderById(orderId);
  if (order) {
    notifyTradeStakeholder(gatedLocale, {
      eventKey: "pickup.scheduled",
      entityId: orderId,
      recipientEmail: order.salespersonEmail,
      vars: { orderNumber: order.orderNumber },
    });
  }
  revalidateFft(gatedLocale, eventId);
  return { ok: true };
}

export async function recordPickupFulfillmentAction(
  locale: string,
  eventId: string,
  formData: FormData,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const disabled = assertFftPickupFeatureAction();
  if (disabled) return disabled;
  const access = await requireTradePermission("pickup.manage", { eventId });
  const orderId = String(formData.get("orderId") ?? "");
  const quantity = Number(formData.get("quantity"));
  if (!orderId || !Number.isFinite(quantity) || quantity <= 0) {
    return { error: "invalid_input" };
  }
  try {
    await recordFulfillment({
      orderId,
      quantity,
      actorId: access.userId,
    });
    const order = await getOrderById(orderId);
    if (order) {
      notifyTradeStakeholder(gatedLocale, {
        eventKey: "pickup.completed",
        entityId: orderId,
        recipientEmail: order.salespersonEmail,
        vars: {
          orderNumber: order.orderNumber,
          fulfilledQuantity: quantity,
        },
      });
      if (isFftErpSyncEnabled()) {
        await enqueueErpSyncJob({
          jobType: "fulfillment_summary",
          entityId: orderId,
          actorId: access.userId,
        });
      }
    }
  } catch (err) {
    const message = toFftActionErrorMessage(err, "fulfillment_failed");
    return { error: message };
  }
  revalidateFft(gatedLocale, eventId);
  return { ok: true };
}

export async function recordPickupExceptionAction(
  locale: string,
  eventId: string,
  formData: FormData,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const disabled = assertFftPickupFeatureAction();
  if (disabled) return disabled;
  const access = await requireTradePermission("pickup.manage", { eventId });
  const orderId = String(formData.get("orderId") ?? "");
  const exceptionType = String(formData.get("exceptionType") ?? "") as
    | "no_show"
    | "partial"
    | "cancel"
    | "override";
  const reason = String(formData.get("reason") ?? "").trim();
  if (!orderId || !exceptionType) return { error: "invalid_input" };
  try {
    await recordPickupException({
      orderId,
      exceptionType,
      reason,
      actorId: access.userId,
    });
  } catch (err) {
    const message = toFftActionErrorMessage(err, "exception_failed");
    return { error: message };
  }
  revalidateFft(gatedLocale, eventId);
  return { ok: true };
}

export async function getImportTemplateAction(
  locale: string,
  importType: string,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const parsed = parseImportType(importType);
  if (!parsed) return { error: "invalid_import_type" as const };
  const featureGate = assertImportFeatureGate(parsed);
  if (featureGate) return featureGate;

  const permission = importPermissionForType(parsed);
  await requireTradePermission(permission);

  const buffer = buildImportTemplateWorkbook(parsed);
  return {
    ok: true as const,
    filename: `${parsed}-template.xlsx`,
    dataBase64: buffer.toString("base64"),
  };
}

export async function uploadImportDryRunAction(
  locale: string,
  eventId: string,
  formData: FormData,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const importTypeRaw = String(formData.get("importType") ?? "");
  const parsed = parseImportType(importTypeRaw);
  if (!parsed) return { error: "invalid_import_type" as const };
  const featureGate = assertImportFeatureGate(parsed);
  if (featureGate) return featureGate;

  const permission = importPermissionForType(parsed);
  const access = await requireTradePermission(permission, { eventId });

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "file_required" as const };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsedRows = parseImportWorkbook(buffer, parsed);
  const limit = assertImportRowLimit(parsed, parsedRows.length);
  if (!limit.ok) {
    return { error: limit.error, maxRows: limit.maxRows };
  }

  const validated = await validateImportRowsForDryRun(eventId, parsed, parsedRows);

  const batch = await createImportBatch({
    eventId,
    importType: parsed,
    filename: file.name,
    actorId: access.userId,
    rows: validated,
  });

  await recordFftAudit({
    eventId,
    action: "import.dry_run",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "ops",
    newValue: {
      batchId: batch.id,
      importType: parsed,
      rowCount: batch.rowCount,
      validCount: batch.validCount,
      errorCount: batch.errorCount,
    },
  });

  return {
    ok: true as const,
    batchId: batch.id,
    rowCount: batch.rowCount,
    validCount: batch.validCount,
    errorCount: batch.errorCount,
    rows: validated.map((r) => ({
      rowNumber: r.rowNumber,
      validationErrors: r.validationErrors,
      payload: r.payload,
    })),
  };
}

export async function confirmImportBatchAction(
  locale: string,
  eventId: string,
  batchId: string,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const batch = await getImportBatchById(batchId);
  if (!batch || batch.eventId !== eventId) {
    return { error: "batch_not_found" as const };
  }
  const featureGate = assertImportFeatureGate(batch.importType);
  if (featureGate) return featureGate;

  const permission = importPermissionForType(batch.importType);
  const access = await requireTradePermission(permission, { eventId });

  if (batch.validCount === 0) {
    return { error: "no_valid_rows" as const };
  }

  const result = await commitImportBatch(batchId, {
    actorEmail: access.email,
    onDepositPending: (order) => notifyDepositPending(gatedLocale, order),
  });

  await recordFftAudit({
    eventId,
    action: "import.committed",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "ops",
    newValue: {
      batchId,
      importType: batch.importType,
      ...result,
    },
  });

  revalidateFft(gatedLocale, eventId);
  return { ok: true as const, ...result };
}

export async function cancelImportBatchAction(
  locale: string,
  eventId: string,
  batchId: string,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const batch = await getImportBatchById(batchId);
  if (!batch || batch.eventId !== eventId) {
    return { error: "batch_not_found" as const };
  }

  const permission = importPermissionForType(batch.importType);
  const access = await requireTradePermission(permission, { eventId });

  await cancelImportBatch(batchId);
  await recordFftAudit({
    eventId,
    action: "import.cancelled",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "ops",
    newValue: { batchId },
  });

  return { ok: true as const };
}

export async function getImportBatchDetailAction(
  locale: string,
  eventId: string,
  batchId: string,
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;
  
  const batch = await getImportBatchById(batchId);
  if (!batch || batch.eventId !== eventId) {
    return { error: "batch_not_found" as const };
  }

  const permission = importPermissionForType(batch.importType);
  await requireTradePermission(permission, { eventId });

  const rows = await listImportRowsForBatch(batchId);
  return {
    ok: true as const,
    batch,
    rows: rows.map((r) => ({
      rowNumber: r.rowNumber,
      validationErrors: r.validationErrors,
      writeStatus: r.writeStatus,
      payload: r.payloadJson,
    })),
  };
}

export async function retryErpSyncJobAction(locale: string, jobId: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;

  const disabled = assertFftErpSyncFeatureAction();
  if (disabled) return disabled;

  const access = await requireTradePermission("sync.retry");
  const { getSyncJobById, retrySyncJob } = await import(
    "@/modules/fft/domain/erp-sync-store"
  );
  const before = await getSyncJobById(jobId);
  if (!before) {
    return { ok: false as const, error: "job_not_found" };
  }
  if (before.status !== "failed" && before.status !== "dead") {
    return { ok: false as const, error: "job_not_retryable" };
  }
  const after = await retrySyncJob(jobId);
  if (!after) {
    return { ok: false as const, error: "retry_failed" };
  }
  await recordFftAudit({
    action: "erp_sync.retry",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "ops",
    oldValue: {
      jobId: before.id,
      jobType: before.jobType,
      entityId: before.entityId,
      status: before.status,
      attemptCount: before.attemptCount,
      lastError: before.lastError,
    },
    newValue: {
      jobId: after.id,
      status: after.status,
      attemptCount: after.attemptCount,
    },
    reason: "manual_dlq_retry",
  });
  revalidatePath(`/fft/admin/erp-sync`);
  return { ok: true as const };
}

export async function processErpSyncJobsAction(locale: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") return gatedLocale;

  const disabled = assertFftErpSyncFeatureAction();
  if (disabled) return disabled;

  await requireTradePermission("export.finance");
  const { processPendingSyncJobs } = await import("@/modules/fft/domain/erp-sync-store");
  const result = await processPendingSyncJobs();
  revalidatePath(`/fft/admin/erp-sync`);
  return { ok: true as const, ...result };
}
