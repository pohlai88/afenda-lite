import { randomUUID } from "node:crypto";

import { database as afendaDatabase } from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import type {
	AccountRoleMapping,
	AccountType,
	ChartOfAccounts,
	LedgerAccount,
	NormalBalance,
} from "../../kernel/contracts/domain";
import type { AccountingLedgerMasterStore } from "./ledger-master.store";

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

function accountType(value: string): AccountType {
	switch (value) {
		case "asset":
		case "liability":
		case "equity":
		case "revenue":
		case "expense":
			return value;
		default:
			throw new Error(`Invalid ledger_account.account_type: ${value}`);
	}
}

function normalBalance(value: string): NormalBalance {
	switch (value) {
		case "debit":
		case "credit":
			return value;
		default:
			throw new Error(`Invalid ledger_account.normal_balance: ${value}`);
	}
}

interface LedgerAccountSqlRow {
	account_type: string;
	chart_of_account_id: string;
	code: string;
	created_at: Date;
	created_by: string;
	id: string;
	is_control: boolean;
	name: string;
	normal_balance: string;
	normalized_code: string;
	organization_id: string;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface AccountRoleMappingSqlRow {
	account_role: string;
	created_at: Date;
	created_by: string;
	id: string;
	ledger_account_id: string;
	organization_id: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

function mapLedgerAccountSql(row: LedgerAccountSqlRow): LedgerAccount {
	const status = row.status === "inactive" ? "inactive" : "active";
	return {
		id: row.id,
		organizationId: row.organization_id,
		chartOfAccountId: row.chart_of_account_id,
		code: row.code,
		normalizedCode: row.normalized_code,
		name: row.name,
		accountType: accountType(row.account_type),
		normalBalance: normalBalance(row.normal_balance),
		isControl: row.is_control,
		status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapAccountRoleSql(row: AccountRoleMappingSqlRow): AccountRoleMapping {
	return {
		id: row.id,
		organizationId: row.organization_id,
		accountRole: row.account_role,
		ledgerAccountId: row.ledger_account_id,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

export const drizzleLedgerMasterMethods: AccountingLedgerMasterStore = {
	async createChartOfAccounts(
		record: Parameters<AccountingLedgerMasterStore["createChartOfAccounts"]>[0],
	): Promise<Result<ChartOfAccounts>> {
		const id = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					INSERT INTO chart_of_account (id, organization_id, code, name, status, version, created_by, updated_by)
					VALUES (${id}, ${record.organizationId}, ${record.code}, ${record.name}, 'active', 1, ${record.actorUserId}, ${record.actorUserId})
					ON CONFLICT (organization_id, code) DO NOTHING
					RETURNING id
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Chart of accounts code already exists",
				});
			}
			return errorResult.ok({
				id,
				organizationId: record.organizationId,
				code: record.code,
				name: record.name,
				status: "active" as const,
				version: 1,
				createdBy: record.actorUserId,
				updatedBy: record.actorUserId,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		} catch (error) {
			return failFromPersistence(error, "Failed to create chart of accounts");
		}
	},

	async createLedgerAccount(
		record: Parameters<AccountingLedgerMasterStore["createLedgerAccount"]>[0],
	): Promise<Result<LedgerAccount>> {
		const id = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					INSERT INTO ledger_account (
						id, organization_id, chart_of_account_id, code, normalized_code,
						name, account_type, normal_balance, is_control, status, version,
						created_by, updated_by
					) VALUES (
						${id}, ${record.organizationId}, ${record.chartOfAccountId},
						${record.code}, ${record.normalizedCode}, ${record.name},
						${record.accountType}, ${record.normalBalance}, ${record.isControl},
						'active', 1, ${record.actorUserId}, ${record.actorUserId}
					) RETURNING id
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Ledger account code already exists",
				});
			}
			const now = new Date();
			return errorResult.ok({
				id,
				organizationId: record.organizationId,
				chartOfAccountId: record.chartOfAccountId,
				code: record.code,
				normalizedCode: record.normalizedCode,
				name: record.name,
				accountType: record.accountType,
				normalBalance: record.normalBalance,
				isControl: record.isControl,
				status: "active" as const,
				version: 1,
				createdBy: record.actorUserId,
				updatedBy: record.actorUserId,
				createdAt: now,
				updatedAt: now,
			});
		} catch (error) {
			return failFromPersistence(error, "Failed to create ledger account");
		}
	},

	async updateLedgerAccount(
		record: Parameters<AccountingLedgerMasterStore["updateLedgerAccount"]>[0],
	): Promise<Result<LedgerAccount>> {
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					UPDATE ledger_account
					SET name = ${record.name}, account_type = ${record.accountType},
						normal_balance = ${record.normalBalance}, is_control = ${record.isControl},
						version = version + 1, updated_by = ${record.actorUserId}, updated_at = now()
					WHERE id = ${record.id} AND organization_id = ${record.organizationId}
						AND version = ${record.expectedVersion}
					RETURNING *
				`,
			]);
			const [row] = rows;
			if (row === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Version mismatch",
				});
			}
			return errorResult.ok(mapLedgerAccountSql(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to update ledger account");
		}
	},

	async deactivateLedgerAccount(
		record: Parameters<
			AccountingLedgerMasterStore["deactivateLedgerAccount"]
		>[0],
	): Promise<Result<LedgerAccount>> {
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					UPDATE ledger_account
					SET status = 'inactive', version = version + 1,
						updated_by = ${record.actorUserId}, updated_at = now()
					WHERE id = ${record.id} AND organization_id = ${record.organizationId}
						AND status = 'active' AND version = ${record.expectedVersion}
					RETURNING *
				`,
			]);
			const [row] = rows;
			if (row === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Deactivation conflict",
				});
			}
			return errorResult.ok(mapLedgerAccountSql(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to deactivate ledger account");
		}
	},

	async listLedgerAccounts(
		filter: Parameters<AccountingLedgerMasterStore["listLedgerAccounts"]>[0],
	): Promise<Result<LedgerAccount[]>> {
		try {
			const [rows] = await afendaDatabase.transaction(
				(sql) => [
					sql`
					SELECT * FROM ledger_account
					WHERE organization_id = ${filter.organizationId}
						AND (${filter.chartOfAccountId ?? null}::uuid IS NULL
							OR chart_of_account_id = ${filter.chartOfAccountId ?? null}::uuid)
						AND (${filter.status ?? null}::text IS NULL
							OR status = ${filter.status ?? null}::text)
					ORDER BY code
				`,
				],
				{ readOnly: true },
			);
			return errorResult.ok(rows.map(mapLedgerAccountSql));
		} catch (error) {
			return failFromPersistence(error, "Failed to list ledger accounts");
		}
	},

	async resolveLedgerAccountByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<LedgerAccount | null>> {
		try {
			const [rows] = await afendaDatabase.transaction(
				(sql) => [
					sql`
					SELECT * FROM ledger_account
					WHERE organization_id = ${organizationId}
						AND normalized_code = ${normalizedCode}
					LIMIT 1
				`,
				],
				{ readOnly: true },
			);
			const [row] = rows;
			return errorResult.ok(
				row === undefined ? null : mapLedgerAccountSql(row),
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to resolve ledger account");
		}
	},

	async mapAccountRole(
		record: Parameters<AccountingLedgerMasterStore["mapAccountRole"]>[0],
	): Promise<Result<AccountRoleMapping>> {
		const id = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					INSERT INTO account_role_mapping (id, organization_id, account_role, ledger_account_id, version, created_by, updated_by)
					VALUES (${id}, ${record.organizationId}, ${record.accountRole}, ${record.ledgerAccountId}, 1, ${record.actorUserId}, ${record.actorUserId})
					ON CONFLICT (organization_id, account_role) DO UPDATE
					SET ledger_account_id = EXCLUDED.ledger_account_id, version = account_role_mapping.version + 1,
						updated_by = EXCLUDED.updated_by, updated_at = now()
					RETURNING *
				`,
			]);
			const [row] = rows;
			if (row === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok(mapAccountRoleSql(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to map account role");
		}
	},

	async resolveAccountRole(
		organizationId: string,
		accountRole: string,
	): Promise<Result<AccountRoleMapping | null>> {
		try {
			const [rows] = await afendaDatabase.transaction(
				(sql) => [
					sql`
					SELECT * FROM account_role_mapping
					WHERE organization_id = ${organizationId} AND account_role = ${accountRole}
					LIMIT 1
				`,
				],
				{ readOnly: true },
			);
			const [row] = rows;
			return errorResult.ok(row === undefined ? null : mapAccountRoleSql(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to resolve account role");
		}
	},
};
