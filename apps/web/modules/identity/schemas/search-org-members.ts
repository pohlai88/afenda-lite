import { MAX_SEARCH_LIMIT, MAX_SEARCH_QUERY_LENGTH } from "@afenda/search";
import { z } from "zod";

export const searchOrgMembersQuerySchema = z.object({
	query: z.string().trim().min(1).max(MAX_SEARCH_QUERY_LENGTH),
	limit: z.number().int().min(1).max(MAX_SEARCH_LIMIT).optional(),
});
