import type { Result } from "@afenda/errors";
import { z } from "zod";
import {
	governanceBodyIdSchema,
	governanceMembershipIdSchema,
} from "../../kernel/brands";
import {
	decodeCorporateAdministrationCursor,
	encodeCorporateAdministrationCursor,
} from "../../kernel/internal/pagination-cursor";
import type { OpaqueCursor } from "../../kernel/pagination";
import { governanceBodyTypeSchema } from "./schemas";
import type {
	GovernanceBodiesAsOfQuery,
	GovernanceMembershipsAsOfQuery,
} from "./store";

const governanceBodyCursorKeySchema = z.tuple([
	governanceBodyTypeSchema,
	z.string().min(1),
	governanceBodyIdSchema,
]);

export type GovernanceBodyCursorKey = z.infer<
	typeof governanceBodyCursorKeySchema
>;

export function encodeGovernanceBodyCursor(
	scope: ReturnType<typeof governanceBodyCursorScope>,
	key: GovernanceBodyCursorKey,
): OpaqueCursor {
	return encodeCorporateAdministrationCursor(
		"governance_bodies_as_of",
		scope,
		key,
	);
}

export function decodeGovernanceBodyCursor(
	cursor: OpaqueCursor | undefined,
	scope: ReturnType<typeof governanceBodyCursorScope>,
): Result<GovernanceBodyCursorKey | null> {
	return decodeCorporateAdministrationCursor(
		cursor,
		"governance_bodies_as_of",
		scope,
		governanceBodyCursorKeySchema,
	);
}

export function governanceBodyCursorScope(input: GovernanceBodiesAsOfQuery) {
	return {
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		asOf: input.asOf,
		bodyType: input.bodyType ?? null,
		includeRetired: input.includeRetired ?? false,
	} as const;
}

const governanceMembershipCursorKeySchema = z.tuple([
	z.boolean(),
	z.string().min(1),
	governanceMembershipIdSchema,
]);

export type GovernanceMembershipCursorKey = z.infer<
	typeof governanceMembershipCursorKeySchema
>;

export function encodeGovernanceMembershipCursor(
	scope: ReturnType<typeof governanceMembershipCursorScope>,
	key: GovernanceMembershipCursorKey,
): OpaqueCursor {
	return encodeCorporateAdministrationCursor(
		"governance_memberships_as_of",
		scope,
		key,
	);
}

export function decodeGovernanceMembershipCursor(
	cursor: OpaqueCursor | undefined,
	scope: ReturnType<typeof governanceMembershipCursorScope>,
): Result<GovernanceMembershipCursorKey | null> {
	return decodeCorporateAdministrationCursor(
		cursor,
		"governance_memberships_as_of",
		scope,
		governanceMembershipCursorKeySchema,
	);
}

export function governanceMembershipCursorScope(
	input: GovernanceMembershipsAsOfQuery,
) {
	return {
		organizationId: input.organizationId,
		governanceBodyId: input.governanceBodyId,
		asOf: input.asOf,
		memberPartyId: input.memberPartyId ?? null,
	} as const;
}
