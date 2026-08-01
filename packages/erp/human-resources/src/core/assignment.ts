import { errorResult, type Result } from "@afenda/errors";
import {
	type HumanResourcesCommandOptions,
	requireOrganizationDimensionDirectory,
} from "../command-options";
import {
	runEmploymentLifecycleCommand,
	runEmploymentLifecycleQuery,
} from "../employment-lifecycle/run-operation";
import type { HumanResourcesEmploymentLifecycleStore } from "../employment-lifecycle/store";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END,
	HUMAN_RESOURCES_QUERY_ASSIGNMENT_AS_OF,
	HUMAN_RESOURCES_QUERY_ASSIGNMENT_GET,
} from "../module-ids";
import {
	createAssignmentInputSchema,
	endAssignmentInputSchema,
	getAssignmentAsOfInputSchema,
	getAssignmentInputSchema,
} from "../schemas/organization";
import {
	assertAssignmentWithinEmployment,
	assertNoAssignmentOverlap,
} from "../shared/assignment-guards";
import { resolveAssignmentContextSnapshots } from "../shared/assignment-snapshots";
import { assertValidDateRange } from "../shared/employment-status";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { Employment, WorkAssignment } from "../types";

async function loadEmploymentForAssignment(
	store: Pick<HumanResourcesEmploymentLifecycleStore, "getEmploymentById">,
	data: { organizationId: string; employmentId: Employment["id"] },
): Promise<Result<Employment>> {
	const employment = await store.getEmploymentById({
		organizationId: data.organizationId,
		employmentId: data.employmentId,
	});
	if (!employment.ok) {
		return employment;
	}
	if (employment.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			),
		});
	}
	return errorResult.ok(employment.data);
}

export function createAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkAssignment>> {
	return runEmploymentLifecycleCommand(input, options, {
		schema: createAssignmentInputSchema,
		invalidMessage: "Invalid assignment create input",
		command: HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE,
		storeMethods: [
			"getEmploymentById",
			"getPositionById",
			"resolvePrimaryManager",
			"listWorkCalendarScopeAssignments",
			"resolveEmploymentCalendar",
			"listWorkCalendars",
			"getWorkCalendar",
			"listAssignmentsByEmployment",
			"createAssignment",
		],
		execute: async (data, { store, ports }) => {
			const directory = requireOrganizationDimensionDirectory(options);
			if (!directory.ok) {
				return directory;
			}

			const employment = await loadEmploymentForAssignment(store, {
				organizationId: data.organizationId,
				employmentId: data.employmentId,
			});
			if (!employment.ok) {
				return employment;
			}

			const endsOn = data.endsOn ?? null;
			const dateCheck = assertValidDateRange(data.startsOn, endsOn);
			if (!dateCheck.ok) {
				return dateCheck;
			}

			const withinEmployment = assertAssignmentWithinEmployment({
				assignmentStartsOn: data.startsOn,
				assignmentEndsOn: endsOn,
				employmentStartsOn: employment.data.startsOn,
				employmentEndsOn: employment.data.endsOn,
			});
			if (!withinEmployment.ok) {
				return withinEmployment;
			}

			const dimensions = await directory.data.resolveRequiredAsOf({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				asOf: data.startsOn,
				keys: {
					legal_entity: data.legalEntityKey,
					business_unit: data.businessUnitKey,
					location: data.locationKey,
					cost_centre: data.costCentreKey,
					project: data.projectKey,
				},
			});
			if (!dimensions.ok) {
				return dimensions;
			}

			const snapshots = await resolveAssignmentContextSnapshots({
				organizationId: data.organizationId,
				employeeId: employment.data.employeeId,
				employmentId: data.employmentId,
				positionId: data.positionId,
				organizationDimensions: dimensions.data,
				asOf: data.startsOn,
				store,
				calendarStore: store,
			});
			if (!snapshots.ok) {
				return snapshots;
			}

			const siblings = await store.listAssignmentsByEmployment({
				organizationId: data.organizationId,
				employmentId: data.employmentId,
			});
			if (!siblings.ok) {
				return siblings;
			}

			const overlap = assertNoAssignmentOverlap({
				candidateStartsOn: data.startsOn,
				candidateEndsOn: endsOn,
				existing: siblings.data,
			});
			if (!overlap.ok) {
				return overlap;
			}

			return store.createAssignment(
				{
					organizationId: data.organizationId,
					employmentId: data.employmentId,
					employeeId: employment.data.employeeId,
					positionId: data.positionId,
					organizationDimensions: dimensions.data,
					managerEmployeeIdSnapshot: snapshots.data.managerEmployeeIdSnapshot,
					workCalendarIdSnapshot: snapshots.data.workCalendarIdSnapshot,
					startsOn: data.startsOn,
					endsOn,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE,
				}),
			);
		},
	});
}

export function endAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkAssignment>> {
	return runEmploymentLifecycleCommand(input, options, {
		schema: endAssignmentInputSchema,
		invalidMessage: "Invalid assignment end input",
		command: HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END,
		storeMethods: [
			"getAssignmentById",
			"getEmploymentById",
			"listAssignmentsByEmployment",
			"endAssignment",
		],
		execute: async (data, { store, ports }) => {
			const existing = await store.getAssignmentById({
				organizationId: data.organizationId,
				assignmentId: data.assignmentId,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}

			const employment = await loadEmploymentForAssignment(store, {
				organizationId: data.organizationId,
				employmentId: existing.data.employmentId,
			});
			if (!employment.ok) {
				return employment;
			}

			const dateCheck = assertValidDateRange(
				existing.data.startsOn,
				data.endsOn,
			);
			if (!dateCheck.ok) {
				return dateCheck;
			}

			const withinEmployment = assertAssignmentWithinEmployment({
				assignmentStartsOn: existing.data.startsOn,
				assignmentEndsOn: data.endsOn,
				employmentStartsOn: employment.data.startsOn,
				employmentEndsOn: employment.data.endsOn,
			});
			if (!withinEmployment.ok) {
				return withinEmployment;
			}

			const siblings = await store.listAssignmentsByEmployment({
				organizationId: data.organizationId,
				employmentId: existing.data.employmentId,
			});
			if (!siblings.ok) {
				return siblings;
			}

			const overlap = assertNoAssignmentOverlap({
				candidateAssignmentId: existing.data.id,
				candidateStartsOn: existing.data.startsOn,
				candidateEndsOn: data.endsOn,
				existing: siblings.data,
			});
			if (!overlap.ok) {
				return overlap;
			}

			return store.endAssignment(
				{
					organizationId: data.organizationId,
					assignmentId: data.assignmentId,
					endsOn: data.endsOn,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END,
				}),
			);
		},
	});
}

export function getAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkAssignment>> {
	return runEmploymentLifecycleQuery(input, options, {
		schema: getAssignmentInputSchema,
		invalidMessage: "Invalid assignment get input",
		query: HUMAN_RESOURCES_QUERY_ASSIGNMENT_GET,
		storeMethods: ["getAssignmentById"],
		execute: async (data, { store }) => {
			const assignment = await store.getAssignmentById({
				organizationId: data.organizationId,
				assignmentId: data.assignmentId,
			});
			if (!assignment.ok) {
				return assignment;
			}
			if (assignment.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return errorResult.ok(assignment.data);
		},
	});
}

export function getAssignmentAsOf(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkAssignment | null>> {
	return runEmploymentLifecycleQuery(input, options, {
		schema: getAssignmentAsOfInputSchema,
		invalidMessage: "Invalid assignment as-of input",
		query: HUMAN_RESOURCES_QUERY_ASSIGNMENT_AS_OF,
		storeMethods: ["findAssignmentByEmploymentAsOf"],
		execute: async (data, { store }) =>
			store.findAssignmentByEmploymentAsOf({
				organizationId: data.organizationId,
				employmentId: data.employmentId,
				asOf: data.asOf,
			}),
	});
}
