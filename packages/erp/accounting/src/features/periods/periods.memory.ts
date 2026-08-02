import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type { AccountingPeriod } from "../../kernel/contracts/domain";
import { resolveOperation } from "../../kernel/execution/async";
import {
	findPeriod,
	type MemoryAccountingState,
} from "../../kernel/memory/state";
import type { AccountingPeriodsStore } from "./periods.store";

export function createMemoryPeriodsMethods(
	state: MemoryAccountingState,
): AccountingPeriodsStore {
	return {
		openPeriod(record): Promise<Result<AccountingPeriod>> {
			return resolveOperation(() => {
				const existing = state.periods.find(
					(p) =>
						p.organizationId === record.organizationId &&
						p.normalizedCode === record.normalizedCode,
				);
				if (existing) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Period code already exists",
					});
				}
				const now = new Date();
				const period: AccountingPeriod = {
					id: randomUUID(),
					organizationId: record.organizationId,
					code: record.code,
					normalizedCode: record.normalizedCode,
					startDate: record.startDate,
					endDate: record.endDate,
					status: "open",
					softClosed: false,
					softClosedAt: null,
					softClosedBy: null,
					reopenReason: null,
					reopenedAt: null,
					reopenedBy: null,
					closeReason: null,
					version: 1,
					openedBy: record.actorUserId,
					closedBy: null,
					closedAt: null,
					createdAt: now,
					updatedAt: now,
				};
				state.periods.push(period);
				return errorResult.ok(period);
			});
		},

		softClosePeriod(record): Promise<Result<AccountingPeriod>> {
			return resolveOperation(() => {
				const period = findPeriod(
					state,
					record.organizationId,
					record.periodId,
				);
				if (!period) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "Period not found",
					});
				}
				if (period.status !== "open") {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Only open periods can be soft-closed",
					});
				}
				if (period.version !== record.expectedVersion) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Version mismatch",
					});
				}
				const now = new Date();
				period.status = "soft_closed";
				period.softClosed = true;
				period.softClosedAt = now;
				period.softClosedBy = record.actorUserId;
				period.updatedAt = now;
				period.version += 1;
				return errorResult.ok(period);
			});
		},

		closePeriod(record): Promise<Result<AccountingPeriod>> {
			return resolveOperation(() => {
				const period = findPeriod(
					state,
					record.organizationId,
					record.periodId,
				);
				if (!period) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "Period not found",
					});
				}
				if (period.status !== "soft_closed") {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Only soft-closed periods can be closed",
					});
				}
				if (period.version !== record.expectedVersion) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Version mismatch",
					});
				}
				const now = new Date();
				period.status = "closed";
				period.closeReason = record.closeReason;
				period.closedBy = record.actorUserId;
				period.closedAt = now;
				period.updatedAt = now;
				period.version += 1;
				return errorResult.ok(period);
			});
		},

		reopenPeriod(record): Promise<Result<AccountingPeriod>> {
			return resolveOperation(() => {
				const period = findPeriod(
					state,
					record.organizationId,
					record.periodId,
				);
				if (!period) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "Period not found",
					});
				}
				if (period.status !== "soft_closed" && period.status !== "closed") {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Only soft-closed or closed periods can be reopened",
					});
				}
				if (period.version !== record.expectedVersion) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Version mismatch",
					});
				}
				const now = new Date();
				period.status = "open";
				period.softClosed = false;
				period.reopenReason = record.reason;
				period.reopenedAt = now;
				period.reopenedBy = record.actorUserId;
				period.updatedAt = now;
				period.version += 1;
				return errorResult.ok(period);
			});
		},
	};
}
