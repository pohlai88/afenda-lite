import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE,
	HUMAN_RESOURCES_QUERY_CERTIFICATION_GET,
	HUMAN_RESOURCES_QUERY_CERTIFICATION_LIST,
} from "../module-ids";
import {
	certificationStatusTransitionInputSchema,
	getCertificationInputSchema,
	issueCertificationInputSchema,
	listCertificationsInputSchema,
} from "../schemas/learning";
import { fingerprintCertificationIssue } from "../shared/fingerprint";
import {
	runLearningCommand,
	runLearningQuery,
} from "../shared/learning-command";
import type { CertificationListPage, EmployeeCertification } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_CERTIFICATION = "certification" as const;
export type HumanResourcesCertificationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_CERTIFICATION;

export async function issueCertification(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCertification>> {
	return runLearningCommand(input, options, {
		schema: issueCertificationInputSchema,
		invalidMessage: "Invalid certification issue input",
		command: HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE,
		execute: async (data, { store, ports }) => {
			const completionResult = await store.getCompletionById({
				organizationId: data.organizationId,
				completionId: data.completionId,
			});
			if (!completionResult.ok) return completionResult;
			const completion = completionResult.data;
			if (
				completion === null ||
				completion.employeeId !== data.employeeId ||
				completion.courseId !== data.courseId
			) {
				return fail(
					"BAD_REQUEST",
					"Completion does not match the certification employee and course",
				);
			}

			const requestFingerprint = fingerprintCertificationIssue({
				employeeId: data.employeeId,
				courseId: data.courseId,
				completionId: completion.id,
				certificationCode: data.certificationCode,
				issuedOn: data.issuedOn,
				expiresOn: data.expiresOn ?? null,
			});

			const existingByKey = await store.findCertificationByIdempotencyKey({
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
				return ok(existingByKey.data.certification);
			}

			return await store.issueCertification(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					courseId: data.courseId,
					completionId: completion.id,
					certificationCode: data.certificationCode,
					issuedOn: data.issuedOn,
					expiresOn: data.expiresOn ?? null,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE },
			);
		},
	});
}

export async function expireCertification(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCertification>> {
	return runLearningCommand(input, options, {
		schema: certificationStatusTransitionInputSchema,
		invalidMessage: "Invalid certification expire input",
		command: HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE,
		execute: async (data, { store, ports }) => {
			return await store.expireCertification(
				{
					organizationId: data.organizationId,
					certificationId: data.certificationId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE },
			);
		},
	});
}

export async function revokeCertification(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCertification>> {
	return runLearningCommand(input, options, {
		schema: certificationStatusTransitionInputSchema,
		invalidMessage: "Invalid certification revoke input",
		command: HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE,
		execute: async (data, { store, ports }) => {
			return await store.revokeCertification(
				{
					organizationId: data.organizationId,
					certificationId: data.certificationId,
					revokedBy: data.actorUserId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE },
			);
		},
	});
}

export async function getCertification(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCertification | null>> {
	return runLearningQuery(input, options, {
		schema: getCertificationInputSchema,
		invalidMessage: "Invalid certification get input",
		query: HUMAN_RESOURCES_QUERY_CERTIFICATION_GET,
		execute: async (data, { store }) => {
			return await store.getCertificationById({
				organizationId: data.organizationId,
				certificationId: data.certificationId,
			});
		},
	});
}

export async function listCertifications(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CertificationListPage>> {
	return runLearningQuery(input, options, {
		schema: listCertificationsInputSchema,
		invalidMessage: "Invalid certification list input",
		query: HUMAN_RESOURCES_QUERY_CERTIFICATION_LIST,
		execute: async (data, { store }) => {
			return await store.listCertifications({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
				employeeId: data.employeeId,
				courseId: data.courseId,
			});
		},
	});
}
