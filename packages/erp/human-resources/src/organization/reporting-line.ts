import type { Result } from "@afenda/errors/result";

import {
	requireHumanResourcesCommandPermission,
	requireHumanResourcesQueryPermission,
} from "../authorization";
import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_REPORTING_LINE_ASSIGN_PRIMARY,
	HUMAN_RESOURCES_COMMAND_REPORTING_LINE_CLOSE,
	HUMAN_RESOURCES_COMMAND_REPORTING_LINE_REPLACE_PRIMARY,
	HUMAN_RESOURCES_QUERY_REPORTING_LINE_LIST_DIRECT_REPORTS,
	HUMAN_RESOURCES_QUERY_REPORTING_LINE_RESOLVE_PRIMARY_MANAGER,
} from "../module-ids";
import { parseHumanResourcesInput } from "../parse-input";
import {
	assignPrimaryReportingLineInputSchema,
	closeReportingLineInputSchema,
	listDirectReportsInputSchema,
	replacePrimaryReportingLineInputSchema,
	resolvePrimaryManagerInputSchema,
} from "../schemas/organization";
import type { ReportingLine } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_REPORTING_LINE =
	"reporting-line" as const;
export type HumanResourcesReportingLineAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_REPORTING_LINE;

export async function assignPrimaryReportingLine(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ReportingLine>> {
	const parsed = parseHumanResourcesInput(
		assignPrimaryReportingLineInputSchema,
		input,
		"Invalid primary reporting line assign input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_REPORTING_LINE_ASSIGN_PRIMARY,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return store.assignPrimaryReportingLine(
		{
			organizationId: parsed.data.organizationId,
			employeeId: parsed.data.employeeId,
			managerEmployeeId: parsed.data.managerEmployeeId,
			startsOn: parsed.data.startsOn,
			endsOn: parsed.data.endsOn ?? null,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function closeReportingLine(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ReportingLine>> {
	const parsed = parseHumanResourcesInput(
		closeReportingLineInputSchema,
		input,
		"Invalid reporting line close input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_REPORTING_LINE_CLOSE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return store.closeReportingLine(
		{
			organizationId: parsed.data.organizationId,
			reportingLineId: parsed.data.reportingLineId,
			endsOn: parsed.data.endsOn,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function replacePrimaryReportingLine(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ReportingLine>> {
	const parsed = parseHumanResourcesInput(
		replacePrimaryReportingLineInputSchema,
		input,
		"Invalid primary reporting line replace input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_REPORTING_LINE_REPLACE_PRIMARY,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const closePriorOn = parsed.data.closePriorOn ?? parsed.data.startsOn;

	return store.replacePrimaryReportingLine(
		{
			organizationId: parsed.data.organizationId,
			employeeId: parsed.data.employeeId,
			managerEmployeeId: parsed.data.managerEmployeeId,
			startsOn: parsed.data.startsOn,
			endsOn: parsed.data.endsOn ?? null,
			closePriorOn,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function resolvePrimaryManager(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ReportingLine | null>> {
	const parsed = parseHumanResourcesInput(
		resolvePrimaryManagerInputSchema,
		input,
		"Invalid resolve primary manager input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: HUMAN_RESOURCES_QUERY_REPORTING_LINE_RESOLVE_PRIMARY_MANAGER,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const asOf = parsed.data.asOf ?? new Date().toISOString().slice(0, 10);

	return store.resolvePrimaryManager({
		organizationId: parsed.data.organizationId,
		employeeId: parsed.data.employeeId,
		asOf,
	});
}

export async function listDirectReports(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ reportingLines: ReportingLine[]; totalCount: number }>> {
	const parsed = parseHumanResourcesInput(
		listDirectReportsInputSchema,
		input,
		"Invalid list direct reports input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: HUMAN_RESOURCES_QUERY_REPORTING_LINE_LIST_DIRECT_REPORTS,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const asOf = parsed.data.asOf ?? new Date().toISOString().slice(0, 10);

	return store.listDirectReports({
		organizationId: parsed.data.organizationId,
		managerEmployeeId: parsed.data.managerEmployeeId,
		asOf,
		page: parsed.data.page ?? 1,
		pageSize: parsed.data.pageSize ?? 20,
	});
}
