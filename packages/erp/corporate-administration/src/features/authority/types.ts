// biome-ignore-all lint/style/noExportedImports: Branded identifiers are both local schema types and public authority contracts.
import type { z } from "zod";

import type { AuthorityMandateId } from "../../kernel/brands";
import type {
	amendAuthorityMandateInputSchema,
	authorityGrantedByTypeSchema,
	authorityMandateListPageSchema,
	authorityMandateSchema,
	authorityMandateStatusSchema,
	authorityMandateTypeSchema,
	getAuthorityMandateInputSchema,
	grantAuthorityMandateInputSchema,
	listAuthorityMandatesAsOfInputSchema,
	revokeAuthorityMandateInputSchema,
} from "./schemas";

export type { AuthorityMandateId };
export type AuthorityMandateType = z.infer<typeof authorityMandateTypeSchema>;
export type AuthorityGrantedByType = z.infer<
	typeof authorityGrantedByTypeSchema
>;
export type AuthorityMandateStatus = z.infer<
	typeof authorityMandateStatusSchema
>;
export type AuthorityMandate = z.infer<typeof authorityMandateSchema>;
export type AuthorityMandateListPage = z.infer<
	typeof authorityMandateListPageSchema
>;
export type GrantAuthorityMandateInput = z.input<
	typeof grantAuthorityMandateInputSchema
>;
export type AmendAuthorityMandateInput = z.input<
	typeof amendAuthorityMandateInputSchema
>;
export type RevokeAuthorityMandateInput = z.input<
	typeof revokeAuthorityMandateInputSchema
>;
export type ListAuthorityMandatesAsOfInput = z.input<
	typeof listAuthorityMandatesAsOfInputSchema
>;
export type GetAuthorityMandateInput = z.input<
	typeof getAuthorityMandateInputSchema
>;
