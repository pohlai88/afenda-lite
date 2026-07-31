/**
 * Org-scoped product search vocabulary (Postgres FTS — not docs Orama).
 */

export interface SearchDocument {
	createdAt: Date;
	description: string | null;
	documentId: string;
	entity: SearchEntity;
	id: string;
	metadata: Record<string, unknown> | null;
	organizationId: string;
	title: string;
	updatedAt: Date;
	url: string | null;
}

export interface SearchHit {
	description: string | null;
	documentId: string;
	entity: SearchEntity;
	id: string;
	metadata: Record<string, unknown> | null;
	organizationId: string;
	score: number;
	title: string;
	url: string | null;
}

export interface SearchUpsertInput {
	description?: string | null | undefined;
	documentId: string;
	entity: SearchEntity;
	metadata?: Record<string, unknown> | null | undefined;
	organizationId: string;
	title: string;
	url?: string | null | undefined;
}

export interface SearchDeleteInput {
	documentId: string;
	entity: SearchEntity;
	organizationId: string;
}

export interface SearchListIdsInput {
	entity: SearchEntity;
	organizationId: string;
}

export interface SearchQueryOptions {
	entity?: SearchEntity | undefined;
	limit: number;
	offset: number;
	organizationId: string;
	query: string;
}

import type { SearchEntity } from "./semantic-registry";
