import { errorResult, type Result } from "@afenda/errors";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_RENEW,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE,
	HUMAN_RESOURCES_QUERY_CERTIFICATION_GET,
	HUMAN_RESOURCES_QUERY_CERTIFICATION_LIST,
	HUMAN_RESOURCES_QUERY_CERTIFICATION_LIST_EXPIRING,
} from "../module-ids";
import {
	certificationStatusTransitionInputSchema,
	getCertificationInputSchema,
	issueCertificationInputSchema,
	listCertificationsInputSchema,
	listExpiringCertificationsInputSchema,
	renewCertificationInputSchema,
} from "../schemas/learning";
import {
	fingerprintCertificationIssue,
	fingerprintCertificationRenew,
} from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { CertificationListPage, EmployeeCertification } from "../types";
import {
	runLearningCapabilityCommand,
	runLearningCapabilityQuery,
} from "./run-operation";

export const HUMAN_RESOURCES_AGGREGATE_CERTIFICATION = "certification" as const;
export type HumanResourcesCertificationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_CERTIFICATION;

export function issueCertification(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCertification>> {
	return runLearningCapabilityCommand(input, options, {
		schema: issueCertificationInputSchema,
		invalidMessage: "Invalid certification issue input",
		command: HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE,
		storeMethods: [
			"getCompletionById",
			"findCertificationByIdempotencyKey",
			"issueCertification",
		],
		execute: async (data, { store, ports }) => {
			const completionResult = await store.getCompletionById({
				organizationId: data.organizationId,
				completionId: data.completionId,
			});
			if (!completionResult.ok) {
				return completionResult;
			}
			const completion = completionResult.data;
			if (
				completion === null ||
				completion.employeeId !== data.employeeId ||
				completion.courseId !== data.courseId
			) {
				return errorResult.fail("BAD_REQUEST", {
					publicMessage: "The request is invalid",
				});
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
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existingByKey.data.certification);
			}

			return store.issueCertification(
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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE,
					idempotencyKey: data.idempotencyKey,
				}),
			);
		},
	});
}

export function expireCertification(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCertification>> {
	return runLearningCapabilityCommand(input, options, {
		schema: certificationStatusTransitionInputSchema,
		invalidMessage: "Invalid certification expire input",
		command: HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE,
		storeMethods: ["expireCertification"],
		execute: async (data, { store, ports }) =>
			await store.expireCertification(
				{
					organizationId: data.organizationId,
					certificationId: data.certificationId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE,
				}),
			),
	});
}

export function revokeCertification(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCertification>> {
	return runLearningCapabilityCommand(input, options, {
		schema: certificationStatusTransitionInputSchema,
		invalidMessage: "Invalid certification revoke input",
		command: HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE,
		storeMethods: ["revokeCertification"],
		execute: async (data, { store, ports }) =>
			await store.revokeCertification(
				{
					organizationId: data.organizationId,
					certificationId: data.certificationId,
					revokedBy: data.actorUserId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE,
				}),
			),
	});
}

export function renewCertification(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCertification>> {
	return runLearningCapabilityCommand(input, options, {
		schema: renewCertificationInputSchema,
		invalidMessage: "Invalid certification renew input",
		command: HUMAN_RESOURCES_COMMAND_CERTIFICATION_RENEW,
		storeMethods: [
			"getCertificationById",
			"getCompletionById",
			"findCertificationByIdempotencyKey",
			"renewCertification",
		],
		execute: async (data, { store, ports }) => {
			const priorResult = await store.getCertificationById({
				organizationId: data.organizationId,
				certificationId: data.certificationId,
			});
			if (!priorResult.ok) {
				return priorResult;
			}
			if (priorResult.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				});
			}
			const prior = priorResult.data;

			const completionResult = await store.getCompletionById({
				organizationId: data.organizationId,
				completionId: data.completionId,
			});
			if (!completionResult.ok) {
				return completionResult;
			}
			if (completionResult.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				});
			}
			const completion = completionResult.data;

			const requestFingerprint = fingerprintCertificationRenew({
				certificationId: data.certificationId,
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
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existingByKey.data.certification);
			}

			return store.renewCertification(
				{
					organizationId: data.organizationId,
					certificationId: data.certificationId,
					employeeId: prior.employeeId,
					courseId: prior.courseId,
					completionId: completion.id,
					certificationCode: data.certificationCode,
					issuedOn: data.issuedOn,
					expiresOn: data.expiresOn ?? null,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					expectedVersion: data.expectedVersion,
					createdBy: data.actorUserId,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_CERTIFICATION_RENEW,
					idempotencyKey: data.idempotencyKey,
				}),
			);
		},
	});
}

export function getCertification(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCertification | null>> {
	return runLearningCapabilityQuery(input, options, {
		schema: getCertificationInputSchema,
		invalidMessage: "Invalid certification get input",
		query: HUMAN_RESOURCES_QUERY_CERTIFICATION_GET,
		storeMethods: ["getCertificationById"],
		execute: async (data, { store }) =>
			await store.getCertificationById({
				organizationId: data.organizationId,
				certificationId: data.certificationId,
			}),
	});
}

export function listCertifications(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CertificationListPage>> {
	return runLearningCapabilityQuery(input, options, {
		schema: listCertificationsInputSchema,
		invalidMessage: "Invalid certification list input",
		query: HUMAN_RESOURCES_QUERY_CERTIFICATION_LIST,
		storeMethods: ["listCertifications"],
		execute: async (data, { store }) =>
			await store.listCertifications({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
				employeeId: data.employeeId,
				courseId: data.courseId,
			}),
	});
}

export function listExpiringCertifications(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CertificationListPage>> {
	return runLearningCapabilityQuery(input, options, {
		schema: listExpiringCertificationsInputSchema,
		invalidMessage: "Invalid expiring certifications list input",
		query: HUMAN_RESOURCES_QUERY_CERTIFICATION_LIST_EXPIRING,
		storeMethods: ["listExpiringCertifications"],
		execute: async (data, { store }) =>
			await store.listExpiringCertifications({
				organizationId: data.organizationId,
				asOf: data.asOf,
				withinDays: data.withinDays ?? 30,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 25,
			}),
	});
}
