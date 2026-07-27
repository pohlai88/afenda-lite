import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_MOBILITY_RECORD,
	HUMAN_RESOURCES_QUERY_TALENT_PROFILE_MOBILITY_LIST,
} from "../module-ids";
import { parseHumanResourcesInput } from "../parse-input";
import {
	listTalentProfileMobilityInputSchema,
	recordTalentProfileMobilityInputSchema,
} from "../schemas/talent";
import { fingerprintTalentProfileMobilityCreate } from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import {
	resolveTalentProfileResourceFromTalentProfile,
	runTalentCommand,
	runTalentQuery,
} from "../shared/talent-command";
import type {
	TalentProfileMobility,
	TalentProfileMobilityListPage,
} from "../types";
import {
	type ProjectedTalentProfileMobilityListPage,
	projectTalentProfileMobilityListFromDecision,
	TALENT_PROFILE_MOBILITY_SENSITIVE_FIELD_NAMES,
} from "./talent-field-projection";

export const HUMAN_RESOURCES_AGGREGATE_TALENT_PROFILE_MOBILITY =
	"talent-profile-mobility" as const;
export type HumanResourcesTalentProfileMobilityAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_TALENT_PROFILE_MOBILITY;

export async function recordTalentProfileMobility(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentProfileMobility>> {
	return runTalentCommand(input, options, {
		schema: recordTalentProfileMobilityInputSchema,
		invalidMessage: "Invalid talent profile mobility record input",
		command: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_MOBILITY_RECORD,
		resolveResource: (data, opts) =>
			resolveTalentProfileResourceFromTalentProfile(data, opts),
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintTalentProfileMobilityCreate({
				talentProfileId: data.talentProfileId,
				dimension: data.dimension,
				preferenceCode: data.preferenceCode,
				effectiveFrom: data.effectiveFrom,
			});

			const existingByKey =
				await store.findTalentProfileMobilityByIdempotencyKey({
					organizationId: data.organizationId,
					idempotencyKey: data.idempotencyKey,
				});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (
					existingByKey.data.createRequestFingerprint !== requestFingerprint
				) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existingByKey.data.mobility);
			}

			return await store.recordTalentProfileMobility(
				{
					organizationId: data.organizationId,
					talentProfileId: data.talentProfileId,
					dimension: data.dimension,
					preferenceCode: data.preferenceCode,
					scopeDetail: data.scopeDetail ?? null,
					evidenceSummary: data.evidenceSummary,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_MOBILITY_RECORD,
				}),
			);
		},
	});
}

export async function listTalentProfileMobility(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ProjectedTalentProfileMobilityListPage>> {
	const parsed = parseHumanResourcesInput(
		listTalentProfileMobilityInputSchema,
		input,
		"Invalid talent profile mobility list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const includeSensitive = parsed.data.includeSensitive;

	return runTalentQuery(parsed.data, options, {
		schema: listTalentProfileMobilityInputSchema,
		invalidMessage: "Invalid talent profile mobility list input",
		query: HUMAN_RESOURCES_QUERY_TALENT_PROFILE_MOBILITY_LIST,
		resolveResource: (data, opts) =>
			resolveTalentProfileResourceFromTalentProfile(data, opts),
		resolveRequestedFields: () =>
			includeSensitive
				? [...TALENT_PROFILE_MOBILITY_SENSITIVE_FIELD_NAMES]
				: undefined,
		project: (value: TalentProfileMobilityListPage, projection) =>
			projectTalentProfileMobilityListFromDecision(value, projection, {
				includeSensitive,
			}),
		execute: async (data, { store }) =>
			store.listTalentProfileMobility({
				organizationId: data.organizationId,
				talentProfileId: data.talentProfileId,
			}),
	});
}
