import { z } from "zod";

export const DEFAULT_SEARCH_LIMIT = 20 as const;
export const MAX_SEARCH_LIMIT = 100 as const;
export const MAX_SEARCH_TITLE_LENGTH = 500 as const;
export const MAX_SEARCH_DESCRIPTION_LENGTH = 4_000 as const;
export const MAX_SEARCH_URL_LENGTH = 2_048 as const;
export const MAX_SEARCH_ENTITY_LENGTH = 128 as const;
export const MAX_SEARCH_DOCUMENT_ID_LENGTH = 256 as const;
export const MAX_SEARCH_QUERY_LENGTH = 500 as const;
export const MAX_SEARCH_BATCH_SIZE = 1_000 as const;

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const searchDocumentSchema = z.object({
	id: z.string().min(1),
	organizationId: z.string().min(1),
	entity: z.string().min(1),
	documentId: z.string().min(1),
	title: z.string().min(1),
	description: z.string().nullable(),
	url: z.string().nullable(),
	metadata: jsonObjectSchema.nullable(),
	createdAt: z
		.union([z.string().datetime(), z.date()])
		.transform((value) => (value instanceof Date ? value : new Date(value))),
	updatedAt: z
		.union([z.string().datetime(), z.date()])
		.transform((value) => (value instanceof Date ? value : new Date(value))),
});

export type ParsedSearchDocument = z.infer<typeof searchDocumentSchema>;

export const searchHitSchema = z.object({
	id: z.string().min(1),
	organizationId: z.string().min(1),
	entity: z.string().min(1),
	documentId: z.string().min(1),
	title: z.string().min(1),
	description: z.string().nullable(),
	url: z.string().nullable(),
	metadata: jsonObjectSchema.nullable(),
	score: z.number(),
});

export const searchUpsertInputSchema = z.object({
	organizationId: z.string().trim().min(1),
	entity: z.string().trim().min(1).max(MAX_SEARCH_ENTITY_LENGTH),
	documentId: z.string().trim().min(1).max(MAX_SEARCH_DOCUMENT_ID_LENGTH),
	title: z.string().trim().min(1).max(MAX_SEARCH_TITLE_LENGTH),
	description: z
		.string()
		.trim()
		.max(MAX_SEARCH_DESCRIPTION_LENGTH)
		.nullable()
		.optional(),
	url: z.string().trim().max(MAX_SEARCH_URL_LENGTH).nullable().optional(),
	metadata: jsonObjectSchema.nullable().optional(),
});

export const searchDeleteInputSchema = z.object({
	organizationId: z.string().trim().min(1),
	entity: z.string().trim().min(1).max(MAX_SEARCH_ENTITY_LENGTH),
	documentId: z.string().trim().min(1).max(MAX_SEARCH_DOCUMENT_ID_LENGTH),
});

export const searchListIdsInputSchema = z.object({
	organizationId: z.string().trim().min(1),
	entity: z.string().trim().min(1).max(MAX_SEARCH_ENTITY_LENGTH),
});

export const searchUpsertBatchSchema = z
	.array(searchUpsertInputSchema)
	.min(1)
	.max(MAX_SEARCH_BATCH_SIZE);

export const searchQueryOptionsSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		query: z.string().trim().min(1).max(MAX_SEARCH_QUERY_LENGTH),
		entity: z.string().trim().min(1).max(MAX_SEARCH_ENTITY_LENGTH).optional(),
		limit: z.number().int().min(1).max(MAX_SEARCH_LIMIT).optional(),
		offset: z.number().int().min(0).optional(),
	})
	.transform((value) => ({
		...value,
		limit: value.limit ?? DEFAULT_SEARCH_LIMIT,
		offset: value.offset ?? 0,
	}));
