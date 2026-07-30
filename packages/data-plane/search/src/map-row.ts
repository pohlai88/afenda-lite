import { searchDocumentSchema, searchHitSchema } from "./schemas";
import type { SearchDocument, SearchHit } from "./types";

export interface SearchDocumentRow {
	createdAt: Date;
	description: string | null;
	documentId: string;
	entity: string;
	id: string;
	metadata: unknown;
	organizationId: string;
	title: string;
	updatedAt: Date;
	url: string | null;
}

export type SearchHitRow = Omit<
	SearchDocumentRow,
	"createdAt" | "updatedAt"
> & {
	score: unknown;
};

export interface MapSearchRowFailure {
	ok: false;
	reason: "invalid_metadata" | "invalid_document" | "invalid_hit";
}

export type MapSearchDocumentResult =
	| { ok: true; data: SearchDocument }
	| MapSearchRowFailure;

export type MapSearchHitResult =
	| { ok: true; data: SearchHit }
	| MapSearchRowFailure;

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
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

export function mapSearchDocumentRow(
	row: SearchDocumentRow,
): MapSearchDocumentResult {
	const metadata = asRecordOrNull(row.metadata);
	if (!metadata.ok) {
		return { ok: false, reason: "invalid_metadata" };
	}

	const parsed = searchDocumentSchema.safeParse({
		id: row.id,
		organizationId: row.organizationId,
		entity: row.entity,
		documentId: row.documentId,
		title: row.title,
		description: row.description,
		url: row.url,
		metadata: metadata.data,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});

	if (!parsed.success) {
		return { ok: false, reason: "invalid_document" };
	}
	return { ok: true, data: parsed.data };
}

export function mapSearchHitRow(row: SearchHitRow): MapSearchHitResult {
	const metadata = asRecordOrNull(row.metadata);
	if (!metadata.ok) {
		return { ok: false, reason: "invalid_metadata" };
	}

	const { score: rawScore } = row;
	let score = Number.NaN;
	if (typeof rawScore === "number") {
		score = rawScore;
	} else if (typeof rawScore === "string") {
		score = Number(rawScore);
	}

	const parsed = searchHitSchema.safeParse({
		id: row.id,
		organizationId: row.organizationId,
		entity: row.entity,
		documentId: row.documentId,
		title: row.title,
		description: row.description,
		url: row.url,
		metadata: metadata.data,
		score,
	});

	if (!parsed.success) {
		return { ok: false, reason: "invalid_hit" };
	}
	return { ok: true, data: parsed.data };
}
