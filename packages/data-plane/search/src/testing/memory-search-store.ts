import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import { sanitizeSearchMetadata } from "../sanitize";
import type { SearchStore } from "../store";
import type {
	SearchDeleteInput,
	SearchDocument,
	SearchHit,
	SearchListIdsInput,
	SearchQueryOptions,
	SearchUpsertInput,
} from "../types";

const SEARCH_TOKEN_SEPARATOR = /\s+/;

function scoreDocument(doc: SearchDocument, query: string): number {
	const q = query.toLowerCase();
	const title = doc.title.toLowerCase();
	const description = (doc.description ?? "").toLowerCase();
	if (title.includes(q)) {
		return 1 + q.length / Math.max(title.length, 1);
	}
	if (description.includes(q)) {
		return 0.5 + q.length / Math.max(description.length, 1);
	}
	const tokens = q
		.split(SEARCH_TOKEN_SEPARATOR)
		.filter((token) => token.length > 0);
	let hits = 0;
	for (const token of tokens) {
		if (title.includes(token) || description.includes(token)) {
			hits += 1;
		}
	}
	return hits === 0 ? 0 : hits / tokens.length;
}

/** In-memory SearchStore for Vitest and package consumers' tests only. */
export class MemorySearchStore implements SearchStore {
	private readonly documents = new Map<string, SearchDocument>();

	private key(organizationId: string, entity: string, documentId: string) {
		return `${organizationId}\0${entity}\0${documentId}`;
	}

	upsert(input: SearchUpsertInput): Promise<Result<SearchDocument>> {
		const key = this.key(input.organizationId, input.entity, input.documentId);
		const existing = this.documents.get(key);
		const now = new Date();
		const document: SearchDocument = {
			id: existing?.id ?? randomUUID(),
			organizationId: input.organizationId,
			entity: input.entity,
			documentId: input.documentId,
			title: input.title,
			description: input.description ?? null,
			url: input.url ?? null,
			metadata: sanitizeSearchMetadata(input.metadata),
			createdAt: existing?.createdAt ?? now,
			updatedAt: now,
		};
		this.documents.set(key, document);
		return Promise.resolve(errorResult.ok(document));
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

	delete(input: SearchDeleteInput): Promise<Result<{ deleted: boolean }>> {
		const key = this.key(input.organizationId, input.entity, input.documentId);
		return Promise.resolve(
			errorResult.ok({ deleted: this.documents.delete(key) }),
		);
	}

	listDocumentIds(input: SearchListIdsInput): Promise<Result<string[]>> {
		const ids: string[] = [];
		for (const doc of this.documents.values()) {
			if (
				doc.organizationId === input.organizationId &&
				doc.entity === input.entity
			) {
				ids.push(doc.documentId);
			}
		}
		return Promise.resolve(errorResult.ok(ids));
	}

	search(options: SearchQueryOptions): Promise<Result<SearchHit[]>> {
		const hits: SearchHit[] = [];
		for (const doc of this.documents.values()) {
			if (doc.organizationId !== options.organizationId) {
				continue;
			}
			if (options.entity !== undefined && doc.entity !== options.entity) {
				continue;
			}
			const score = scoreDocument(doc, options.query);
			if (score <= 0) {
				continue;
			}
			hits.push({
				id: doc.id,
				organizationId: doc.organizationId,
				entity: doc.entity,
				documentId: doc.documentId,
				title: doc.title,
				description: doc.description,
				url: doc.url,
				metadata: doc.metadata,
				score,
			});
		}
		hits.sort((a, b) => b.score - a.score);
		return Promise.resolve(
			errorResult.ok(
				hits.slice(options.offset, options.offset + options.limit),
			),
		);
	}
}
