import type { Result } from "@afenda/errors";
import type { z } from "zod";

import type { AccountingPeriod } from "../../kernel/contracts/domain";
import {
	type AccountingAuthorizationPort,
	requireAccountingPermission,
} from "../../kernel/execution/authorization";
import {
	failInvalidAccountingInput,
	normalize,
} from "../../kernel/validation/parse-input";
import {
	CloseAccountingPeriodInput,
	OpenAccountingPeriodInput,
	ReopenAccountingPeriodInput,
	SoftCloseAccountingPeriodInput,
} from "./periods.schema";
import type { AccountingPeriodsStore } from "./periods.store";

export interface PeriodsOperationDeps {
	authorization: AccountingAuthorizationPort;
	store: AccountingPeriodsStore;
}

export async function openAccountingPeriodOperation(
	input: z.infer<typeof OpenAccountingPeriodInput>,
	deps: PeriodsOperationDeps,
): Promise<Result<AccountingPeriod>> {
	const parsed = OpenAccountingPeriodInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.period.open",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.openPeriod({
		organizationId: parsed.data.organizationId,
		code: parsed.data.code,
		normalizedCode: normalize(parsed.data.code),
		startDate: parsed.data.startDate,
		endDate: parsed.data.endDate,
		actorUserId: parsed.data.actorUserId,
	});
}

export async function softCloseAccountingPeriodOperation(
	input: z.infer<typeof SoftCloseAccountingPeriodInput>,
	deps: PeriodsOperationDeps,
): Promise<Result<AccountingPeriod>> {
	const parsed = SoftCloseAccountingPeriodInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.period.soft_close",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.softClosePeriod({
		organizationId: parsed.data.organizationId,
		periodId: parsed.data.periodId,
		expectedVersion: parsed.data.expectedVersion,
		actorUserId: parsed.data.actorUserId,
	});
}

export async function closeAccountingPeriodOperation(
	input: z.infer<typeof CloseAccountingPeriodInput>,
	deps: PeriodsOperationDeps,
): Promise<Result<AccountingPeriod>> {
	const parsed = CloseAccountingPeriodInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.period.close",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.closePeriod({
		organizationId: parsed.data.organizationId,
		periodId: parsed.data.periodId,
		expectedVersion: parsed.data.expectedVersion,
		closeReason: parsed.data.closeReason,
		actorUserId: parsed.data.actorUserId,
	});
}

export async function reopenAccountingPeriodOperation(
	input: z.infer<typeof ReopenAccountingPeriodInput>,
	deps: PeriodsOperationDeps,
): Promise<Result<AccountingPeriod>> {
	const parsed = ReopenAccountingPeriodInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.period.reopen",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.reopenPeriod({
		organizationId: parsed.data.organizationId,
		periodId: parsed.data.periodId,
		expectedVersion: parsed.data.expectedVersion,
		reason: parsed.data.reason,
		actorUserId: parsed.data.actorUserId,
	});
}
