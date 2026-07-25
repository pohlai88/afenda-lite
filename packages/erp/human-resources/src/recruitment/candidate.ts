import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_CANDIDATE_CHANGE_RETENTION,
	HUMAN_RESOURCES_COMMAND_CANDIDATE_CREATE,
	HUMAN_RESOURCES_COMMAND_CANDIDATE_UPDATE_PROFILE,
	HUMAN_RESOURCES_COMMAND_CANDIDATE_WITHDRAW_CONSENT,
	HUMAN_RESOURCES_QUERY_CANDIDATE_GET,
	HUMAN_RESOURCES_QUERY_CANDIDATE_LIST,
} from "../module-ids";
import {
	changeCandidateRetentionInputSchema,
	createCandidateInputSchema,
	getCandidateInputSchema,
	listCandidatesInputSchema,
	updateCandidateProfileInputSchema,
	withdrawCandidateConsentInputSchema,
} from "../schemas/recruitment";
import { fingerprintCandidateCreate } from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import {
	runRecruitmentCommand,
	runRecruitmentQuery,
} from "../shared/recruitment-command";
import { normalizeCandidateEmail } from "../shared/recruitment-guards";
import type { Candidate, CandidateListPage } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_CANDIDATE = "candidate" as const;
export type HumanResourcesCandidateAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_CANDIDATE;

export async function createCandidate(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Candidate>> {
	return runRecruitmentCommand(input, options, {
		schema: createCandidateInputSchema,
		invalidMessage: "Invalid candidate create input",
		command: HUMAN_RESOURCES_COMMAND_CANDIDATE_CREATE,
		execute: async (data, { store, ports }) => {
			const normalizedEmail = normalizeCandidateEmail(data.email);
			const phone = data.phone ?? null;
			const requestFingerprint = fingerprintCandidateCreate({
				displayName: data.displayName,
				normalizedEmail,
				phone,
				consentPolicyVersion: data.consentPolicyVersion,
				consentCapturedAt: data.consentCapturedAt,
				consentSource: data.consentSource,
				retentionUntil: data.retentionUntil,
			});

			const existingByKey = await store.findCandidateByIdempotencyKey({
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
				return ok(existingByKey.data.candidate);
			}

			return store.createCandidate(
				{
					organizationId: data.organizationId,
					displayName: data.displayName.trim(),
					email: data.email.trim(),
					normalizedEmail,
					phone,
					consentPolicyVersion: data.consentPolicyVersion,
					consentCapturedAt: new Date(data.consentCapturedAt),
					consentSource: data.consentSource,
					retentionUntil: data.retentionUntil,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_CANDIDATE_CREATE,
				}),
			);
		},
	});
}

export async function updateCandidateProfile(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Candidate>> {
	return runRecruitmentCommand(input, options, {
		schema: updateCandidateProfileInputSchema,
		invalidMessage: "Invalid candidate update-profile input",
		command: HUMAN_RESOURCES_COMMAND_CANDIDATE_UPDATE_PROFILE,
		execute: (data, { store, ports }) =>
			store.updateCandidateProfile(
				{
					organizationId: data.organizationId,
					candidateId: data.candidateId,
					displayName: data.displayName?.trim(),
					phone: data.phone,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_CANDIDATE_UPDATE_PROFILE,
				}),
			),
	});
}

export async function withdrawCandidateConsent(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Candidate>> {
	return runRecruitmentCommand(input, options, {
		schema: withdrawCandidateConsentInputSchema,
		invalidMessage: "Invalid candidate withdraw-consent input",
		command: HUMAN_RESOURCES_COMMAND_CANDIDATE_WITHDRAW_CONSENT,
		execute: (data, { store, ports }) =>
			store.withdrawCandidateConsent(
				{
					organizationId: data.organizationId,
					candidateId: data.candidateId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_CANDIDATE_WITHDRAW_CONSENT,
				}),
			),
	});
}

export async function changeCandidateRetention(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Candidate>> {
	return runRecruitmentCommand(input, options, {
		schema: changeCandidateRetentionInputSchema,
		invalidMessage: "Invalid candidate change-retention input",
		command: HUMAN_RESOURCES_COMMAND_CANDIDATE_CHANGE_RETENTION,
		execute: async (data, { store, ports }) => {
			const existing = await store.getCandidateById({
				organizationId: data.organizationId,
				candidateId: data.candidateId,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data === null) {
				return fail(
					"NOT_FOUND",
					"Candidate not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			if (
				existing.data.consentCapturedAt !== null &&
				data.retentionUntil <
					existing.data.consentCapturedAt.toISOString().slice(0, 10)
			) {
				return fail(
					"VALIDATION_ERROR",
					"Candidate retention date must not precede consent capture",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
			}

			return store.changeCandidateRetention(
				{
					organizationId: data.organizationId,
					candidateId: data.candidateId,
					retentionUntil: data.retentionUntil,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_CANDIDATE_CHANGE_RETENTION,
				}),
			);
		},
	});
}

export async function getCandidate(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Candidate>> {
	return runRecruitmentQuery(input, options, {
		schema: getCandidateInputSchema,
		invalidMessage: "Invalid candidate get input",
		query: HUMAN_RESOURCES_QUERY_CANDIDATE_GET,
		execute: async (data, { store }) => {
			const candidate = await store.getCandidateById({
				organizationId: data.organizationId,
				candidateId: data.candidateId,
			});
			if (!candidate.ok) {
				return candidate;
			}
			if (candidate.data === null) {
				return fail(
					"NOT_FOUND",
					"Candidate not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			return ok(candidate.data);
		},
	});
}

export async function listCandidates(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CandidateListPage>> {
	return runRecruitmentQuery(input, options, {
		schema: listCandidatesInputSchema,
		invalidMessage: "Invalid candidate list input",
		query: HUMAN_RESOURCES_QUERY_CANDIDATE_LIST,
		execute: (data, { store }) =>
			store.listCandidates({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
				retentionDueAsOf: data.retentionDueAsOf,
			}),
	});
}
