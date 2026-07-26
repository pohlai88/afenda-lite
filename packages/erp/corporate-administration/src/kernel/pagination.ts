import { z } from "zod";

export const DEFAULT_CURSOR_PAGE_SIZE = 50 as const;
export const MAX_CURSOR_PAGE_SIZE = 100 as const;

export const opaqueCursorSchema = z
	.string()
	.trim()
	.min(1)
	.max(1024)
	.brand<"OpaqueCursor">();
export type OpaqueCursor = z.infer<typeof opaqueCursorSchema>;

export const cursorPaginationSchema = z.object({
	cursor: opaqueCursorSchema.optional(),
	limit: z
		.number()
		.int()
		.min(1)
		.max(MAX_CURSOR_PAGE_SIZE)
		.default(DEFAULT_CURSOR_PAGE_SIZE),
});

export type CursorPagination = z.infer<typeof cursorPaginationSchema>;

export type CursorPage<T> = {
	items: readonly T[];
	nextCursor: OpaqueCursor | null;
};
