"use server";

import type { Result } from "@afenda/errors/result";
import {
	activateDepartment,
	activateJob,
	activatePosition,
	addCalendarDateOverride,
	addWorkCalendarHoliday,
	archiveDepartment,
	archiveJob,
	assignEmploymentCalendar,
	assignPrimaryReportingLine,
	assignWorkCalendarScope,
	closePosition,
	closeReportingLine,
	createDepartment,
	createJob,
	createPosition,
	type Department,
	type EmploymentCalendarAssignment,
	endWorkCalendarAssignment,
	endWorkCalendarScopeAssignment,
	freezePosition,
	getDepartment,
	getDepartmentAsOf,
	getJob,
	getJobAsOf,
	getOrganizationTree,
	getOrganizationTreeAsOf,
	getPosition,
	getPositionAsOf,
	getPositionOccupancyAsOf,
	getWorkCalendar,
	type Job,
	listDepartments,
	listDirectReports,
	listJobs,
	listPositions,
	listWorkCalendarHolidays,
	listWorkCalendars,
	type OrganizationTreePage,
	type Position,
	type PositionOccupancyAsOf,
	type ReportingLine,
	removeCalendarDateOverride,
	removeWorkCalendarHoliday,
	replacePrimaryReportingLine,
	resolveEmployeeWorkCalendar,
	resolveEmploymentCalendar,
	resolvePrimaryManager,
	updateDepartment,
	updateJob,
	updatePosition,
	type WorkCalendar,
	type WorkCalendarHolidayRecord,
	type WorkCalendarScopeAssignment,
} from "@afenda/human-resources";
import {
	assignEmploymentCalendarInputSchema,
	assignPrimaryReportingLineInputSchema,
	assignWorkCalendarScopeInputSchema,
	closeReportingLineInputSchema,
	createDepartmentInputSchema,
	createJobInputSchema,
	createPositionInputSchema,
	departmentStatusTransitionInputSchema,
	endWorkCalendarAssignmentInputSchema,
	endWorkCalendarScopeAssignmentInputSchema,
	getDepartmentAsOfInputSchema,
	getDepartmentInputSchema,
	getJobAsOfInputSchema,
	getJobInputSchema,
	getPositionAsOfInputSchema,
	getPositionInputSchema,
	getPositionOccupancyAsOfInputSchema,
	getWorkCalendarInputSchema,
	jobStatusTransitionInputSchema,
	listDepartmentsInputSchema,
	listDirectReportsInputSchema,
	listJobsInputSchema,
	listPositionsInputSchema,
	listWorkCalendarHolidaysInputSchema,
	listWorkCalendarsInputSchema,
	organizationTreeAsOfInputSchema,
	organizationTreeInputSchema,
	positionStatusTransitionInputSchema,
	removeCalendarDateOverrideInputSchema,
	removeWorkCalendarHolidayInputSchema,
	replacePrimaryReportingLineInputSchema,
	resolveEmployeeWorkCalendarInputSchema,
	resolveEmploymentCalendarInputSchema,
	resolvePrimaryManagerInputSchema,
	updateDepartmentInputSchema,
	updateJobInputSchema,
	updatePositionInputSchema,
} from "@afenda/human-resources/schemas";
import { z } from "zod";

import {
	hrActionSchema,
	hrMutationContextSchema as mutationContextSchema,
	withHrSessionContext as withSessionContext,
} from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrWorkforceOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/run-hr-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const positiveMinutesSchema = z.number().int().positive().max(1440);
const workCalendarDateOverrideKindSchema = z.enum([
	"holiday",
	"half_day",
	"shortened_day",
	"replacement_workday",
	"closure",
]);

type ResultData<T> = T extends Result<infer D> ? D : never;

type DepartmentAsOf = ResultData<Awaited<ReturnType<typeof getDepartmentAsOf>>>;
type JobAsOf = ResultData<Awaited<ReturnType<typeof getJobAsOf>>>;
type PositionAsOf = ResultData<Awaited<ReturnType<typeof getPositionAsOf>>>;

const createDepartmentActionSchema = hrActionSchema(
	createDepartmentInputSchema,
);
const updateDepartmentActionSchema = hrActionSchema(
	updateDepartmentInputSchema,
);
const departmentStatusTransitionActionSchema = hrActionSchema(
	departmentStatusTransitionInputSchema,
);
const getDepartmentActionSchema = hrActionSchema(getDepartmentInputSchema);
const getDepartmentAsOfActionSchema = hrActionSchema(
	getDepartmentAsOfInputSchema,
);
const listDepartmentsActionSchema = hrActionSchema(listDepartmentsInputSchema);
const organizationTreeActionSchema = hrActionSchema(
	organizationTreeInputSchema,
);
const organizationTreeAsOfActionSchema = hrActionSchema(
	organizationTreeAsOfInputSchema,
);

const createJobActionSchema = hrActionSchema(createJobInputSchema);
const updateJobActionSchema = hrActionSchema(updateJobInputSchema);
const jobStatusTransitionActionSchema = hrActionSchema(
	jobStatusTransitionInputSchema,
);
const getJobActionSchema = hrActionSchema(getJobInputSchema);
const getJobAsOfActionSchema = hrActionSchema(getJobAsOfInputSchema);
const listJobsActionSchema = hrActionSchema(listJobsInputSchema);

const createPositionActionSchema = hrActionSchema(createPositionInputSchema);
const updatePositionActionSchema = hrActionSchema(updatePositionInputSchema);
const positionStatusTransitionActionSchema = hrActionSchema(
	positionStatusTransitionInputSchema,
);
const getPositionActionSchema = hrActionSchema(getPositionInputSchema);
const getPositionAsOfActionSchema = hrActionSchema(getPositionAsOfInputSchema);
const getPositionOccupancyAsOfActionSchema = hrActionSchema(
	getPositionOccupancyAsOfInputSchema,
);
const listPositionsActionSchema = hrActionSchema(listPositionsInputSchema);

const assignPrimaryReportingLineActionSchema = hrActionSchema(
	assignPrimaryReportingLineInputSchema,
);
const closeReportingLineActionSchema = hrActionSchema(
	closeReportingLineInputSchema,
);
const replacePrimaryReportingLineActionSchema = hrActionSchema(
	replacePrimaryReportingLineInputSchema,
);
const resolvePrimaryManagerActionSchema = hrActionSchema(
	resolvePrimaryManagerInputSchema,
);
const listDirectReportsActionSchema = hrActionSchema(
	listDirectReportsInputSchema,
);

const addWorkCalendarHolidayActionSchema = mutationContextSchema.extend({
	calendarId: z.string().uuid(),
	holidayDate: isoDateSchema,
	label: z.string().trim().min(1).max(200).nullable().optional(),
	locationCode: z.string().trim().min(1).max(64).nullable().optional(),
	jurisdiction: z.string().trim().min(1).max(64).nullable().optional(),
	overrideKind: workCalendarDateOverrideKindSchema.optional(),
	isWorkingDay: z.boolean().optional(),
	expectedMinutes: positiveMinutesSchema.nullable().optional(),
});

const addCalendarDateOverrideActionSchema = mutationContextSchema.extend({
	calendarId: z.string().uuid(),
	holidayDate: isoDateSchema,
	overrideKind: workCalendarDateOverrideKindSchema,
	isWorkingDay: z.boolean().optional(),
	expectedMinutes: positiveMinutesSchema.nullable().optional(),
	label: z.string().trim().min(1).max(200).nullable().optional(),
	locationCode: z.string().trim().min(1).max(64).nullable().optional(),
	jurisdiction: z.string().trim().min(1).max(64).nullable().optional(),
});
const removeWorkCalendarHolidayActionSchema = hrActionSchema(
	removeWorkCalendarHolidayInputSchema,
);
const removeCalendarDateOverrideActionSchema = hrActionSchema(
	removeCalendarDateOverrideInputSchema,
);
const listWorkCalendarHolidaysActionSchema = hrActionSchema(
	listWorkCalendarHolidaysInputSchema,
);
const assignEmploymentCalendarActionSchema = hrActionSchema(
	assignEmploymentCalendarInputSchema,
);
const endWorkCalendarAssignmentActionSchema = hrActionSchema(
	endWorkCalendarAssignmentInputSchema,
);
const resolveEmploymentCalendarActionSchema = hrActionSchema(
	resolveEmploymentCalendarInputSchema,
);
const assignWorkCalendarScopeActionSchema = hrActionSchema(
	assignWorkCalendarScopeInputSchema,
);
const endWorkCalendarScopeAssignmentActionSchema = hrActionSchema(
	endWorkCalendarScopeAssignmentInputSchema,
);
const resolveEmployeeWorkCalendarActionSchema = hrActionSchema(
	resolveEmployeeWorkCalendarInputSchema,
);
const getWorkCalendarActionSchema = hrActionSchema(getWorkCalendarInputSchema);
const listWorkCalendarsActionSchema = hrActionSchema(
	listWorkCalendarsInputSchema,
);

// Department

export async function createDepartmentAction(input: {
	correlationId?: string;
	code: string;
	name: string;
	parentDepartmentId?: string | null;
	status?: "active" | "archived";
}): Promise<ActionResult<{ department: Department }>> {
	return await runOperatorPermissionAction({
		path: "createDepartmentAction",
		permission: "human-resources.organization.manage",
		safeMessage: "Could not create department.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createDepartmentActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid department.",
					parsed.details,
				);
			}
			const result = await createDepartment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { department: mapped.data } };
		},
	});
}

export async function updateDepartmentAction(input: {
	correlationId?: string;
	departmentId: string;
	name?: string;
	parentDepartmentId?: string | null;
	effectiveOn: string;
	reasonCode: string;
	evidenceRef?: string;
	expectedVersion: number;
}): Promise<ActionResult<{ department: Department }>> {
	return await runOperatorPermissionAction({
		path: "updateDepartmentAction",
		permission: "human-resources.organization.manage",
		safeMessage: "Could not update department.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(updateDepartmentActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid department update.",
					parsed.details,
				);
			}
			const result = await updateDepartment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { department: mapped.data } };
		},
	});
}

export async function activateDepartmentAction(input: {
	correlationId?: string;
	departmentId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ department: Department }>> {
	return await runOperatorPermissionAction({
		path: "activateDepartmentAction",
		permission: "human-resources.organization.manage",
		safeMessage: "Could not activate department.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(departmentStatusTransitionActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid department activation.",
					parsed.details,
				);
			}
			const result = await activateDepartment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { department: mapped.data } };
		},
	});
}

export async function archiveDepartmentAction(input: {
	correlationId?: string;
	departmentId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ department: Department }>> {
	return await runOperatorPermissionAction({
		path: "archiveDepartmentAction",
		permission: "human-resources.organization.manage",
		safeMessage: "Could not archive department.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(departmentStatusTransitionActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid department archive request.",
					parsed.details,
				);
			}
			const result = await archiveDepartment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { department: mapped.data } };
		},
	});
}

export async function getDepartmentAction(input: {
	correlationId?: string;
	departmentId: string;
}): Promise<ActionResult<{ department: Department }>> {
	return await runOperatorPermissionAction({
		path: "getDepartmentAction",
		permission: "human-resources.organization.read",
		safeMessage: "Could not get department.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getDepartmentActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid department lookup.",
					parsed.details,
				);
			}
			const result = await getDepartment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { department: mapped.data } };
		},
	});
}

export async function listDepartmentsAction(input?: {
	correlationId?: string;
	page?: number;
	pageSize?: number;
	status?: "active" | "archived";
	parentDepartmentId?: string | null;
}): Promise<ActionResult<{ departments: Department[]; totalCount: number }>> {
	return await runOperatorPermissionAction({
		path: "listDepartmentsAction",
		permission: "human-resources.organization.read",
		safeMessage: "Could not list departments.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listDepartmentsActionSchema, input ?? {});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid department list filters.",
					parsed.details,
				);
			}
			const result = await listDepartments(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return {
				ok: true,
				data: {
					departments: mapped.data.departments,
					totalCount: mapped.data.totalCount,
				},
			};
		},
	});
}

export async function getDepartmentAsOfAction(input: {
	correlationId?: string;
	departmentId: string;
	asOf: string;
}): Promise<ActionResult<{ department: DepartmentAsOf }>> {
	return await runOperatorPermissionAction({
		path: "getDepartmentAsOfAction",
		permission: "human-resources.organization.read",
		safeMessage: "Could not get department as of date.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getDepartmentAsOfActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid department as-of request.",
					parsed.details,
				);
			}
			const result = await getDepartmentAsOf(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { department: mapped.data } };
		},
	});
}

export async function getOrganizationTreeAction(input?: {
	correlationId?: string;
	rootDepartmentId?: string;
	maxDepth?: number;
	maxNodes?: number;
}): Promise<ActionResult<{ tree: OrganizationTreePage }>> {
	return await runOperatorPermissionAction({
		path: "getOrganizationTreeAction",
		permission: "human-resources.organization.read",
		safeMessage: "Could not get organization tree.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(organizationTreeActionSchema, input ?? {});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid organization tree filters.",
					parsed.details,
				);
			}
			const result = await getOrganizationTree(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { tree: mapped.data } };
		},
	});
}

export async function getOrganizationTreeAsOfAction(input: {
	correlationId?: string;
	asOf: string;
	rootDepartmentId?: string;
	maxDepth?: number;
	maxNodes?: number;
}): Promise<ActionResult<{ tree: OrganizationTreePage }>> {
	return await runOperatorPermissionAction({
		path: "getOrganizationTreeAsOfAction",
		permission: "human-resources.organization.read",
		safeMessage: "Could not get organization tree as of date.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(organizationTreeAsOfActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid organization tree as-of request.",
					parsed.details,
				);
			}
			const result = await getOrganizationTreeAsOf(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { tree: mapped.data } };
		},
	});
}

// Job

export async function createJobAction(input: {
	correlationId?: string;
	code: string;
	title: string;
	status?: "active" | "archived";
}): Promise<ActionResult<{ job: Job }>> {
	return await runOperatorPermissionAction({
		path: "createJobAction",
		permission: "human-resources.organization.manage",
		safeMessage: "Could not create job.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createJobActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid job.",
					parsed.details,
				);
			}
			const result = await createJob(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { job: mapped.data } };
		},
	});
}

export async function updateJobAction(input: {
	correlationId?: string;
	jobId: string;
	title: string;
	effectiveOn: string;
	reasonCode: string;
	evidenceRef?: string;
	expectedVersion: number;
}): Promise<ActionResult<{ job: Job }>> {
	return await runOperatorPermissionAction({
		path: "updateJobAction",
		permission: "human-resources.organization.manage",
		safeMessage: "Could not update job.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(updateJobActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid job update.",
					parsed.details,
				);
			}
			const result = await updateJob(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { job: mapped.data } };
		},
	});
}

export async function activateJobAction(input: {
	correlationId?: string;
	jobId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ job: Job }>> {
	return await runOperatorPermissionAction({
		path: "activateJobAction",
		permission: "human-resources.organization.manage",
		safeMessage: "Could not activate job.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(jobStatusTransitionActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid job activation.",
					parsed.details,
				);
			}
			const result = await activateJob(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { job: mapped.data } };
		},
	});
}

export async function archiveJobAction(input: {
	correlationId?: string;
	jobId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ job: Job }>> {
	return await runOperatorPermissionAction({
		path: "archiveJobAction",
		permission: "human-resources.organization.manage",
		safeMessage: "Could not archive job.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(jobStatusTransitionActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid job archive request.",
					parsed.details,
				);
			}
			const result = await archiveJob(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { job: mapped.data } };
		},
	});
}

export async function getJobAction(input: {
	correlationId?: string;
	jobId: string;
}): Promise<ActionResult<{ job: Job }>> {
	return await runOperatorPermissionAction({
		path: "getJobAction",
		permission: "human-resources.organization.read",
		safeMessage: "Could not get job.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getJobActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid job lookup.",
					parsed.details,
				);
			}
			const result = await getJob(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { job: mapped.data } };
		},
	});
}

export async function listJobsAction(input?: {
	correlationId?: string;
	page?: number;
	pageSize?: number;
	status?: "active" | "archived";
}): Promise<ActionResult<{ jobs: Job[]; totalCount: number }>> {
	return await runOperatorPermissionAction({
		path: "listJobsAction",
		permission: "human-resources.organization.read",
		safeMessage: "Could not list jobs.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listJobsActionSchema, input ?? {});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid job list filters.",
					parsed.details,
				);
			}
			const result = await listJobs(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return {
				ok: true,
				data: { jobs: mapped.data.jobs, totalCount: mapped.data.totalCount },
			};
		},
	});
}

export async function getJobAsOfAction(input: {
	correlationId?: string;
	jobId: string;
	asOf: string;
}): Promise<ActionResult<{ job: JobAsOf }>> {
	return await runOperatorPermissionAction({
		path: "getJobAsOfAction",
		permission: "human-resources.organization.read",
		safeMessage: "Could not get job as of date.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getJobAsOfActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid job as-of request.",
					parsed.details,
				);
			}
			const result = await getJobAsOf(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { job: mapped.data } };
		},
	});
}

// Position

export async function createPositionAction(input: {
	correlationId?: string;
	code: string;
	title: string;
	departmentId: string;
	jobId: string;
	status?: "active" | "frozen" | "closed";
}): Promise<ActionResult<{ position: Position }>> {
	return await runOperatorPermissionAction({
		path: "createPositionAction",
		permission: "human-resources.organization.manage",
		safeMessage: "Could not create position.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createPositionActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid position.",
					parsed.details,
				);
			}
			const result = await createPosition(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { position: mapped.data } };
		},
	});
}

export async function updatePositionAction(input: {
	correlationId?: string;
	positionId: string;
	title?: string;
	departmentId?: string;
	jobId?: string;
	effectiveOn: string;
	reasonCode: string;
	evidenceRef?: string;
	expectedVersion: number;
}): Promise<ActionResult<{ position: Position }>> {
	return await runOperatorPermissionAction({
		path: "updatePositionAction",
		permission: "human-resources.organization.manage",
		safeMessage: "Could not update position.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(updatePositionActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid position update.",
					parsed.details,
				);
			}
			const result = await updatePosition(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { position: mapped.data } };
		},
	});
}

export async function activatePositionAction(input: {
	correlationId?: string;
	positionId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ position: Position }>> {
	return await runOperatorPermissionAction({
		path: "activatePositionAction",
		permission: "human-resources.organization.manage",
		safeMessage: "Could not activate position.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(positionStatusTransitionActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid position activation.",
					parsed.details,
				);
			}
			const result = await activatePosition(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { position: mapped.data } };
		},
	});
}

export async function freezePositionAction(input: {
	correlationId?: string;
	positionId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ position: Position }>> {
	return await runOperatorPermissionAction({
		path: "freezePositionAction",
		permission: "human-resources.organization.manage",
		safeMessage: "Could not freeze position.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(positionStatusTransitionActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid position freeze request.",
					parsed.details,
				);
			}
			const result = await freezePosition(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { position: mapped.data } };
		},
	});
}

export async function closePositionAction(input: {
	correlationId?: string;
	positionId: string;
	expectedVersion: number;
}): Promise<ActionResult<{ position: Position }>> {
	return await runOperatorPermissionAction({
		path: "closePositionAction",
		permission: "human-resources.organization.manage",
		safeMessage: "Could not close position.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(positionStatusTransitionActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid position close request.",
					parsed.details,
				);
			}
			const result = await closePosition(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { position: mapped.data } };
		},
	});
}

export async function getPositionAction(input: {
	correlationId?: string;
	positionId: string;
}): Promise<ActionResult<{ position: Position }>> {
	return await runOperatorPermissionAction({
		path: "getPositionAction",
		permission: "human-resources.organization.read",
		safeMessage: "Could not get position.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getPositionActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid position lookup.",
					parsed.details,
				);
			}
			const result = await getPosition(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { position: mapped.data } };
		},
	});
}

export async function listPositionsAction(input?: {
	correlationId?: string;
	page?: number;
	pageSize?: number;
	status?: "active" | "frozen" | "closed";
	departmentId?: string;
	jobId?: string;
}): Promise<ActionResult<{ positions: Position[]; totalCount: number }>> {
	return await runOperatorPermissionAction({
		path: "listPositionsAction",
		permission: "human-resources.organization.read",
		safeMessage: "Could not list positions.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listPositionsActionSchema, input ?? {});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid position list filters.",
					parsed.details,
				);
			}
			const result = await listPositions(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return {
				ok: true,
				data: {
					positions: mapped.data.positions,
					totalCount: mapped.data.totalCount,
				},
			};
		},
	});
}

export async function getPositionAsOfAction(input: {
	correlationId?: string;
	positionId: string;
	asOf: string;
}): Promise<ActionResult<{ position: PositionAsOf }>> {
	return await runOperatorPermissionAction({
		path: "getPositionAsOfAction",
		permission: "human-resources.organization.read",
		safeMessage: "Could not get position as of date.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getPositionAsOfActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid position as-of request.",
					parsed.details,
				);
			}
			const result = await getPositionAsOf(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { position: mapped.data } };
		},
	});
}

export async function getPositionOccupancyAsOfAction(input: {
	correlationId?: string;
	positionId: string;
	asOf: string;
}): Promise<ActionResult<{ occupancy: PositionOccupancyAsOf }>> {
	return await runOperatorPermissionAction({
		path: "getPositionOccupancyAsOfAction",
		permission: "human-resources.organization.read",
		safeMessage: "Could not get position occupancy as of date.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getPositionOccupancyAsOfActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid position occupancy request.",
					parsed.details,
				);
			}
			const result = await getPositionOccupancyAsOf(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { occupancy: mapped.data } };
		},
	});
}

// Reporting

export async function assignPrimaryReportingLineAction(input: {
	correlationId?: string;
	employeeId: string;
	managerEmployeeId: string;
	startsOn: string;
	endsOn?: string | null;
}): Promise<ActionResult<{ reportingLine: ReportingLine }>> {
	return await runOperatorPermissionAction({
		path: "assignPrimaryReportingLineAction",
		permission: "human-resources.organization.manage",
		safeMessage: "Could not assign primary reporting line.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(assignPrimaryReportingLineActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid reporting line assignment.",
					parsed.details,
				);
			}
			const result = await assignPrimaryReportingLine(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { reportingLine: mapped.data } };
		},
	});
}

export async function closeReportingLineAction(input: {
	correlationId?: string;
	reportingLineId: string;
	endsOn: string;
	expectedVersion: number;
}): Promise<ActionResult<{ reportingLine: ReportingLine }>> {
	return await runOperatorPermissionAction({
		path: "closeReportingLineAction",
		permission: "human-resources.organization.manage",
		safeMessage: "Could not close reporting line.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(closeReportingLineActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid reporting line close request.",
					parsed.details,
				);
			}
			const result = await closeReportingLine(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { reportingLine: mapped.data } };
		},
	});
}

export async function replacePrimaryReportingLineAction(input: {
	correlationId?: string;
	employeeId: string;
	managerEmployeeId: string;
	startsOn: string;
	endsOn?: string | null;
	closePriorOn?: string;
}): Promise<ActionResult<{ reportingLine: ReportingLine }>> {
	return await runOperatorPermissionAction({
		path: "replacePrimaryReportingLineAction",
		permission: "human-resources.organization.manage",
		safeMessage: "Could not replace primary reporting line.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				replacePrimaryReportingLineActionSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid reporting line replacement.",
					parsed.details,
				);
			}
			const result = await replacePrimaryReportingLine(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { reportingLine: mapped.data } };
		},
	});
}

export async function resolvePrimaryManagerAction(input: {
	correlationId?: string;
	employeeId: string;
	asOf?: string;
}): Promise<ActionResult<{ reportingLine: ReportingLine | null }>> {
	return await runOperatorPermissionAction({
		path: "resolvePrimaryManagerAction",
		permission: "human-resources.organization.read",
		safeMessage: "Could not resolve primary manager.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(resolvePrimaryManagerActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid primary manager resolve request.",
					parsed.details,
				);
			}
			const result = await resolvePrimaryManager(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { reportingLine: mapped.data } };
		},
	});
}

export async function listDirectReportsAction(input: {
	correlationId?: string;
	managerEmployeeId: string;
	asOf?: string;
	page?: number;
	pageSize?: number;
}): Promise<
	ActionResult<{ reportingLines: ReportingLine[]; totalCount: number }>
> {
	return await runOperatorPermissionAction({
		path: "listDirectReportsAction",
		permission: "human-resources.organization.read",
		safeMessage: "Could not list direct reports.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listDirectReportsActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid direct reports list filters.",
					parsed.details,
				);
			}
			const result = await listDirectReports(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return {
				ok: true,
				data: {
					reportingLines: mapped.data.reportingLines,
					totalCount: mapped.data.totalCount,
				},
			};
		},
	});
}

// Work calendar (non-CRUD — calendar lifecycle stays in hr-time.ts)

export async function addWorkCalendarHolidayAction(input: {
	correlationId?: string;
	calendarId: string;
	holidayDate: string;
	label?: string | null;
	locationCode?: string | null;
	jurisdiction?: string | null;
	overrideKind?:
		| "holiday"
		| "half_day"
		| "shortened_day"
		| "replacement_workday"
		| "closure";
	isWorkingDay?: boolean;
	expectedMinutes?: number | null;
}): Promise<ActionResult<{ holiday: WorkCalendarHolidayRecord }>> {
	return await runOperatorPermissionAction({
		path: "addWorkCalendarHolidayAction",
		permission: "human-resources.time.calendar.manage",
		safeMessage: "Could not add work calendar holiday.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(addWorkCalendarHolidayActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid work calendar holiday.",
					parsed.details,
				);
			}
			const result = await addWorkCalendarHoliday(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { holiday: mapped.data } };
		},
	});
}

export async function removeWorkCalendarHolidayAction(input: {
	correlationId?: string;
	holidayId: string;
}): Promise<ActionResult<Record<string, never>>> {
	return await runOperatorPermissionAction({
		path: "removeWorkCalendarHolidayAction",
		permission: "human-resources.time.calendar.manage",
		safeMessage: "Could not remove work calendar holiday.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(removeWorkCalendarHolidayActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid work calendar holiday removal.",
					parsed.details,
				);
			}
			const result = await removeWorkCalendarHoliday(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: {} };
		},
	});
}

export async function addCalendarDateOverrideAction(input: {
	correlationId?: string;
	calendarId: string;
	holidayDate: string;
	overrideKind:
		| "holiday"
		| "half_day"
		| "shortened_day"
		| "replacement_workday"
		| "closure";
	isWorkingDay?: boolean;
	expectedMinutes?: number | null;
	label?: string | null;
	locationCode?: string | null;
	jurisdiction?: string | null;
}): Promise<ActionResult<{ override: WorkCalendarHolidayRecord }>> {
	return await runOperatorPermissionAction({
		path: "addCalendarDateOverrideAction",
		permission: "human-resources.time.calendar.manage",
		safeMessage: "Could not add calendar date override.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(addCalendarDateOverrideActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid calendar date override.",
					parsed.details,
				);
			}
			const result = await addCalendarDateOverride(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { override: mapped.data } };
		},
	});
}

export async function removeCalendarDateOverrideAction(input: {
	correlationId?: string;
	holidayId: string;
}): Promise<ActionResult<Record<string, never>>> {
	return await runOperatorPermissionAction({
		path: "removeCalendarDateOverrideAction",
		permission: "human-resources.time.calendar.manage",
		safeMessage: "Could not remove calendar date override.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(removeCalendarDateOverrideActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid calendar date override removal.",
					parsed.details,
				);
			}
			const result = await removeCalendarDateOverride(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: {} };
		},
	});
}

export async function assignEmploymentCalendarAction(input: {
	correlationId?: string;
	employeeId: string;
	employmentId: string;
	calendarId: string;
	effectiveFrom: string;
	effectiveTo?: string | null;
	locationCode?: string | null;
	jurisdiction?: string | null;
}): Promise<ActionResult<{ assignment: EmploymentCalendarAssignment }>> {
	return await runOperatorPermissionAction({
		path: "assignEmploymentCalendarAction",
		permission: "human-resources.time.calendar.manage",
		safeMessage: "Could not assign employment calendar.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(assignEmploymentCalendarActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment calendar assignment.",
					parsed.details,
				);
			}
			const result = await assignEmploymentCalendar(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { assignment: mapped.data } };
		},
	});
}

export async function endWorkCalendarAssignmentAction(input: {
	correlationId?: string;
	assignmentId: string;
	effectiveTo: string;
	expectedVersion: number;
}): Promise<ActionResult<{ assignment: EmploymentCalendarAssignment }>> {
	return await runOperatorPermissionAction({
		path: "endWorkCalendarAssignmentAction",
		permission: "human-resources.time.calendar.manage",
		safeMessage: "Could not end work calendar assignment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(endWorkCalendarAssignmentActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid work calendar assignment end request.",
					parsed.details,
				);
			}
			const result = await endWorkCalendarAssignment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { assignment: mapped.data } };
		},
	});
}

export async function assignWorkCalendarScopeAction(input: {
	correlationId?: string;
	scopeType:
		| "employment"
		| "employee"
		| "location"
		| "department"
		| "legal_entity"
		| "organization";
	scopeKey: string;
	calendarId: string;
	effectiveFrom: string;
	effectiveTo?: string | null;
}): Promise<ActionResult<{ assignment: WorkCalendarScopeAssignment }>> {
	return await runOperatorPermissionAction({
		path: "assignWorkCalendarScopeAction",
		permission: "human-resources.time.calendar.manage",
		safeMessage: "Could not assign work calendar scope.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(assignWorkCalendarScopeActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid work calendar scope assignment.",
					parsed.details,
				);
			}
			const result = await assignWorkCalendarScope(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { assignment: mapped.data } };
		},
	});
}

export async function endWorkCalendarScopeAssignmentAction(input: {
	correlationId?: string;
	assignmentId: string;
	effectiveTo: string;
	expectedVersion: number;
}): Promise<ActionResult<{ assignment: WorkCalendarScopeAssignment }>> {
	return await runOperatorPermissionAction({
		path: "endWorkCalendarScopeAssignmentAction",
		permission: "human-resources.time.calendar.manage",
		safeMessage: "Could not end work calendar scope assignment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				endWorkCalendarScopeAssignmentActionSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid work calendar scope end request.",
					parsed.details,
				);
			}
			const result = await endWorkCalendarScopeAssignment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { assignment: mapped.data } };
		},
	});
}

export async function getWorkCalendarAction(input: {
	correlationId?: string;
	calendarId: string;
}): Promise<ActionResult<{ calendar: WorkCalendar | null }>> {
	return await runOperatorPermissionAction({
		path: "getWorkCalendarAction",
		permission: "human-resources.time.calendar.read",
		safeMessage: "Could not get work calendar.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getWorkCalendarActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid work calendar lookup.",
					parsed.details,
				);
			}
			const result = await getWorkCalendar(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { calendar: mapped.data } };
		},
	});
}

export async function listWorkCalendarsAction(input?: {
	correlationId?: string;
	status?: "active" | "superseded" | "archived";
	page?: number;
	pageSize?: number;
}): Promise<ActionResult<{ calendars: WorkCalendar[] }>> {
	return await runOperatorPermissionAction({
		path: "listWorkCalendarsAction",
		permission: "human-resources.time.calendar.read",
		safeMessage: "Could not list work calendars.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listWorkCalendarsActionSchema, input ?? {});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid work calendar list filters.",
					parsed.details,
				);
			}
			const result = await listWorkCalendars(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { calendars: mapped.data } };
		},
	});
}

export async function listWorkCalendarHolidaysAction(input: {
	correlationId?: string;
	calendarId: string;
	fromDate?: string;
	toDate?: string;
}): Promise<ActionResult<{ holidays: WorkCalendarHolidayRecord[] }>> {
	return await runOperatorPermissionAction({
		path: "listWorkCalendarHolidaysAction",
		permission: "human-resources.time.calendar.read",
		safeMessage: "Could not list work calendar holidays.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listWorkCalendarHolidaysActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid work calendar holiday list filters.",
					parsed.details,
				);
			}
			const result = await listWorkCalendarHolidays(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { holidays: mapped.data } };
		},
	});
}

export async function resolveEmploymentCalendarAction(input: {
	correlationId?: string;
	employeeId: string;
	employmentId: string;
	asOf: string;
}): Promise<ActionResult<{ assignment: EmploymentCalendarAssignment | null }>> {
	return await runOperatorPermissionAction({
		path: "resolveEmploymentCalendarAction",
		permission: "human-resources.time.calendar.read",
		safeMessage: "Could not resolve employment calendar.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(resolveEmploymentCalendarActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment calendar resolve request.",
					parsed.details,
				);
			}
			const result = await resolveEmploymentCalendar(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { assignment: mapped.data } };
		},
	});
}

export async function resolveEmployeeWorkCalendarAction(input: {
	correlationId?: string;
	employeeId: string;
	employmentId: string;
	asOf: string;
}): Promise<ActionResult<{ calendarId: string }>> {
	return await runOperatorPermissionAction({
		path: "resolveEmployeeWorkCalendarAction",
		permission: "human-resources.time.calendar.read",
		safeMessage: "Could not resolve employee work calendar.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				resolveEmployeeWorkCalendarActionSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employee work calendar resolve request.",
					parsed.details,
				);
			}
			const result = await resolveEmployeeWorkCalendar(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { calendarId: mapped.data.calendarId } };
		},
	});
}
