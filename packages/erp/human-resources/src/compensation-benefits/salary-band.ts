import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_SALARY_BAND_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_SALARY_BAND_CREATE,
	HUMAN_RESOURCES_COMMAND_SALARY_BAND_SUPERSEDE,
} from "../module-ids";
import {
	archiveSalaryBandInputSchema,
	createSalaryBandInputSchema,
	supersedeSalaryBandInputSchema,
} from "../schemas/compensation";
import {
	assertCurrencyExists,
	runCompensationCommand,
} from "../shared/compensation-command";
import type { SalaryBand } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_SALARY_BAND = "salary_band" as const;
export type HumanResourcesSalaryBandAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_SALARY_BAND;

export async function createSalaryBand(
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
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function supersedeSalaryBand(
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
			return store.supersedeSalaryBand(
				{
					organizationId: data.organizationId,
					gradeId: data.gradeId,
					currencyCode: data.currencyCode,
					minAmount: data.minAmount,
					midAmount: data.midAmount,
					maxAmount: data.maxAmount,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function archiveSalaryBand(
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
				{ correlationId: data.correlationId },
			),
	});
}
