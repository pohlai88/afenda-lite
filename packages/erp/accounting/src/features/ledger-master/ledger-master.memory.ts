import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type {
	AccountRoleMapping,
	ChartOfAccounts,
	LedgerAccount,
} from "../../kernel/contracts/domain";
import { resolveOperation } from "../../kernel/execution/async";
import type { MemoryAccountingState } from "../../kernel/memory/state";
import type { AccountingLedgerMasterStore } from "./ledger-master.store";

export function createMemoryLedgerMasterMethods(
	state: MemoryAccountingState,
): AccountingLedgerMasterStore {
	return {
		createChartOfAccounts(record): Promise<Result<ChartOfAccounts>> {
			return resolveOperation(() => {
				const existing = state.chartOfAccounts.find(
					(c) =>
						c.organizationId === record.organizationId &&
						c.code.toUpperCase() === record.code.toUpperCase(),
				);
				if (existing) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Chart of accounts code already exists",
					});
				}
				const now = new Date();
				const coa: ChartOfAccounts = {
					id: randomUUID(),
					organizationId: record.organizationId,
					code: record.code,
					name: record.name,
					status: "active",
					version: 1,
					createdBy: record.actorUserId,
					updatedBy: record.actorUserId,
					createdAt: now,
					updatedAt: now,
				};
				state.chartOfAccounts.push(coa);
				return errorResult.ok(coa);
			});
		},

		createLedgerAccount(record): Promise<Result<LedgerAccount>> {
			return resolveOperation(() => {
				const existing = state.ledgerAccounts.find(
					(a) =>
						a.organizationId === record.organizationId &&
						a.normalizedCode === record.normalizedCode,
				);
				if (existing) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Ledger account code already exists",
					});
				}
				const now = new Date();
				const account: LedgerAccount = {
					id: randomUUID(),
					organizationId: record.organizationId,
					chartOfAccountId: record.chartOfAccountId,
					code: record.code,
					normalizedCode: record.normalizedCode,
					name: record.name,
					accountType: record.accountType,
					normalBalance: record.normalBalance,
					isControl: record.isControl,
					status: "active",
					version: 1,
					createdBy: record.actorUserId,
					updatedBy: record.actorUserId,
					createdAt: now,
					updatedAt: now,
				};
				state.ledgerAccounts.push(account);
				return errorResult.ok(account);
			});
		},

		updateLedgerAccount(record): Promise<Result<LedgerAccount>> {
			return resolveOperation(() => {
				const account = state.ledgerAccounts.find(
					(a) =>
						a.organizationId === record.organizationId && a.id === record.id,
				);
				if (!account) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "Ledger account not found",
					});
				}
				if (account.version !== record.expectedVersion) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Version mismatch",
					});
				}
				account.name = record.name;
				account.accountType = record.accountType;
				account.normalBalance = record.normalBalance;
				account.isControl = record.isControl;
				account.updatedBy = record.actorUserId;
				account.updatedAt = new Date();
				account.version += 1;
				return errorResult.ok(account);
			});
		},

		deactivateLedgerAccount(record): Promise<Result<LedgerAccount>> {
			return resolveOperation(() => {
				const account = state.ledgerAccounts.find(
					(a) =>
						a.organizationId === record.organizationId && a.id === record.id,
				);
				if (!account) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "Ledger account not found",
					});
				}
				if (account.version !== record.expectedVersion) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Version mismatch",
					});
				}
				if (account.status === "inactive") {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Ledger account is already inactive",
					});
				}
				account.status = "inactive";
				account.updatedBy = record.actorUserId;
				account.updatedAt = new Date();
				account.version += 1;
				return errorResult.ok(account);
			});
		},

		listLedgerAccounts(filter): Promise<Result<LedgerAccount[]>> {
			return resolveOperation(() => {
				let filtered = state.ledgerAccounts.filter(
					(a) => a.organizationId === filter.organizationId,
				);
				if (filter.chartOfAccountId) {
					filtered = filtered.filter(
						(a) => a.chartOfAccountId === filter.chartOfAccountId,
					);
				}
				if (filter.status) {
					filtered = filtered.filter((a) => a.status === filter.status);
				}
				return errorResult.ok(filtered);
			});
		},

		resolveLedgerAccountByCode(
			organizationId,
			normalizedCode,
		): Promise<Result<LedgerAccount | null>> {
			return resolveOperation(() => {
				const account = state.ledgerAccounts.find(
					(a) =>
						a.organizationId === organizationId &&
						a.normalizedCode === normalizedCode,
				);
				return errorResult.ok(account ?? null);
			});
		},

		mapAccountRole(record): Promise<Result<AccountRoleMapping>> {
			return resolveOperation(() => {
				const existing = state.accountRoleMappings.find(
					(m) =>
						m.organizationId === record.organizationId &&
						m.accountRole === record.accountRole,
				);
				const now = new Date();
				if (existing) {
					existing.ledgerAccountId = record.ledgerAccountId;
					existing.updatedBy = record.actorUserId;
					existing.updatedAt = now;
					existing.version += 1;
					return errorResult.ok(existing);
				}
				const mapping: AccountRoleMapping = {
					id: randomUUID(),
					organizationId: record.organizationId,
					accountRole: record.accountRole,
					ledgerAccountId: record.ledgerAccountId,
					version: 1,
					createdBy: record.actorUserId,
					updatedBy: record.actorUserId,
					createdAt: now,
					updatedAt: now,
				};
				state.accountRoleMappings.push(mapping);
				return errorResult.ok(mapping);
			});
		},

		resolveAccountRole(
			organizationId,
			accountRole,
		): Promise<Result<AccountRoleMapping | null>> {
			return resolveOperation(() => {
				const mapping = state.accountRoleMappings.find(
					(m) =>
						m.organizationId === organizationId &&
						m.accountRole === accountRole,
				);
				return errorResult.ok(mapping ?? null);
			});
		},
	};
}
