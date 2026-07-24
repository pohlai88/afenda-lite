import { randomUUID } from "node:crypto";
import {
	and,
	db,
	eq,
	payrollCalendar,
	payrollDeductionRule,
	payrollEarningRule,
	payrollPayGroup,
	payrollPeriod,
	payrollStatutoryRule,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";

import {
	type PayrollCalendarId,
	type PayrollPayGroupId,
	type PayrollPeriodId,
	parsePayrollCalendarId,
	parsePayrollDeductionRuleId,
	parsePayrollEarningRuleId,
	parsePayrollPayGroupId,
	parsePayrollPeriodId,
	parsePayrollStatutoryRuleId,
} from "../../brands";
import {
	PAYROLL_ERROR_EFFECTIVE_RANGE_OVERLAP,
	payrollErrorDetails,
} from "../../error-codes";
import type { MutationPorts } from "../../ports";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	effectiveRangesOverlap,
	isEffectiveOnDate,
} from "../../shared/effective-date";
import {
	isCreateIdempotencyUniqueViolation,
	mapConflict,
	mapNotFound,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import type { PayrollSetupStore } from "../../store/setup";
import { createDrizzleSetupExtendedMethods } from "./setup-extended-methods";
import type {
	IdempotentPayrollCalendarRecord,
	PayrollCalendar,
	PayrollCalendarCreateRecord,
	PayrollCalendarUpdateInput,
	PayrollDeductionRule,
	PayrollDeductionRuleCreateRecord,
	PayrollEarningRule,
	PayrollEarningRuleCreateRecord,
	PayrollPayGroup,
	PayrollPayGroupCreateRecord,
	PayrollPeriod,
	PayrollPeriodCreateRecord,
	PayrollStatutoryRule,
	PayrollStatutoryRuleCreateRecord,
} from "../../types";

async function recordAudit(
	ports: MutationPorts,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		entity: string;
		entityId: string;
		action: "CREATE" | "UPDATE" | "DELETE";
	},
): Promise<Result<{ id: string }>> {
	return ports.audit.record({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		changes: [],
	});
}

function formatDecimal(value: string | null | undefined): string | null {
	if (value === null || value === undefined) {
		return null;
	}
	return String(value);
}

function mapCalendarRow(
	row: typeof payrollCalendar.$inferSelect,
): Result<PayrollCalendar> {
	const id = parsePayrollCalendarId(row.id);
	if (!id.ok) {
		return id;
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		name: row.name,
		timezone: row.timezone,
		status: row.status as PayrollCalendar["status"],
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapPayGroupRow(
	row: typeof payrollPayGroup.$inferSelect,
): Result<PayrollPayGroup> {
	const id = parsePayrollPayGroupId(row.id);
	const calendarId = parsePayrollCalendarId(row.calendarId);
	if (!id.ok) {
		return id;
	}
	if (!calendarId.ok) {
		return calendarId;
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		calendarId: calendarId.data,
		code: row.code,
		name: row.name,
		currencyCode: row.currencyCode,
		status: row.status as PayrollPayGroup["status"],
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapPeriodRow(
	row: typeof payrollPeriod.$inferSelect,
): Result<PayrollPeriod> {
	const id = parsePayrollPeriodId(row.id);
	const payGroupId = parsePayrollPayGroupId(row.payGroupId);
	if (!id.ok) {
		return id;
	}
	if (!payGroupId.ok) {
		return payGroupId;
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		payGroupId: payGroupId.data,
		periodStart: row.periodStart,
		periodEnd: row.periodEnd,
		cutoffDate: row.cutoffDate,
		status: row.status as PayrollPeriod["status"],
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapEarningRuleRow(
	row: typeof payrollEarningRule.$inferSelect,
): Result<PayrollEarningRule> {
	const id = parsePayrollEarningRuleId(row.id);
	const payGroupId = parsePayrollPayGroupId(row.payGroupId);
	if (!id.ok) {
		return id;
	}
	if (!payGroupId.ok) {
		return payGroupId;
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		payGroupId: payGroupId.data,
		code: row.code,
		name: row.name,
		ruleType: row.ruleType as PayrollEarningRule["ruleType"],
		amount: formatDecimal(row.amount),
		rate: formatDecimal(row.rate),
		currencyCode: row.currencyCode,
		ruleVersion: row.ruleVersion,
		status: row.status as PayrollEarningRule["status"],
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapDeductionRuleRow(
	row: typeof payrollDeductionRule.$inferSelect,
): Result<PayrollDeductionRule> {
	const id = parsePayrollDeductionRuleId(row.id);
	const payGroupId = parsePayrollPayGroupId(row.payGroupId);
	if (!id.ok) {
		return id;
	}
	if (!payGroupId.ok) {
		return payGroupId;
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		payGroupId: payGroupId.data,
		code: row.code,
		name: row.name,
		ruleType: row.ruleType as PayrollDeductionRule["ruleType"],
		amount: formatDecimal(row.amount),
		rate: formatDecimal(row.rate),
		currencyCode: row.currencyCode,
		ruleVersion: row.ruleVersion,
		taxTiming: row.taxTiming as PayrollDeductionRule["taxTiming"],
		status: row.status as PayrollDeductionRule["status"],
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapStatutoryRuleRow(
	row: typeof payrollStatutoryRule.$inferSelect,
): Result<PayrollStatutoryRule> {
	const id = parsePayrollStatutoryRuleId(row.id);
	const payGroupId = parsePayrollPayGroupId(row.payGroupId);
	if (!id.ok) {
		return id;
	}
	if (!payGroupId.ok) {
		return payGroupId;
	}
	const configJson =
		typeof row.configJson === "object" && row.configJson !== null
			? (row.configJson as Record<string, unknown>)
			: {};
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		payGroupId: payGroupId.data,
		code: row.code,
		name: row.name,
		jurisdictionCode: row.jurisdictionCode,
		configJson,
		ruleVersion: row.ruleVersion,
		status: row.status as PayrollStatutoryRule["status"],
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

async function resolveIdempotentCreate<
	TRow extends {
		createRequestFingerprint: string;
	},
	TEntity,
>(
	findExisting: () => Promise<
		Result<{ entity: TEntity; createRequestFingerprint: string } | null>
	>,
	recordFingerprint: string,
	mapRow: (row: TRow) => Result<TEntity>,
	insert: () => Promise<Result<TRow>>,
): Promise<Result<TEntity>> {
	const existing = await findExisting();
	if (!existing.ok) {
		return existing;
	}
	if (existing.data !== null) {
		if (existing.data.createRequestFingerprint !== recordFingerprint) {
			return mapConflict("Idempotency key conflict");
		}
		return ok(existing.data.entity);
	}

	const inserted = await insert();
	if (!inserted.ok) {
		return inserted;
	}
	return mapRow(inserted.data);
}

function hasActiveRuleOverlap<
	TRule extends {
		status: string;
		effectiveFrom: string;
		effectiveTo: string | null;
	},
>(
	rules: TRule[],
	record: {
		effectiveFrom: string;
		effectiveTo: string | null;
	},
): boolean {
	for (const rule of rules) {
		if (rule.status !== "active") {
			continue;
		}
		if (
			effectiveRangesOverlap(
				rule.effectiveFrom,
				rule.effectiveTo,
				record.effectiveFrom,
				record.effectiveTo,
			)
		) {
			return true;
		}
	}
	return false;
}

function selectRuleAtEffectiveDate<
	TRule extends {
		status: string;
		effectiveFrom: string;
		effectiveTo: string | null;
	},
>(rules: TRule[], effectiveDate: string): TRule | null {
	let selected: TRule | null = null;
	for (const rule of rules) {
		if (rule.status !== "active") {
			continue;
		}
		if (
			!isEffectiveOnDate(rule.effectiveFrom, rule.effectiveTo, effectiveDate)
		) {
			continue;
		}
		if (selected === null || rule.effectiveFrom > selected.effectiveFrom) {
			selected = rule;
		}
	}
	return selected;
}

function listActiveRulesForPayGroup<
	TRule extends {
		organizationId: string;
		payGroupId: string;
		status: string;
		effectiveFrom: string;
		effectiveTo: string | null;
	},
>(
	rules: TRule[],
	input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		effectiveDate: string;
	},
): TRule[] {
	const selected: TRule[] = [];
	for (const rule of rules) {
		if (rule.organizationId !== input.organizationId) {
			continue;
		}
		if (rule.payGroupId !== input.payGroupId) {
			continue;
		}
		if (rule.status !== "active") {
			continue;
		}
		if (
			!isEffectiveOnDate(
				rule.effectiveFrom,
				rule.effectiveTo,
				input.effectiveDate,
			)
		) {
			continue;
		}
		selected.push(rule);
	}
	return selected;
}

/** Drizzle persistence methods for payroll setup. */
const drizzleSetupCore = {
	async findCalendarByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentPayrollCalendarRecord | null>> {
		try {
			const rows = await db
				.select()
				.from(payrollCalendar)
				.where(
					and(
						eq(payrollCalendar.organizationId, input.organizationId),
						eq(payrollCalendar.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return ok(null);
			}
			const mapped = mapCalendarRow(row);
			if (!mapped.ok) {
				return mapped;
			}
			return ok({
				calendar: mapped.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll calendar idempotency record",
			);
		}
	},

	async createCalendar(
		record: PayrollCalendarCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollCalendar>> {
		const existing = await this.findCalendarByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint !==
				record.createRequestFingerprint
			) {
				return mapConflict("Idempotency key conflict");
			}
			return ok(existing.data.calendar);
		}

		const calendarId = parsePayrollCalendarId(randomUUID());
		if (!calendarId.ok) {
			return calendarId;
		}

		try {
			const rows = await db
				.insert(payrollCalendar)
				.values({
					id: calendarId.data,
					organizationId: record.organizationId,
					code: record.code,
					name: record.name,
					timezone: record.timezone,
					status: "active",
					effectiveFrom: record.effectiveFrom,
					effectiveTo: record.effectiveTo,
					createIdempotencyKey: record.idempotencyKey,
					createRequestFingerprint: record.createRequestFingerprint,
					version: 1,
					createdBy: record.createdBy,
					updatedBy: record.createdBy,
				})
				.returning();
			const row = rows[0];
			if (row === undefined) {
				return mapPersistenceFailure(
					new Error("Missing returning row"),
					"Failed to create payroll calendar",
				);
			}

			const mapped = mapCalendarRow(row);
			if (!mapped.ok) {
				return mapped;
			}

			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_calendar",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				return audit;
			}

			return mapped;
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findCalendarByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.idempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint !==
						record.createRequestFingerprint
					) {
						return mapConflict("Idempotency key conflict");
					}
					return ok(replay.data.calendar);
				}
			}
			return mapPersistenceFailure(error, "Failed to create payroll calendar");
		}
	},

	async getCalendar(input: {
		organizationId: string;
		calendarId: PayrollCalendarId;
	}): Promise<Result<PayrollCalendar | null>> {
		try {
			const rows = await db
				.select()
				.from(payrollCalendar)
				.where(
					and(
						eq(payrollCalendar.organizationId, input.organizationId),
						eq(payrollCalendar.id, input.calendarId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapCalendarRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load payroll calendar");
		}
	},

	async updateCalendar(
		input: PayrollCalendarUpdateInput,
		ports: MutationPorts,
	): Promise<Result<PayrollCalendar>> {
		const current = await this.getCalendar({
			organizationId: input.organizationId,
			calendarId: input.calendarId,
		});
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return mapNotFound("Payroll calendar not found");
		}

		const versionCheck = assertExpectedVersion(
			current.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		try {
			const rows = await db
				.update(payrollCalendar)
				.set({
					name: input.name ?? current.data.name,
					timezone: input.timezone ?? current.data.timezone,
					effectiveTo:
						input.effectiveTo !== undefined
							? input.effectiveTo
							: current.data.effectiveTo,
					version: current.data.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(payrollCalendar.organizationId, input.organizationId),
						eq(payrollCalendar.id, input.calendarId),
						eq(payrollCalendar.version, input.expectedVersion),
					),
				)
				.returning();
			const row = rows[0];
			if (row === undefined) {
				return mapConflict("Payroll calendar version is stale");
			}

			const mapped = mapCalendarRow(row);
			if (!mapped.ok) {
				return mapped;
			}

			const audit = await recordAudit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "payroll_calendar",
				entityId: mapped.data.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				return audit;
			}

			return mapped;
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update payroll calendar");
		}
	},

	async createPayGroup(
		record: PayrollPayGroupCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollPayGroup>> {
		return resolveIdempotentCreate(
			async () => {
				try {
					const rows = await db
						.select()
						.from(payrollPayGroup)
						.where(
							and(
								eq(payrollPayGroup.organizationId, record.organizationId),
								eq(payrollPayGroup.createIdempotencyKey, record.idempotencyKey),
							),
						)
						.limit(1);
					const row = rows[0];
					if (row === undefined) {
						return ok(null);
					}
					const mapped = mapPayGroupRow(row);
					if (!mapped.ok) {
						return mapped;
					}
					return ok({
						entity: mapped.data,
						createRequestFingerprint: row.createRequestFingerprint,
					});
				} catch (error) {
					return mapPersistenceFailure(
						error,
						"Failed to load payroll pay group idempotency record",
					);
				}
			},
			record.createRequestFingerprint,
			mapPayGroupRow,
			async () => {
				const calendar = await this.getCalendar({
					organizationId: record.organizationId,
					calendarId: record.calendarId,
				});
				if (!calendar.ok) {
					return calendar;
				}
				if (calendar.data === null) {
					return mapNotFound("Payroll calendar not found");
				}

				const payGroupId = parsePayrollPayGroupId(randomUUID());
				if (!payGroupId.ok) {
					return payGroupId;
				}

				try {
					const rows = await db
						.insert(payrollPayGroup)
						.values({
							id: payGroupId.data,
							organizationId: record.organizationId,
							calendarId: record.calendarId,
							code: record.code,
							name: record.name,
							currencyCode: record.currencyCode,
							status: "active",
							createIdempotencyKey: record.idempotencyKey,
							createRequestFingerprint: record.createRequestFingerprint,
							version: 1,
							createdBy: record.createdBy,
							updatedBy: record.createdBy,
						})
						.returning();
					const row = rows[0];
					if (row === undefined) {
						return mapPersistenceFailure(
							new Error("Missing returning row"),
							"Failed to create payroll pay group",
						);
					}

					const mapped = mapPayGroupRow(row);
					if (!mapped.ok) {
						return mapped;
					}

					const audit = await recordAudit(ports, {
						organizationId: record.organizationId,
						actorUserId: record.createdBy,
						correlationId: record.correlationId,
						entity: "payroll_pay_group",
						entityId: mapped.data.id,
						action: "CREATE",
					});
					if (!audit.ok) {
						return audit;
					}

					return ok(row);
				} catch (error) {
					if (isCreateIdempotencyUniqueViolation(error)) {
						const rows = await db
							.select()
							.from(payrollPayGroup)
							.where(
								and(
									eq(payrollPayGroup.organizationId, record.organizationId),
									eq(
										payrollPayGroup.createIdempotencyKey,
										record.idempotencyKey,
									),
								),
							)
							.limit(1);
						const row = rows[0];
						if (row !== undefined) {
							if (
								row.createRequestFingerprint !== record.createRequestFingerprint
							) {
								return mapConflict("Idempotency key conflict");
							}
							return ok(row);
						}
					}
					return mapPersistenceFailure(
						error,
						"Failed to create payroll pay group",
					);
				}
			},
		);
	},

	async getPayGroup(input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
	}): Promise<Result<PayrollPayGroup | null>> {
		try {
			const rows = await db
				.select()
				.from(payrollPayGroup)
				.where(
					and(
						eq(payrollPayGroup.organizationId, input.organizationId),
						eq(payrollPayGroup.id, input.payGroupId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapPayGroupRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load payroll pay group");
		}
	},

	async listPayGroups(input: {
		organizationId: string;
		status?: "active" | "archived";
	}): Promise<Result<PayrollPayGroup[]>> {
		try {
			const rows = await db
				.select()
				.from(payrollPayGroup)
				.where(
					input.status === undefined
						? eq(payrollPayGroup.organizationId, input.organizationId)
						: and(
								eq(payrollPayGroup.organizationId, input.organizationId),
								eq(payrollPayGroup.status, input.status),
							),
				);
			const groups: PayrollPayGroup[] = [];
			for (const row of rows) {
				const mapped = mapPayGroupRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				groups.push(mapped.data);
			}
			return ok(groups);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list payroll pay groups");
		}
	},

	async createPeriod(
		record: PayrollPeriodCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollPeriod>> {
		return resolveIdempotentCreate(
			async () => {
				try {
					const rows = await db
						.select()
						.from(payrollPeriod)
						.where(
							and(
								eq(payrollPeriod.organizationId, record.organizationId),
								eq(payrollPeriod.createIdempotencyKey, record.idempotencyKey),
							),
						)
						.limit(1);
					const row = rows[0];
					if (row === undefined) {
						return ok(null);
					}
					const mapped = mapPeriodRow(row);
					if (!mapped.ok) {
						return mapped;
					}
					return ok({
						entity: mapped.data,
						createRequestFingerprint: row.createRequestFingerprint,
					});
				} catch (error) {
					return mapPersistenceFailure(
						error,
						"Failed to load payroll period idempotency record",
					);
				}
			},
			record.createRequestFingerprint,
			mapPeriodRow,
			async () => {
				const payGroup = await this.getPayGroup({
					organizationId: record.organizationId,
					payGroupId: record.payGroupId,
				});
				if (!payGroup.ok) {
					return payGroup;
				}
				if (payGroup.data === null) {
					return mapNotFound("Payroll pay group not found");
				}

				const periodId = parsePayrollPeriodId(randomUUID());
				if (!periodId.ok) {
					return periodId;
				}

				try {
					const rows = await db
						.insert(payrollPeriod)
						.values({
							id: periodId.data,
							organizationId: record.organizationId,
							payGroupId: record.payGroupId,
							periodStart: record.periodStart,
							periodEnd: record.periodEnd,
							cutoffDate: record.cutoffDate,
							status: "open",
							createIdempotencyKey: record.idempotencyKey,
							createRequestFingerprint: record.createRequestFingerprint,
							version: 1,
							createdBy: record.createdBy,
							updatedBy: record.createdBy,
						})
						.returning();
					const row = rows[0];
					if (row === undefined) {
						return mapPersistenceFailure(
							new Error("Missing returning row"),
							"Failed to create payroll period",
						);
					}

					const mapped = mapPeriodRow(row);
					if (!mapped.ok) {
						return mapped;
					}

					const audit = await recordAudit(ports, {
						organizationId: record.organizationId,
						actorUserId: record.createdBy,
						correlationId: record.correlationId,
						entity: "payroll_period",
						entityId: mapped.data.id,
						action: "CREATE",
					});
					if (!audit.ok) {
						return audit;
					}

					return ok(row);
				} catch (error) {
					if (isCreateIdempotencyUniqueViolation(error)) {
						const rows = await db
							.select()
							.from(payrollPeriod)
							.where(
								and(
									eq(payrollPeriod.organizationId, record.organizationId),
									eq(payrollPeriod.createIdempotencyKey, record.idempotencyKey),
								),
							)
							.limit(1);
						const row = rows[0];
						if (row !== undefined) {
							if (
								row.createRequestFingerprint !== record.createRequestFingerprint
							) {
								return mapConflict("Idempotency key conflict");
							}
							return ok(row);
						}
					}
					return mapPersistenceFailure(
						error,
						"Failed to create payroll period",
					);
				}
			},
		);
	},

	async getPeriod(input: {
		organizationId: string;
		periodId: PayrollPeriodId;
	}): Promise<Result<PayrollPeriod | null>> {
		try {
			const rows = await db
				.select()
				.from(payrollPeriod)
				.where(
					and(
						eq(payrollPeriod.organizationId, input.organizationId),
						eq(payrollPeriod.id, input.periodId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapPeriodRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load payroll period");
		}
	},

	async listPeriodsForPayGroup(input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		status?: "open" | "closed";
	}): Promise<Result<PayrollPeriod[]>> {
		try {
			const rows = await db
				.select()
				.from(payrollPeriod)
				.where(
					input.status === undefined
						? and(
								eq(payrollPeriod.organizationId, input.organizationId),
								eq(payrollPeriod.payGroupId, input.payGroupId),
							)
						: and(
								eq(payrollPeriod.organizationId, input.organizationId),
								eq(payrollPeriod.payGroupId, input.payGroupId),
								eq(payrollPeriod.status, input.status),
							),
				);
			const periods: PayrollPeriod[] = [];
			for (const row of rows) {
				const mapped = mapPeriodRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				periods.push(mapped.data);
			}
			return ok(periods);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list payroll periods for pay group",
			);
		}
	},

	async createEarningRule(
		record: PayrollEarningRuleCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollEarningRule>> {
		return resolveIdempotentCreate(
			async () => {
				try {
					const rows = await db
						.select()
						.from(payrollEarningRule)
						.where(
							and(
								eq(payrollEarningRule.organizationId, record.organizationId),
								eq(
									payrollEarningRule.createIdempotencyKey,
									record.idempotencyKey,
								),
							),
						)
						.limit(1);
					const row = rows[0];
					if (row === undefined) {
						return ok(null);
					}
					const mapped = mapEarningRuleRow(row);
					if (!mapped.ok) {
						return mapped;
					}
					return ok({
						entity: mapped.data,
						createRequestFingerprint: row.createRequestFingerprint,
					});
				} catch (error) {
					return mapPersistenceFailure(
						error,
						"Failed to load payroll earning rule idempotency record",
					);
				}
			},
			record.createRequestFingerprint,
			mapEarningRuleRow,
			async () => {
				const payGroup = await this.getPayGroup({
					organizationId: record.organizationId,
					payGroupId: record.payGroupId,
				});
				if (!payGroup.ok) {
					return payGroup;
				}
				if (payGroup.data === null) {
					return mapNotFound("Payroll pay group not found");
				}

				try {
					const activeRows = await db
						.select()
						.from(payrollEarningRule)
						.where(
							and(
								eq(payrollEarningRule.organizationId, record.organizationId),
								eq(payrollEarningRule.payGroupId, record.payGroupId),
								eq(payrollEarningRule.code, record.code),
								eq(payrollEarningRule.status, "active"),
							),
						);
					if (hasActiveRuleOverlap(activeRows, record)) {
						return fail(
							"CONFLICT",
							"Overlapping effective range for active earning rule",
							payrollErrorDetails(PAYROLL_ERROR_EFFECTIVE_RANGE_OVERLAP),
						);
					}

					const ruleId = parsePayrollEarningRuleId(randomUUID());
					if (!ruleId.ok) {
						return ruleId;
					}

					const rows = await db
						.insert(payrollEarningRule)
						.values({
							id: ruleId.data,
							organizationId: record.organizationId,
							payGroupId: record.payGroupId,
							code: record.code,
							name: record.name,
							ruleType: record.ruleType,
							amount: record.amount,
							rate: record.rate,
							currencyCode: record.currencyCode,
							ruleVersion: record.ruleVersion,
							status: "active",
							effectiveFrom: record.effectiveFrom,
							effectiveTo: record.effectiveTo,
							createIdempotencyKey: record.idempotencyKey,
							createRequestFingerprint: record.createRequestFingerprint,
							version: 1,
							createdBy: record.createdBy,
							updatedBy: record.createdBy,
						})
						.returning();
					const row = rows[0];
					if (row === undefined) {
						return mapPersistenceFailure(
							new Error("Missing returning row"),
							"Failed to create payroll earning rule",
						);
					}

					const mapped = mapEarningRuleRow(row);
					if (!mapped.ok) {
						return mapped;
					}

					const audit = await recordAudit(ports, {
						organizationId: record.organizationId,
						actorUserId: record.createdBy,
						correlationId: record.correlationId,
						entity: "payroll_earning_rule",
						entityId: mapped.data.id,
						action: "CREATE",
					});
					if (!audit.ok) {
						return audit;
					}

					return ok(row);
				} catch (error) {
					if (isCreateIdempotencyUniqueViolation(error)) {
						const rows = await db
							.select()
							.from(payrollEarningRule)
							.where(
								and(
									eq(payrollEarningRule.organizationId, record.organizationId),
									eq(
										payrollEarningRule.createIdempotencyKey,
										record.idempotencyKey,
									),
								),
							)
							.limit(1);
						const row = rows[0];
						if (row !== undefined) {
							if (
								row.createRequestFingerprint !== record.createRequestFingerprint
							) {
								return mapConflict("Idempotency key conflict");
							}
							return ok(row);
						}
					}
					return mapPersistenceFailure(
						error,
						"Failed to create payroll earning rule",
					);
				}
			},
		);
	},

	async createDeductionRule(
		record: PayrollDeductionRuleCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollDeductionRule>> {
		return resolveIdempotentCreate(
			async () => {
				try {
					const rows = await db
						.select()
						.from(payrollDeductionRule)
						.where(
							and(
								eq(payrollDeductionRule.organizationId, record.organizationId),
								eq(
									payrollDeductionRule.createIdempotencyKey,
									record.idempotencyKey,
								),
							),
						)
						.limit(1);
					const row = rows[0];
					if (row === undefined) {
						return ok(null);
					}
					const mapped = mapDeductionRuleRow(row);
					if (!mapped.ok) {
						return mapped;
					}
					return ok({
						entity: mapped.data,
						createRequestFingerprint: row.createRequestFingerprint,
					});
				} catch (error) {
					return mapPersistenceFailure(
						error,
						"Failed to load payroll deduction rule idempotency record",
					);
				}
			},
			record.createRequestFingerprint,
			mapDeductionRuleRow,
			async () => {
				const payGroup = await this.getPayGroup({
					organizationId: record.organizationId,
					payGroupId: record.payGroupId,
				});
				if (!payGroup.ok) {
					return payGroup;
				}
				if (payGroup.data === null) {
					return mapNotFound("Payroll pay group not found");
				}

				try {
					const activeRows = await db
						.select()
						.from(payrollDeductionRule)
						.where(
							and(
								eq(payrollDeductionRule.organizationId, record.organizationId),
								eq(payrollDeductionRule.payGroupId, record.payGroupId),
								eq(payrollDeductionRule.code, record.code),
								eq(payrollDeductionRule.status, "active"),
							),
						);
					if (hasActiveRuleOverlap(activeRows, record)) {
						return fail(
							"CONFLICT",
							"Overlapping effective range for active deduction rule",
							payrollErrorDetails(PAYROLL_ERROR_EFFECTIVE_RANGE_OVERLAP),
						);
					}

					const ruleId = parsePayrollDeductionRuleId(randomUUID());
					if (!ruleId.ok) {
						return ruleId;
					}

					const rows = await db
						.insert(payrollDeductionRule)
						.values({
							id: ruleId.data,
							organizationId: record.organizationId,
							payGroupId: record.payGroupId,
							code: record.code,
							name: record.name,
							ruleType: record.ruleType,
							amount: record.amount,
							rate: record.rate,
							currencyCode: record.currencyCode,
							ruleVersion: record.ruleVersion,
							taxTiming: record.taxTiming,
							status: "active",
							effectiveFrom: record.effectiveFrom,
							effectiveTo: record.effectiveTo,
							createIdempotencyKey: record.idempotencyKey,
							createRequestFingerprint: record.createRequestFingerprint,
							version: 1,
							createdBy: record.createdBy,
							updatedBy: record.createdBy,
						})
						.returning();
					const row = rows[0];
					if (row === undefined) {
						return mapPersistenceFailure(
							new Error("Missing returning row"),
							"Failed to create payroll deduction rule",
						);
					}

					const mapped = mapDeductionRuleRow(row);
					if (!mapped.ok) {
						return mapped;
					}

					const audit = await recordAudit(ports, {
						organizationId: record.organizationId,
						actorUserId: record.createdBy,
						correlationId: record.correlationId,
						entity: "payroll_deduction_rule",
						entityId: mapped.data.id,
						action: "CREATE",
					});
					if (!audit.ok) {
						return audit;
					}

					return ok(row);
				} catch (error) {
					if (isCreateIdempotencyUniqueViolation(error)) {
						const rows = await db
							.select()
							.from(payrollDeductionRule)
							.where(
								and(
									eq(
										payrollDeductionRule.organizationId,
										record.organizationId,
									),
									eq(
										payrollDeductionRule.createIdempotencyKey,
										record.idempotencyKey,
									),
								),
							)
							.limit(1);
						const row = rows[0];
						if (row !== undefined) {
							if (
								row.createRequestFingerprint !== record.createRequestFingerprint
							) {
								return mapConflict("Idempotency key conflict");
							}
							return ok(row);
						}
					}
					return mapPersistenceFailure(
						error,
						"Failed to create payroll deduction rule",
					);
				}
			},
		);
	},

	async createStatutoryRule(
		record: PayrollStatutoryRuleCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollStatutoryRule>> {
		return resolveIdempotentCreate(
			async () => {
				try {
					const rows = await db
						.select()
						.from(payrollStatutoryRule)
						.where(
							and(
								eq(payrollStatutoryRule.organizationId, record.organizationId),
								eq(
									payrollStatutoryRule.createIdempotencyKey,
									record.idempotencyKey,
								),
							),
						)
						.limit(1);
					const row = rows[0];
					if (row === undefined) {
						return ok(null);
					}
					const mapped = mapStatutoryRuleRow(row);
					if (!mapped.ok) {
						return mapped;
					}
					return ok({
						entity: mapped.data,
						createRequestFingerprint: row.createRequestFingerprint,
					});
				} catch (error) {
					return mapPersistenceFailure(
						error,
						"Failed to load payroll statutory rule idempotency record",
					);
				}
			},
			record.createRequestFingerprint,
			mapStatutoryRuleRow,
			async () => {
				const payGroup = await this.getPayGroup({
					organizationId: record.organizationId,
					payGroupId: record.payGroupId,
				});
				if (!payGroup.ok) {
					return payGroup;
				}
				if (payGroup.data === null) {
					return mapNotFound("Payroll pay group not found");
				}

				try {
					const activeRows = await db
						.select()
						.from(payrollStatutoryRule)
						.where(
							and(
								eq(payrollStatutoryRule.organizationId, record.organizationId),
								eq(payrollStatutoryRule.payGroupId, record.payGroupId),
								eq(payrollStatutoryRule.code, record.code),
								eq(payrollStatutoryRule.status, "active"),
							),
						);
					if (hasActiveRuleOverlap(activeRows, record)) {
						return fail(
							"CONFLICT",
							"Overlapping effective range for active statutory rule",
							payrollErrorDetails(PAYROLL_ERROR_EFFECTIVE_RANGE_OVERLAP),
						);
					}

					const ruleId = parsePayrollStatutoryRuleId(randomUUID());
					if (!ruleId.ok) {
						return ruleId;
					}

					const rows = await db
						.insert(payrollStatutoryRule)
						.values({
							id: ruleId.data,
							organizationId: record.organizationId,
							payGroupId: record.payGroupId,
							code: record.code,
							name: record.name,
							jurisdictionCode: record.jurisdictionCode,
							configJson: record.configJson,
							ruleVersion: record.ruleVersion,
							status: "active",
							effectiveFrom: record.effectiveFrom,
							effectiveTo: record.effectiveTo,
							createIdempotencyKey: record.idempotencyKey,
							createRequestFingerprint: record.createRequestFingerprint,
							version: 1,
							createdBy: record.createdBy,
							updatedBy: record.createdBy,
						})
						.returning();
					const row = rows[0];
					if (row === undefined) {
						return mapPersistenceFailure(
							new Error("Missing returning row"),
							"Failed to create payroll statutory rule",
						);
					}

					const mapped = mapStatutoryRuleRow(row);
					if (!mapped.ok) {
						return mapped;
					}

					const audit = await recordAudit(ports, {
						organizationId: record.organizationId,
						actorUserId: record.createdBy,
						correlationId: record.correlationId,
						entity: "payroll_statutory_rule",
						entityId: mapped.data.id,
						action: "CREATE",
					});
					if (!audit.ok) {
						return audit;
					}

					return ok(row);
				} catch (error) {
					if (isCreateIdempotencyUniqueViolation(error)) {
						const rows = await db
							.select()
							.from(payrollStatutoryRule)
							.where(
								and(
									eq(
										payrollStatutoryRule.organizationId,
										record.organizationId,
									),
									eq(
										payrollStatutoryRule.createIdempotencyKey,
										record.idempotencyKey,
									),
								),
							)
							.limit(1);
						const row = rows[0];
						if (row !== undefined) {
							if (
								row.createRequestFingerprint !== record.createRequestFingerprint
							) {
								return mapConflict("Idempotency key conflict");
							}
							return ok(row);
						}
					}
					return mapPersistenceFailure(
						error,
						"Failed to create payroll statutory rule",
					);
				}
			},
		);
	},

	async getEarningRuleAtEffectiveDate(input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		code: string;
		effectiveDate: string;
	}): Promise<Result<PayrollEarningRule | null>> {
		try {
			const rows = await db
				.select()
				.from(payrollEarningRule)
				.where(
					and(
						eq(payrollEarningRule.organizationId, input.organizationId),
						eq(payrollEarningRule.payGroupId, input.payGroupId),
						eq(payrollEarningRule.code, input.code),
						eq(payrollEarningRule.status, "active"),
					),
				);
			const selected = selectRuleAtEffectiveDate(rows, input.effectiveDate);
			if (selected === null) {
				return ok(null);
			}
			return mapEarningRuleRow(selected);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to resolve payroll earning rule at effective date",
			);
		}
	},

	async getDeductionRuleAtEffectiveDate(input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		code: string;
		effectiveDate: string;
	}): Promise<Result<PayrollDeductionRule | null>> {
		try {
			const rows = await db
				.select()
				.from(payrollDeductionRule)
				.where(
					and(
						eq(payrollDeductionRule.organizationId, input.organizationId),
						eq(payrollDeductionRule.payGroupId, input.payGroupId),
						eq(payrollDeductionRule.code, input.code),
						eq(payrollDeductionRule.status, "active"),
					),
				);
			const selected = selectRuleAtEffectiveDate(rows, input.effectiveDate);
			if (selected === null) {
				return ok(null);
			}
			return mapDeductionRuleRow(selected);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to resolve payroll deduction rule at effective date",
			);
		}
	},

	async getStatutoryRuleAtEffectiveDate(input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		code: string;
		effectiveDate: string;
	}): Promise<Result<PayrollStatutoryRule | null>> {
		try {
			const rows = await db
				.select()
				.from(payrollStatutoryRule)
				.where(
					and(
						eq(payrollStatutoryRule.organizationId, input.organizationId),
						eq(payrollStatutoryRule.payGroupId, input.payGroupId),
						eq(payrollStatutoryRule.code, input.code),
						eq(payrollStatutoryRule.status, "active"),
					),
				);
			const selected = selectRuleAtEffectiveDate(rows, input.effectiveDate);
			if (selected === null) {
				return ok(null);
			}
			return mapStatutoryRuleRow(selected);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to resolve payroll statutory rule at effective date",
			);
		}
	},

	async listActiveEarningRulesForPayGroup(input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		effectiveDate: string;
	}): Promise<Result<PayrollEarningRule[]>> {
		try {
			const rows = await db
				.select()
				.from(payrollEarningRule)
				.where(
					and(
						eq(payrollEarningRule.organizationId, input.organizationId),
						eq(payrollEarningRule.payGroupId, input.payGroupId),
						eq(payrollEarningRule.status, "active"),
					),
				);
			const active = listActiveRulesForPayGroup(rows, input);
			const rules: PayrollEarningRule[] = [];
			for (const row of active) {
				const mapped = mapEarningRuleRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				rules.push(mapped.data);
			}
			return ok(rules);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list active payroll earning rules",
			);
		}
	},

	async listActiveDeductionRulesForPayGroup(input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		effectiveDate: string;
	}): Promise<Result<PayrollDeductionRule[]>> {
		try {
			const rows = await db
				.select()
				.from(payrollDeductionRule)
				.where(
					and(
						eq(payrollDeductionRule.organizationId, input.organizationId),
						eq(payrollDeductionRule.payGroupId, input.payGroupId),
						eq(payrollDeductionRule.status, "active"),
					),
				);
			const active = listActiveRulesForPayGroup(rows, input);
			const rules: PayrollDeductionRule[] = [];
			for (const row of active) {
				const mapped = mapDeductionRuleRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				rules.push(mapped.data);
			}
			return ok(rules);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list active payroll deduction rules",
			);
		}
	},

	async listActiveStatutoryRulesForPayGroup(input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		effectiveDate: string;
	}): Promise<Result<PayrollStatutoryRule[]>> {
		try {
			const rows = await db
				.select()
				.from(payrollStatutoryRule)
				.where(
					and(
						eq(payrollStatutoryRule.organizationId, input.organizationId),
						eq(payrollStatutoryRule.payGroupId, input.payGroupId),
						eq(payrollStatutoryRule.status, "active"),
					),
				);
			const active = listActiveRulesForPayGroup(rows, input);
			const rules: PayrollStatutoryRule[] = [];
			for (const row of active) {
				const mapped = mapStatutoryRuleRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				rules.push(mapped.data);
			}
			return ok(rules);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list active payroll statutory rules",
			);
		}
	},
};

export const drizzleSetupMethods: PayrollSetupStore = {
	...drizzleSetupCore,
	...createDrizzleSetupExtendedMethods(drizzleSetupCore as PayrollSetupStore),
};
