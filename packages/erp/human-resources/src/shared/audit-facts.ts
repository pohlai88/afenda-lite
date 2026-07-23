import type { Change } from "@afenda/audit";
import { computeDiff, maskSensitiveData } from "@afenda/audit";

import type { AuditFactInput } from "../ports";
import type { HumanResourcesMutationMeta } from "./mutation-meta";

const HR_PII_FIELDS = new Set([
	"documentRef",
	"identifier",
	"identifierFingerprint",
	"identifierLast4",
	"legalName",
	"rejectionReason",
	"metadata",
	"commentsSensitive",
	"evidenceReference",
	"documentIdentifier",
]);

const MASKED = "***" as const;

function isHrPiiField(field: string): boolean {
	return HR_PII_FIELDS.has(field);
}

function maskHrValue(value: unknown, sensitive: boolean): unknown {
	if (!sensitive) return value;
	if (value === null || value === undefined) return value;
	if (typeof value === "string" && value.length > 0) return MASKED;
	if (typeof value === "object") return MASKED;
	return value;
}

function maskHrSnapshot(
	value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
	if (value === undefined || value === null) return null;
	const auditMasked = maskSensitiveData(value);
	const out: Record<string, unknown> = {};
	for (const [key, fieldValue] of Object.entries(auditMasked)) {
		if (isHrPiiField(key)) {
			out[key] = maskHrValue(fieldValue, true);
			continue;
		}
		if (
			fieldValue !== null &&
			typeof fieldValue === "object" &&
			!Array.isArray(fieldValue)
		) {
			out[key] = maskHrSnapshot(fieldValue as Record<string, unknown>);
			continue;
		}
		out[key] = fieldValue;
	}
	return out;
}

function maskHrChanges(changes: Change[]): Change[] {
	return changes.map((change) => {
		const sensitive = isHrPiiField(change.field) || change.field === "*";
		if (!sensitive && change.field !== "*") {
			return change;
		}
		if (change.field === "*") {
			const oldSnap =
				change.oldValue !== null &&
				typeof change.oldValue === "object" &&
				!Array.isArray(change.oldValue)
					? maskHrSnapshot(change.oldValue as Record<string, unknown>)
					: maskHrValue(change.oldValue, true);
			const newSnap =
				change.newValue !== null &&
				typeof change.newValue === "object" &&
				!Array.isArray(change.newValue)
					? maskHrSnapshot(change.newValue as Record<string, unknown>)
					: maskHrValue(change.newValue, true);
			return { field: "*", oldValue: oldSnap, newValue: newSnap };
		}
		return {
			field: change.field,
			oldValue: maskHrValue(change.oldValue, true),
			newValue: maskHrValue(change.newValue, true),
		};
	});
}

function computeHrDiff(
	oldValue: Record<string, unknown> | null | undefined,
	newValue: Record<string, unknown> | null | undefined,
): Change[] {
	const raw = computeDiff(oldValue ?? null, newValue ?? null);
	return maskHrChanges(raw);
}

export type AuditFactContext = {
	organizationId: string;
	actorUserId: string;
	entity: string;
	entityId: string;
	meta: HumanResourcesMutationMeta;
};

export function buildCreateAuditFact(input: {
	context: AuditFactContext;
	newValue: Record<string, unknown>;
	changes?: Change[];
}): AuditFactInput {
	const newValue = maskHrSnapshot(input.newValue);
	const changes =
		input.changes !== undefined
			? maskHrChanges(input.changes)
			: computeHrDiff(null, input.newValue);
	return {
		organizationId: input.context.organizationId,
		actorUserId: input.context.actorUserId,
		correlationId: input.context.meta.correlationId,
		entity: input.context.entity,
		entityId: input.context.entityId,
		action: "CREATE",
		changes,
		oldValue: null,
		newValue,
	};
}

export function buildUpdateAuditFact(input: {
	context: AuditFactContext;
	oldValue: Record<string, unknown>;
	newValue: Record<string, unknown>;
	changes?: Change[];
}): AuditFactInput {
	const oldValue = maskHrSnapshot(input.oldValue);
	const newValue = maskHrSnapshot(input.newValue);
	const changes =
		input.changes !== undefined
			? maskHrChanges(input.changes)
			: computeHrDiff(input.oldValue, input.newValue);
	return {
		organizationId: input.context.organizationId,
		actorUserId: input.context.actorUserId,
		correlationId: input.context.meta.correlationId,
		entity: input.context.entity,
		entityId: input.context.entityId,
		action: "UPDATE",
		changes,
		oldValue,
		newValue,
	};
}

export function buildStatusTransitionAuditFact(input: {
	context: AuditFactContext;
	field?: string;
	oldStatus: string | null;
	newStatus: string;
	oldValue?: Record<string, unknown> | null;
	newValue?: Record<string, unknown> | null;
}): AuditFactInput {
	const field = input.field ?? "status";
	const changes: Change[] = [
		{
			field,
			oldValue: input.oldStatus,
			newValue: input.newStatus,
		},
	];
	return {
		organizationId: input.context.organizationId,
		actorUserId: input.context.actorUserId,
		correlationId: input.context.meta.correlationId,
		entity: input.context.entity,
		entityId: input.context.entityId,
		action: "UPDATE",
		changes,
		oldValue: maskHrSnapshot(input.oldValue ?? null),
		newValue: maskHrSnapshot(input.newValue ?? null),
	};
}

/** JSON helpers for Drizzle CTE audit inserts. */
export function fieldChangeJson(
	field: string,
	oldValue: unknown,
	newValue: unknown,
): string {
	const sensitive = isHrPiiField(field);
	return JSON.stringify([
		{
			field,
			oldValue: maskHrValue(oldValue, sensitive),
			newValue: maskHrValue(newValue, sensitive),
		},
	]);
}

export function valueSnapshotJson(value: Record<string, unknown>): string {
	return JSON.stringify(maskHrSnapshot(value) ?? {});
}

export function eventPayloadJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}
