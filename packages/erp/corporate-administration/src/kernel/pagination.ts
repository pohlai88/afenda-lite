import { z } from "zod";

export const DEFAULT_CURSOR_PAGE_SIZE = 50 as const;
export const MAX_CURSOR_PAGE_SIZE = 100 as const;
export const MAX_OPAQUE_CURSOR_LENGTH = 1024 as const;

export const opaqueCursorSchema = z
	.string()
	.trim()
	.min(1, "Cursor must not be empty")
	.max(
		MAX_OPAQUE_CURSOR_LENGTH,
		`Cursor must not exceed ${MAX_OPAQUE_CURSOR_LENGTH} characters`,
	)
	.brand<"OpaqueCursor">();
export type OpaqueCursor = z.infer<typeof opaqueCursorSchema>;

export const cursorPaginationSchema = z
	.object({
		cursor: opaqueCursorSchema.optional(),
		limit: z
			.number()
			.int("Page size must be an integer")
			.min(1, "Page size must be at least 1")
			.max(
				MAX_CURSOR_PAGE_SIZE,
				`Page size must not exceed ${MAX_CURSOR_PAGE_SIZE}`,
			)
			.default(DEFAULT_CURSOR_PAGE_SIZE),
	})
	.readonly();
export type CursorPagination = z.infer<typeof cursorPaginationSchema>;

export type CursorPage<T> = Readonly<{
	items: readonly T[];
	nextCursor: OpaqueCursor | null;
}>;
