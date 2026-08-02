import { z } from "zod";

function isNullish(value: unknown): value is null | undefined {
	return value === null || value === undefined;
}

import {
	governanceBodyIdSchema,
	governanceMembershipIdSchema,
	legalCompanyIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "../../kernel/brands";
import { canonicalDateSchema } from "../../kernel/dates";
import { opaqueCursorSchema } from "../../kernel/pagination";

const codeSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(/^[A-Z0-9][A-Z0-9._-]*$/);
const displayTextSchema = z.string().trim().min(1).max(256);
const descriptionSchema = z.string().trim().min(1).max(2048);
const reasonSchema = z.string().trim().min(1).max(512);
const sourceDocumentIdSchema = z.string().trim().min(1).max(128);
const partyIdSchema = z.string().trim().min(1).max(128);

export const governanceBodyTypeSchema = z.enum([
	"board",
	"committee",
	"shareholder_body",
	"configured_statutory_body",
]);

export const governanceBodyStatusSchema = z.enum(["active", "retired"]);

export const governanceMemberKindSchema = z.enum(["party", "role_seat"]);
export const governanceMembershipRoleSchema = z.enum([
	"member",
	"secretary",
	"observer",
	"advisor",
]);
export const governanceVotingEntitlementSchema = z.enum([
	"voting",
	"non_voting",
]);
export const governanceMembershipStatusSchema = z.enum(["active", "ended"]);

export const governanceBodySchema = z
	.object({
		id: governanceBodyIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		bodyType: governanceBodyTypeSchema,
		bodyCode: z.string().trim().min(1).max(64),
		normalizedBodyCode: codeSchema,
		displayName: displayTextSchema,
		description: descriptionSchema.nullable(),
		effectiveFrom: canonicalDateSchema,
		effectiveTo: canonicalDateSchema.nullable(),
		status: governanceBodyStatusSchema,
		retirementReason: reasonSchema.nullable(),
		recordedAt: z.coerce.date(),
		recordedBy: userIdSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		version: z.number().int().positive(),
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
	})
	.strict()
	.readonly();

export const governanceBodyListPageSchema = z
	.object({
		items: z.array(governanceBodySchema).readonly(),
		nextCursor: opaqueCursorSchema.nullable(),
	})
	.readonly();

export const governanceMembershipSchema = z
	.object({
		id: governanceMembershipIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		governanceBodyId: governanceBodyIdSchema,
		memberKind: governanceMemberKindSchema,
		memberPartyId: partyIdSchema.nullable(),
		roleSeatCode: codeSchema.nullable(),
		seatLabel: displayTextSchema,
		membershipRole: governanceMembershipRoleSchema,
		votingEntitlement: governanceVotingEntitlementSchema,
		isChair: z.boolean(),
		termFrom: canonicalDateSchema,
		termTo: canonicalDateSchema.nullable(),
		status: governanceMembershipStatusSchema,
		endReason: reasonSchema.nullable(),
		recordedAt: z.coerce.date(),
		recordedBy: userIdSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		version: z.number().int().positive(),
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
	})
	.strict()
	.readonly();

export const governanceMembershipListPageSchema = z
	.object({
		items: z.array(governanceMembershipSchema).readonly(),
		nextCursor: opaqueCursorSchema.nullable(),
	})
	.readonly();

export const createGovernanceBodyInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		bodyType: governanceBodyTypeSchema,
		bodyCode: z.string().trim().min(1).max(64),
		displayName: displayTextSchema,
		description: descriptionSchema.nullable().optional(),
		effectiveFrom: canonicalDateSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedCompanyVersion: z.number().int().positive(),
	})
	.strict()
	.readonly();

export const amendGovernanceBodyInputSchema = z
	.object({
		governanceBodyId: governanceBodyIdSchema,
		displayName: displayTextSchema,
		description: descriptionSchema.nullable().optional(),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: z.number().int().positive(),
	})
	.strict()
	.readonly();

export const retireGovernanceBodyInputSchema = z
	.object({
		governanceBodyId: governanceBodyIdSchema,
		retiredOn: canonicalDateSchema,
		reason: reasonSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: z.number().int().positive(),
	})
	.strict()
	.readonly();

const membershipInputBase = {
	governanceBodyId: governanceBodyIdSchema,
	seatLabel: displayTextSchema,
	membershipRole: governanceMembershipRoleSchema,
	votingEntitlement: governanceVotingEntitlementSchema,
	isChair: z.boolean().optional(),
	termFrom: canonicalDateSchema,
	termTo: canonicalDateSchema.nullable().optional(),
	sourceDocumentId: sourceDocumentIdSchema,
	expectedBodyVersion: z.number().int().positive(),
} as const;

export const appointGovernanceMemberInputSchema = z
	.discriminatedUnion("memberKind", [
		z.object({
			...membershipInputBase,
			memberKind: z.literal("party"),
			memberPartyId: partyIdSchema,
		}),
		z.object({
			...membershipInputBase,
			memberKind: z.literal("role_seat"),
			roleSeatCode: codeSchema,
		}),
	])
	.refine((value) => isNullish(value.termTo) || value.termFrom < value.termTo, {
		path: ["termTo"],
		message: "termTo must follow termFrom",
	})
	.readonly();

export const changeGovernanceMembershipInputSchema = z
	.object({
		governanceMembershipId: governanceMembershipIdSchema,
		seatLabel: displayTextSchema,
		membershipRole: governanceMembershipRoleSchema,
		votingEntitlement: governanceVotingEntitlementSchema,
		isChair: z.boolean(),
		termFrom: canonicalDateSchema,
		termTo: canonicalDateSchema.nullable().optional(),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: z.number().int().positive(),
	})
	.strict()
	.refine((value) => isNullish(value.termTo) || value.termFrom < value.termTo, {
		path: ["termTo"],
		message: "termTo must follow termFrom",
	})
	.readonly();

export const endGovernanceMembershipInputSchema = z
	.object({
		governanceMembershipId: governanceMembershipIdSchema,
		endedOn: canonicalDateSchema,
		reason: reasonSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: z.number().int().positive(),
	})
	.strict()
	.readonly();

export const getGovernanceBodyInputSchema = z
	.object({ governanceBodyId: governanceBodyIdSchema })
	.strict()
	.readonly();

export const listGovernanceBodiesAsOfInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		asOf: canonicalDateSchema,
		bodyType: governanceBodyTypeSchema.optional(),
		includeRetired: z.boolean().optional(),
		cursor: opaqueCursorSchema.optional(),
		pageSize: z.number().int().min(1).max(100).optional(),
	})
	.strict()
	.readonly();

export const listGovernanceMembershipsAsOfInputSchema = z
	.object({
		governanceBodyId: governanceBodyIdSchema,
		asOf: canonicalDateSchema,
		memberPartyId: partyIdSchema.optional(),
		cursor: opaqueCursorSchema.optional(),
		pageSize: z.number().int().min(1).max(100).optional(),
	})
	.strict()
	.readonly();
