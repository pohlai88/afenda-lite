import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ASSESSMENT_CONFIRM,
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ASSESSMENT_RECORD,
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_CREATE,
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_UPDATE,
	HUMAN_RESOURCES_QUERY_TALENT_PROFILE_ASSESSMENT_LIST,
	HUMAN_RESOURCES_QUERY_TALENT_PROFILE_GET_BY_EMPLOYEE,
} from "../module-ids";
import { parseHumanResourcesInput } from "../parse-input";
import {
	archiveTalentProfileInputSchema,
	confirmTalentProfileAssessmentInputSchema,
	createTalentProfileInputSchema,
	getTalentProfileByEmployeeInputSchema,
	listTalentProfileAssessmentsInputSchema,
	recordTalentProfileAssessmentInputSchema,
	updateTalentProfileInputSchema,
} from "../schemas/talent";
import { fingerprintTalentProfileCreate } from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import {
	resolveActorTalentProfileResource,
	resolveTalentProfileResourceForEmployee,
	resolveTalentProfileResourceFromTalentProfile,
	runTalentCommand,
	runTalentEmployeeScopedQuery,
	runTalentQuery,
} from "../shared/talent-command";
import type {
	TalentProfile,
	TalentProfileAssessment,
	TalentProfileAssessmentListPage,
} from "../types";
import {
	projectTalentProfileAssessmentListFromDecision,
	projectTalentProfileFromDecision,
	TALENT_PROFILE_ASSESSMENT_SENSITIVE_FIELD_NAMES,
	TALENT_PROFILE_SENSITIVE_FIELD_NAMES,
} from "./talent-field-projection";

export const HUMAN_RESOURCES_AGGREGATE_TALENT_PROFILE =
	"talent-profile" as const;
export type HumanResourcesTalentProfileAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_TALENT_PROFILE;

export async function createTalentProfile(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentProfile>> {
	return runTalentCommand(input, options, {
		schema: createTalentProfileInputSchema,
		invalidMessage: "Invalid talent profile create input",
		command: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_CREATE,
		resolveResource: async (data, opts) =>
			resolveTalentProfileResourceForEmployee(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
				},
				opts,
			),
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintTalentProfileCreate({
				employeeId: data.employeeId,
				summary: data.summary ?? null,
			});

			const existingByKey = await store.findTalentProfileByIdempotencyKey({
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
				return ok(existingByKey.data.profile);
			}

			return await store.createTalentProfile(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					summary: data.summary ?? null,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_CREATE,
				}),
			);
		},
	});
}

export async function updateTalentProfile(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentProfile>> {
	return runTalentCommand(input, options, {
		schema: updateTalentProfileInputSchema,
		invalidMessage: "Invalid talent profile update input",
		command: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_UPDATE,
		resolveResource: (data, opts) =>
			resolveTalentProfileResourceFromTalentProfile(data, opts),
		execute: async (data, { store, ports }) => {
			return await store.updateTalentProfile(
				{
					organizationId: data.organizationId,
					talentProfileId: data.talentProfileId,
					summary: data.summary,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_UPDATE,
				}),
			);
		},
	});
}

export async function recordTalentProfileAssessment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentProfileAssessment>> {
	return runTalentCommand(input, options, {
		schema: recordTalentProfileAssessmentInputSchema,
		invalidMessage: "Invalid talent profile assessment record input",
		command: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ASSESSMENT_RECORD,
		resolveResource: (data, opts) =>
			resolveTalentProfileResourceFromTalentProfile(data, opts),
		execute: async (data, { store, ports }) => {
			return await store.recordTalentProfileAssessment(
				{
					organizationId: data.organizationId,
					talentProfileId: data.talentProfileId,
					methodCode: data.methodCode,
					classification: data.classification,
					evidenceSummary: data.evidenceSummary,
					assessorUserId: data.assessorUserId,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ASSESSMENT_RECORD,
				}),
			);
		},
	});
}

export async function confirmTalentProfileAssessment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentProfileAssessment>> {
	return runTalentCommand(input, options, {
		schema: confirmTalentProfileAssessmentInputSchema,
		invalidMessage: "Invalid talent profile assessment confirm input",
		command: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ASSESSMENT_CONFIRM,
		resolveResource: (data, opts) =>
			resolveActorTalentProfileResource(data, opts),
		execute: async (data, { store, ports }) => {
			return await store.confirmTalentProfileAssessment(
				{
					organizationId: data.organizationId,
					assessmentId: data.assessmentId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId:
						HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ASSESSMENT_CONFIRM,
				}),
			);
		},
	});
}

export async function archiveTalentProfile(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentProfile>> {
	return runTalentCommand(input, options, {
		schema: archiveTalentProfileInputSchema,
		invalidMessage: "Invalid talent profile archive input",
		command: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ARCHIVE,
		resolveResource: (data, opts) =>
			resolveTalentProfileResourceFromTalentProfile(data, opts),
		execute: async (data, { store, ports }) => {
			return await store.archiveTalentProfile(
				{
					organizationId: data.organizationId,
					talentProfileId: data.talentProfileId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ARCHIVE,
				}),
			);
		},
	});
}

export async function getTalentProfileByEmployee(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentProfile | null>> {
	const parsed = parseHumanResourcesInput(
		getTalentProfileByEmployeeInputSchema,
		input,
		"Invalid talent profile get by employee input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const includeSensitive = parsed.data.includeSensitive;

	return runTalentEmployeeScopedQuery(parsed.data, options, {
		schema: getTalentProfileByEmployeeInputSchema,
		invalidMessage: "Invalid talent profile get by employee input",
		query: HUMAN_RESOURCES_QUERY_TALENT_PROFILE_GET_BY_EMPLOYEE,
		resolveRequestedFields: () =>
			includeSensitive ? [...TALENT_PROFILE_SENSITIVE_FIELD_NAMES] : undefined,
		project: (value: TalentProfile | null, projection) =>
			projectTalentProfileFromDecision(value, projection, {
				includeSensitive,
			}),
		execute: async (data, { store }) =>
			store.getTalentProfileByEmployee({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
			}),
	});
}

export async function listTalentProfileAssessments(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentProfileAssessmentListPage>> {
	const parsed = parseHumanResourcesInput(
		listTalentProfileAssessmentsInputSchema,
		input,
		"Invalid talent profile assessment list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const includeSensitive = parsed.data.includeSensitive;

	return runTalentQuery(parsed.data, options, {
		schema: listTalentProfileAssessmentsInputSchema,
		invalidMessage: "Invalid talent profile assessment list input",
		query: HUMAN_RESOURCES_QUERY_TALENT_PROFILE_ASSESSMENT_LIST,
		resolveResource: (data, opts) =>
			resolveTalentProfileResourceFromTalentProfile(data, opts),
		resolveRequestedFields: () =>
			includeSensitive
				? [...TALENT_PROFILE_ASSESSMENT_SENSITIVE_FIELD_NAMES]
				: undefined,
		project: (value: TalentProfileAssessmentListPage, projection) =>
			projectTalentProfileAssessmentListFromDecision(value, projection, {
				includeSensitive,
			}),
		execute: async (data, { store }) =>
			store.listTalentProfileAssessments({
				organizationId: data.organizationId,
				talentProfileId: data.talentProfileId,
			}),
	});
}
