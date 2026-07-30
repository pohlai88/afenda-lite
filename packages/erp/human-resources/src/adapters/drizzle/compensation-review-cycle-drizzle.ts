import { randomUUID } from "node:crypto";

import { prepareTransactionalAuditInsertValues } from "@afenda/audit";
import {
	and,
	db,
	desc,
	eq,
	hrCompensationReview,
	hrCompensationReviewCycle,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";

import {
	type HumanResourcesCompensationReviewCycleId,
	parseHumanResourcesCompensationReviewCycleId,
} from "../../brands";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../../error-codes";
import type { MutationPorts } from "../../ports";
import {
	compensationReviewCycleAuditSnapshot,
	statusChange,
} from "../../shared/compensation-review-audit";
import {
	assertReviewCycleStatusTransition,
	assertValidReviewCyclePeriod,
} from "../../shared/compensation-review-guards";
import { compensationReviewCycleStatusSchema } from "../../shared/compensation-status";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	conflict,
	missAfterOptimisticUpdate,
	notFound,
} from "../../shared/domain-guards";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import {
	isCreateIdempotencyUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import type {
	CompensationReviewCycleCreateRecord,
	IdempotentCompensationReviewCycleRecord,
} from "../../store/compensation";
import type {
	CompensationReview,
	CompensationReviewCycle,
	CompensationReviewCycleListPage,
} from "../../types";
import { mapCompensationReviewFromDbRow } from "./compensation-benefits";

const COMPENSATION_REVIEW_CYCLE_AUDIT_SOURCE =
	"human-resources.compensation-review-cycle-drizzle";

interface CompensationReviewCycleSqlRow {
	budget_currency_code: string;
	budget_total_amount: string;
	code: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	id: string;
	name: string;
	organization_id: string;
	period_end: string;
	period_start: string;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

export function mapCompensationReviewCycleFromDbRow(
	row: typeof hrCompensationReviewCycle.$inferSelect,
): Result<CompensationReviewCycle> {
	const id = parseHumanResourcesCompensationReviewCycleId(row.id);
	if (!id.ok) {
		return id;
	}
	const status = compensationReviewCycleStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid compensation review cycle status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		name: row.name,
		periodStart: row.periodStart,
		periodEnd: row.periodEnd,
		status: status.data,
		budgetTotalAmount: row.budgetTotalAmount,
		budgetCurrencyCode: row.budgetCurrencyCode,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapCompensationReviewCycleSql(
	row: CompensationReviewCycleSqlRow,
): Result<CompensationReviewCycle> {
	return mapCompensationReviewCycleFromDbRow({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		name: row.name,
		periodStart: row.period_start,
		periodEnd: row.period_end,
		status: row.status,
		budgetTotalAmount: row.budget_total_amount,
		budgetCurrencyCode: row.budget_currency_code,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

async function transitionReviewCycleStatus(
	input: {
		organizationId: string;
		cycleId: HumanResourcesCompensationReviewCycleId;
		expectedVersion: number;
		actorUserId: string;
	},
	meta: HumanResourcesMutationMeta,
	nextStatus: CompensationReviewCycle["status"],
): Promise<Result<CompensationReviewCycle>> {
	const existing =
		await drizzleCompensationReviewCycleMethods.getCompensationReviewCycle({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return notFound(
			"Compensation review cycle not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const cycle = existing.data;
	const versionCheck = assertExpectedVersion(
		cycle.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}
	const transition = assertReviewCycleStatusTransition(
		cycle.status,
		nextStatus,
	);
	if (!transition.ok) {
		return transition;
	}

	const nextVersion = input.expectedVersion + 1;
	const auditId = randomUUID();
	const preparedAudit = prepareTransactionalAuditInsertValues({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		module: "human-resources",
		entity: "hr_compensation_review_cycle",
		entityId: input.cycleId,
		action: "UPDATE",
		changes: [statusChange("status", cycle.status, nextStatus)],
		oldValue: compensationReviewCycleAuditSnapshot(cycle),
		newValue: compensationReviewCycleAuditSnapshot({
			...cycle,
			status: nextStatus,
			version: nextVersion,
		}),
		eventContext: {
			version: 1,
			outcome: "SUCCEEDED",
			source: COMPENSATION_REVIEW_CYCLE_AUDIT_SOURCE,
			causationId: meta.causationId ?? meta.idempotencyKey ?? null,
		},
	});
	if (!preparedAudit.ok) {
		return preparedAudit;
	}
	const audit = preparedAudit.data;

	try {
		const [rows] = await runNeonHttpTransaction((sqlTag) => [
			sqlTag`
				WITH mutated AS (
					UPDATE hr_compensation_review_cycle
					SET status = ${nextStatus},
						version = ${nextVersion},
						updated_by = ${input.actorUserId},
						updated_at = now()
					WHERE id = ${input.cycleId}
						AND organization_id = ${input.organizationId}
						AND version = ${input.expectedVersion}
					RETURNING *
				),
				audited AS (
					INSERT INTO platform_audit_log (
						id, organization_id, actor_user_id, correlation_id, module, entity,
						entity_id, action, changes, old_value, new_value, metadata,
						ip_address, user_agent
					)
					SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
					RETURNING id
				)
				SELECT mutated.* FROM mutated, audited
			`,
		]);
		const [row] = rows;
		if (!row) {
			return missAfterOptimisticUpdate({
				found: true,
				entityLabel: "Compensation review cycle",
			});
		}
		return mapCompensationReviewCycleSql(row);
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to update compensation review cycle",
		);
	}
}

export const drizzleCompensationReviewCycleMethods = {
	async getCompensationReviewCycle(input: {
		organizationId: string;
		cycleId: HumanResourcesCompensationReviewCycleId;
	}): Promise<Result<CompensationReviewCycle | null>> {
		try {
			const rows = await db
				.select()
				.from(hrCompensationReviewCycle)
				.where(
					and(
						eq(hrCompensationReviewCycle.organizationId, input.organizationId),
						eq(hrCompensationReviewCycle.id, input.cycleId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return ok(null);
			}
			return mapCompensationReviewCycleFromDbRow(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load compensation review cycle",
			);
		}
	},

	async findCompensationReviewCycleByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCompensationReviewCycleRecord | null>> {
		try {
			const rows = await db
				.select()
				.from(hrCompensationReviewCycle)
				.where(
					and(
						eq(hrCompensationReviewCycle.organizationId, input.organizationId),
						eq(
							hrCompensationReviewCycle.createIdempotencyKey,
							input.idempotencyKey,
						),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return ok(null);
			}
			const mapped = mapCompensationReviewCycleFromDbRow(row);
			if (!mapped.ok) {
				return mapped;
			}
			return ok({
				cycle: mapped.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find compensation review cycle by idempotency key",
			);
		}
	},

	async createCompensationReviewCycle(
		record: CompensationReviewCycleCreateRecord,
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationReviewCycle>> {
		const existing =
			await drizzleCompensationReviewCycleMethods.findCompensationReviewCycleByIdempotencyKey(
				{
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				},
			);
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existing.data.cycle);
			}
			return conflict("Idempotency key already used with different data");
		}

		const periodCheck = assertValidReviewCyclePeriod({
			periodStart: record.periodStart,
			periodEnd: record.periodEnd,
		});
		if (!periodCheck.ok) {
			return periodCheck;
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesCompensationReviewCycleId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const preparedAudit = prepareTransactionalAuditInsertValues({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			module: "human-resources",
			entity: "hr_compensation_review_cycle",
			entityId: brandedId.data,
			action: "CREATE",
			changes: [{ field: "code", oldValue: null, newValue: record.code }],
			newValue: compensationReviewCycleAuditSnapshot({
				id: brandedId.data,
				code: record.code,
				name: record.name,
				periodStart: record.periodStart,
				periodEnd: record.periodEnd,
				status: "draft",
				budgetTotalAmount: record.budgetTotalAmount,
				budgetCurrencyCode: record.budgetCurrencyCode,
				version: 1,
			}),
			eventContext: {
				version: 1,
				outcome: "SUCCEEDED",
				source: COMPENSATION_REVIEW_CYCLE_AUDIT_SOURCE,
				causationId:
					meta.causationId ??
					meta.idempotencyKey ??
					record.createIdempotencyKey,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						INSERT INTO hr_compensation_review_cycle (
							id, organization_id, code, name, period_start, period_end,
							status, budget_total_amount, budget_currency_code,
							create_idempotency_key, create_request_fingerprint,
							version, created_by, updated_by
						)
						VALUES (
							${brandedId.data}, ${record.organizationId}, ${record.code},
							${record.name}, ${record.periodStart}, ${record.periodEnd},
							'draft', ${record.budgetTotalAmount}, ${record.budgetCurrencyCode},
							${record.createIdempotencyKey}, ${record.createRequestFingerprint},
							1, ${record.createdBy}, ${record.createdBy}
						)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict(
					"Compensation review cycle with this code already exists",
				);
			}
			return mapCompensationReviewCycleSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay =
					await drizzleCompensationReviewCycleMethods.findCompensationReviewCycleByIdempotencyKey(
						{
							organizationId: record.organizationId,
							idempotencyKey: record.createIdempotencyKey,
						},
					);
				if (!replay.ok) {
					return replay;
				}
				if (
					replay.data !== null &&
					replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
				) {
					return ok(replay.data.cycle);
				}
				return conflict("Idempotency key already used with different data");
			}
			return mapPersistenceFailure(
				error,
				"Failed to create compensation review cycle",
			);
		}
	},

	async openCompensationReviewCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesCompensationReviewCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationReviewCycle>> {
		return await transitionReviewCycleStatus(input, meta, "open");
	},

	async closeCompensationReviewCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesCompensationReviewCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationReviewCycle>> {
		return await transitionReviewCycleStatus(input, meta, "closed");
	},

	async cancelCompensationReviewCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesCompensationReviewCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationReviewCycle>> {
		return await transitionReviewCycleStatus(input, meta, "cancelled");
	},

	async listCompensationReviewCycles(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CompensationReviewCycle["status"] | undefined;
	}): Promise<Result<CompensationReviewCycleListPage>> {
		try {
			const conditions = [
				eq(hrCompensationReviewCycle.organizationId, input.organizationId),
			];
			if (input.status) {
				conditions.push(eq(hrCompensationReviewCycle.status, input.status));
			}
			const allRows = await db
				.select()
				.from(hrCompensationReviewCycle)
				.where(and(...conditions))
				.orderBy(desc(hrCompensationReviewCycle.createdAt));
			const cycles: CompensationReviewCycle[] = [];
			for (const row of allRows) {
				const mapped = mapCompensationReviewCycleFromDbRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				cycles.push(mapped.data);
			}
			const totalCount = cycles.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = cycles.slice(offset, offset + input.pageSize);
			return ok({
				cycles: paginated,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list compensation review cycles",
			);
		}
	},

	async listCompensationReviewsByCycle(input: {
		organizationId: string;
		cycleId: HumanResourcesCompensationReviewCycleId;
	}): Promise<Result<CompensationReview[]>> {
		try {
			const rows = await db
				.select()
				.from(hrCompensationReview)
				.where(
					and(
						eq(hrCompensationReview.organizationId, input.organizationId),
						eq(hrCompensationReview.cycleId, input.cycleId),
					),
				);
			const reviews: CompensationReview[] = [];
			for (const row of rows) {
				const mapped = mapCompensationReviewFromDbRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				reviews.push(mapped.data);
			}
			return ok(reviews);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list compensation reviews by cycle",
			);
		}
	},
};
