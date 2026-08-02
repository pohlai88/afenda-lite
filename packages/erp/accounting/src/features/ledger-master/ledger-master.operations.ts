import type { Result } from "@afenda/errors";
import type { z } from "zod";

import type {
	AccountRoleMapping,
	ChartOfAccounts,
	LedgerAccount,
} from "../../kernel/contracts/domain";
import {
	type AccountingAuthorizationPort,
	requireAccountingPermission,
} from "../../kernel/execution/authorization";
import {
	failInvalidAccountingInput,
	normalize,
} from "../../kernel/validation/parse-input";
import {
	CreateChartOfAccountsInput,
	CreateLedgerAccountInput,
	DeactivateLedgerAccountInput,
	ListLedgerAccountsInput,
	MapAccountRoleInput,
	UpdateLedgerAccountInput,
} from "./ledger-master.schema";
import type { AccountingLedgerMasterStore } from "./ledger-master.store";

export interface LedgerMasterOperationDeps {
	authorization: AccountingAuthorizationPort;
	store: AccountingLedgerMasterStore;
}

export async function createChartOfAccountsOperation(
	input: z.infer<typeof CreateChartOfAccountsInput>,
	deps: LedgerMasterOperationDeps,
): Promise<Result<ChartOfAccounts>> {
	const parsed = CreateChartOfAccountsInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.account.manage",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.createChartOfAccounts({
		organizationId: parsed.data.organizationId,
		code: parsed.data.code,
		name: parsed.data.name,
		actorUserId: parsed.data.actorUserId,
	});
}

export async function createLedgerAccountOperation(
	input: z.infer<typeof CreateLedgerAccountInput>,
	deps: LedgerMasterOperationDeps,
): Promise<Result<LedgerAccount>> {
	const parsed = CreateLedgerAccountInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.account.manage",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.createLedgerAccount({
		organizationId: parsed.data.organizationId,
		chartOfAccountId: parsed.data.chartOfAccountId,
		code: parsed.data.code,
		normalizedCode: normalize(parsed.data.code),
		name: parsed.data.name,
		accountType: parsed.data.accountType,
		normalBalance: parsed.data.normalBalance,
		isControl: parsed.data.isControl,
		actorUserId: parsed.data.actorUserId,
	});
}

export async function updateLedgerAccountOperation(
	input: z.infer<typeof UpdateLedgerAccountInput>,
	deps: LedgerMasterOperationDeps,
): Promise<Result<LedgerAccount>> {
	const parsed = UpdateLedgerAccountInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.account.manage",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.updateLedgerAccount({
		organizationId: parsed.data.organizationId,
		id: parsed.data.id,
		name: parsed.data.name,
		accountType: parsed.data.accountType,
		normalBalance: parsed.data.normalBalance,
		isControl: parsed.data.isControl,
		expectedVersion: parsed.data.expectedVersion,
		actorUserId: parsed.data.actorUserId,
	});
}

export async function deactivateLedgerAccountOperation(
	input: z.infer<typeof DeactivateLedgerAccountInput>,
	deps: LedgerMasterOperationDeps,
): Promise<Result<LedgerAccount>> {
	const parsed = DeactivateLedgerAccountInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.account.manage",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.deactivateLedgerAccount({
		organizationId: parsed.data.organizationId,
		id: parsed.data.id,
		expectedVersion: parsed.data.expectedVersion,
		actorUserId: parsed.data.actorUserId,
	});
}

export async function listLedgerAccountsOperation(
	input: z.infer<typeof ListLedgerAccountsInput>,
	deps: LedgerMasterOperationDeps,
): Promise<Result<LedgerAccount[]>> {
	const parsed = ListLedgerAccountsInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.account.read",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.listLedgerAccounts({
		organizationId: parsed.data.organizationId,
		chartOfAccountId: parsed.data.chartOfAccountId,
		status: parsed.data.status,
	});
}

export async function mapAccountRoleOperation(
	input: z.infer<typeof MapAccountRoleInput>,
	deps: LedgerMasterOperationDeps,
): Promise<Result<AccountRoleMapping>> {
	const parsed = MapAccountRoleInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.account.manage",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.mapAccountRole({
		organizationId: parsed.data.organizationId,
		accountRole: parsed.data.accountRole,
		ledgerAccountId: parsed.data.ledgerAccountId,
		actorUserId: parsed.data.actorUserId,
	});
}
