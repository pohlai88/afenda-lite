import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_EXPIRE,
	HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_RECORD,
	HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_COMPETENCY_CREATE,
	HUMAN_RESOURCES_COMMAND_COMPETENCY_RETIRE,
	HUMAN_RESOURCES_COMMAND_COMPETENCY_UPDATE,
	HUMAN_RESOURCES_COMMAND_JOB_COMPETENCY_MAP,
	HUMAN_RESOURCES_COMMAND_JOB_COMPETENCY_REMOVE,
	HUMAN_RESOURCES_QUERY_COMPETENCY_GET,
	HUMAN_RESOURCES_QUERY_COMPETENCY_LIST,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPETENCY_PROFILE_GET,
	HUMAN_RESOURCES_QUERY_JOB_COMPETENCY_LIST,
} from "../module-ids";
import {
	assessEmployeeCompetencyInputSchema,
	createCompetencyInputSchema,
	expireCompetencyAssessmentInputSchema,
	getCompetencyByIdInputSchema,
	getEmployeeCompetencyProfileInputSchema,
	listCompetenciesInputSchema,
	listJobCompetenciesInputSchema,
	mapCompetencyToJobInputSchema,
	removeCompetencyFromJobInputSchema,
	retireCompetencyInputSchema,
	supersedeCompetencyAssessmentInputSchema,
	updateCompetencyInputSchema,
} from "../schemas/talent";
import {
	fingerprintCompetencyAssessmentCreate,
	fingerprintCompetencyAssessmentSupersede,
	fingerprintCompetencyCreate,
} from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import {
	resolveCompetencyAssessmentResource,
	runTalentCommand,
	runTalentEmployeeScopedQuery,
	runTalentQuery,
} from "../shared/talent-command";
import type {
	Competency,
	CompetencyAssessment,
	CompetencyListPage,
	EmployeeCompetencyProfile,
	JobCompetency,
	JobCompetencyListPage,
} from "../types";
import {
	type ProjectedEmployeeCompetencyProfile,
	projectEmployeeCompetencyProfileFromDecision,
	talentSensitiveQueryRequestedFields,
} from "./talent-field-projection";

export const HUMAN_RESOURCES_AGGREGATE_COMPETENCY = "competency" as const;
export type HumanResourcesCompetencyAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_COMPETENCY;

export function createCompetency(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Competency>> {
	return runTalentCommand(input, options, {
		schema: createCompetencyInputSchema,
		invalidMessage: "Invalid competency create input",
		command: HUMAN_RESOURCES_COMMAND_COMPETENCY_CREATE,
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintCompetencyCreate({
				code: data.code,
				name: data.name,
				scaleCode: data.scaleCode,
			});

			const existingByKey = await store.findCompetencyByIdempotencyKey({
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
				return ok(existingByKey.data.competency);
			}

			return store.createCompetency(
				{
					organizationId: data.organizationId,
					code: data.code,
					name: data.name,
					description: data.description ?? null,
					category: data.category ?? null,
					scaleCode: data.scaleCode,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_COMPETENCY_CREATE,
				}),
			);
		},
	});
}

export function updateCompetency(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Competency>> {
	return runTalentCommand(input, options, {
		schema: updateCompetencyInputSchema,
		invalidMessage: "Invalid competency update input",
		command: HUMAN_RESOURCES_COMMAND_COMPETENCY_UPDATE,
		execute: async (data, { store, ports }) =>
			await store.updateCompetency(
				{
					organizationId: data.organizationId,
					competencyId: data.competencyId,
					name: data.name,
					description: data.description,
					category: data.category,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_COMPETENCY_UPDATE,
				}),
			),
	});
}

export function retireCompetency(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Competency>> {
	return runTalentCommand(input, options, {
		schema: retireCompetencyInputSchema,
		invalidMessage: "Invalid competency retire input",
		command: HUMAN_RESOURCES_COMMAND_COMPETENCY_RETIRE,
		execute: async (data, { store, ports }) =>
			await store.retireCompetency(
				{
					organizationId: data.organizationId,
					competencyId: data.competencyId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_COMPETENCY_RETIRE,
				}),
			),
	});
}

export function mapCompetencyToJob(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobCompetency>> {
	return runTalentCommand(input, options, {
		schema: mapCompetencyToJobInputSchema,
		invalidMessage: "Invalid competency to job mapping input",
		command: HUMAN_RESOURCES_COMMAND_JOB_COMPETENCY_MAP,
		execute: async (data, { store, ports }) =>
			await store.mapCompetencyToJob(
				{
					organizationId: data.organizationId,
					jobId: data.jobId,
					competencyId: data.competencyId,
					requiredLevel: data.requiredLevel,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_JOB_COMPETENCY_MAP,
				}),
			),
	});
}

export function removeCompetencyFromJob(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobCompetency>> {
	return runTalentCommand(input, options, {
		schema: removeCompetencyFromJobInputSchema,
		invalidMessage: "Invalid competency from job removal input",
		command: HUMAN_RESOURCES_COMMAND_JOB_COMPETENCY_REMOVE,
		execute: async (data, { store, ports }) =>
			await store.removeCompetencyFromJob(
				{
					organizationId: data.organizationId,
					jobCompetencyId: data.jobCompetencyId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_JOB_COMPETENCY_REMOVE,
				}),
			),
	});
}

export function assessEmployeeCompetency(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompetencyAssessment>> {
	return runTalentCommand(input, options, {
		schema: assessEmployeeCompetencyInputSchema,
		invalidMessage: "Invalid employee competency assessment input",
		command: HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_RECORD,
		resolveResource: async (data) => ({
			organizationId: data.organizationId,
			kind: "competency_assessment",
			subjectEmployeeId: data.employeeId,
		}),
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintCompetencyAssessmentCreate({
				employeeId: data.employeeId,
				competencyId: data.competencyId,
				assessorUserId: data.assessorUserId,
				scaleCode: data.scaleCode,
				level: data.level,
				effectiveOn: data.effectiveOn,
				expiresOn: data.expiresOn ?? null,
			});

			const existingByKey =
				await store.findCompetencyAssessmentByIdempotencyKey({
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
				return ok(existingByKey.data.assessment);
			}

			return store.createCompetencyAssessment(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					competencyId: data.competencyId,
					scaleCode: data.scaleCode,
					level: data.level,
					assessorUserId: data.assessorUserId,
					evidenceSource: data.evidenceSource,
					effectiveOn: data.effectiveOn,
					expiresOn: data.expiresOn ?? null,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_RECORD,
				}),
			);
		},
	});
}

export function supersedeCompetencyAssessment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompetencyAssessment>> {
	return runTalentCommand(input, options, {
		schema: supersedeCompetencyAssessmentInputSchema,
		invalidMessage: "Invalid competency assessment supersede input",
		command: HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_SUPERSEDE,
		resolveResource: (data, opts) =>
			resolveCompetencyAssessmentResource(data, opts),
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintCompetencyAssessmentSupersede({
				assessmentId: data.assessmentId,
				assessorUserId: data.assessorUserId,
				level: data.level,
				effectiveOn: data.effectiveOn,
				expiresOn: data.expiresOn ?? null,
			});

			return await store.supersedeCompetencyAssessment(
				{
					organizationId: data.organizationId,
					sourceAssessmentId: data.assessmentId,
					level: data.level,
					assessorUserId: data.assessorUserId,
					evidenceSource: data.evidenceSource,
					effectiveOn: data.effectiveOn,
					expiresOn: data.expiresOn ?? null,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					expectedVersion: data.expectedVersion,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_SUPERSEDE,
				}),
			);
		},
	});
}

export function expireCompetencyAssessment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompetencyAssessment>> {
	return runTalentCommand(input, options, {
		schema: expireCompetencyAssessmentInputSchema,
		invalidMessage: "Invalid competency assessment expire input",
		command: HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_EXPIRE,
		resolveResource: (data, opts) =>
			resolveCompetencyAssessmentResource(data, opts),
		execute: async (data, { store, ports }) =>
			await store.expireCompetencyAssessment(
				{
					organizationId: data.organizationId,
					assessmentId: data.assessmentId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_EXPIRE,
				}),
			),
	});
}

export function getCompetencyById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Competency | null>> {
	return runTalentQuery(input, options, {
		schema: getCompetencyByIdInputSchema,
		invalidMessage: "Invalid competency get input",
		query: HUMAN_RESOURCES_QUERY_COMPETENCY_GET,
		execute: async (data, { store }) =>
			await store.getCompetencyById({
				organizationId: data.organizationId,
				competencyId: data.competencyId,
			}),
	});
}

export function listCompetencies(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompetencyListPage>> {
	return runTalentQuery(input, options, {
		schema: listCompetenciesInputSchema,
		invalidMessage: "Invalid competency list input",
		query: HUMAN_RESOURCES_QUERY_COMPETENCY_LIST,
		execute: async (data, { store }) =>
			await store.listCompetencies({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
			}),
	});
}

export function listJobCompetencies(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobCompetencyListPage>> {
	return runTalentQuery(input, options, {
		schema: listJobCompetenciesInputSchema,
		invalidMessage: "Invalid job competency list input",
		query: HUMAN_RESOURCES_QUERY_JOB_COMPETENCY_LIST,
		execute: async (data, { store }) =>
			await store.listJobCompetencies({
				organizationId: data.organizationId,
				jobId: data.jobId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
			}),
	});
}

export function getEmployeeCompetencyProfile(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ProjectedEmployeeCompetencyProfile>> {
	return runTalentEmployeeScopedQuery(input, options, {
		schema: getEmployeeCompetencyProfileInputSchema,
		invalidMessage: "Invalid employee competency profile get input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPETENCY_PROFILE_GET,
		resolveRequestedFields: () => talentSensitiveQueryRequestedFields(),
		project: (value: EmployeeCompetencyProfile, projection) =>
			projectEmployeeCompetencyProfileFromDecision(value, projection),
		execute: async (data, { store }) =>
			await store.getEmployeeCompetencyProfile({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
			}),
	});
}
