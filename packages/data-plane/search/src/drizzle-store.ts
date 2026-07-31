import { and, db, desc, eq, platformSearchDocument, sql } from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import { mapSearchDocumentRow, mapSearchHitRow } from "./map-row";
import { sanitizeSearchMetadata } from "./sanitize";
import type { SearchStore } from "./store";
import type {
	SearchDeleteInput,
	SearchDocument,
	SearchHit,
	SearchListIdsInput,
	SearchQueryOptions,
	SearchUpsertInput,
} from "./types";

const documentReturning = {
	id: platformSearchDocument.id,
	organizationId: platformSearchDocument.organizationId,
	entity: platformSearchDocument.entity,
	documentId: platformSearchDocument.documentId,
	title: platformSearchDocument.title,
	description: platformSearchDocument.description,
	url: platformSearchDocument.url,
	metadata: platformSearchDocument.metadata,
	createdAt: platformSearchDocument.createdAt,
	updatedAt: platformSearchDocument.updatedAt,
} as const;

function buildSearchText(title: string, description: string | null): string {
	return description === null || description.trim().length === 0
		? title
		: `${title} ${description}`;
}

function toTsvectorSql(title: string, description: string | null) {
	return sql`to_tsvector('english', ${buildSearchText(title, description)})`;
}

function mapDocument(
	row: Parameters<typeof mapSearchDocumentRow>[0],
): Result<SearchDocument> {
	const mapped = mapSearchDocumentRow(row);
	if (!mapped.ok) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(mapped.data);
}

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

export class DrizzleSearchStore implements SearchStore {
	async upsert(input: SearchUpsertInput): Promise<Result<SearchDocument>> {
		try {
			const description = input.description ?? null;
			const metadata = sanitizeSearchMetadata(input.metadata);
			const now = new Date();
			const searchVector = toTsvectorSql(input.title, description);

			const [row] = await db
				.insert(platformSearchDocument)
				.values({
					organizationId: input.organizationId,
					entity: input.entity,
					documentId: input.documentId,
					title: input.title,
					description,
					url: input.url ?? null,
					metadata,
					searchVector,
					createdAt: now,
					updatedAt: now,
				})
				.onConflictDoUpdate({
					target: [
						platformSearchDocument.organizationId,
						platformSearchDocument.entity,
						platformSearchDocument.documentId,
					],
					set: {
						title: input.title,
						description,
						url: input.url ?? null,
						metadata,
						searchVector,
						updatedAt: now,
					},
				})
				.returning(documentReturning);

			if (row === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return mapDocument(row);
		} catch (error) {
			return failFromPersistence(error, "Failed to upsert search document");
		}
	}

	upsertBatch(inputs: SearchUpsertInput[]): Promise<Result<SearchDocument[]>> {
		return inputs.reduce<Promise<Result<SearchDocument[]>>>(
			async (previousResult, input) => {
				const accumulated = await previousResult;
				if (!accumulated.ok) {
					return accumulated;
				}

				const result = await this.upsert(input);
				if (!result.ok) {
					return result;
				}
				accumulated.data.push(result.data);
				return accumulated;
			},
			Promise.resolve(errorResult.ok([])),
		);
	}

	async delete(
		input: SearchDeleteInput,
	): Promise<Result<{ deleted: boolean }>> {
		try {
			const deleted = await db
				.delete(platformSearchDocument)
				.where(
					and(
						eq(platformSearchDocument.organizationId, input.organizationId),
						eq(platformSearchDocument.entity, input.entity),
						eq(platformSearchDocument.documentId, input.documentId),
					),
				)
				.returning({ id: platformSearchDocument.id });

			return errorResult.ok({ deleted: deleted.length > 0 });
		} catch (error) {
			return failFromPersistence(error, "Failed to delete search document");
		}
	}

	async listDocumentIds(input: SearchListIdsInput): Promise<Result<string[]>> {
		try {
			const rows = await db
				.select({ documentId: platformSearchDocument.documentId })
				.from(platformSearchDocument)
				.where(
					and(
						eq(platformSearchDocument.organizationId, input.organizationId),
						eq(platformSearchDocument.entity, input.entity),
					),
				);

			return errorResult.ok(rows.map((row) => row.documentId));
		} catch (error) {
			return failFromPersistence(error, "Failed to list search document ids");
		}
	}

	async search(options: SearchQueryOptions): Promise<Result<SearchHit[]>> {
		try {
			const tsQuery = sql`plainto_tsquery('english', ${options.query})`;
			const predicates = [
				eq(platformSearchDocument.organizationId, options.organizationId),
				sql`${platformSearchDocument.searchVector} @@ ${tsQuery}`,
			];
			if (options.entity !== undefined) {
				predicates.push(eq(platformSearchDocument.entity, options.entity));
			}

			const where = and(...predicates);
			if (where === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}

			const rank = sql<number>`ts_rank(${platformSearchDocument.searchVector}, ${tsQuery})`;

			const rows = await db
				.select({
					id: platformSearchDocument.id,
					organizationId: platformSearchDocument.organizationId,
					entity: platformSearchDocument.entity,
					documentId: platformSearchDocument.documentId,
					title: platformSearchDocument.title,
					description: platformSearchDocument.description,
					url: platformSearchDocument.url,
					metadata: platformSearchDocument.metadata,
					score: rank,
				})
				.from(platformSearchDocument)
				.where(where)
				.orderBy(desc(rank))
				.limit(options.limit)
				.offset(options.offset);

			const hits: SearchHit[] = [];
			for (const row of rows) {
				const mapped = mapSearchHitRow(row);
				if (!mapped.ok) {
					return errorResult.fail("INTERNAL_ERROR");
				}
				hits.push(mapped.data);
			}
			return errorResult.ok(hits);
		} catch (error) {
			return failFromPersistence(error, "Failed to search documents");
		}
	}
}

export function createDrizzleSearchStore(): SearchStore {
	return new DrizzleSearchStore();
}
