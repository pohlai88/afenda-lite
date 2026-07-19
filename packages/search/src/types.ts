/**
 * Org-scoped product search vocabulary (Postgres FTS — not docs Orama).
 */

export type SearchDocument = {
	id: string;
	organizationId: string;
	entity: string;
	documentId: string;
	title: string;
	description: string | null;
	url: string | null;
	metadata: Record<string, unknown> | null;
	createdAt: Date;
	updatedAt: Date;
};

export type SearchHit = {
	id: string;
	organizationId: string;
	entity: string;
	documentId: string;
	title: string;
	description: string | null;
	url: string | null;
	metadata: Record<string, unknown> | null;
	score: number;
};

export type SearchUpsertInput = {
	organizationId: string;
	entity: string;
	documentId: string;
	title: string;
	description?: string | null;
	url?: string | null;
	metadata?: Record<string, unknown> | null;
};

export type SearchDeleteInput = {
	organizationId: string;
	entity: string;
	documentId: string;
};

export type SearchListIdsInput = {
	organizationId: string;
	entity: string;
};

export type SearchQueryOptions = {
	organizationId: string;
	query: string;
	entity?: string;
	limit: number;
	offset: number;
};
