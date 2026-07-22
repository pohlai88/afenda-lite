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
	HUMAN_RESOURCES_QUERY_TALENT_PROFILE_GET_BY_EMPLOYEE,
} from "../module-ids";
import {
	archiveTalentProfileInputSchema,
	confirmTalentProfileAssessmentInputSchema,
	createTalentProfileInputSchema,
	getTalentProfileByEmployeeInputSchema,
	recordTalentProfileAssessmentInputSchema,
	updateTalentProfileInputSchema,
} from "../schemas/talent";
import { fingerprintTalentProfileCreate } from "../shared/fingerprint";
import {
	requireTalentProfileSensitiveRead,
	runTalentCommand,
	runTalentQuery,
} from "../shared/talent-command";
import type { TalentProfile, TalentProfileAssessment } from "../types";

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
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintTalentProfileCreate({
				employeeId: data.employeeId,
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
				{ correlationId: data.correlationId },
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
				{ correlationId: data.correlationId },
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
				{ correlationId: data.correlationId },
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
		execute: async (data, { store, ports }) => {
			return await store.confirmTalentProfileAssessment(
				{
					organizationId: data.organizationId,
					assessmentId: data.assessmentId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
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
		execute: async (data, { store, ports }) => {
			return await store.archiveTalentProfile(
				{
					organizationId: data.organizationId,
					talentProfileId: data.talentProfileId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function getTalentProfileByEmployee(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentProfile | null>> {
	return runTalentQuery(input, options, {
		schema: getTalentProfileByEmployeeInputSchema,
		invalidMessage: "Invalid talent profile get by employee input",
		query: HUMAN_RESOURCES_QUERY_TALENT_PROFILE_GET_BY_EMPLOYEE,
		execute: async (data, { store, authorization }) => {
			const sensitiveCheck = await requireTalentProfileSensitiveRead(
				authorization,
				{
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
					includeSensitive: data.includeSensitive,
				},
			);
			if (!sensitiveCheck.ok) {
				return sensitiveCheck;
			}

			const profile = await store.getTalentProfileByEmployee({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
			});
			if (!profile.ok) {
				return profile;
			}
			if (profile.data === null || data.includeSensitive) {
				return profile;
			}
			return ok({ ...profile.data, currentClassification: null });
		},
	});
}
