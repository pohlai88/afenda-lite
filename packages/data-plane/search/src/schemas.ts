import { z } from "zod";
import { normalizeSearchText } from "./normalization";
import {
	SEARCH_DOCUMENT_POLICY,
	SEARCH_ENTITY_VALUES,
	SEARCH_LIFECYCLE_POLICY,
} from "./semantic-registry";

export const DEFAULT_SEARCH_LIMIT = SEARCH_LIFECYCLE_POLICY.defaultLimit;
export const MAX_SEARCH_LIMIT = SEARCH_LIFECYCLE_POLICY.maxLimit;
export const MAX_SEARCH_TITLE_LENGTH = SEARCH_DOCUMENT_POLICY.titleMaxLength;
export const MAX_SEARCH_DESCRIPTION_LENGTH =
	SEARCH_DOCUMENT_POLICY.descriptionMaxLength;
export const MAX_SEARCH_URL_LENGTH = SEARCH_DOCUMENT_POLICY.urlMaxLength;
export const MAX_SEARCH_ENTITY_LENGTH = SEARCH_DOCUMENT_POLICY.entityMaxLength;
export const MAX_SEARCH_DOCUMENT_ID_LENGTH =
	SEARCH_DOCUMENT_POLICY.documentIdMaxLength;
export const MAX_SEARCH_QUERY_LENGTH = SEARCH_DOCUMENT_POLICY.queryMaxLength;
export const MAX_SEARCH_BATCH_SIZE = SEARCH_LIFECYCLE_POLICY.batchLimit;

const jsonObjectSchema = z.record(z.string(), z.unknown());
const normalizedRequiredText = (maxLength: number) =>
	z
		.string()
		.transform(normalizeSearchText)
		.pipe(z.string().min(1).max(maxLength));
const normalizedOptionalText = (maxLength: number) =>
	z.string().transform(normalizeSearchText).pipe(z.string().max(maxLength));

export const searchDocumentSchema = z.object({
	id: z.string().min(1),
	organizationId: z.string().min(1),
	entity: z.enum(SEARCH_ENTITY_VALUES),
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
	entity: z.enum(SEARCH_ENTITY_VALUES),
	documentId: z.string().min(1),
	title: z.string().min(1),
	description: z.string().nullable(),
	url: z.string().nullable(),
	metadata: jsonObjectSchema.nullable(),
	score: z.number(),
});

export const searchUpsertInputSchema = z.object({
	organizationId: z.string().trim().min(1),
	entity: z.enum(SEARCH_ENTITY_VALUES),
	documentId: normalizedRequiredText(MAX_SEARCH_DOCUMENT_ID_LENGTH),
	title: normalizedRequiredText(MAX_SEARCH_TITLE_LENGTH),
	description: normalizedOptionalText(MAX_SEARCH_DESCRIPTION_LENGTH)
		.nullable()
		.optional(),
	url: normalizedOptionalText(MAX_SEARCH_URL_LENGTH).nullable().optional(),
	metadata: jsonObjectSchema.nullable().optional(),
});

export const searchDeleteInputSchema = z.object({
	organizationId: z.string().trim().min(1),
	entity: z.enum(SEARCH_ENTITY_VALUES),
	documentId: normalizedRequiredText(MAX_SEARCH_DOCUMENT_ID_LENGTH),
});

export const searchListIdsInputSchema = z.object({
	organizationId: z.string().trim().min(1),
	entity: z.enum(SEARCH_ENTITY_VALUES),
});

export const searchUpsertBatchSchema = z
	.array(searchUpsertInputSchema)
	.min(1)
	.max(MAX_SEARCH_BATCH_SIZE);

export const searchQueryOptionsSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		query: normalizedRequiredText(MAX_SEARCH_QUERY_LENGTH),
		entity: z.enum(SEARCH_ENTITY_VALUES).optional(),
		limit: z.number().int().min(1).max(MAX_SEARCH_LIMIT).optional(),
		offset: z.number().int().min(0).optional(),
	})
	.transform((value) => ({
		...value,
		limit: value.limit ?? DEFAULT_SEARCH_LIMIT,
		offset: value.offset ?? 0,
	}));
