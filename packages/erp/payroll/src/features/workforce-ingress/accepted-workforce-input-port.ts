import { errorResult, type Result } from "@afenda/errors";

import type { PayrollWorkforceInputPort } from "../../kernel/execution/ports";
import type { PayrollWorkforceIngressStore } from "./accepted-handoff.store";

function toPayload(
	result: Result<{ payload: unknown } | null>,
): Result<unknown | null> {
	if (!result.ok) {
		return result;
	}
	return errorResult.ok(result.data === null ? null : result.data.payload);
}

/**
 * Reads approved workforce facts from the accepted-handoff ledger (PRD R1):
 * runs consume sealed accepted records instead of pulling HR at calculation
 * time. Period-scoped reads fall back to the period-agnostic identity because
 * durable deliveries ingest without period bounds.
 */
export function createAcceptedWorkforceInputPort(
	store: PayrollWorkforceIngressStore,
): PayrollWorkforceInputPort {
	return {
		async getApprovedPayrollHandoff(input) {
			const identity = {
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				effectiveDate: input.effectiveDate,
			};
			const exact = await store.getAcceptedWorkforceHandoff({
				...identity,
				periodStart: input.periodStart ?? null,
				periodEnd: input.periodEnd ?? null,
			});
			if (!exact.ok || exact.data !== null) {
				return toPayload(exact);
			}
			if (input.periodStart === undefined && input.periodEnd === undefined) {
				return errorResult.ok(null);
			}
			return toPayload(
				await store.getAcceptedWorkforceHandoff({
					...identity,
					periodStart: null,
					periodEnd: null,
				}),
			);
		},
	};
}
