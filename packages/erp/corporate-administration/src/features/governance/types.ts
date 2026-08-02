// biome-ignore-all lint/style/noExportedImports: Branded identifiers are both local schema types and public domain contracts.
import type { z } from "zod";

import type {
	GovernanceBodyId,
	GovernanceMembershipId,
} from "../../kernel/brands";
import type {
	amendGovernanceBodyInputSchema,
	appointGovernanceMemberInputSchema,
	changeGovernanceMembershipInputSchema,
	createGovernanceBodyInputSchema,
	endGovernanceMembershipInputSchema,
	getGovernanceBodyInputSchema,
	governanceBodyListPageSchema,
	governanceBodySchema,
	governanceBodyStatusSchema,
	governanceBodyTypeSchema,
	governanceMemberKindSchema,
	governanceMembershipListPageSchema,
	governanceMembershipRoleSchema,
	governanceMembershipSchema,
	governanceMembershipStatusSchema,
	governanceVotingEntitlementSchema,
	listGovernanceBodiesAsOfInputSchema,
	listGovernanceMembershipsAsOfInputSchema,
	retireGovernanceBodyInputSchema,
} from "./schemas";

export type { GovernanceBodyId, GovernanceMembershipId };
export type GovernanceBodyType = z.infer<typeof governanceBodyTypeSchema>;
export type GovernanceBodyStatus = z.infer<typeof governanceBodyStatusSchema>;
export type GovernanceMemberKind = z.infer<typeof governanceMemberKindSchema>;
export type GovernanceMembershipRole = z.infer<
	typeof governanceMembershipRoleSchema
>;
export type GovernanceVotingEntitlement = z.infer<
	typeof governanceVotingEntitlementSchema
>;
export type GovernanceMembershipStatus = z.infer<
	typeof governanceMembershipStatusSchema
>;
export type GovernanceBody = z.infer<typeof governanceBodySchema>;
export type GovernanceBodyListPage = z.infer<
	typeof governanceBodyListPageSchema
>;
export type GovernanceMembership = z.infer<typeof governanceMembershipSchema>;
export type GovernanceMembershipListPage = z.infer<
	typeof governanceMembershipListPageSchema
>;
export type CreateGovernanceBodyInput = z.input<
	typeof createGovernanceBodyInputSchema
>;
export type AmendGovernanceBodyInput = z.input<
	typeof amendGovernanceBodyInputSchema
>;
export type RetireGovernanceBodyInput = z.input<
	typeof retireGovernanceBodyInputSchema
>;
export type AppointGovernanceMemberInput = z.input<
	typeof appointGovernanceMemberInputSchema
>;
export type ChangeGovernanceMembershipInput = z.input<
	typeof changeGovernanceMembershipInputSchema
>;
export type EndGovernanceMembershipInput = z.input<
	typeof endGovernanceMembershipInputSchema
>;
export type GetGovernanceBodyInput = z.input<
	typeof getGovernanceBodyInputSchema
>;
export type ListGovernanceBodiesAsOfInput = z.input<
	typeof listGovernanceBodiesAsOfInputSchema
>;
export type ListGovernanceMembershipsAsOfInput = z.input<
	typeof listGovernanceMembershipsAsOfInputSchema
>;
