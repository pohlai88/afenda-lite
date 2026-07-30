import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_CRITICAL_ROLE_READINESS_RECORD,
	HUMAN_RESOURCES_QUERY_CRITICAL_ROLE_READINESS_LIST,
} from "../module-ids";
import { parseHumanResourcesInput } from "../parse-input";
import {
	listCriticalRoleReadinessInputSchema,
	recordCriticalRoleReadinessInputSchema,
} from "../schemas/talent";
import { fingerprintCriticalRoleReadinessCreate } from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import {
	resolveTalentProfileResourceFromTalentProfile,
	runTalentCommand,
	runTalentQuery,
} from "../shared/talent-command";
import type {
	TalentCriticalRoleReadiness,
	TalentCriticalRoleReadinessListPage,
} from "../types";
import {
	CRITICAL_ROLE_READINESS_SENSITIVE_FIELD_NAMES,
	type ProjectedTalentCriticalRoleReadinessListPage,
	projectCriticalRoleReadinessListFromDecision,
} from "./talent-field-projection";

export const HUMAN_RESOURCES_AGGREGATE_CRITICAL_ROLE_READINESS =
	"critical-role-readiness" as const;
export type HumanResourcesCriticalRoleReadinessAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_CRITICAL_ROLE_READINESS;

export function recordCriticalRoleReadiness(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentCriticalRoleReadiness>> {
	return runTalentCommand(input, options, {
		schema: recordCriticalRoleReadinessInputSchema,
		invalidMessage: "Invalid critical role readiness record input",
		command: HUMAN_RESOURCES_COMMAND_CRITICAL_ROLE_READINESS_RECORD,
		resolveResource: (data, opts) =>
			resolveTalentProfileResourceFromTalentProfile(data, opts),
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintCriticalRoleReadinessCreate({
				talentProfileId: data.talentProfileId,
				positionId: data.positionId,
				readiness: data.readiness,
				readinessEffectiveOn: data.readinessEffectiveOn,
			});

			const existingByKey =
				await store.findCriticalRoleReadinessByIdempotencyKey({
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
				return ok(existingByKey.data.readiness);
			}

			return store.recordCriticalRoleReadiness(
				{
					organizationId: data.organizationId,
					talentProfileId: data.talentProfileId,
					positionId: data.positionId,
					readiness: data.readiness,
					readinessEffectiveOn: data.readinessEffectiveOn,
					evidenceSummary: data.evidenceSummary,
					assessorUserId: data.assessorUserId,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_CRITICAL_ROLE_READINESS_RECORD,
				}),
			);
		},
	});
}

export function listCriticalRoleReadiness(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ProjectedTalentCriticalRoleReadinessListPage>> {
	const parsed = parseHumanResourcesInput(
		listCriticalRoleReadinessInputSchema,
		input,
		"Invalid critical role readiness list input",
	);
	if (!parsed.ok) {
		return Promise.resolve(parsed);
	}
	const { includeSensitive } = parsed.data;

	return runTalentQuery(parsed.data, options, {
		schema: listCriticalRoleReadinessInputSchema,
		invalidMessage: "Invalid critical role readiness list input",
		query: HUMAN_RESOURCES_QUERY_CRITICAL_ROLE_READINESS_LIST,
		resolveResource: (data, opts) =>
			resolveTalentProfileResourceFromTalentProfile(data, opts),
		resolveRequestedFields: () =>
			includeSensitive
				? [...CRITICAL_ROLE_READINESS_SENSITIVE_FIELD_NAMES]
				: undefined,
		project: (value: TalentCriticalRoleReadinessListPage, projection) =>
			projectCriticalRoleReadinessListFromDecision(value, projection, {
				includeSensitive,
			}),
		execute: async (data, { store }) =>
			store.listCriticalRoleReadiness({
				organizationId: data.organizationId,
				talentProfileId: data.talentProfileId,
			}),
	});
}
