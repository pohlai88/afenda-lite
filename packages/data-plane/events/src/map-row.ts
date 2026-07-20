import { domainEventSchema } from "./schemas";
import type { DomainEvent } from "./types";

export type DomainEventRow = {
	id: string;
	organizationId: string;
	type: string;
	sourceModule: string;
	correlationId: string;
	causationId: string | null;
	actorUserId: string;
	payload: unknown;
	metadata: unknown;
	status: string;
	attempts: number;
	lastError: string | null;
	processedAt: Date | null;
	createdAt: Date;
};

export type MapDomainEventRowFailure = {
	ok: false;
	reason: "invalid_payload" | "invalid_metadata" | "invalid_event";
};

export type MapDomainEventRowResult =
	| { ok: true; data: DomainEvent }
	| MapDomainEventRowFailure;

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(
	value: unknown,
): { ok: true; data: Record<string, unknown> } | { ok: false } {
	if (isPlainObject(value)) {
		return { ok: true, data: value };
	}
	return { ok: false };
}

function asRecordOrNull(
	value: unknown,
): { ok: true; data: Record<string, unknown> | null } | { ok: false } {
	if (value === null || value === undefined) {
		return { ok: true, data: null };
	}
	if (isPlainObject(value)) {
		return { ok: true, data: value };
	}
	return { ok: false };
}

export function mapDomainEventRow(
	row: DomainEventRow,
): MapDomainEventRowResult {
	const payload = asRecord(row.payload);
	if (!payload.ok) {
		return { ok: false, reason: "invalid_payload" };
	}

	const metadata = asRecordOrNull(row.metadata);
	if (!metadata.ok) {
		return { ok: false, reason: "invalid_metadata" };
	}

	const parsed = domainEventSchema.safeParse({
		id: row.id,
		type: row.type,
		sourceModule: row.sourceModule,
		occurredAt: row.createdAt,
		correlationId: row.correlationId,
		causationId: row.causationId,
		organizationId: row.organizationId,
		actorUserId: row.actorUserId,
		payload: payload.data,
		metadata: metadata.data,
		status: row.status,
		attempts: row.attempts,
		lastError: row.lastError,
		processedAt: row.processedAt,
	});

	if (!parsed.success) {
		return { ok: false, reason: "invalid_event" };
	}

	return { ok: true, data: parsed.data };
}
