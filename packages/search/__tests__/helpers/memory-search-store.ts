import { randomUUID } from "node:crypto";

import { ok, type Result } from "@afenda/errors/result";

import { sanitizeSearchMetadata } from "../../src/sanitize";
import type { SearchStore } from "../../src/store";
import type {
	SearchDeleteInput,
	SearchDocument,
	SearchHit,
	SearchListIdsInput,
	SearchQueryOptions,
	SearchUpsertInput,
} from "../../src/types";

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
	const tokens = q.split(/\s+/).filter((token) => token.length > 0);
	let hits = 0;
	for (const token of tokens) {
		if (title.includes(token) || description.includes(token)) {
			hits += 1;
		}
	}
	return hits === 0 ? 0 : hits / tokens.length;
}

/** In-memory SearchStore for Vitest only — not a production export. */
export class MemorySearchStore implements SearchStore {
	private readonly documents = new Map<string, SearchDocument>();

	private key(organizationId: string, entity: string, documentId: string) {
		return `${organizationId}\0${entity}\0${documentId}`;
	}

	async upsert(input: SearchUpsertInput): Promise<Result<SearchDocument>> {
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
		return ok(document);
	}

	async upsertBatch(
		inputs: SearchUpsertInput[],
	): Promise<Result<SearchDocument[]>> {
		const documents: SearchDocument[] = [];
		for (const input of inputs) {
			const result = await this.upsert(input);
			if (!result.ok) {
				return result;
			}
			documents.push(result.data);
		}
		return ok(documents);
	}

	async delete(
		input: SearchDeleteInput,
	): Promise<Result<{ deleted: boolean }>> {
		const key = this.key(input.organizationId, input.entity, input.documentId);
		return ok({ deleted: this.documents.delete(key) });
	}

	async listDocumentIds(input: SearchListIdsInput): Promise<Result<string[]>> {
		const ids: string[] = [];
		for (const doc of this.documents.values()) {
			if (
				doc.organizationId === input.organizationId &&
				doc.entity === input.entity
			) {
				ids.push(doc.documentId);
			}
		}
		return ok(ids);
	}

	async search(options: SearchQueryOptions): Promise<Result<SearchHit[]>> {
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
		return ok(hits.slice(options.offset, options.offset + options.limit));
	}
}
