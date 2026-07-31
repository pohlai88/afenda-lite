import { errorResult, type Result } from "@afenda/errors";

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
	_input: IntegrationFailureContext &
		Readonly<{
			code: IntegrationContractFailureCode;
		}>,
): Result<never> {
	return errorResult.fail("INTERNAL_ERROR");
}

export function integrationOutboxWriteFailed(
	_input: IntegrationFailureContext,
): Result<never> {
	return errorResult.fail("INTERNAL_ERROR");
}

export function integrationTransactionFailed(
	_input: IntegrationFailureContext,
): Result<never> {
	return errorResult.fail("INTERNAL_ERROR");
}

function _buildIntegrationFailureDetails(
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
