import type { Result } from "@afenda/errors";

import type {
	AccountRoleMapping,
	AccountType,
	ChartOfAccounts,
	LedgerAccount,
	NormalBalance,
} from "../../kernel/contracts/domain";

export interface AccountingLedgerMasterStore {
	createChartOfAccounts: (record: {
		organizationId: string;
		code: string;
		name: string;
		actorUserId: string;
	}) => Promise<Result<ChartOfAccounts>>;
	createLedgerAccount: (record: {
		organizationId: string;
		chartOfAccountId: string;
		code: string;
		normalizedCode: string;
		name: string;
		accountType: AccountType;
		normalBalance: NormalBalance;
		isControl: boolean;
		actorUserId: string;
	}) => Promise<Result<LedgerAccount>>;
	deactivateLedgerAccount: (record: {
		organizationId: string;
		id: string;
		expectedVersion: number;
		actorUserId: string;
	}) => Promise<Result<LedgerAccount>>;
	listLedgerAccounts: (filter: {
		organizationId: string;
		chartOfAccountId?: string | undefined;
		status?: "active" | "inactive" | undefined;
	}) => Promise<Result<LedgerAccount[]>>;
	mapAccountRole: (record: {
		organizationId: string;
		accountRole: string;
		ledgerAccountId: string;
		actorUserId: string;
	}) => Promise<Result<AccountRoleMapping>>;
	resolveAccountRole: (
		organizationId: string,
		accountRole: string,
	) => Promise<Result<AccountRoleMapping | null>>;
	resolveLedgerAccountByCode: (
		organizationId: string,
		normalizedCode: string,
	) => Promise<Result<LedgerAccount | null>>;
	updateLedgerAccount: (record: {
		organizationId: string;
		id: string;
		name: string;
		accountType: AccountType;
		normalBalance: NormalBalance;
		isControl: boolean;
		expectedVersion: number;
		actorUserId: string;
	}) => Promise<Result<LedgerAccount>>;
}
