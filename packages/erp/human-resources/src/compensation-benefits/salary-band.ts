import type { Result } from "@afenda/errors";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_SALARY_BAND_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_SALARY_BAND_CREATE,
	HUMAN_RESOURCES_COMMAND_SALARY_BAND_SUPERSEDE,
	HUMAN_RESOURCES_QUERY_SALARY_BAND_FIND_AS_OF,
	HUMAN_RESOURCES_QUERY_SALARY_BAND_GET,
	HUMAN_RESOURCES_QUERY_SALARY_BAND_LIST_BY_GRADE,
} from "../module-ids";
import {
	archiveSalaryBandInputSchema,
	createSalaryBandInputSchema,
	findSalaryBandByGradeAndCurrencyAsOfInputSchema,
	getSalaryBandInputSchema,
	listSalaryBandsByGradeInputSchema,
	supersedeSalaryBandInputSchema,
} from "../schemas/compensation";
import {
	assertCurrencyExists,
	runCompensationCommand,
	runCompensationQuery,
} from "../shared/compensation-command";
import { notFound } from "../shared/domain-guards";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { SalaryBand, SalaryBandListPage } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_SALARY_BAND = "salary_band" as const;
export type HumanResourcesSalaryBandAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_SALARY_BAND;

export function createSalaryBand(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<SalaryBand>> {
	return runCompensationCommand(input, options, {
		schema: createSalaryBandInputSchema,
		invalidMessage: "Invalid salary band create input",
		command: HUMAN_RESOURCES_COMMAND_SALARY_BAND_CREATE,
		execute: async (data, { store, ports, currency }) => {
			const currencyCheck = await assertCurrencyExists(
				currency,
				data.currencyCode,
			);
			if (!currencyCheck.ok) {
				return currencyCheck;
			}
			return store.createSalaryBand(
				{
					organizationId: data.organizationId,
					gradeId: data.gradeId,
					currencyCode: data.currencyCode,
					minAmount: data.minAmount,
					midAmount: data.midAmount,
					maxAmount: data.maxAmount,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_SALARY_BAND_CREATE,
				}),
			);
		},
	});
}

export function supersedeSalaryBand(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<SalaryBand>> {
	return runCompensationCommand(input, options, {
		schema: supersedeSalaryBandInputSchema,
		invalidMessage: "Invalid salary band supersede input",
		command: HUMAN_RESOURCES_COMMAND_SALARY_BAND_SUPERSEDE,
		execute: async (data, { store, ports, currency }) => {
			const currencyCheck = await assertCurrencyExists(
				currency,
				data.currencyCode,
			);
			if (!currencyCheck.ok) {
				return currencyCheck;
			}
			const superseded = await store.supersedeSalaryBand(
				{
					organizationId: data.organizationId,
					gradeId: data.gradeId,
					currencyCode: data.currencyCode,
					minAmount: data.minAmount,
					midAmount: data.midAmount,
					maxAmount: data.maxAmount,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					supersededSalaryBandId: data.supersededSalaryBandId,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_SALARY_BAND_SUPERSEDE,
				}),
			);
			if (!superseded.ok) {
				return superseded;
			}
			return { ok: true, data: superseded.data.successor };
		},
	});
}

export function archiveSalaryBand(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<SalaryBand>> {
	return runCompensationCommand(input, options, {
		schema: archiveSalaryBandInputSchema,
		invalidMessage: "Invalid salary band archive input",
		command: HUMAN_RESOURCES_COMMAND_SALARY_BAND_ARCHIVE,
		execute: (data, { store, ports }) =>
			store.archiveSalaryBand(
				{
					organizationId: data.organizationId,
					salaryBandId: data.salaryBandId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_SALARY_BAND_ARCHIVE,
				}),
			),
	});
}

export function getSalaryBand(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<SalaryBand>> {
	return runCompensationQuery<typeof getSalaryBandInputSchema, SalaryBand>(
		input,
		options,
		{
			schema: getSalaryBandInputSchema,
			invalidMessage: "Invalid salary band get input",
			query: HUMAN_RESOURCES_QUERY_SALARY_BAND_GET,
			execute: async (data, { store }) => {
				const band = await store.getSalaryBand({
					organizationId: data.organizationId,
					salaryBandId: data.salaryBandId,
				});
				if (!band.ok) {
					return band;
				}
				if (band.data === null) {
					return notFound("Salary band not found");
				}
				return { ok: true, data: band.data };
			},
		},
	);
}

export function listSalaryBandsByGrade(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<SalaryBandListPage>> {
	return runCompensationQuery<
		typeof listSalaryBandsByGradeInputSchema,
		SalaryBandListPage
	>(input, options, {
		schema: listSalaryBandsByGradeInputSchema,
		invalidMessage: "Invalid salary band list input",
		query: HUMAN_RESOURCES_QUERY_SALARY_BAND_LIST_BY_GRADE,
		execute: (data, { store }) =>
			store.listSalaryBandsByGrade({
				organizationId: data.organizationId,
				gradeId: data.gradeId,
				page: data.page,
				pageSize: data.pageSize,
				status: data.status,
			}),
	});
}

export function findSalaryBandByGradeAndCurrencyAsOf(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<SalaryBand>> {
	return runCompensationQuery<
		typeof findSalaryBandByGradeAndCurrencyAsOfInputSchema,
		SalaryBand
	>(input, options, {
		schema: findSalaryBandByGradeAndCurrencyAsOfInputSchema,
		invalidMessage: "Invalid salary band as-of input",
		query: HUMAN_RESOURCES_QUERY_SALARY_BAND_FIND_AS_OF,
		execute: async (data, { store }) => {
			const band = await store.findSalaryBandByGradeAndCurrencyAsOf({
				organizationId: data.organizationId,
				gradeId: data.gradeId,
				currencyCode: data.currencyCode,
				asOf: data.asOf,
			});
			if (!band.ok) {
				return band;
			}
			if (band.data === null) {
				return notFound("Salary band not found for as-of date");
			}
			return { ok: true, data: band.data };
		},
	});
}
