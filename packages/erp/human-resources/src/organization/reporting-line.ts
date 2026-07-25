import type { Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_REPORTING_LINE_ASSIGN_PRIMARY,
	HUMAN_RESOURCES_COMMAND_REPORTING_LINE_CLOSE,
	HUMAN_RESOURCES_COMMAND_REPORTING_LINE_REPLACE_PRIMARY,
	HUMAN_RESOURCES_QUERY_REPORTING_LINE_LIST_DIRECT_REPORTS,
	HUMAN_RESOURCES_QUERY_REPORTING_LINE_RESOLVE_PRIMARY_MANAGER,
} from "../module-ids";
import {
	assignPrimaryReportingLineInputSchema,
	closeReportingLineInputSchema,
	listDirectReportsInputSchema,
	replacePrimaryReportingLineInputSchema,
	resolvePrimaryManagerInputSchema,
} from "../schemas/organization";
import { buildMutationMeta } from "../shared/mutation-meta";
import {
	runOrganizationCommand,
	runOrganizationQuery,
} from "../shared/organization-command";
import type { ReportingLine } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_REPORTING_LINE =
	"reporting-line" as const;
export type HumanResourcesReportingLineAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_REPORTING_LINE;

export async function assignPrimaryReportingLine(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ReportingLine>> {
	return runOrganizationCommand(input, options, {
		schema: assignPrimaryReportingLineInputSchema,
		invalidMessage: "Invalid primary reporting line assign input",
		command: HUMAN_RESOURCES_COMMAND_REPORTING_LINE_ASSIGN_PRIMARY,
		execute: async (data, { store, ports }) =>
			store.assignPrimaryReportingLine(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					managerEmployeeId: data.managerEmployeeId,
					startsOn: data.startsOn,
					endsOn: data.endsOn ?? null,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_REPORTING_LINE_ASSIGN_PRIMARY,
				}),
			),
	});
}

export async function closeReportingLine(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ReportingLine>> {
	return runOrganizationCommand(input, options, {
		schema: closeReportingLineInputSchema,
		invalidMessage: "Invalid reporting line close input",
		command: HUMAN_RESOURCES_COMMAND_REPORTING_LINE_CLOSE,
		execute: async (data, { store, ports }) =>
			store.closeReportingLine(
				{
					organizationId: data.organizationId,
					reportingLineId: data.reportingLineId,
					endsOn: data.endsOn,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_REPORTING_LINE_CLOSE,
				}),
			),
	});
}

export async function replacePrimaryReportingLine(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ReportingLine>> {
	return runOrganizationCommand(input, options, {
		schema: replacePrimaryReportingLineInputSchema,
		invalidMessage: "Invalid primary reporting line replace input",
		command: HUMAN_RESOURCES_COMMAND_REPORTING_LINE_REPLACE_PRIMARY,
		execute: async (data, { store, ports }) => {
			const closePriorOn = data.closePriorOn ?? data.startsOn;
			return store.replacePrimaryReportingLine(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					managerEmployeeId: data.managerEmployeeId,
					startsOn: data.startsOn,
					endsOn: data.endsOn ?? null,
					closePriorOn,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_REPORTING_LINE_REPLACE_PRIMARY,
				}),
			);
		},
	});
}

export async function resolvePrimaryManager(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ReportingLine | null>> {
	return runOrganizationQuery(input, options, {
		schema: resolvePrimaryManagerInputSchema,
		invalidMessage: "Invalid resolve primary manager input",
		query: HUMAN_RESOURCES_QUERY_REPORTING_LINE_RESOLVE_PRIMARY_MANAGER,
		execute: async (data, { store }) => {
			const asOf = data.asOf ?? new Date().toISOString().slice(0, 10);
			return store.resolvePrimaryManager({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				asOf,
			});
		},
	});
}

export async function listDirectReports(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ reportingLines: ReportingLine[]; totalCount: number }>> {
	return runOrganizationQuery(input, options, {
		schema: listDirectReportsInputSchema,
		invalidMessage: "Invalid list direct reports input",
		query: HUMAN_RESOURCES_QUERY_REPORTING_LINE_LIST_DIRECT_REPORTS,
		execute: async (data, { store }) => {
			const asOf = data.asOf ?? new Date().toISOString().slice(0, 10);
			return store.listDirectReports({
				organizationId: data.organizationId,
				managerEmployeeId: data.managerEmployeeId,
				asOf,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
			});
		},
	});
}
