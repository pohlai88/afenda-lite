import { randomUUID } from "node:crypto";

import {
	claimDuePayrollJobWork,
	createJurisdictionPayrollCurrency,
	createPayrollCapabilityOptions,
	createRegistryPayrollStatutory,
	createSystemPayrollClock,
	executePayrollJobWork,
} from "@afenda/payroll";
import { errorResult, type Result } from "@afenda/errors";

export interface PayrollJobsDrainSummary {
	claimed: number;
	failed: number;
	succeeded: number;
	timedOut: boolean;
}

export async function runPayrollJobsDrain(input: {
	batchSize: number;
	leaseDurationMs: number;
	timeBudgetMs: number;
	workerId?: string;
}): Promise<Result<PayrollJobsDrainSummary>> {
	const startedAt = Date.now();
	const workerId = input.workerId ?? `vercel-cron:${randomUUID()}`;
	const options = createPayrollCapabilityOptions({
		authorization: {
			can: async () => true,
		},
		clock: createSystemPayrollClock(),
		currency: createJurisdictionPayrollCurrency(),
		statutory: createRegistryPayrollStatutory(),
	});

	const claimed = await claimDuePayrollJobWork(
		{
			organizationId: "platform-payroll-jobs",
			actorUserId: "system:payroll-jobs",
			correlationId: workerId,
			workerId,
			limit: input.batchSize,
			leaseDurationMs: input.leaseDurationMs,
		},
		options,
	);
	if (!claimed.ok) {
		return claimed;
	}

	let succeeded = 0;
	let failed = 0;
	let timedOut = false;
	for (const workItem of claimed.data) {
		if (Date.now() - startedAt >= input.timeBudgetMs) {
			timedOut = true;
			break;
		}
		const executed = await executePayrollJobWork(
			{
				organizationId: workItem.organizationId,
				actorUserId: "system:payroll-jobs",
				correlationId: workerId,
				workItemId: workItem.id,
				workerId,
			},
			options,
		);
		if (executed.ok) {
			succeeded += 1;
		} else {
			failed += 1;
		}
	}

	return errorResult.ok({
		claimed: claimed.data.length,
		succeeded,
		failed,
		timedOut,
	});
}
