import { search } from "@afenda/search";
import { z } from "zod";

export const searchOrgMembersQuerySchema = z.object({
	query: z.string().trim().min(1).max(search.policy.document.queryMaxLength),
	limit: z
		.number()
		.int()
		.min(1)
		.max(search.policy.lifecycle.maxLimit)
		.optional(),
});
