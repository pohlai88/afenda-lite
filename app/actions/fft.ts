"use server";

import { revalidatePath } from "next/cache";
import { resolveFftOrganizationContext } from "@/features/fft/fft-organization-context";
import {
  assertFftDepositFeatureAction,
  assertFftPickupFeatureAction,
} from "@/modules/fft/auth/fft-phase2b";
import { assertFftErpSyncFeatureAction } from "@/modules/fft/auth/fft-phase2d";
import {
  requireFftAdmin,
  requireFftPermission,
} from "@/modules/fft/auth/fft-session";
import {
  calculateAllocation,
  validateManualAllocationQuantity,
} from "@/modules/fft/domain/allocation";
import {
  ensureDepositForOrder,
  listDepositsForEvent,
  listFinanceAuditForEvent,
  recordDepositAdjustment,
  recordDepositReceipt,
  updateDepositDetails,
} from "@/modules/fft/domain/deposit-store";
import { enqueueErpSyncJob } from "@/modules/fft/domain/erp-sync-store";
import {
  assertEventFieldEditable,
  canActivateScheduledEvent,
  canCloseEvent,
  canOpenEvent,
  canSubmitOrder,
} from "@/modules/fft/domain/events";
import {
  allocationToCsv,
  buildEventSummary,
  eventSummaryToCsv,
} from "@/modules/fft/domain/export";
import { toFftActionErrorMessage } from "@/modules/fft/domain/fft-action-result";
import {
  notifyDepositPending,
  notifyTradeStakeholder,
} from "@/modules/fft/domain/fft-notify";
import {
  applyFieldDefaults,
  sanitizeFieldKey,
  validateOrderAttrs,
} from "@/modules/fft/domain/fields";
import { validateImportRowsForDryRun } from "@/modules/fft/domain/import-dry-run";
import {
  assertImportFeatureGate,
  importPermissionForType,
  parseImportType,
} from "@/modules/fft/domain/import-guards";
import {
  buildImportTemplateWorkbook,
  parseImportWorkbook,
} from "@/modules/fft/domain/import-parse";
import {
  cancelImportBatch,
  commitImportBatch,
  createImportBatch,
  getImportBatchById,
  listImportRowsForBatch,
} from "@/modules/fft/domain/import-store";
import { assertImportRowLimit } from "@/modules/fft/domain/import-validators";
import {
  createPickupWindow,
  recordFulfillment,
  recordPickupException,
  schedulePickup,
} from "@/modules/fft/domain/pickup-store";
import { parseAndValidatePriorityCsv } from "@/modules/fft/domain/priority-csv";
import {
  FFT_SCOPE_TYPES,
  type FftScopeType,
} from "@/modules/fft/domain/rbac-catalog";
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
import {
  calculateEstimatedSupport,
  calculateFinalSupport,
  canCompleteOrder,
  getSupportRate,
} from "@/modules/fft/domain/support";
import {
  canTransferOrder,
  resolveDepositStatusForEvent,
} from "@/modules/fft/domain/transfer";
import type { FftLocale } from "@/modules/fft/i18n/fft-i18n";
import {
  parseFftEventId,
  parseFftLocale,
  parseFftOrderId,
} from "@/modules/fft/schemas/fft-schemas";
import { getNeonAuthUserByEmail } from "@/modules/identity/domain/neon-auth-users";
import { ensureFftMemberPlatformAccess } from "@/modules/identity/domain/platform-rbac";
import { asOrganizationId } from "@/modules/identity/schemas/platform-rbac";
import {
  isFftDepositEnabled,
  isFftErpSyncEnabled,
  isFftPickupOpsEnabled,
} from "@/modules/platform/env/accessors";

async function getScopedEvent(eventId: string, userId?: string) {
  const org = await resolveFftOrganizationContext(userId);
  return getEventById(eventId, org.organizationId);
}

/** Zod-backed locale gate — returns action error shape (no throws). */
function gateFftLocale(
  locale: string
): FftLocale | { error: "invalid_locale" } {
  const parsed = parseFftLocale(locale);
  if (!parsed.success) {
    return { error: "invalid_locale" };
  }
  return parsed.data;
}

function gateFftEventId(
  eventId: string
): string | { error: "invalid_event_id" } {
  const parsed = parseFftEventId(eventId);
  if (!parsed.success) {
    return { error: "invalid_event_id" };
  }
  return parsed.data;
}

function gateFftOrderId(
  orderId: string
): string | { error: "invalid_order_id" } {
  const parsed = parseFftOrderId(orderId);
  if (!parsed.success) {
    return { error: "invalid_order_id" };
  }
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

export async function createFftEventAction(locale: string, formData: FormData) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const access = await requireFftPermission("event.create");

  const eventName = String(formData.get("eventName") ?? "").trim();
  const eventType = String(formData.get("eventType") ?? "hot_sales").trim();
  const opensAt = new Date(String(formData.get("opensAt")));
  const closesAt = new Date(String(formData.get("closesAt")));
  const timezone = String(formData.get("timezone") ?? "Asia/Ho_Chi_Minh");
  const sourceLocation =
    String(formData.get("sourceLocation") ?? "").trim() || undefined;

  if (
    !eventName ||
    Number.isNaN(opensAt.getTime()) ||
    Number.isNaN(closesAt.getTime())
  ) {
    return { error: "invalid_input" };
  }

  const org = await resolveFftOrganizationContext(access.userId);
  const event = await createEvent({
    closesAt,
    createdBy: access.userId,
    eventName,
    eventType,
    opensAt,
    organizationId: org.organizationId,
    sourceLocation,
    timezone,
  });

  await recordFftAudit({
    action: "event.created",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "ops",
    eventId: event.id,
    newValue: { eventName: event.eventName },
  });

  revalidateFft(gatedLocale);
  return { eventId: event.id };
}

export async function ensurePigletTemplateAction(locale: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const admin = await requireFftAdmin();
  const org = await resolveFftOrganizationContext(admin.userId);
  const event = await ensureGp2PigletTemplate(admin.userId, org.organizationId);
  revalidateFft(gatedLocale);
  return { eventId: event.id };
}

export async function cloneFftEventAction(
  locale: string,
  sourceEventId: string
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedSourceId = gateFftEventId(sourceEventId);
  if (typeof gatedSourceId === "object") {
    return gatedSourceId;
  }

  const admin = await requireFftAdmin();
  const org = await resolveFftOrganizationContext(admin.userId);
  try {
    const event = await cloneEventFromTemplate(
      gatedSourceId,
      admin.userId,
      undefined,
      org.organizationId
    );
    await recordFftAudit({
      action: "event.cloned",
      actorId: admin.userId,
      actorRole: "admin",
      eventId: event.id,
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
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") {
    return gatedEventId;
  }
  const admin = await requireFftPermission("event.open_close", {
    eventId: gatedEventId,
  });
  const event = await getScopedEvent(gatedEventId);
  if (!event) {
    return { error: "not_found" };
  }

  const check = canOpenEvent(event);
  if (!check.allowed) {
    return { error: check.reason };
  }

  // Future window → scheduled; otherwise open for ordering immediately.
  const nextStatus =
    Date.now() < event.opensAt.getTime() ? "scheduled" : "open";

  await updateEvent(gatedEventId, { status: nextStatus }, admin.userId);
  await recordFftAudit({
    action: nextStatus === "scheduled" ? "event.scheduled" : "event.opened",
    actorId: admin.userId,
    actorRole: "admin",
    eventId: gatedEventId,
    newValue: { status: nextStatus },
  });
  if (nextStatus === "open") {
    notifyTradeStakeholder(gatedLocale, {
      entityId: gatedEventId,
      eventKey: "event.opened",
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
  eventId: string
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") {
    return gatedEventId;
  }

  const admin = await requireFftPermission("event.open_close", {
    eventId: gatedEventId,
  });
  const event = await getScopedEvent(gatedEventId);
  if (!event) {
    return { error: "not_found" };
  }

  const check = canActivateScheduledEvent(event);
  if (!check.allowed) {
    return { error: check.reason };
  }

  await updateEvent(gatedEventId, { status: "open" }, admin.userId);
  await recordFftAudit({
    action: "event.opened",
    actorId: admin.userId,
    actorRole: "admin",
    eventId: gatedEventId,
  });
  notifyTradeStakeholder(gatedLocale, {
    entityId: gatedEventId,
    eventKey: "event.opened",
    recipientEmail: admin.email,
    vars: { eventName: event.eventName },
  });
  revalidateFft(gatedLocale, gatedEventId);
  return { ok: true };
}

export async function closeFftEventAction(locale: string, eventId: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") {
    return gatedEventId;
  }

  const admin = await requireFftPermission("event.open_close", {
    eventId: gatedEventId,
  });
  const event = await getScopedEvent(gatedEventId);
  if (!event) {
    return { error: "not_found" };
  }

  const check = canCloseEvent(event);
  if (!check.allowed) {
    return { error: check.reason };
  }

  await updateEvent(gatedEventId, { status: "closed" }, admin.userId);
  await recordFftAudit({
    action: "event.closed",
    actorId: admin.userId,
    actorRole: "admin",
    eventId: gatedEventId,
  });
  notifyTradeStakeholder(gatedLocale, {
    entityId: gatedEventId,
    eventKey: "event.closed",
    recipientEmail: admin.email,
    vars: { eventName: event.eventName },
  });
  revalidateFft(gatedLocale, gatedEventId);
  return { ok: true };
}

export async function saveFftEventSetupAction(
  locale: string,
  eventId: string,
  formData: FormData
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") {
    return gatedEventId;
  }

  const admin = await requireFftPermission("event.edit", {
    eventId: gatedEventId,
  });
  const event = await getScopedEvent(gatedEventId);
  if (!event) {
    return { error: "not_found" };
  }

  const overrideReason = String(formData.get("overrideReason") ?? "").trim();
  const patch: Parameters<typeof updateEvent>[1] = {
    depositRefundable: formData.get("depositRefundable") === "on",
    depositRequired: formData.get("depositRequired") === "on",
    descriptionEn: String(formData.get("descriptionEn") ?? "") || undefined,
    descriptionVi: String(formData.get("descriptionVi") ?? "") || undefined,
    eventName: String(formData.get("eventName") ?? event.eventName),
    sourceLocation: String(formData.get("sourceLocation") ?? "") || undefined,
    standaloneProgram: formData.get("standaloneProgram") === "on",
    transferAllowed: formData.get("transferAllowed") === "on",
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
          action: "event.support_override",
          actorId: admin.userId,
          actorRole: "admin",
          eventId: gatedEventId,
          newValue: { supportAmountPerUnit: nextSupport },
          oldValue: { supportAmountPerUnit: event.supportAmountPerUnit },
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
    if (!lock.allowed) {
      return { error: lock.reason ?? "opens_at_locked" };
    }
    patch.opensAt = new Date(String(opensAtRaw));
  }
  if (closesAtRaw) {
    const lock = assertEventFieldEditable(event, "closesAt");
    if (!lock.allowed) {
      return { error: lock.reason ?? "closes_at_locked" };
    }
    if (lock.reason === "admin_override_required") {
      if (!overrideReason) {
        return { error: "override_reason_required" };
      }
      await recordFftAudit({
        action: "event.closes_at_override",
        actorId: admin.userId,
        actorRole: "admin",
        eventId: gatedEventId,
        newValue: { closesAt: String(closesAtRaw) },
        oldValue: { closesAt: event.closesAt.toISOString() },
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
  formData: FormData
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") {
    return gatedEventId;
  }

  const access = await requireFftPermission("supply.manage", {
    eventId: gatedEventId,
  });
  const event = await getScopedEvent(gatedEventId);
  if (!event) {
    return { error: "not_found" };
  }

  const id = String(formData.get("id") ?? "") || undefined;
  const productLock = assertEventFieldEditable(event, "products");
  const finalQtyLock = assertEventFieldEditable(
    event,
    "finalConfirmedQuantity"
  );

  // Closed/allocating: product catalog locked; only final confirmed qty may change.
  if (!productLock.allowed) {
    if (!id) {
      return { error: "products_locked" };
    }
    if (!finalQtyLock.allowed && finalQtyLock.reason !== "audit_required") {
      return { error: productLock.reason ?? "products_locked" };
    }
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
      (p) => p.id === id
    );
    if (!existing) {
      return { error: "product_not_found" };
    }
    await upsertProduct({
      batch: existing.batch ?? undefined,
      category: existing.category ?? undefined,
      eventId: gatedEventId,
      finalConfirmedQuantity,
      id,
      pickupLocation: existing.pickupLocation ?? undefined,
      productCode: existing.productCode ?? undefined,
      productName: existing.productName,
      source: existing.source ?? undefined,
      supportAmountPerUnit: existing.supportAmountPerUnit ?? undefined,
      tentativeQuantity: existing.tentativeQuantity ?? undefined,
      unit: existing.unit,
      weight: existing.weight ?? undefined,
    });
    await recordFftAudit({
      action: "product.final_qty_updated",
      actorId: access.userId,
      actorRole: access.isAdmin ? "admin" : "ops",
      eventId: gatedEventId,
      newValue: { finalConfirmedQuantity, productId: id },
      reason: "final_confirmed_quantity_update",
    });
    revalidateFft(gatedLocale, gatedEventId);
    return { ok: true };
  }

  // Open: limited — no new products; only final confirmed qty on existing rows.
  if (productLock.reason === "limited_no_delete_with_orders") {
    if (!id) {
      return { error: "cannot_add_product_while_open" };
    }
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
      (p) => p.id === id
    );
    if (!existing) {
      return { error: "product_not_found" };
    }
    await upsertProduct({
      batch: existing.batch ?? undefined,
      category: existing.category ?? undefined,
      eventId: gatedEventId,
      finalConfirmedQuantity,
      id,
      pickupLocation: existing.pickupLocation ?? undefined,
      productCode: existing.productCode ?? undefined,
      productName: existing.productName,
      source: existing.source ?? undefined,
      supportAmountPerUnit: existing.supportAmountPerUnit ?? undefined,
      tentativeQuantity: existing.tentativeQuantity ?? undefined,
      unit: existing.unit,
      weight: existing.weight ?? undefined,
    });
    await recordFftAudit({
      action: "product.final_qty_updated",
      actorId: access.userId,
      actorRole: access.isAdmin ? "admin" : "ops",
      eventId: gatedEventId,
      newValue: { finalConfirmedQuantity, productId: id },
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
    batch: String(formData.get("batch") ?? "") || undefined,
    category: String(formData.get("category") ?? "") || undefined,
    eventId: gatedEventId,
    finalConfirmedQuantity,
    id,
    pickupLocation: String(formData.get("pickupLocation") ?? "") || undefined,
    productCode: String(formData.get("productCode") ?? "") || undefined,
    productName,
    source: String(formData.get("source") ?? "") || undefined,
    supportAmountPerUnit: formData.get("supportAmountPerUnit")
      ? Number(formData.get("supportAmountPerUnit"))
      : undefined,
    tentativeQuantity,
    unit: String(formData.get("unit") ?? "piece"),
    weight: String(formData.get("weight") ?? "") || undefined,
  });

  revalidateFft(gatedLocale, gatedEventId);
  return { ok: true };
}

export async function saveTradeFieldDefAction(
  locale: string,
  eventId: string,
  formData: FormData
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") {
    return gatedEventId;
  }

  const access = await requireFftPermission("custom_field.manage", {
    eventId: gatedEventId,
  });
  const event = await getScopedEvent(gatedEventId);
  if (!event) {
    return { error: "not_found" };
  }

  const fieldKey = sanitizeFieldKey(String(formData.get("fieldKey") ?? ""));
  if (!fieldKey) {
    return { error: "invalid_field_key" };
  }

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
      if (!existing && required) {
        return { error: lock.reason };
      }
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
    dropdownOptions: String(formData.get("dropdownOptions") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    eventId: gatedEventId,
    fieldKey,
    fieldType,
    id: fieldId,
    labelEn,
    labelVi,
    required,
  });

  await recordFftAudit({
    action: "field_def.saved",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "ops",
    eventId: gatedEventId,
    newValue: { fieldKey },
  });

  revalidateFft(gatedLocale, gatedEventId);
  return { ok: true };
}

export async function importPriorityCsvAction(
  locale: string,
  eventId: string,
  csvText: string
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") {
    return gatedEventId;
  }

  const access = await requireFftPermission("priority.manage", {
    eventId: gatedEventId,
  });
  const event = await getScopedEvent(gatedEventId);
  if (!event) {
    return { error: "not_found" };
  }

  const parsed = parseAndValidatePriorityCsv(csvText);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  await importPriorityCsv(gatedEventId, parsed.rows);
  await recordFftAudit({
    action: "priority.imported",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "ops",
    eventId: gatedEventId,
    newValue: { count: parsed.rows.length },
  });

  revalidateFft(gatedLocale, gatedEventId);
  return { count: parsed.rows.length, ok: true };
}

export async function addSalesMemberAction(locale: string, email: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const access = await requireFftAdmin();
  const normalized = email.trim().toLowerCase();
  if (!(normalized && normalized.includes("@"))) {
    return { error: "invalid_email" };
  }
  const org = await resolveFftOrganizationContext(access.userId);
  const authUser = await getNeonAuthUserByEmail(normalized);
  await upsertSalesMember(
    normalized,
    authUser?.id ?? undefined,
    org.organizationId
  );
  if (authUser?.id) {
    await ensureFftMemberPlatformAccess({
      actorUserId: access.userId,
      organizationId: asOrganizationId(org.organizationId),
      userId: authUser.id,
    });
  }
  revalidateFft(gatedLocale);
  return { ok: true };
}

export async function submitFftOrderAction(
  locale: string,
  eventId: string,
  formData: FormData
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") {
    return gatedEventId;
  }

  const access = await requireFftPermission("order.create", {
    eventId: gatedEventId,
  });
  const event = await getScopedEvent(gatedEventId);
  if (!event) {
    return { error: "not_found" };
  }

  const now = new Date();
  const gate = canSubmitOrder(event, now);
  if (!gate.allowed) {
    return { error: gate.reason };
  }

  const customerName = String(formData.get("customerName") ?? "").trim();
  const productId = String(formData.get("productId") ?? "").trim();
  const requestedQuantity = Number(formData.get("requestedQuantity"));
  if (!customerName) {
    return { error: "customer_name_required" };
  }
  if (!productId) {
    return { error: "product_required" };
  }
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
    return { details: validation.errors, error: "validation_failed" };
  }

  const depositStatus = resolveDepositStatusForEvent(
    event,
    (formData.get("depositStatus") as "pending" | "paid" | "waived") ??
      undefined
  );

  const order = await createOrder({
    attrs: validatedAttrs,
    customerCode:
      String(formData.get("customerCode") ?? "").trim() || undefined,
    customerName,
    depositStatus,
    eventId: gatedEventId,
    productId,
    registeredAt: now,
    remarks: String(formData.get("remarks") ?? "").trim() || undefined,
    requestedQuantity,
    salespersonEmail: access.email,
    salespersonUserId: access.userId,
  });

  if (isFftDepositEnabled() && event.depositRequired) {
    await ensureDepositForOrder({
      createdBy: access.userId,
      depositRequired: true,
      orderId: order.id,
    });
    notifyDepositPending(gatedLocale, order);
  }

  await recordFftAudit({
    action: "order.registered",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "sales",
    eventId: gatedEventId,
    newValue: { orderNumber: order.orderNumber },
    orderId: order.id,
  });

  notifyTradeStakeholder(gatedLocale, {
    entityId: order.id,
    eventKey: "order.submitted",
    recipientEmail: access.email,
    vars: {
      customerName: order.customerName,
      orderNumber: order.orderNumber,
    },
  });

  if (isFftErpSyncEnabled()) {
    await enqueueErpSyncJob({
      actorId: access.userId,
      entityId: order.id,
      jobType: "order",
    });
  }

  revalidateFft(gatedLocale, gatedEventId);
  return { ok: true, orderId: order.id };
}

export async function runFftAllocationAction(
  locale: string,
  eventId: string,
  reason?: string
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") {
    return gatedEventId;
  }

  const admin = await requireFftPermission("allocation.run", {
    eventId: gatedEventId,
  });

  const [event, products, orders] = await Promise.all([
    getScopedEvent(gatedEventId),
    listProductsForEvent(gatedEventId),
    listOrdersForEvent(gatedEventId),
  ]);
  if (!event) {
    return { error: "not_found" };
  }

  const summary = calculateAllocation(products, orders);
  const productById = new Map(products.map((p) => [p.id, p]));

  const results = summary.results.map((r) => {
    const order = orders.find((o) => o.id === r.orderId)!;
    const product = productById.get(order.productId)!;
    const rate = getSupportRate(product, event);
    return {
      confirmedQuantity: r.confirmedQuantity,
      estimatedSupport: calculateEstimatedSupport(r.confirmedQuantity, rate),
      orderId: r.orderId,
      status:
        r.status === "full"
          ? "full"
          : r.status === "partial"
            ? "partial"
            : "rejected",
    };
  });

  await runAllocationForEvent({
    eventId: gatedEventId,
    mode: reason ? "rerun" : "auto",
    reason,
    results,
    runBy: admin.userId,
    summary: {
      totalAllocated: summary.totalAllocated,
      totalRejected: summary.totalRejected,
      totalRequested: summary.totalRequested,
    },
  });

  await recordFftAudit({
    action: "allocation.run",
    actorId: admin.userId,
    actorRole: "admin",
    eventId: gatedEventId,
    newValue: summary,
    reason,
  });

  for (const r of results) {
    const order = orders.find((o) => o.id === r.orderId);
    if (!order?.salespersonEmail) {
      continue;
    }
    if (r.status !== "rejected" && r.confirmedQuantity <= 0) {
      continue;
    }
    const eventKey =
      r.status === "full"
        ? "allocation.completed"
        : r.status === "partial"
          ? "allocation.partial"
          : "order.rejected";
    if (r.status === "rejected" || r.confirmedQuantity > 0) {
      notifyTradeStakeholder(gatedLocale, {
        entityId: order.id,
        eventKey,
        recipientEmail: order.salespersonEmail,
        vars: {
          confirmedQuantity: r.confirmedQuantity,
          orderNumber: order.orderNumber,
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
  eventId: string
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") {
    return gatedEventId;
  }

  await requireFftPermission("allocation.preview", {
    eventId: gatedEventId,
  });

  const [event, products, orders] = await Promise.all([
    getScopedEvent(gatedEventId),
    listProductsForEvent(gatedEventId),
    listOrdersForEvent(gatedEventId),
  ]);
  if (!event) {
    return { error: "not_found" };
  }

  return calculateAllocation(products, orders);
}

export async function manualAdjustFftOrderAction(
  locale: string,
  orderId: string,
  confirmedQuantity: number,
  reason: string
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedOrderId = gateFftOrderId(orderId);
  if (typeof gatedOrderId === "object") {
    return gatedOrderId;
  }

  if (!Number.isFinite(confirmedQuantity)) {
    return { error: "confirmed_quantity_required" };
  }
  if (!reason.trim()) {
    return { error: "reason_required" };
  }

  const order = await getOrderById(gatedOrderId);
  if (!order) {
    return { error: "not_found" };
  }

  // G9: distinct from allocation.preview / allocation.run — never substitute those codes.
  const admin = await requireFftPermission("allocation.override", {
    eventId: order.eventId,
  });

  const [event, products, siblingOrders] = await Promise.all([
    getScopedEvent(order.eventId),
    listProductsForEvent(order.eventId),
    listOrdersForEvent(order.eventId),
  ]);
  if (!event) {
    return { error: "not_found" };
  }

  const product = products.find((p) => p.id === order.productId);
  if (!product) {
    return { error: "product_not_found" };
  }

  const otherAllocated = siblingOrders
    .filter((o) => o.productId === order.productId && o.id !== gatedOrderId)
    .reduce((sum, o) => sum + (o.confirmedQuantity ?? 0), 0);

  const cap = validateManualAllocationQuantity({
    confirmedQuantity,
    excludingOrderId: gatedOrderId,
    otherOrdersAllocatedOnProduct: otherAllocated,
    productAlreadyAllocated: product.allocatedQuantity,
    productFinalSupply: product.finalConfirmedQuantity ?? 0,
  });
  if (!cap.valid) {
    return { error: cap.reason };
  }

  const rate = getSupportRate(product, event);
  const status =
    confirmedQuantity <= 0
      ? "rejected"
      : confirmedQuantity >= order.requestedQuantity
        ? "full"
        : "partial";

  await manualAdjustOrder({
    actorId: admin.userId,
    confirmedQuantity,
    estimatedSupport: calculateEstimatedSupport(confirmedQuantity, rate),
    orderId: gatedOrderId,
    reason: reason.trim(),
    status,
  });

  revalidateFft(gatedLocale, order.eventId);
  return { ok: true };
}

export async function requestTransferAction(
  locale: string,
  orderId: string,
  formData: FormData
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedOrderId = gateFftOrderId(orderId);
  if (typeof gatedOrderId === "object") {
    return gatedOrderId;
  }

  const order = await getOrderById(gatedOrderId);
  if (!order) {
    return { error: "not_found" };
  }

  const access = await requireFftPermission("transfer.request", {
    eventId: order.eventId,
  });
  if (!access.isAdmin && order.salespersonUserId !== access.userId) {
    return { error: "forbidden" };
  }

  const event = await getScopedEvent(order.eventId);
  if (!event) {
    return { error: "not_found" };
  }

  const check = canTransferOrder(order, event);
  if (!check.allowed) {
    return { error: check.reason };
  }

  const newCustomerName = String(formData.get("newCustomerName") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const transferQuantity = Number(formData.get("transferQuantity"));
  if (!newCustomerName) {
    return { error: "new_customer_name_required" };
  }
  if (!reason) {
    return { error: "reason_required" };
  }
  if (!Number.isFinite(transferQuantity) || transferQuantity < 1) {
    return { error: "invalid_transfer_quantity" };
  }

  const maxQty = order.confirmedQuantity ?? order.requestedQuantity;
  if (transferQuantity > maxQty) {
    return { error: "transfer_quantity_exceeds_order" };
  }

  await createTransferRequest({
    newCustomerCode:
      String(formData.get("newCustomerCode") ?? "").trim() || undefined,
    newCustomerName,
    orderId: gatedOrderId,
    reason,
    requestedBy: access.userId,
    transferQuantity,
  });

  await recordFftAudit({
    action: "transfer.requested",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "sales",
    eventId: event.id,
    orderId: gatedOrderId,
    reason,
  });

  notifyTradeStakeholder(gatedLocale, {
    entityId: gatedOrderId,
    eventKey: "transfer.requested",
    recipientEmail: order.salespersonEmail,
    vars: { orderNumber: order.orderNumber },
  });

  revalidateFft(gatedLocale, event.id);
  return { ok: true };
}

export async function approveTransferAction(
  locale: string,
  orderId: string,
  transferId: string
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedOrderId = gateFftOrderId(orderId);
  if (typeof gatedOrderId === "object") {
    return gatedOrderId;
  }

  const order = await getOrderById(gatedOrderId);
  if (!order) {
    return { error: "not_found" };
  }

  const access = await requireFftPermission("transfer.approve", {
    eventId: order.eventId,
  });

  await approveTransfer({
    approvedBy: access.userId,
    orderId: gatedOrderId,
    transferId,
  });
  await recordFftAudit({
    action: "transfer.approved",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "ops",
    eventId: order.eventId,
    newValue: { transferId },
    orderId: gatedOrderId,
  });
  notifyTradeStakeholder(gatedLocale, {
    entityId: gatedOrderId,
    eventKey: "transfer.approved",
    recipientEmail: order.salespersonEmail,
    vars: { orderNumber: order.orderNumber },
  });
  revalidateFft(gatedLocale, order.eventId);
  return { ok: true };
}

export async function rejectTransferAction(
  locale: string,
  orderId: string,
  transferId: string
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedOrderId = gateFftOrderId(orderId);
  if (typeof gatedOrderId === "object") {
    return gatedOrderId;
  }

  const order = await getOrderById(gatedOrderId);
  if (!order) {
    return { error: "not_found" };
  }

  const access = await requireFftPermission("transfer.approve", {
    eventId: order.eventId,
  });

  await rejectTransfer({
    approvedBy: access.userId,
    orderId: gatedOrderId,
    transferId,
  });
  await recordFftAudit({
    action: "transfer.rejected",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "ops",
    eventId: order.eventId,
    newValue: { transferId },
    orderId: gatedOrderId,
  });
  notifyTradeStakeholder(gatedLocale, {
    entityId: gatedOrderId,
    eventKey: "transfer.rejected",
    recipientEmail: order.salespersonEmail,
    vars: { orderNumber: order.orderNumber },
  });
  revalidateFft(gatedLocale, order.eventId);
  return { ok: true };
}

export async function exportOrdersCsvAction(locale: string, eventId: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") {
    return gatedEventId;
  }

  await requireFftPermission("export.orders", { eventId: gatedEventId });
  const orders = await listOrdersForEvent(gatedEventId);
  return ordersToCsv(orders);
}

export async function exportEventSummaryCsvAction(
  locale: string,
  eventId: string
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") {
    return gatedEventId;
  }

  await requireFftPermission("export.orders", { eventId: gatedEventId });
  const [event, products, orders] = await Promise.all([
    getScopedEvent(gatedEventId),
    listProductsForEvent(gatedEventId),
    listOrdersForEvent(gatedEventId),
  ]);
  if (!event) {
    return { error: "not_found" as const };
  }
  return eventSummaryToCsv(buildEventSummary(event, products, orders));
}

export async function exportAllocationCsvAction(
  locale: string,
  eventId: string
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedEventId = gateFftEventId(eventId);
  if (typeof gatedEventId === "object") {
    return gatedEventId;
  }

  await requireFftPermission("export.orders", { eventId: gatedEventId });
  const orders = await listOrdersForEvent(gatedEventId);
  return allocationToCsv(orders);
}

export async function completeFftOrderAction(
  locale: string,
  orderId: string,
  fulfilledQuantity: number
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }
  const gatedOrderId = gateFftOrderId(orderId);
  if (typeof gatedOrderId === "object") {
    return gatedOrderId;
  }

  if (!Number.isFinite(fulfilledQuantity)) {
    return { error: "fulfilled_quantity_required" };
  }

  const order = await getOrderById(gatedOrderId);
  if (!order) {
    return { error: "not_found" };
  }

  const pickupOps = isFftPickupOpsEnabled();
  const access = pickupOps
    ? await requireFftPermission("pickup.manage", {
        eventId: order.eventId,
      })
    : await requireFftAdmin();

  const gate = canCompleteOrder({
    fulfilledQuantity,
    status: order.status,
  });
  if (!gate.allowed) {
    return { error: gate.reason };
  }

  const [event, products] = await Promise.all([
    getScopedEvent(order.eventId),
    listProductsForEvent(order.eventId),
  ]);
  const product = products.find((p) => p.id === order.productId);
  if (!(event && product)) {
    return { error: "not_found" };
  }

  const rate = getSupportRate(product, event);
  const finalSupport = calculateFinalSupport(fulfilledQuantity, rate) ?? 0;

  if (pickupOps) {
    try {
      await recordFulfillment({
        absoluteQuantity: fulfilledQuantity,
        actorId: access.userId,
        finalSupport,
        orderId: gatedOrderId,
        quantity: fulfilledQuantity,
      });
    } catch (err) {
      const message = toFftActionErrorMessage(err, "fulfillment_failed");
      return { error: message };
    }
  } else {
    await completeOrder({
      finalSupport,
      fulfilledQuantity,
      orderId: gatedOrderId,
    });
  }

  await recordFftAudit({
    action: "order.completed",
    actorId: access.userId,
    actorRole:
      "isAdmin" in access && access.isAdmin
        ? "admin"
        : pickupOps
          ? "ops"
          : "admin",
    eventId: order.eventId,
    newValue: { fulfilledQuantity },
    orderId: gatedOrderId,
  });

  revalidateFft(gatedLocale, order.eventId);
  return { ok: true };
}

export async function listEventTransfersAction(
  locale: string,
  eventId: string
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  await requireFftAdmin();
  return listTransfersForEvent(eventId);
}

export async function seedFftRbacCatalogAction(locale: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const access = await requireFftPermission("role.manage");
  await seedFftRbacCatalog({
    actorId: access.userId,
    organizationId: access.organizationId,
  });
  revalidateFft(gatedLocale);
  return { ok: true };
}

export async function createTradeRoleAction(
  locale: string,
  name: string,
  permissionCodes: string[]
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const access = await requireFftPermission("role.manage");
  if (!name.trim()) {
    return { error: "invalid_name" };
  }
  const org = await resolveFftOrganizationContext(access.userId);
  const roleId = await createCustomRole({
    actorId: access.userId,
    name,
    organizationId: org.organizationId,
    permissionCodes,
  });
  revalidateFft(gatedLocale);
  return { ok: true, roleId };
}

export async function setTradeRolePermissionsAction(
  locale: string,
  roleId: string,
  permissionCodes: string[]
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const access = await requireFftPermission("role.manage");
  await setRolePermissions({
    actorId: access.userId,
    permissionCodes,
    roleId,
  });
  revalidateFft(gatedLocale);
  return { ok: true };
}

export async function setTradeRoleActiveAction(
  locale: string,
  roleId: string,
  active: boolean
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const access = await requireFftPermission("role.manage");
  const org = await resolveFftOrganizationContext(access.userId);
  await setRoleActive({
    active,
    actorId: access.userId,
    organizationId: org.organizationId,
    roleId,
  });
  revalidateFft(gatedLocale);
  return { ok: true };
}

export async function duplicateTradeRoleAction(
  locale: string,
  sourceRoleId: string,
  name: string
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const access = await requireFftPermission("role.manage");
  const org = await resolveFftOrganizationContext(access.userId);
  const roleId = await duplicateRole({
    actorId: access.userId,
    name,
    organizationId: org.organizationId,
    sourceRoleId,
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
  }
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const access = await requireFftPermission("role.manage");
  if (!(input.userId && input.roleId)) {
    return { error: "invalid_input" };
  }
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
  const orgCtx = await resolveFftOrganizationContext(access.userId);
  await ensureRoleAssignment({
    actorId: access.userId,
    organizationId: orgCtx.organizationId,
    roleId: input.roleId,
    scopeId: input.scopeId,
    scopeType: input.scopeType,
    userEmail: input.userEmail,
    userId: input.userId,
  });
  await ensureFftMemberPlatformAccess({
    actorUserId: access.userId,
    organizationId: asOrganizationId(orgCtx.organizationId),
    userId: input.userId,
  });
  revalidateFft(gatedLocale);
  return { ok: true };
}

export async function revokeTradeRoleAssignmentAction(
  locale: string,
  assignmentId: string
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const access = await requireFftPermission("role.manage");
  const org = await resolveFftOrganizationContext(access.userId);
  await revokeRoleAssignment({
    actorId: access.userId,
    assignmentId,
    organizationId: org.organizationId,
  });
  revalidateFft(gatedLocale);
  return { ok: true };
}

export async function listEventDepositsAction(locale: string, eventId: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const disabled = assertFftDepositFeatureAction();
  if (disabled) {
    return disabled;
  }
  await requireFftPermission("deposit.view", { eventId });
  const [deposits, audit] = await Promise.all([
    listDepositsForEvent(eventId),
    listFinanceAuditForEvent(eventId),
  ]);
  return { audit, deposits };
}

export async function recordDepositReceiptAction(
  locale: string,
  eventId: string,
  formData: FormData
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const disabled = assertFftDepositFeatureAction();
  if (disabled) {
    return disabled;
  }
  const access = await requireFftPermission("deposit.manage", { eventId });
  const depositId = String(formData.get("depositId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const amount = Number(formData.get("amount"));
  if (!(depositId && orderId && Number.isFinite(amount)) || amount <= 0) {
    return { error: "invalid_input" };
  }
  await recordDepositReceipt({
    amount,
    depositId,
    orderId,
    recordedBy: access.userId,
    reference: String(formData.get("reference") ?? "").trim() || undefined,
  });
  const order = await getOrderById(orderId);
  if (order) {
    notifyTradeStakeholder(gatedLocale, {
      entityId: orderId,
      eventKey: "deposit.confirmed",
      recipientEmail: order.salespersonEmail,
      vars: {
        amount,
        orderNumber: order.orderNumber,
      },
    });
    if (isFftErpSyncEnabled()) {
      await enqueueErpSyncJob({
        actorId: access.userId,
        entityId: orderId,
        jobType: "deposit_summary",
      });
    }
  }
  revalidateFft(gatedLocale, eventId);
  return { ok: true };
}

export async function recordDepositAdjustmentAction(
  locale: string,
  eventId: string,
  formData: FormData
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const disabled = assertFftDepositFeatureAction();
  if (disabled) {
    return disabled;
  }
  const access = await requireFftPermission("deposit.manage", { eventId });
  const depositId = String(formData.get("depositId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const adjustmentType = String(formData.get("adjustmentType") ?? "") as
    | "waive"
    | "refund"
    | "forfeit"
    | "correction"
    | "cancelled";
  const reason = String(formData.get("reason") ?? "").trim();
  if (!(depositId && orderId && adjustmentType)) {
    return { error: "invalid_input" };
  }
  try {
    await recordDepositAdjustment({
      actorId: access.userId,
      adjustmentType,
      amount: formData.get("amount") ? Number(formData.get("amount")) : null,
      depositId,
      orderId,
      reason,
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
  formData: FormData
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const disabled = assertFftDepositFeatureAction();
  if (disabled) {
    return disabled;
  }
  const access = await requireFftPermission("deposit.manage", { eventId });
  const depositId = String(formData.get("depositId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  if (!(depositId && orderId)) {
    return { error: "invalid_input" };
  }
  await updateDepositDetails({
    actorId: access.userId,
    amount: formData.get("amount") ? Number(formData.get("amount")) : undefined,
    depositId,
    nonRefundable: formData.get("nonRefundable") === "on",
    orderId,
  });
  revalidateFft(gatedLocale, eventId);
  return { ok: true };
}

export async function createPickupWindowAction(
  locale: string,
  eventId: string,
  formData: FormData
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const disabled = assertFftPickupFeatureAction();
  if (disabled) {
    return disabled;
  }
  await requireFftPermission("pickup.manage", { eventId });
  const startsAt = new Date(String(formData.get("startsAt") ?? ""));
  const endsAt = new Date(String(formData.get("endsAt") ?? ""));
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { error: "invalid_dates" };
  }
  await createPickupWindow({
    capacity: formData.get("capacity")
      ? Number(formData.get("capacity"))
      : undefined,
    endsAt,
    eventId,
    location: String(formData.get("location") ?? "").trim() || undefined,
    startsAt,
  });
  revalidateFft(gatedLocale, eventId);
  return { ok: true };
}

export async function schedulePickupAction(
  locale: string,
  eventId: string,
  formData: FormData
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const disabled = assertFftPickupFeatureAction();
  if (disabled) {
    return disabled;
  }
  const access = await requireFftPermission("pickup.manage", { eventId });
  const orderId = String(formData.get("orderId") ?? "");
  const windowId = String(formData.get("windowId") ?? "");
  if (!(orderId && windowId)) {
    return { error: "invalid_input" };
  }
  await schedulePickup({ actorId: access.userId, orderId, windowId });
  const order = await getOrderById(orderId);
  if (order) {
    notifyTradeStakeholder(gatedLocale, {
      entityId: orderId,
      eventKey: "pickup.scheduled",
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
  formData: FormData
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const disabled = assertFftPickupFeatureAction();
  if (disabled) {
    return disabled;
  }
  const access = await requireFftPermission("pickup.manage", { eventId });
  const orderId = String(formData.get("orderId") ?? "");
  const quantity = Number(formData.get("quantity"));
  if (!(orderId && Number.isFinite(quantity)) || quantity <= 0) {
    return { error: "invalid_input" };
  }
  try {
    await recordFulfillment({
      actorId: access.userId,
      orderId,
      quantity,
    });
    const order = await getOrderById(orderId);
    if (order) {
      notifyTradeStakeholder(gatedLocale, {
        entityId: orderId,
        eventKey: "pickup.completed",
        recipientEmail: order.salespersonEmail,
        vars: {
          fulfilledQuantity: quantity,
          orderNumber: order.orderNumber,
        },
      });
      if (isFftErpSyncEnabled()) {
        await enqueueErpSyncJob({
          actorId: access.userId,
          entityId: orderId,
          jobType: "fulfillment_summary",
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
  formData: FormData
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const disabled = assertFftPickupFeatureAction();
  if (disabled) {
    return disabled;
  }
  const access = await requireFftPermission("pickup.manage", { eventId });
  const orderId = String(formData.get("orderId") ?? "");
  const exceptionType = String(formData.get("exceptionType") ?? "") as
    | "no_show"
    | "partial"
    | "cancel"
    | "override";
  const reason = String(formData.get("reason") ?? "").trim();
  if (!(orderId && exceptionType)) {
    return { error: "invalid_input" };
  }
  try {
    await recordPickupException({
      actorId: access.userId,
      exceptionType,
      orderId,
      reason,
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
  importType: string
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const parsed = parseImportType(importType);
  if (!parsed) {
    return { error: "invalid_import_type" as const };
  }
  const featureGate = assertImportFeatureGate(parsed);
  if (featureGate) {
    return featureGate;
  }

  const permission = importPermissionForType(parsed);
  await requireFftPermission(permission);

  const buffer = buildImportTemplateWorkbook(parsed);
  return {
    dataBase64: buffer.toString("base64"),
    filename: `${parsed}-template.xlsx`,
    ok: true as const,
  };
}

export async function uploadImportDryRunAction(
  locale: string,
  eventId: string,
  formData: FormData
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const importTypeRaw = String(formData.get("importType") ?? "");
  const parsed = parseImportType(importTypeRaw);
  if (!parsed) {
    return { error: "invalid_import_type" as const };
  }
  const featureGate = assertImportFeatureGate(parsed);
  if (featureGate) {
    return featureGate;
  }

  const permission = importPermissionForType(parsed);
  const access = await requireFftPermission(permission, { eventId });
  const scoped = await getScopedEvent(eventId, access.userId);
  if (!scoped) {
    return { error: "not_found" as const };
  }
  const org = await resolveFftOrganizationContext(access.userId);

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

  const validated = await validateImportRowsForDryRun(
    eventId,
    parsed,
    parsedRows,
    org.organizationId
  );

  const batch = await createImportBatch({
    actorId: access.userId,
    eventId,
    filename: file.name,
    importType: parsed,
    rows: validated,
  });

  await recordFftAudit({
    action: "import.dry_run",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "ops",
    eventId,
    newValue: {
      batchId: batch.id,
      errorCount: batch.errorCount,
      importType: parsed,
      rowCount: batch.rowCount,
      validCount: batch.validCount,
    },
  });

  return {
    batchId: batch.id,
    errorCount: batch.errorCount,
    ok: true as const,
    rowCount: batch.rowCount,
    rows: validated.map((r) => ({
      payload: r.payload,
      rowNumber: r.rowNumber,
      validationErrors: r.validationErrors,
    })),
    validCount: batch.validCount,
  };
}

export async function confirmImportBatchAction(
  locale: string,
  eventId: string,
  batchId: string
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const batch = await getImportBatchById(batchId);
  if (!batch || batch.eventId !== eventId) {
    return { error: "batch_not_found" as const };
  }
  const featureGate = assertImportFeatureGate(batch.importType);
  if (featureGate) {
    return featureGate;
  }

  const permission = importPermissionForType(batch.importType);
  const access = await requireFftPermission(permission, { eventId });
  const scoped = await getScopedEvent(eventId, access.userId);
  if (!scoped) {
    return { error: "not_found" as const };
  }
  const org = await resolveFftOrganizationContext(access.userId);

  if (batch.validCount === 0) {
    return { error: "no_valid_rows" as const };
  }

  const result = await commitImportBatch(batchId, {
    actorEmail: access.email,
    onDepositPending: (order) => notifyDepositPending(gatedLocale, order),
    organizationId: org.organizationId,
  });

  await recordFftAudit({
    action: "import.committed",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "ops",
    eventId,
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
  batchId: string
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const batch = await getImportBatchById(batchId);
  if (!batch || batch.eventId !== eventId) {
    return { error: "batch_not_found" as const };
  }

  const permission = importPermissionForType(batch.importType);
  const access = await requireFftPermission(permission, { eventId });

  await cancelImportBatch(batchId);
  await recordFftAudit({
    action: "import.cancelled",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "ops",
    eventId,
    newValue: { batchId },
  });

  return { ok: true as const };
}

export async function getImportBatchDetailAction(
  locale: string,
  eventId: string,
  batchId: string
) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const batch = await getImportBatchById(batchId);
  if (!batch || batch.eventId !== eventId) {
    return { error: "batch_not_found" as const };
  }

  const permission = importPermissionForType(batch.importType);
  await requireFftPermission(permission, { eventId });

  const rows = await listImportRowsForBatch(batchId);
  return {
    batch,
    ok: true as const,
    rows: rows.map((r) => ({
      payload: r.payloadJson,
      rowNumber: r.rowNumber,
      validationErrors: r.validationErrors,
      writeStatus: r.writeStatus,
    })),
  };
}

export async function retryErpSyncJobAction(locale: string, jobId: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const disabled = assertFftErpSyncFeatureAction();
  if (disabled) {
    return disabled;
  }

  const access = await requireFftPermission("sync.retry");
  const { getSyncJobById, retrySyncJob } = await import(
    "@/modules/fft/domain/erp-sync-store"
  );
  const before = await getSyncJobById(jobId);
  if (!before) {
    return { error: "job_not_found", ok: false as const };
  }
  if (before.status !== "failed" && before.status !== "dead") {
    return { error: "job_not_retryable", ok: false as const };
  }
  const after = await retrySyncJob(jobId);
  if (!after) {
    return { error: "retry_failed", ok: false as const };
  }
  await recordFftAudit({
    action: "erp_sync.retry",
    actorId: access.userId,
    actorRole: access.isAdmin ? "admin" : "ops",
    newValue: {
      attemptCount: after.attemptCount,
      jobId: after.id,
      status: after.status,
    },
    oldValue: {
      attemptCount: before.attemptCount,
      entityId: before.entityId,
      jobId: before.id,
      jobType: before.jobType,
      lastError: before.lastError,
      status: before.status,
    },
    reason: "manual_dlq_retry",
  });
  revalidatePath("/fft/admin/erp-sync");
  return { ok: true as const };
}

export async function processErpSyncJobsAction(locale: string) {
  const gatedLocale = gateFftLocale(locale);
  if (typeof gatedLocale === "object") {
    return gatedLocale;
  }

  const disabled = assertFftErpSyncFeatureAction();
  if (disabled) {
    return disabled;
  }

  await requireFftPermission("export.finance");
  const { processPendingSyncJobs } = await import(
    "@/modules/fft/domain/erp-sync-store"
  );
  const result = await processPendingSyncJobs();
  revalidatePath("/fft/admin/erp-sync");
  return { ok: true as const, ...result };
}
