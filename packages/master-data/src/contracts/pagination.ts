import { z } from "zod";

export const DEFAULT_MASTER_PAGE = 1 as const;
export const DEFAULT_MASTER_PAGE_SIZE = 25 as const;
export const MAX_MASTER_PAGE_SIZE = 100 as const;

export const masterListOptionsSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		actorUserId: z.string().trim().min(1),
		page: z.number().int().min(1).optional(),
		pageSize: z.number().int().min(1).max(MAX_MASTER_PAGE_SIZE).optional(),
		status: z
			.enum(["draft", "active", "inactive", "blocked", "retired"])
			.optional(),
	})
	.transform((value) => ({
		...value,
		page: value.page ?? DEFAULT_MASTER_PAGE,
		pageSize: value.pageSize ?? DEFAULT_MASTER_PAGE_SIZE,
	}));

export type MasterListOptions = z.infer<typeof masterListOptionsSchema>;
