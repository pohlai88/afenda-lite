import { z } from "zod";

import { orgQueryActorSchema } from "./contracts/context";

export const DEFAULT_MASTER_PAGE = 1 as const;
export const DEFAULT_MASTER_PAGE_SIZE = 25 as const;
export const MAX_MASTER_PAGE_SIZE = 100 as const;

export interface PageRequest {
	cursor?: string;
	pageSize?: number;
}

export interface Page<T> {
	items: T[];
	nextCursor?: string;
}

export const pageRequestSchema = z
	.object({
		cursor: z.string().trim().min(1).max(512).optional(),
		pageSize: z.number().int().min(1).max(MAX_MASTER_PAGE_SIZE).optional(),
	})
	.strict()
	.transform((value) => ({
		...value,
		pageSize: value.pageSize ?? DEFAULT_MASTER_PAGE_SIZE,
	}));

export const masterListOptionsSchema = z
	.object({
		...orgQueryActorSchema.shape,
		page: z.number().int().min(1).optional(),
		pageSize: z.number().int().min(1).max(MAX_MASTER_PAGE_SIZE).optional(),
		status: z
			.enum(["draft", "active", "inactive", "blocked", "retired"])
			.optional(),
		updatedSince: z.coerce.date().optional(),
	})
	.strict()
	.transform((value) => ({
		...value,
		page: value.page ?? DEFAULT_MASTER_PAGE,
		pageSize: value.pageSize ?? DEFAULT_MASTER_PAGE_SIZE,
	}));

export type MasterListOptions = z.infer<typeof masterListOptionsSchema>;
