import { z } from "zod";
import { salesQueryContextSchema } from "../contracts/context";

export const DEFAULT_SALES_PAGE_SIZE = 25 as const;
export const MAX_SALES_PAGE_SIZE = 100 as const;
export interface SalesPage<T> {
	items: T[];
	nextCursor?: string | undefined;
}
export const salesPageRequestSchema = salesQueryContextSchema
	.extend({
		cursor: z.string().trim().min(1).max(512).optional(),
		pageSize: z.number().int().min(1).max(MAX_SALES_PAGE_SIZE).optional(),
	})
	.transform((value) => ({
		...value,
		pageSize: value.pageSize ?? DEFAULT_SALES_PAGE_SIZE,
	}));
