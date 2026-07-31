import { errorResult, type Result } from "@afenda/errors";
import { z } from "zod";
import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import { changeRequestIdSchema, partyIdSchema } from "../../brands";
import {
	type MasterCommandOptions,
	resolveCommandDeps,
} from "../../command-options";
import {
	orgActorContextSchema,
	orgQueryActorSchema,
} from "../../contracts/context";
import {
	MASTER_COMMAND_PARTY_MERGE,
	MASTER_QUERY_PARTY_FIND_DUPLICATES,
	MASTER_QUERY_PARTY_GET_BY_ID,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import type { MergePartiesChangePayload, Party } from "../../types";
import {
	MASTER_SEARCH_ENTITY,
	syncMasterRootProjection,
} from "../integration-projections/search-projector-commands";
import {
	assertDistinctMergeParticipants,
	resolveCanonicalIdentityWithLineage,
} from "../lifecycle-governance";
import { assertApprovedChangeRequestForApply } from "./change-request-commands";

const mergeFieldDecisionSchema = z.enum(["source", "target"]);

export const mergePartiesInputSchema = orgActorContextSchema.extend({
	changeRequestId: changeRequestIdSchema.optional(),
	sourcePartyId: partyIdSchema,
	targetPartyId: partyIdSchema,
	sourceExpectedVersion: z.number().int().positive(),
	targetExpectedVersion: z.number().int().positive(),
	fieldDecisions: z
		.object({
			name: mergeFieldDecisionSchema.optional(),
			legalName: mergeFieldDecisionSchema.optional(),
			tradingName: mergeFieldDecisionSchema.optional(),
			registrationNumber: mergeFieldDecisionSchema.optional(),
			registrationCountryId: mergeFieldDecisionSchema.optional(),
			preferredLanguageId: mergeFieldDecisionSchema.optional(),
			defaultCurrencyId: mergeFieldDecisionSchema.optional(),
		})
		.default({}),
});

export type MergePartiesInput = z.infer<typeof mergePartiesInputSchema>;

export interface MergePartiesResult {
	merged: Party;
	survivor: Party;
}

export interface DuplicatePartyWarning {
	code: string;
	message: string;
	partyId: string;
	signal: "registration" | "name";
}

const duplicateWarningQuerySchema = orgQueryActorSchema.extend({
	name: z.string().trim().min(1).max(200),
	registrationNumber: z.string().trim().min(1).max(64).optional(),
	registrationCountryId: z.string().uuid().optional(),
	excludePartyId: partyIdSchema.optional(),
});

/**
 * Warning-level duplicate signals — never auto-merges.
 */
export async function findPartyDuplicateWarnings(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<DuplicatePartyWarning[]>> {
	const parsed = parseMasterInput(
		duplicateWarningQuerySchema,
		input,
		"Invalid duplicate warning query",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_FIND_DUPLICATES,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const listed = await store.listParties({
		organizationId: parsed.data.organizationId,
		page: 1,
		pageSize: 100,
	});
	if (!listed.ok) {
		return listed;
	}

	const warnings: DuplicatePartyWarning[] = [];
	const nameKey = parsed.data.name.trim().toLowerCase();
	const reg = parsed.data.registrationNumber?.trim().toLowerCase();

	for (const party of listed.data) {
		if (party.mergedIntoId !== null) {
			continue;
		}
		if (
			parsed.data.excludePartyId !== undefined &&
			party.id === parsed.data.excludePartyId
		) {
			continue;
		}
		if (
			reg &&
			party.registrationNumber &&
			party.registrationNumber.trim().toLowerCase() === reg &&
			(parsed.data.registrationCountryId === undefined ||
				party.registrationCountryId === parsed.data.registrationCountryId)
		) {
			warnings.push({
				partyId: party.id,
				code: party.code,
				signal: "registration",
				message: `Possible duplicate registration with party ${party.code}`,
			});
		}
		if (party.name.trim().toLowerCase() === nameKey) {
			warnings.push({
				partyId: party.id,
				code: party.code,
				signal: "name",
				message: `Possible duplicate name with party ${party.code}`,
			});
		}
	}

	return errorResult.ok(warnings);
}

/**
 * Walk `merged_into_id` to the living survivor. Rejects cycles / deep chains.
 * One-hop tombstones are the merge write model (no merge-of-merged).
 */
export async function resolveCanonicalPartyId(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<
	Result<{
		partyId: string;
		hops: number;
		requestedPartyId: string;
		lineage: readonly string[];
	}>
> {
	const parsed = parseMasterInput(
		orgQueryActorSchema.extend({ partyId: partyIdSchema }),
		input,
		"Invalid canonical party resolve input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_GET_BY_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}

	return resolveCanonicalIdentityWithLineage(
		parsed.data.partyId,
		async (currentId) => {
			const party = await store.getPartyById(
				parsed.data.organizationId,
				currentId,
			);
			if (!party.ok) {
				return party;
			}
			if (party.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Party not found",
				});
			}
			if (party.data.mergedIntoId !== null) {
				const nextId = partyIdSchema.safeParse(party.data.mergedIntoId);
				if (!nextId.success) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Invalid merged_into_id on party",
					});
				}
			}
			return errorResult.ok({
				id: party.data.id,
				mergedIntoId: party.data.mergedIntoId,
			});
		},
	).then((result) =>
		result.ok
			? errorResult.ok({
					partyId: result.data.canonicalId,
					hops: result.data.hops,
					requestedPartyId: result.data.requestedId,
					lineage: result.data.lineage,
				})
			: result,
	);
}

/**
 * Governed party merge — same-org, compatible kinds, CAS, former code +
 * external IDs preserved on survivor, `merged_into_id` on source,
 * role/address/contact consolidation, `master_data.party.merged.v1`
 * (never delete/created; never rewrite peer ERP tables).
 */
export async function mergeParties(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<MergePartiesResult>> {
	const parsed = parseMasterInput(
		mergePartiesInputSchema,
		input,
		"Invalid party merge input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const distinct = assertDistinctMergeParticipants(
		parsed.data.sourcePartyId,
		parsed.data.targetPartyId,
	);
	if (!distinct.ok) {
		return distinct;
	}

	const approved = await assertApprovedChangeRequestForApply(
		{
			organizationId: parsed.data.organizationId,
			changeRequestId: parsed.data.changeRequestId,
			commandKind: "merge_parties",
			match: (payload) => {
				const p = payload as MergePartiesChangePayload;
				return (
					p.sourcePartyId === parsed.data.sourcePartyId &&
					p.targetPartyId === parsed.data.targetPartyId
				);
			},
		},
		options,
	);
	if (!approved.ok) {
		return approved;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_MERGE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const result = await store.mergeParties(
		{
			organizationId: parsed.data.organizationId,
			sourcePartyId: parsed.data.sourcePartyId,
			targetPartyId: parsed.data.targetPartyId,
			sourceExpectedVersion: parsed.data.sourceExpectedVersion,
			targetExpectedVersion: parsed.data.targetExpectedVersion,
			actorUserId: parsed.data.actorUserId,
			changeRequestId: approved.data.id,
			fieldDecisions: parsed.data.fieldDecisions,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
	if (!result.ok) {
		return result;
	}

	await syncMasterRootProjection(
		MASTER_SEARCH_ENTITY.party,
		result.data.survivor,
		options.searchStore,
	);
	await syncMasterRootProjection(
		MASTER_SEARCH_ENTITY.party,
		result.data.merged,
		options.searchStore,
	);

	return result;
}
