import { fail, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "../../../contracts/reasons";
import type { MasterMutationOperationId } from "./mutation-transaction";

export const INTEGRATION_PROJECTION_FAILURE_CODES = [
	"MASTER_DATA_AUDIT_FACT_INVALID",
	"MASTER_DATA_EVENT_CONTRACT_INVALID",
	"MASTER_DATA_OUTBOX_WRITE_FAILED",
	"MASTER_DATA_TRANSACTION_FAILED",
] as const;

export type IntegrationProjectionFailureCode =
	(typeof INTEGRATION_PROJECTION_FAILURE_CODES)[number];

export type IntegrationProjectionFailureDetails = MasterFailureDetails &
	Readonly<{
		integrationCode: IntegrationProjectionFailureCode;
		operationId: MasterMutationOperationId;
		entityId?: string;
		eventId?: string;
	}>;

type IntegrationFailureContext = Readonly<{
	operationId: MasterMutationOperationId;
	entityId?: string;
	eventId?: string;
}>;

type IntegrationContractFailureCode = Extract<
	IntegrationProjectionFailureCode,
	"MASTER_DATA_AUDIT_FACT_INVALID" | "MASTER_DATA_EVENT_CONTRACT_INVALID"
>;

export function integrationProjectionInvalid(
	input: IntegrationFailureContext &
		Readonly<{
			code: IntegrationContractFailureCode;
		}>,
): Result<never> {
	return fail(
		"INTERNAL_ERROR",
		"Master-data integration contract is invalid",
		buildIntegrationFailureDetails({
			...input,
			integrationCode: input.code,
		}),
	);
}

export function integrationOutboxWriteFailed(
	input: IntegrationFailureContext,
): Result<never> {
	return fail(
		"INTERNAL_ERROR",
		"Master-data outbox write failed",
		buildIntegrationFailureDetails({
			...input,
			integrationCode: "MASTER_DATA_OUTBOX_WRITE_FAILED",
		}),
	);
}

export function integrationTransactionFailed(
	input: IntegrationFailureContext,
): Result<never> {
	return fail(
		"INTERNAL_ERROR",
		"Master-data mutation transaction failed",
		buildIntegrationFailureDetails({
			...input,
			integrationCode: "MASTER_DATA_TRANSACTION_FAILED",
		}),
	);
}

function buildIntegrationFailureDetails(
	input: IntegrationFailureContext &
		Readonly<{
			integrationCode: IntegrationProjectionFailureCode;
		}>,
): IntegrationProjectionFailureDetails {
	return {
		reason: "MASTER_DEPENDENCY_UNAVAILABLE",
		integrationCode: input.integrationCode,
		operationId: input.operationId,
		...(input.entityId === undefined ? {} : { entityId: input.entityId }),
		...(input.eventId === undefined ? {} : { eventId: input.eventId }),
	};
}
