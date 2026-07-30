import { fail, ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CORRECT,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_END,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_SUPERSEDE,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_AS_OF,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_CURRENT,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_LIST,
} from "../module-ids";
import {
	correctEmploymentContractInputSchema,
	createEmploymentContractInputSchema,
	endEmploymentContractInputSchema,
	getCurrentEmploymentContractInputSchema,
	getEmploymentContractAsOfInputSchema,
	getEmploymentContractInputSchema,
	listEmploymentContractsInputSchema,
	supersedeEmploymentContractInputSchema,
} from "../schemas/core";
import { runCoreCommand, runCoreQuery } from "../shared/core-command";
import { previousIsoDate } from "../shared/effective-dates";
import {
	assertContractWithinEmployment,
	assertEmploymentContractMutable,
	assertNoEmploymentContractOverlap,
} from "../shared/employment-contract-guards";
import { assertValidDateRange } from "../shared/employment-status";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { HumanResourcesCoreStore } from "../store/core";
import type { Employment, EmploymentContract } from "../types";

interface ValidatedContractSupersession {
	endsOn: string | null;
	predecessor: EmploymentContract;
	referenceCode: string;
}

async function loadEmploymentForContract(
	store: HumanResourcesCoreStore,
	data: {
		organizationId: string;
		employmentId: EmploymentContract["employmentId"];
	},
): Promise<Result<Employment>> {
	const employment = await store.getEmploymentById({
		organizationId: data.organizationId,
		employmentId: data.employmentId,
	});
	if (!employment.ok) {
		return employment;
	}
	if (employment.data === null) {
		return fail(
			"NOT_FOUND",
			"Employment not found",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}
	return ok(employment.data);
}

async function validateActiveContractMutationRange(
	store: HumanResourcesCoreStore,
	input: {
		organizationId: string;
		contract: EmploymentContract;
		startsOn: string;
		endsOn: string | null;
	},
): Promise<Result<Employment>> {
	const mutable = assertEmploymentContractMutable({
		lineageStatus: input.contract.lineageStatus,
	});
	if (!mutable.ok) {
		return mutable;
	}

	const employment = await loadEmploymentForContract(store, {
		organizationId: input.organizationId,
		employmentId: input.contract.employmentId,
	});
	if (!employment.ok) {
		return employment;
	}

	const dateCheck = assertValidDateRange(input.startsOn, input.endsOn);
	if (!dateCheck.ok) {
		return dateCheck;
	}

	const withinEmployment = assertContractWithinEmployment({
		contractStartsOn: input.startsOn,
		contractEndsOn: input.endsOn,
		employmentStartsOn: employment.data.startsOn,
		employmentEndsOn: employment.data.endsOn,
	});
	if (!withinEmployment.ok) {
		return withinEmployment;
	}

	const siblings = await store.listActiveContractsByEmployment({
		organizationId: input.organizationId,
		employmentId: input.contract.employmentId,
	});
	if (!siblings.ok) {
		return siblings;
	}

	const overlapCheck = assertNoEmploymentContractOverlap({
		candidateContractId: input.contract.id,
		candidateStartsOn: input.startsOn,
		candidateEndsOn: input.endsOn,
		existing: siblings.data,
	});
	if (!overlapCheck.ok) {
		return overlapCheck;
	}

	return ok(employment.data);
}

function resolveEmploymentContractAsOf(
	store: HumanResourcesCoreStore,
	input: {
		organizationId: string;
		employmentId: EmploymentContract["employmentId"];
		asOf: string;
	},
): Promise<Result<EmploymentContract | null>> {
	return store.findEmploymentContractByEmploymentAsOf(input);
}

async function validateContractSupersession(
	store: HumanResourcesCoreStore,
	data: z.output<typeof supersedeEmploymentContractInputSchema>,
): Promise<Result<ValidatedContractSupersession>> {
	const predecessor = await store.getEmploymentContractById({
		organizationId: data.organizationId,
		employmentContractId: data.employmentContractId,
	});
	if (!predecessor.ok) {
		return predecessor;
	}
	if (predecessor.data === null) {
		return fail(
			"NOT_FOUND",
			"Employment contract not found",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}
	if (predecessor.data.lineageStatus !== "active") {
		return fail(
			"VALIDATION_ERROR",
			"Only active contracts can be superseded",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	const activePredecessor = predecessor.data;
	const employment = await loadEmploymentForContract(store, {
		organizationId: data.organizationId,
		employmentId: activePredecessor.employmentId,
	});
	if (!employment.ok) {
		return employment;
	}
	const endsOn = data.endsOn ?? null;
	const dateCheck = assertValidDateRange(data.startsOn, endsOn);
	if (!dateCheck.ok) {
		return dateCheck;
	}
	if (data.startsOn <= activePredecessor.startsOn) {
		return fail(
			"VALIDATION_ERROR",
			"Successor start date must be after the predecessor start date",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	const withinEmployment = assertContractWithinEmployment({
		contractStartsOn: data.startsOn,
		contractEndsOn: endsOn,
		employmentStartsOn: employment.data.startsOn,
		employmentEndsOn: employment.data.endsOn,
	});
	if (!withinEmployment.ok) {
		return withinEmployment;
	}
	const siblings = await store.listActiveContractsByEmployment({
		organizationId: data.organizationId,
		employmentId: activePredecessor.employmentId,
	});
	if (!siblings.ok) {
		return siblings;
	}
	const overlapCheck = assertNoEmploymentContractOverlap({
		candidateStartsOn: data.startsOn,
		candidateEndsOn: endsOn,
		existing: siblings.data.filter(
			(contract) => contract.id !== activePredecessor.id,
		),
	});
	if (!overlapCheck.ok) {
		return overlapCheck;
	}
	const referenceCode = data.referenceCode ?? activePredecessor.referenceCode;
	if (referenceCode !== activePredecessor.referenceCode) {
		const duplicate = await store.findContractByEmploymentAndCode({
			organizationId: data.organizationId,
			employmentId: activePredecessor.employmentId,
			referenceCode,
		});
		if (!duplicate.ok) {
			return duplicate;
		}
		if (duplicate.data !== null) {
			return fail(
				"CONFLICT",
				"Contract with this reference code already exists",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
			);
		}
	}
	return ok({ endsOn, predecessor: activePredecessor, referenceCode });
}

export function createEmploymentContract(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentContract>> {
	return runCoreCommand(input, options, {
		schema: createEmploymentContractInputSchema,
		invalidMessage: "Invalid employment contract create input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE,
		execute: async (data, { store, ports }) => {
			const employment = await loadEmploymentForContract(store, {
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

			const withinEmployment = assertContractWithinEmployment({
				contractStartsOn: data.startsOn,
				contractEndsOn: endsOn,
				employmentStartsOn: employment.data.startsOn,
				employmentEndsOn: employment.data.endsOn,
			});
			if (!withinEmployment.ok) {
				return withinEmployment;
			}

			const siblings = await store.listActiveContractsByEmployment({
				organizationId: data.organizationId,
				employmentId: data.employmentId,
			});
			if (!siblings.ok) {
				return siblings;
			}
			const overlapCheck = assertNoEmploymentContractOverlap({
				candidateStartsOn: data.startsOn,
				candidateEndsOn: endsOn,
				existing: siblings.data,
			});
			if (!overlapCheck.ok) {
				return overlapCheck;
			}

			return store.createEmploymentContract(
				{
					organizationId: data.organizationId,
					employmentId: data.employmentId,
					employeeId: employment.data.employeeId,
					referenceCode: data.referenceCode,
					startsOn: data.startsOn,
					endsOn,
					reasonCode: data.reasonCode,
					sourceReference: data.sourceReference ?? null,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE,
				}),
			);
		},
	});
}

export function correctEmploymentContract(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentContract>> {
	return runCoreCommand(input, options, {
		schema: correctEmploymentContractInputSchema,
		invalidMessage: "Invalid employment contract correct input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CORRECT,
		execute: async (data, { store, ports }) => {
			const existing = await store.getEmploymentContractById({
				organizationId: data.organizationId,
				employmentContractId: data.employmentContractId,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data === null) {
				return fail(
					"NOT_FOUND",
					"Employment contract not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			const startsOn = data.startsOn ?? existing.data.startsOn;
			const endsOn =
				data.endsOn === undefined ? existing.data.endsOn : data.endsOn;
			const referenceCode = data.referenceCode ?? existing.data.referenceCode;

			const validated = await validateActiveContractMutationRange(store, {
				organizationId: data.organizationId,
				contract: existing.data,
				startsOn,
				endsOn,
			});
			if (!validated.ok) {
				return validated;
			}

			if (referenceCode !== existing.data.referenceCode) {
				const duplicate = await store.findContractByEmploymentAndCode({
					organizationId: data.organizationId,
					employmentId: existing.data.employmentId,
					referenceCode,
				});
				if (!duplicate.ok) {
					return duplicate;
				}
				if (duplicate.data !== null) {
					return fail(
						"CONFLICT",
						"Contract with this reference code already exists",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
			}

			return store.correctEmploymentContract(
				{
					organizationId: data.organizationId,
					employmentContractId: data.employmentContractId,
					referenceCode,
					startsOn,
					endsOn,
					reasonCode: data.reasonCode,
					sourceReference: data.sourceReference,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CORRECT,
				}),
			);
		},
	});
}

export function supersedeEmploymentContract(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<
	Result<{ superseded: EmploymentContract; successor: EmploymentContract }>
> {
	return runCoreCommand(input, options, {
		schema: supersedeEmploymentContractInputSchema,
		invalidMessage: "Invalid employment contract supersede input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_SUPERSEDE,
		execute: async (data, { store, ports }) => {
			const validated = await validateContractSupersession(store, data);
			if (!validated.ok) {
				return validated;
			}

			return store.supersedeEmploymentContract(
				{
					organizationId: data.organizationId,
					employmentContractId: data.employmentContractId,
					referenceCode: validated.data.referenceCode,
					startsOn: data.startsOn,
					endsOn: validated.data.endsOn,
					reasonCode: data.reasonCode,
					sourceReference: data.sourceReference,
					predecessorEffectiveTo: previousIsoDate(data.startsOn),
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_SUPERSEDE,
				}),
			);
		},
	});
}

export function endEmploymentContract(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentContract>> {
	return runCoreCommand(input, options, {
		schema: endEmploymentContractInputSchema,
		invalidMessage: "Invalid employment contract end input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_END,
		execute: async (data, { store, ports }) => {
			const existing = await store.getEmploymentContractById({
				organizationId: data.organizationId,
				employmentContractId: data.employmentContractId,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data === null) {
				return fail(
					"NOT_FOUND",
					"Employment contract not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			const validated = await validateActiveContractMutationRange(store, {
				organizationId: data.organizationId,
				contract: existing.data,
				startsOn: existing.data.startsOn,
				endsOn: data.endsOn,
			});
			if (!validated.ok) {
				return validated;
			}

			return store.correctEmploymentContract(
				{
					organizationId: data.organizationId,
					employmentContractId: data.employmentContractId,
					referenceCode: existing.data.referenceCode,
					startsOn: existing.data.startsOn,
					endsOn: data.endsOn,
					reasonCode: data.reasonCode,
					sourceReference: data.sourceReference,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_END,
				}),
			);
		},
	});
}

export function getEmploymentContract(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentContract>> {
	return runCoreQuery(input, options, {
		schema: getEmploymentContractInputSchema,
		invalidMessage: "Invalid employment contract get input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_GET,
		execute: async (data, { store }) => {
			const contract = await store.getEmploymentContractById({
				organizationId: data.organizationId,
				employmentContractId: data.employmentContractId,
			});
			if (!contract.ok) {
				return contract;
			}
			if (contract.data === null) {
				return fail(
					"NOT_FOUND",
					"Employment contract not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			return ok(contract.data);
		},
	});
}

export function getEmploymentContractAsOf(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentContract | null>> {
	return runCoreQuery(input, options, {
		schema: getEmploymentContractAsOfInputSchema,
		invalidMessage: "Invalid employment contract as-of input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_AS_OF,
		execute: async (data, { store }) =>
			resolveEmploymentContractAsOf(store, {
				organizationId: data.organizationId,
				employmentId: data.employmentId,
				asOf: data.asOf,
			}),
	});
}

export function getCurrentEmploymentContract(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentContract | null>> {
	return runCoreQuery(input, options, {
		schema: getCurrentEmploymentContractInputSchema,
		invalidMessage: "Invalid employment contract current input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_CURRENT,
		execute: async (data, { store }) =>
			resolveEmploymentContractAsOf(store, {
				organizationId: data.organizationId,
				employmentId: data.employmentId,
				asOf: data.asOf,
			}),
	});
}

export function listEmploymentContracts(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentContract[]>> {
	return runCoreQuery(input, options, {
		schema: listEmploymentContractsInputSchema,
		invalidMessage: "Invalid employment contract list input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_LIST,
		execute: async (data, { store }) =>
			store.listEmploymentContractsByEmployment({
				organizationId: data.organizationId,
				employmentId: data.employmentId,
			}),
	});
}
