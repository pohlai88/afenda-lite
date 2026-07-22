import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ADD_PARTICIPANT,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ASSIGN_OWNER,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_CLOSE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ISSUE_INTERIM_MEASURE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_OPEN,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_FINDING,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_REOPEN,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_UPDATE_CLASSIFICATION,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_LIST,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_LIST_ASSIGNED,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_LIST_OPEN,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_OUTCOME,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_TIMELINE,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_RELATIONS_HISTORY_BY_EMPLOYEE,
} from "../module-ids";
import {
	addEmployeeCaseParticipantInputSchema,
	assignEmployeeCaseOwnerInputSchema,
	closeEmployeeCaseInputSchema,
	getEmployeeCaseByIdInputSchema,
	getEmployeeCaseOutcomeInputSchema,
	getEmployeeCaseTimelineInputSchema,
	getEmployeeRelationsHistoryByEmployeeInputSchema,
	issueInterimEmployeeMeasureInputSchema,
	listCasesAssignedToActorInputSchema,
	listEmployeeCasesInputSchema,
	listOpenEmployeeRelationsCasesInputSchema,
	openEmployeeCaseInputSchema,
	recordEmployeeCaseFindingInputSchema,
	reopenEmployeeCaseInputSchema,
	updateEmployeeCaseClassificationInputSchema,
} from "./schemas";
import { fingerprintEmployeeCaseOpen } from "../shared/fingerprint";
import {
	runEmployeeRelationsCommand,
	runEmployeeRelationsQuery,
} from "../shared/employee-relations-command";
import type {
	EmployeeCase,
	EmployeeCaseListPage,
	EmployeeCaseOutcome,
	EmployeeCaseTimeline,
} from "./types";

export const HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_CASE = "employee_case" as const;
export type HumanResourcesEmployeeCaseAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_CASE;

export async function openEmployeeCase(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCase>> {
	return runEmployeeRelationsCommand(input, options, {
		schema: openEmployeeCaseInputSchema,
		invalidMessage: "Invalid employee case open input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_OPEN,
		execute: async (data, { store, ports }) => {
			const fingerprint = fingerprintEmployeeCaseOpen({
				employeeId: data.employeeId,
				employmentId: data.employmentId,
				caseType: data.caseType,
				severity: data.severity,
				classificationCode: data.classificationCode,
				ownerActorUserId: data.ownerActorUserId,
			});
			const existing = await store.findEmployeeCaseByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				if (existing.data.createRequestFingerprint !== fingerprint) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existing.data.case);
			}
			return store.openEmployeeCase(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: data.employmentId,
					caseType: data.caseType,
					severity: data.severity,
					allegationSummary: data.allegationSummary,
					classificationCode: data.classificationCode,
					ownerActorUserId: data.ownerActorUserId,
					subjectActorUserId: data.subjectActorUserId ?? null,
					conflictedActorUserIds: data.conflictedActorUserIds,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function updateEmployeeCaseClassification(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCase>> {
	return runEmployeeRelationsCommand(input, options, {
		schema: updateEmployeeCaseClassificationInputSchema,
		invalidMessage: "Invalid employee case classification input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_UPDATE_CLASSIFICATION,
		execute: (data, { store, ports }) =>
			store.updateEmployeeCaseClassification(
				{
					organizationId: data.organizationId,
					caseId: data.caseId,
					classificationCode: data.classificationCode,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function assignEmployeeCaseOwner(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCase>> {
	return runEmployeeRelationsCommand(input, options, {
		schema: assignEmployeeCaseOwnerInputSchema,
		invalidMessage: "Invalid employee case assign-owner input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ASSIGN_OWNER,
		execute: (data, { store, ports }) =>
			store.assignEmployeeCaseOwner(
				{
					organizationId: data.organizationId,
					caseId: data.caseId,
					ownerActorUserId: data.ownerActorUserId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function addEmployeeCaseParticipant(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCase>> {
	return runEmployeeRelationsCommand(input, options, {
		schema: addEmployeeCaseParticipantInputSchema,
		invalidMessage: "Invalid employee case add-participant input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ADD_PARTICIPANT,
		execute: (data, { store, ports }) =>
			store.addEmployeeCaseParticipant(
				{
					organizationId: data.organizationId,
					caseId: data.caseId,
					participantActorUserId: data.participantActorUserId,
					role: data.role,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function issueInterimEmployeeMeasure(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCase>> {
	return runEmployeeRelationsCommand(input, options, {
		schema: issueInterimEmployeeMeasureInputSchema,
		invalidMessage: "Invalid interim employee measure input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ISSUE_INTERIM_MEASURE,
		execute: (data, { store, ports }) =>
			store.issueInterimEmployeeMeasure(
				{
					organizationId: data.organizationId,
					caseId: data.caseId,
					interimAuthority: data.interimAuthority,
					interimReason: data.interimReason,
					interimStartsOn: data.interimStartsOn,
					interimReviewOn: data.interimReviewOn,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function recordEmployeeCaseFinding(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCase>> {
	return runEmployeeRelationsCommand(input, options, {
		schema: recordEmployeeCaseFindingInputSchema,
		invalidMessage: "Invalid employee case finding input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_FINDING,
		execute: (data, { store, ports }) =>
			store.recordEmployeeCaseFinding(
				{
					organizationId: data.organizationId,
					caseId: data.caseId,
					findingCode: data.findingCode,
					findingSummary: data.findingSummary,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function closeEmployeeCase(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCase>> {
	return runEmployeeRelationsCommand(input, options, {
		schema: closeEmployeeCaseInputSchema,
		invalidMessage: "Invalid employee case close input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_CLOSE,
		execute: (data, { store, ports }) =>
			store.closeEmployeeCase(
				{
					organizationId: data.organizationId,
					caseId: data.caseId,
					outcomeCode: data.outcomeCode,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function reopenEmployeeCase(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCase>> {
	return runEmployeeRelationsCommand(input, options, {
		schema: reopenEmployeeCaseInputSchema,
		invalidMessage: "Invalid employee case reopen input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_REOPEN,
		execute: (data, { store, ports }) =>
			store.reopenEmployeeCase(
				{
					organizationId: data.organizationId,
					caseId: data.caseId,
					reasonCode: data.reasonCode,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function getEmployeeCaseById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCase>> {
	return runEmployeeRelationsQuery(input, options, {
		schema: getEmployeeCaseByIdInputSchema,
		invalidMessage: "Invalid employee case get input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_GET,
		execute: async (data, { store }) =>
			store.getEmployeeCaseById({
				organizationId: data.organizationId,
				caseId: data.caseId,
				actorUserId: data.actorUserId,
			}),
	});
}

export async function listEmployeeCases(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCaseListPage>> {
	return runEmployeeRelationsQuery(input, options, {
		schema: listEmployeeCasesInputSchema,
		invalidMessage: "Invalid employee case list input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_LIST,
		execute: (data, { store }) =>
			store.listEmployeeCases({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				page: data.page,
				pageSize: data.pageSize,
				status: data.status,
			}),
	});
}

export async function listCasesAssignedToActor(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCaseListPage>> {
	return runEmployeeRelationsQuery(input, options, {
		schema: listCasesAssignedToActorInputSchema,
		invalidMessage: "Invalid assigned employee case list input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_LIST_ASSIGNED,
		execute: (data, { store }) =>
			store.listCasesAssignedToActor({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				page: data.page,
				pageSize: data.pageSize,
			}),
	});
}

export async function listOpenEmployeeRelationsCases(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCaseListPage>> {
	return runEmployeeRelationsQuery(input, options, {
		schema: listOpenEmployeeRelationsCasesInputSchema,
		invalidMessage: "Invalid open employee case list input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_LIST_OPEN,
		execute: (data, { store }) =>
			store.listOpenEmployeeRelationsCases({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				page: data.page,
				pageSize: data.pageSize,
			}),
	});
}

export async function getEmployeeRelationsHistoryByEmployee(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCaseListPage>> {
	return runEmployeeRelationsQuery(input, options, {
		schema: getEmployeeRelationsHistoryByEmployeeInputSchema,
		invalidMessage: "Invalid employee relations history input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_RELATIONS_HISTORY_BY_EMPLOYEE,
		execute: (data, { store }) =>
			store.getEmployeeRelationsHistoryByEmployee({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				page: data.page,
				pageSize: data.pageSize,
			}),
	});
}

export async function getEmployeeCaseTimeline(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCaseTimeline>> {
	return runEmployeeRelationsQuery(input, options, {
		schema: getEmployeeCaseTimelineInputSchema,
		invalidMessage: "Invalid employee case timeline input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_TIMELINE,
		execute: (data, { store }) =>
			store.getEmployeeCaseTimeline({
				organizationId: data.organizationId,
				caseId: data.caseId,
				actorUserId: data.actorUserId,
			}),
	});
}

export async function getEmployeeCaseOutcome(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCaseOutcome>> {
	return runEmployeeRelationsQuery(input, options, {
		schema: getEmployeeCaseOutcomeInputSchema,
		invalidMessage: "Invalid employee case outcome input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_OUTCOME,
		execute: (data, { store }) =>
			store.getEmployeeCaseOutcome({
				organizationId: data.organizationId,
				caseId: data.caseId,
				actorUserId: data.actorUserId,
			}),
	});
}
