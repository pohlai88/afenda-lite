import { randomUUID } from "node:crypto";

import {
	accountingPeriod,
	database as afendaDatabase,
	and,
	eq,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import type {
	AccountingPeriod,
	AccountingPeriodStatus,
} from "../../kernel/contracts/domain";
import type { AccountingPeriodsStore } from "./periods.store";

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

function periodStatus(value: string): AccountingPeriodStatus {
	if (value === "open" || value === "soft_closed" || value === "closed") {
		return value;
	}
	throw new Error(`Invalid accounting_period.status: ${value}`);
}

export function mapPeriod(
	row: typeof accountingPeriod.$inferSelect,
): AccountingPeriod {
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.code.trim().toUpperCase(),
		startDate: row.startsOn,
		endDate: row.endsOn,
		status: periodStatus(row.status),
		softClosed: row.softClosed,
		softClosedAt: row.softClosedAt,
		softClosedBy: row.softClosedBy,
		reopenReason: row.reopenReason,
		reopenedAt: row.reopenedAt,
		reopenedBy: row.reopenedBy,
		closeReason: row.closeReason,
		version: row.version,
		openedBy: row.createdBy,
		closedBy: row.closedBy,
		closedAt: row.closedAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

async function reloadPeriod(
	organizationId: string,
	id: string,
	_message: string,
): Promise<Result<AccountingPeriod>> {
	const [row] = await afendaDatabase.client
		.select()
		.from(accountingPeriod)
		.where(
			and(
				eq(accountingPeriod.organizationId, organizationId),
				eq(accountingPeriod.id, id),
			),
		)
		.limit(1);
	return row === undefined
		? errorResult.fail("INTERNAL_ERROR")
		: errorResult.ok(mapPeriod(row));
}

export const drizzlePeriodsMethods: AccountingPeriodsStore = {
	async openPeriod(
		record: Parameters<AccountingPeriodsStore["openPeriod"]>[0],
	): Promise<Result<AccountingPeriod>> {
		const id = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction(
				(sql) => [
					sql`
						INSERT INTO accounting_period (
							id, organization_id, code, name, starts_on, ends_on,
							status, version, created_by, updated_by
						)
						SELECT ${id}, ${record.organizationId}, ${record.normalizedCode},
							${record.code}, ${record.startDate}::date,
							${record.endDate}::date, 'open', 1, ${record.actorUserId},
							${record.actorUserId}
						WHERE NOT EXISTS (
							SELECT 1 FROM accounting_period
							WHERE organization_id = ${record.organizationId}
								AND daterange(starts_on, ends_on, '[]')
									&& daterange(${record.startDate}::date, ${record.endDate}::date, '[]')
						)
						RETURNING id
					`,
				],
				{ isolationLevel: "Serializable" },
			);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Accounting periods cannot overlap",
				});
			}
			return reloadPeriod(
				record.organizationId,
				id,
				"Created accounting period missing",
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to open accounting period");
		}
	},

	async softClosePeriod(
		record: Parameters<AccountingPeriodsStore["softClosePeriod"]>[0],
	): Promise<Result<AccountingPeriod>> {
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					UPDATE accounting_period
					SET status = 'soft_closed', soft_closed = true,
						soft_closed_at = now(), soft_closed_by = ${record.actorUserId},
						version = version + 1, updated_at = now()
					WHERE id = ${record.periodId}
						AND organization_id = ${record.organizationId}
						AND status = 'open' AND version = ${record.expectedVersion}
					RETURNING id
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Accounting period soft-close conflict",
				});
			}
			return reloadPeriod(
				record.organizationId,
				record.periodId,
				"Soft-closed accounting period missing",
			);
		} catch (error) {
			return failFromPersistence(
				error,
				"Failed to soft-close accounting period",
			);
		}
	},

	async closePeriod(
		record: Parameters<AccountingPeriodsStore["closePeriod"]>[0],
	): Promise<Result<AccountingPeriod>> {
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					UPDATE accounting_period
					SET status = 'closed', version = version + 1,
						close_reason = ${record.closeReason},
						closed_by = ${record.actorUserId}, closed_at = now(), updated_at = now()
					WHERE id = ${record.periodId}
						AND organization_id = ${record.organizationId}
						AND status = 'soft_closed' AND version = ${record.expectedVersion}
					RETURNING id
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Accounting period close conflict",
				});
			}
			return reloadPeriod(
				record.organizationId,
				record.periodId,
				"Closed accounting period missing",
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to close accounting period");
		}
	},

	async reopenPeriod(
		record: Parameters<AccountingPeriodsStore["reopenPeriod"]>[0],
	): Promise<Result<AccountingPeriod>> {
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					UPDATE accounting_period
					SET status = 'open', soft_closed = false,
						reopen_reason = ${record.reason},
						reopened_at = now(), reopened_by = ${record.actorUserId},
						version = version + 1, updated_at = now()
					WHERE id = ${record.periodId}
						AND organization_id = ${record.organizationId}
						AND status IN ('soft_closed', 'closed')
						AND version = ${record.expectedVersion}
					RETURNING id
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Accounting period reopen conflict",
				});
			}
			return reloadPeriod(
				record.organizationId,
				record.periodId,
				"Reopened accounting period missing",
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to reopen accounting period");
		}
	},
};
