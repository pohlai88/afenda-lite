import { randomUUID } from "node:crypto";

import {
	and,
	db,
	desc,
	eq,
	hrHeadcountPlan,
	hrHeadcountPlanLine,
	hrHeadcountReservation,
	runNeonHttpTransaction,
	sql,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";

import {
	type HumanResourcesHeadcountReservationId,
	parseHumanResourcesDepartmentId,
	parseHumanResourcesHeadcountPlanId,
	parseHumanResourcesHeadcountPlanLineId,
	parseHumanResourcesHeadcountReservationId,
	parseHumanResourcesJobId,
	parseHumanResourcesPositionId,
	parseHumanResourcesRequisitionId,
} from "../../brands";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../../error-codes";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	conflict,
	invalidState,
	missAfterOptimisticUpdate,
	notFound,
} from "../../shared/domain-guards";
import {
	isCreateIdempotencyUniqueViolation,
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import {
	assertHeadcountPlanStatusTransition,
	assertReservationWithinAvailability,
	assertValidHeadcountPeriod,
} from "../../shared/workforce-planning-guards";
import {
	type HeadcountReservationStatus,
	headcountEmploymentTypeSchema,
	headcountPlanStatusSchema,
	headcountReservationStatusSchema,
} from "../../shared/workforce-planning-status";
import type { HumanResourcesStore } from "../../store";
import type {
	HeadcountPlan,
	HeadcountPlanLine,
	HeadcountReservation,
	WorkforcePlanVariance,
} from "../../types";
import { computeLineAvailability } from "../../workforce-planning/availability";

type WorkforcePlanVarianceLine = WorkforcePlanVariance["lines"][number];

function uniqueConstraintMessage(error: unknown): string {
	if (typeof error === "object" && error !== null && "message" in error) {
		const message = (error as { message: unknown }).message;
		if (typeof message === "string") {
			return message;
		}
	}
	return error instanceof Error ? error.message : String(error);
}

type HeadcountPlanSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	title: string;
	planning_scope_key: string;
	period_start: string;
	period_end: string;
	status: string;
	plan_version: number;
	supersedes_plan_id: string | null;
	approved_by: string | null;
	approved_at: Date | null;
	rejected_by: string | null;
	rejected_at: Date | null;
	rejection_reason: string | null;
	cost_envelope_amount: string | null;
	cost_envelope_currency_code: string | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type HeadcountPlanLineSqlRow = {
	id: string;
	organization_id: string;
	plan_id: string;
	department_id: string | null;
	job_id: string | null;
	position_id: string | null;
	location_code: string | null;
	employment_type: string | null;
	planned_fte: string;
	planned_headcount: number;
	cost_envelope_amount: string | null;
	cost_envelope_currency_code: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type HeadcountReservationSqlRow = {
	id: string;
	organization_id: string;
	plan_id: string;
	plan_line_id: string;
	requisition_id: string;
	reserved_fte: string;
	reserved_headcount: number;
	status: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapHeadcountPlan(
	row: typeof hrHeadcountPlan.$inferSelect,
): Result<HeadcountPlan> {
	const id = parseHumanResourcesHeadcountPlanId(row.id);
	if (!id.ok) return id;
	let supersedesPlanId: HeadcountPlan["supersedesPlanId"] = null;
	if (row.supersedesPlanId !== null) {
		const parsed = parseHumanResourcesHeadcountPlanId(row.supersedesPlanId);
		if (!parsed.ok) return parsed;
		supersedesPlanId = parsed.data;
	}
	const status = headcountPlanStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid headcount plan status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		title: row.title,
		planningScopeKey: row.planningScopeKey,
		periodStart: row.periodStart,
		periodEnd: row.periodEnd,
		status: status.data,
		planVersion: row.planVersion,
		supersedesPlanId,
		approvedBy: row.approvedBy,
		approvedAt: row.approvedAt,
		rejectedBy: row.rejectedBy,
		rejectedAt: row.rejectedAt,
		rejectionReason: row.rejectionReason,
		costEnvelopeAmount: row.costEnvelopeAmount,
		costEnvelopeCurrencyCode: row.costEnvelopeCurrencyCode,
		createIdempotencyKey: row.createIdempotencyKey,
		createRequestFingerprint: row.createRequestFingerprint,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapHeadcountPlanSql(row: HeadcountPlanSqlRow): Result<HeadcountPlan> {
	const id = parseHumanResourcesHeadcountPlanId(row.id);
	if (!id.ok) return id;
	let supersedesPlanId: HeadcountPlan["supersedesPlanId"] = null;
	if (row.supersedes_plan_id !== null) {
		const parsed = parseHumanResourcesHeadcountPlanId(row.supersedes_plan_id);
		if (!parsed.ok) return parsed;
		supersedesPlanId = parsed.data;
	}
	const status = headcountPlanStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid headcount plan status");
	}
	return ok({
		id: id.data,
		organizationId: row.organization_id,
		code: row.code,
		title: row.title,
		planningScopeKey: row.planning_scope_key,
		periodStart: row.period_start,
		periodEnd: row.period_end,
		status: status.data,
		planVersion: row.plan_version,
		supersedesPlanId,
		approvedBy: row.approved_by,
		approvedAt: row.approved_at,
		rejectedBy: row.rejected_by,
		rejectedAt: row.rejected_at,
		rejectionReason: row.rejection_reason,
		costEnvelopeAmount: row.cost_envelope_amount,
		costEnvelopeCurrencyCode: row.cost_envelope_currency_code,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapHeadcountPlanLine(
	row: typeof hrHeadcountPlanLine.$inferSelect,
): Result<HeadcountPlanLine> {
	const id = parseHumanResourcesHeadcountPlanLineId(row.id);
	if (!id.ok) return id;
	const planId = parseHumanResourcesHeadcountPlanId(row.planId);
	if (!planId.ok) return planId;
	let departmentId: HeadcountPlanLine["departmentId"] = null;
	if (row.departmentId !== null) {
		const parsed = parseHumanResourcesDepartmentId(row.departmentId);
		if (!parsed.ok) return parsed;
		departmentId = parsed.data;
	}
	let jobId: HeadcountPlanLine["jobId"] = null;
	if (row.jobId !== null) {
		const parsed = parseHumanResourcesJobId(row.jobId);
		if (!parsed.ok) return parsed;
		jobId = parsed.data;
	}
	let positionId: HeadcountPlanLine["positionId"] = null;
	if (row.positionId !== null) {
		const parsed = parseHumanResourcesPositionId(row.positionId);
		if (!parsed.ok) return parsed;
		positionId = parsed.data;
	}
	const employmentType = headcountEmploymentTypeSchema
		.nullable()
		.safeParse(row.employmentType);
	if (!employmentType.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid headcount plan line employment type",
		);
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		planId: planId.data,
		departmentId,
		jobId,
		positionId,
		locationCode: row.locationCode,
		employmentType: employmentType.data,
		plannedFte: row.plannedFte,
		plannedHeadcount: row.plannedHeadcount,
		costEnvelopeAmount: row.costEnvelopeAmount,
		costEnvelopeCurrencyCode: row.costEnvelopeCurrencyCode,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapHeadcountPlanLineSql(
	row: HeadcountPlanLineSqlRow,
): Result<HeadcountPlanLine> {
	const id = parseHumanResourcesHeadcountPlanLineId(row.id);
	if (!id.ok) return id;
	const planId = parseHumanResourcesHeadcountPlanId(row.plan_id);
	if (!planId.ok) return planId;
	let departmentId: HeadcountPlanLine["departmentId"] = null;
	if (row.department_id !== null) {
		const parsed = parseHumanResourcesDepartmentId(row.department_id);
		if (!parsed.ok) return parsed;
		departmentId = parsed.data;
	}
	let jobId: HeadcountPlanLine["jobId"] = null;
	if (row.job_id !== null) {
		const parsed = parseHumanResourcesJobId(row.job_id);
		if (!parsed.ok) return parsed;
		jobId = parsed.data;
	}
	let positionId: HeadcountPlanLine["positionId"] = null;
	if (row.position_id !== null) {
		const parsed = parseHumanResourcesPositionId(row.position_id);
		if (!parsed.ok) return parsed;
		positionId = parsed.data;
	}
	const employmentType = headcountEmploymentTypeSchema
		.nullable()
		.safeParse(row.employment_type);
	if (!employmentType.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid headcount plan line employment type",
		);
	}
	return ok({
		id: id.data,
		organizationId: row.organization_id,
		planId: planId.data,
		departmentId,
		jobId,
		positionId,
		locationCode: row.location_code,
		employmentType: employmentType.data,
		plannedFte: row.planned_fte,
		plannedHeadcount: row.planned_headcount,
		costEnvelopeAmount: row.cost_envelope_amount,
		costEnvelopeCurrencyCode: row.cost_envelope_currency_code,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapHeadcountReservation(
	row: typeof hrHeadcountReservation.$inferSelect,
): Result<HeadcountReservation> {
	const id = parseHumanResourcesHeadcountReservationId(row.id);
	if (!id.ok) return id;
	const planId = parseHumanResourcesHeadcountPlanId(row.planId);
	if (!planId.ok) return planId;
	const planLineId = parseHumanResourcesHeadcountPlanLineId(row.planLineId);
	if (!planLineId.ok) return planLineId;
	const requisitionId = parseHumanResourcesRequisitionId(row.requisitionId);
	if (!requisitionId.ok) return requisitionId;
	const status = headcountReservationStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid headcount reservation status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		planId: planId.data,
		planLineId: planLineId.data,
		requisitionId: requisitionId.data,
		reservedFte: row.reservedFte,
		reservedHeadcount: row.reservedHeadcount,
		status: status.data,
		createIdempotencyKey: row.createIdempotencyKey,
		createRequestFingerprint: row.createRequestFingerprint,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapHeadcountReservationSql(
	row: HeadcountReservationSqlRow,
): Result<HeadcountReservation> {
	const id = parseHumanResourcesHeadcountReservationId(row.id);
	if (!id.ok) return id;
	const planId = parseHumanResourcesHeadcountPlanId(row.plan_id);
	if (!planId.ok) return planId;
	const planLineId = parseHumanResourcesHeadcountPlanLineId(row.plan_line_id);
	if (!planLineId.ok) return planLineId;
	const requisitionId = parseHumanResourcesRequisitionId(row.requisition_id);
	if (!requisitionId.ok) return requisitionId;
	const status = headcountReservationStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid headcount reservation status");
	}
	return ok({
		id: id.data,
		organizationId: row.organization_id,
		planId: planId.data,
		planLineId: planLineId.data,
		requisitionId: requisitionId.data,
		reservedFte: row.reserved_fte,
		reservedHeadcount: row.reserved_headcount,
		status: status.data,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

type WorkforcePlanningHost = Pick<HumanResourcesStore, "getRequisitionById">;

export type DrizzleWorkforcePlanningMethods = Pick<
	HumanResourcesStore,
	| "findHeadcountPlanByIdempotencyKey"
	| "getHeadcountPlanById"
	| "findApprovedHeadcountPlanForScope"
	| "createHeadcountPlan"
	| "updateHeadcountPlan"
	| "transitionHeadcountPlanStatus"
	| "supersedeHeadcountPlan"
	| "listHeadcountPlans"
	| "getHeadcountPlanLineById"
	| "listHeadcountPlanLinesByPlanId"
	| "addHeadcountPlanLine"
	| "updateHeadcountPlanLine"
	| "removeHeadcountPlanLine"
	| "findHeadcountReservationByIdempotencyKey"
	| "getHeadcountReservationById"
	| "findActiveHeadcountReservationForRequisition"
	| "reserveHeadcount"
	| "releaseHeadcountReservation"
	| "consumeHeadcountReservation"
	| "releaseActiveHeadcountReservationsForRequisition"
	| "consumeActiveHeadcountReservationForRequisition"
	| "listHeadcountReservations"
	| "listHeadcountReservationsByPlanLineId"
	| "getHeadcountAvailability"
	| "getRecruitmentHeadcountHandoff"
	| "getWorkforcePlanVariance"
>;

async function transitionHeadcountReservationStatus(
	host: WorkforcePlanningHost & DrizzleWorkforcePlanningMethods,
	input: {
		organizationId: string;
		reservationId: HumanResourcesHeadcountReservationId;
		expectedVersion: number;
		actorUserId: string;
	},
	nextStatus: HeadcountReservationStatus,
	meta: { correlationId: string },
): Promise<Result<HeadcountReservation>> {
	const auditId = randomUUID();
	const nextVersion = input.expectedVersion + 1;
	try {
		const [rows] = await runNeonHttpTransaction<[HeadcountReservationSqlRow[]]>(
			(sql) => [
				sql`
					WITH mutated AS (
						UPDATE hr_headcount_reservation
						SET status = ${nextStatus},
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.reservationId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status = 'active'
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_headcount_reservation', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated JOIN audited ON true
				`,
			],
		);
		const row = rows[0];
		if (!row) {
			const again = await host.getHeadcountReservationById({
				organizationId: input.organizationId,
				reservationId: input.reservationId,
			});
			if (!again.ok) return again;
			if (again.data === null)
				return notFound("Headcount reservation not found");
			if (again.data.status !== "active") {
				return invalidState(
					`Cannot transition headcount reservation from ${again.data.status} to ${nextStatus}`,
				);
			}
			return missAfterOptimisticUpdate({
				found: true,
				entityLabel: "Headcount reservation",
			});
		}
		return mapHeadcountReservationSql(row);
	} catch (error) {
		return mapPersistenceFailure(
			error,
			`Failed to transition headcount reservation to ${nextStatus}`,
		);
	}
}

export const drizzleWorkforcePlanningMethods: DrizzleWorkforcePlanningMethods &
	ThisType<WorkforcePlanningHost & DrizzleWorkforcePlanningMethods> = {
	async findHeadcountPlanByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrHeadcountPlan)
				.where(
					and(
						eq(hrHeadcountPlan.organizationId, input.organizationId),
						eq(hrHeadcountPlan.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const mapped = mapHeadcountPlan(row);
			if (!mapped.ok) return mapped;
			return ok({
				plan: mapped.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find headcount plan by idempotency key",
			);
		}
	},

	async getHeadcountPlanById(input) {
		try {
			const rows = await db
				.select()
				.from(hrHeadcountPlan)
				.where(
					and(
						eq(hrHeadcountPlan.organizationId, input.organizationId),
						eq(hrHeadcountPlan.id, input.planId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapHeadcountPlan(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load headcount plan");
		}
	},

	async findApprovedHeadcountPlanForScope(input) {
		try {
			const rows = await db
				.select()
				.from(hrHeadcountPlan)
				.where(
					and(
						eq(hrHeadcountPlan.organizationId, input.organizationId),
						eq(hrHeadcountPlan.planningScopeKey, input.planningScopeKey),
						eq(hrHeadcountPlan.periodStart, input.periodStart),
						eq(hrHeadcountPlan.periodEnd, input.periodEnd),
						eq(hrHeadcountPlan.status, "approved"),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapHeadcountPlan(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find approved headcount plan",
			);
		}
	},

	async createHeadcountPlan(record, _ports, meta) {
		const periodCheck = assertValidHeadcountPeriod(
			record.periodStart,
			record.periodEnd,
		);
		if (!periodCheck.ok) return periodCheck;

		const brandedId = parseHumanResourcesHeadcountPlanId(randomUUID());
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[HeadcountPlanSqlRow[]]>(
				(sql) => [
					sql`
						WITH mutated AS (
							INSERT INTO hr_headcount_plan (
								id, organization_id, code, title, planning_scope_key, period_start,
								period_end, status, plan_version, supersedes_plan_id,
								cost_envelope_amount, cost_envelope_currency_code,
								create_idempotency_key, create_request_fingerprint, version,
								created_by, updated_by
							) VALUES (
								${brandedId.data}, ${record.organizationId}, ${record.code}, ${record.title},
								${record.planningScopeKey}, ${record.periodStart}, ${record.periodEnd},
								'draft', 1, NULL, ${record.costEnvelopeAmount}, ${record.costEnvelopeCurrencyCode},
								${record.createIdempotencyKey}, ${record.createRequestFingerprint}, 1,
								${record.createdBy}, ${record.createdBy}
							)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_headcount_plan', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated JOIN audited ON true
					`,
				],
			);
			const row = rows[0];
			if (!row) return conflict("Unable to create headcount plan");
			return mapHeadcountPlanSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const existing = await this.findHeadcountPlanByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!existing.ok) return existing;
				if (existing.data !== null) {
					if (
						existing.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(existing.data.plan);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueViolation(error)) {
				const message = uniqueConstraintMessage(error);
				if (/hr_headcount_plan_org_code_uidx/i.test(message)) {
					return conflict("Headcount plan code already exists");
				}
			}
			return mapPersistenceFailure(error, "Failed to create headcount plan");
		}
	},

	async updateHeadcountPlan(input, _ports, meta) {
		const existing = await this.getHeadcountPlanById({
			organizationId: input.organizationId,
			planId: input.planId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) return notFound("Headcount plan not found");
		const plan = existing.data;
		const versionCheck = assertExpectedVersion(
			plan.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		if (plan.status !== "draft" && plan.status !== "submitted") {
			return invalidState("Approved headcount plans are immutable");
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const nextTitle = input.title ?? plan.title;
		const nextCostAmount =
			input.costEnvelopeAmount !== undefined
				? input.costEnvelopeAmount
				: plan.costEnvelopeAmount;
		const nextCostCurrency =
			input.costEnvelopeCurrencyCode !== undefined
				? input.costEnvelopeCurrencyCode
				: plan.costEnvelopeCurrencyCode;

		try {
			const [rows] = await runNeonHttpTransaction<[HeadcountPlanSqlRow[]]>(
				(sql) => [
					sql`
						WITH mutated AS (
							UPDATE hr_headcount_plan
							SET title = ${nextTitle},
								cost_envelope_amount = ${nextCostAmount},
								cost_envelope_currency_code = ${nextCostCurrency},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.planId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status IN ('draft', 'submitted')
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_headcount_plan', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated JOIN audited ON true
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				const again = await this.getHeadcountPlanById({
					organizationId: input.organizationId,
					planId: input.planId,
				});
				if (!again.ok) return again;
				if (
					again.data !== null &&
					again.data.status !== "draft" &&
					again.data.status !== "submitted"
				) {
					return invalidState("Approved headcount plans are immutable");
				}
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Headcount plan",
				});
			}
			return mapHeadcountPlanSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update headcount plan");
		}
	},

	async transitionHeadcountPlanStatus(input, _ports, meta) {
		const existing = await this.getHeadcountPlanById({
			organizationId: input.organizationId,
			planId: input.planId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) return notFound("Headcount plan not found");
		const plan = existing.data;
		const versionCheck = assertExpectedVersion(
			plan.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const transitionCheck = assertHeadcountPlanStatusTransition(
			plan.status,
			input.status,
		);
		if (!transitionCheck.ok) return transitionCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const supersedeAuditId = randomUUID();
		const rejectionReason =
			input.status === "rejected" ? (input.rejectionReason ?? null) : null;

		try {
			const [rows] = await runNeonHttpTransaction<[HeadcountPlanSqlRow[]]>(
				(sql) => [
					sql`
						WITH mutated AS (
							UPDATE hr_headcount_plan
							SET status = ${input.status},
								approved_by = CASE WHEN ${input.status} = 'approved' THEN ${input.actorUserId} ELSE approved_by END,
								approved_at = CASE WHEN ${input.status} = 'approved' THEN now() ELSE approved_at END,
								rejected_by = CASE WHEN ${input.status} = 'rejected' THEN ${input.actorUserId} ELSE rejected_by END,
								rejected_at = CASE WHEN ${input.status} = 'rejected' THEN now() ELSE rejected_at END,
								rejection_reason = CASE WHEN ${input.status} = 'rejected' THEN ${rejectionReason} ELSE rejection_reason END,
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.planId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_headcount_plan', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						superseded_prior AS (
							UPDATE hr_headcount_plan p
							SET status = 'superseded',
								version = p.version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM mutated m
							WHERE p.id = m.supersedes_plan_id
								AND p.organization_id = m.organization_id
								AND p.status = 'approved'
								AND m.status = 'approved'
								AND m.supersedes_plan_id IS NOT NULL
							RETURNING p.id, p.organization_id
						),
						superseded_audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${supersedeAuditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_headcount_plan', id, 'UPDATE', '[]'::jsonb
							FROM superseded_prior
							RETURNING id
						)
						SELECT mutated.* FROM mutated
						JOIN audited ON true
						LEFT JOIN superseded_prior ON true
						LEFT JOIN superseded_audited ON true
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				const again = await this.getHeadcountPlanById({
					organizationId: input.organizationId,
					planId: input.planId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Headcount plan",
				});
			}
			return mapHeadcountPlanSql(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				const message = uniqueConstraintMessage(error);
				if (/hr_headcount_plan_org_scope_period_approved_uidx/i.test(message)) {
					return conflict(
						"An approved headcount plan already exists for this scope and period",
					);
				}
			}
			return mapPersistenceFailure(
				error,
				"Failed to transition headcount plan status",
			);
		}
	},

	async supersedeHeadcountPlan(record, _ports, meta) {
		const source = await this.getHeadcountPlanById({
			organizationId: record.organizationId,
			planId: record.sourcePlanId,
		});
		if (!source.ok) return source;
		if (source.data === null) return notFound("Headcount plan not found");
		if (source.data.status !== "approved") {
			return invalidState("Only approved headcount plans can be superseded");
		}
		const sourcePlan = source.data;
		const versionCheck = assertExpectedVersion(
			sourcePlan.version,
			record.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const brandedId = parseHumanResourcesHeadcountPlanId(randomUUID());
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[HeadcountPlanSqlRow[]]>(
				(sql) => [
					sql`
						WITH source_check AS (
							SELECT id FROM hr_headcount_plan
							WHERE id = ${record.sourcePlanId}
								AND organization_id = ${record.organizationId}
								AND status = 'approved'
								AND version = ${record.expectedVersion}
						),
						mutated AS (
							INSERT INTO hr_headcount_plan (
								id, organization_id, code, title, planning_scope_key, period_start,
								period_end, status, plan_version, supersedes_plan_id,
								cost_envelope_amount, cost_envelope_currency_code,
								create_idempotency_key, create_request_fingerprint, version,
								created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, ${record.code}, ${record.title},
								${sourcePlan.planningScopeKey}, ${sourcePlan.periodStart}, ${sourcePlan.periodEnd},
								'draft', ${sourcePlan.planVersion + 1}, source_check.id,
								${sourcePlan.costEnvelopeAmount}, ${sourcePlan.costEnvelopeCurrencyCode},
								${record.createIdempotencyKey}, ${record.createRequestFingerprint}, 1,
								${record.createdBy}, ${record.createdBy}
							FROM source_check
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_headcount_plan', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated JOIN audited ON true
					`,
					sql`
						INSERT INTO hr_headcount_plan_line (
							id, organization_id, plan_id, department_id, job_id, position_id,
							location_code, employment_type, planned_fte, planned_headcount,
							cost_envelope_amount, cost_envelope_currency_code, version,
							created_by, updated_by
						)
						SELECT
							gen_random_uuid(), organization_id, ${brandedId.data}, department_id, job_id,
							position_id, location_code, employment_type, planned_fte, planned_headcount,
							cost_envelope_amount, cost_envelope_currency_code, 1,
							${record.createdBy}, ${record.createdBy}
						FROM hr_headcount_plan_line
						WHERE plan_id = ${record.sourcePlanId}
							AND organization_id = ${record.organizationId}
							AND EXISTS (
								SELECT 1 FROM hr_headcount_plan
								WHERE id = ${brandedId.data} AND organization_id = ${record.organizationId}
							)
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict(
					"Source headcount plan is no longer approved or its version is stale",
				);
			}
			return mapHeadcountPlanSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const existing = await this.findHeadcountPlanByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!existing.ok) return existing;
				if (existing.data !== null) {
					if (
						existing.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(existing.data.plan);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueViolation(error)) {
				const message = uniqueConstraintMessage(error);
				if (/hr_headcount_plan_org_code_uidx/i.test(message)) {
					return conflict("Headcount plan code already exists");
				}
			}
			return mapPersistenceFailure(error, "Failed to supersede headcount plan");
		}
	},

	async listHeadcountPlans(input) {
		try {
			const conditions = [
				eq(hrHeadcountPlan.organizationId, input.organizationId),
			];
			if (input.status !== undefined) {
				conditions.push(eq(hrHeadcountPlan.status, input.status));
			}
			if (input.planningScopeKey !== undefined) {
				conditions.push(
					eq(hrHeadcountPlan.planningScopeKey, input.planningScopeKey),
				);
			}
			const offset = (input.page - 1) * input.pageSize;
			const [rows, countRows] = await Promise.all([
				db
					.select()
					.from(hrHeadcountPlan)
					.where(and(...conditions))
					.orderBy(desc(hrHeadcountPlan.createdAt))
					.limit(input.pageSize)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(hrHeadcountPlan)
					.where(and(...conditions)),
			]);
			const plans: HeadcountPlan[] = [];
			for (const row of rows) {
				const mapped = mapHeadcountPlan(row);
				if (!mapped.ok) return mapped;
				plans.push(mapped.data);
			}
			return ok({
				plans,
				totalCount: countRows[0]?.count ?? 0,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list headcount plans");
		}
	},

	async getHeadcountPlanLineById(input) {
		try {
			const rows = await db
				.select()
				.from(hrHeadcountPlanLine)
				.where(
					and(
						eq(hrHeadcountPlanLine.organizationId, input.organizationId),
						eq(hrHeadcountPlanLine.id, input.planLineId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapHeadcountPlanLine(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load headcount plan line");
		}
	},

	async listHeadcountPlanLinesByPlanId(input) {
		try {
			const rows = await db
				.select()
				.from(hrHeadcountPlanLine)
				.where(
					and(
						eq(hrHeadcountPlanLine.organizationId, input.organizationId),
						eq(hrHeadcountPlanLine.planId, input.planId),
					),
				)
				.orderBy(desc(hrHeadcountPlanLine.createdAt));
			const lines: HeadcountPlanLine[] = [];
			for (const row of rows) {
				const mapped = mapHeadcountPlanLine(row);
				if (!mapped.ok) return mapped;
				lines.push(mapped.data);
			}
			return ok(lines);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list headcount plan lines",
			);
		}
	},

	async addHeadcountPlanLine(record, _ports, meta) {
		const plan = await this.getHeadcountPlanById({
			organizationId: record.organizationId,
			planId: record.planId,
		});
		if (!plan.ok) return plan;
		if (plan.data === null) return notFound("Headcount plan not found");
		if (plan.data.status !== "draft" && plan.data.status !== "submitted") {
			return invalidState("Approved headcount plans are immutable");
		}

		const brandedId = parseHumanResourcesHeadcountPlanLineId(randomUUID());
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[HeadcountPlanLineSqlRow[]]>(
				(sql) => [
					sql`
						WITH plan_check AS (
							SELECT id FROM hr_headcount_plan
							WHERE id = ${record.planId}
								AND organization_id = ${record.organizationId}
								AND status IN ('draft', 'submitted')
						),
						mutated AS (
							INSERT INTO hr_headcount_plan_line (
								id, organization_id, plan_id, department_id, job_id, position_id,
								location_code, employment_type, planned_fte, planned_headcount,
								cost_envelope_amount, cost_envelope_currency_code, version,
								created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, plan_check.id, ${record.departmentId},
								${record.jobId}, ${record.positionId}, ${record.locationCode},
								${record.employmentType}, ${record.plannedFte}, ${record.plannedHeadcount},
								${record.costEnvelopeAmount}, ${record.costEnvelopeCurrencyCode}, 1,
								${record.createdBy}, ${record.createdBy}
							FROM plan_check
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_headcount_plan_line', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated JOIN audited ON true
					`,
				],
			);
			const row = rows[0];
			if (!row) return invalidState("Approved headcount plans are immutable");
			return mapHeadcountPlanLineSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to add headcount plan line");
		}
	},

	async updateHeadcountPlanLine(input, _ports, meta) {
		const line = await this.getHeadcountPlanLineById({
			organizationId: input.organizationId,
			planLineId: input.planLineId,
		});
		if (!line.ok) return line;
		if (line.data === null) return notFound("Headcount plan line not found");
		const plan = await this.getHeadcountPlanById({
			organizationId: input.organizationId,
			planId: line.data.planId,
		});
		if (!plan.ok) return plan;
		if (
			plan.data === null ||
			(plan.data.status !== "draft" && plan.data.status !== "submitted")
		) {
			return invalidState("Approved headcount plans are immutable");
		}
		const versionCheck = assertExpectedVersion(
			line.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const nextDepartmentId =
			input.departmentId !== undefined
				? input.departmentId
				: line.data.departmentId;
		const nextJobId = input.jobId !== undefined ? input.jobId : line.data.jobId;
		const nextPositionId =
			input.positionId !== undefined ? input.positionId : line.data.positionId;
		const nextLocationCode =
			input.locationCode !== undefined
				? input.locationCode
				: line.data.locationCode;
		const nextEmploymentType =
			input.employmentType !== undefined
				? input.employmentType
				: line.data.employmentType;
		const nextPlannedFte = input.plannedFte ?? line.data.plannedFte;
		const nextPlannedHeadcount =
			input.plannedHeadcount ?? line.data.plannedHeadcount;
		const nextCostAmount =
			input.costEnvelopeAmount !== undefined
				? input.costEnvelopeAmount
				: line.data.costEnvelopeAmount;
		const nextCostCurrency =
			input.costEnvelopeCurrencyCode !== undefined
				? input.costEnvelopeCurrencyCode
				: line.data.costEnvelopeCurrencyCode;

		try {
			const [rows] = await runNeonHttpTransaction<[HeadcountPlanLineSqlRow[]]>(
				(sql) => [
					sql`
						WITH mutated AS (
							UPDATE hr_headcount_plan_line l
							SET department_id = ${nextDepartmentId},
								job_id = ${nextJobId},
								position_id = ${nextPositionId},
								location_code = ${nextLocationCode},
								employment_type = ${nextEmploymentType},
								planned_fte = ${nextPlannedFte},
								planned_headcount = ${nextPlannedHeadcount},
								cost_envelope_amount = ${nextCostAmount},
								cost_envelope_currency_code = ${nextCostCurrency},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM hr_headcount_plan p
							WHERE l.id = ${input.planLineId}
								AND l.organization_id = ${input.organizationId}
								AND l.version = ${input.expectedVersion}
								AND p.id = l.plan_id
								AND p.status IN ('draft', 'submitted')
							RETURNING l.*
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_headcount_plan_line', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated JOIN audited ON true
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				const again = await this.getHeadcountPlanLineById({
					organizationId: input.organizationId,
					planLineId: input.planLineId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Headcount plan line",
				});
			}
			return mapHeadcountPlanLineSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to update headcount plan line",
			);
		}
	},

	async removeHeadcountPlanLine(input, _ports, meta) {
		const line = await this.getHeadcountPlanLineById({
			organizationId: input.organizationId,
			planLineId: input.planLineId,
		});
		if (!line.ok) return line;
		if (line.data === null) return notFound("Headcount plan line not found");
		const plan = await this.getHeadcountPlanById({
			organizationId: input.organizationId,
			planId: line.data.planId,
		});
		if (!plan.ok) return plan;
		if (
			plan.data === null ||
			(plan.data.status !== "draft" && plan.data.status !== "submitted")
		) {
			return invalidState("Approved headcount plans are immutable");
		}
		const versionCheck = assertExpectedVersion(
			line.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
						WITH mutated AS (
							DELETE FROM hr_headcount_plan_line l
							USING hr_headcount_plan p
							WHERE l.id = ${input.planLineId}
								AND l.organization_id = ${input.organizationId}
								AND l.version = ${input.expectedVersion}
								AND p.id = l.plan_id
								AND p.status IN ('draft', 'submitted')
							RETURNING l.id, l.organization_id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_headcount_plan_line', id, 'DELETE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.id FROM mutated JOIN audited ON true
					`,
			]);
			const row = rows[0];
			if (!row) {
				const again = await this.getHeadcountPlanLineById({
					organizationId: input.organizationId,
					planLineId: input.planLineId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Headcount plan line",
				});
			}
			return ok(undefined);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to remove headcount plan line",
			);
		}
	},

	async findHeadcountReservationByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrHeadcountReservation)
				.where(
					and(
						eq(hrHeadcountReservation.organizationId, input.organizationId),
						eq(
							hrHeadcountReservation.createIdempotencyKey,
							input.idempotencyKey,
						),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const mapped = mapHeadcountReservation(row);
			if (!mapped.ok) return mapped;
			return ok({
				reservation: mapped.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find headcount reservation by idempotency key",
			);
		}
	},

	async getHeadcountReservationById(input) {
		try {
			const rows = await db
				.select()
				.from(hrHeadcountReservation)
				.where(
					and(
						eq(hrHeadcountReservation.organizationId, input.organizationId),
						eq(hrHeadcountReservation.id, input.reservationId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapHeadcountReservation(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load headcount reservation",
			);
		}
	},

	async findActiveHeadcountReservationForRequisition(input) {
		try {
			const rows = await db
				.select()
				.from(hrHeadcountReservation)
				.where(
					and(
						eq(hrHeadcountReservation.organizationId, input.organizationId),
						eq(hrHeadcountReservation.requisitionId, input.requisitionId),
						eq(hrHeadcountReservation.status, "active"),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapHeadcountReservation(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find active headcount reservation for requisition",
			);
		}
	},

	async reserveHeadcount(record, _ports, meta) {
		const existingIdempotent =
			await this.findHeadcountReservationByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.createIdempotencyKey,
			});
		if (!existingIdempotent.ok) return existingIdempotent;
		if (existingIdempotent.data !== null) {
			if (
				existingIdempotent.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existingIdempotent.data.reservation);
			}
			return conflict("Idempotency key already used with different data");
		}

		const requisition = await this.getRequisitionById({
			organizationId: record.organizationId,
			requisitionId: record.requisitionId,
		});
		if (!requisition.ok) return requisition;
		if (requisition.data === null) {
			return notFound(
				"Requisition not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const line = await this.getHeadcountPlanLineById({
			organizationId: record.organizationId,
			planLineId: record.planLineId,
		});
		if (!line.ok) return line;
		if (line.data === null) return notFound("Headcount plan line not found");
		const planLine = line.data;

		const plan = await this.getHeadcountPlanById({
			organizationId: record.organizationId,
			planId: planLine.planId,
		});
		if (!plan.ok) return plan;
		if (plan.data === null || plan.data.status !== "approved") {
			return invalidState("Headcount reservations require an approved plan");
		}

		const existingReservations =
			await this.listHeadcountReservationsByPlanLineId({
				organizationId: record.organizationId,
				planLineId: record.planLineId,
			});
		if (!existingReservations.ok) return existingReservations;
		const availability = computeLineAvailability({
			line: planLine,
			reservations: existingReservations.data,
		});
		const availabilityCheck = assertReservationWithinAvailability({
			availableFte: availability.availableFte,
			availableHeadcount: availability.availableHeadcount,
			reservedFte: record.reservedFte,
			reservedHeadcount: record.reservedHeadcount,
		});
		if (!availabilityCheck.ok) return availabilityCheck;

		const brandedId = parseHumanResourcesHeadcountReservationId(randomUUID());
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<
				[HeadcountReservationSqlRow[]]
			>((sql) => [
				sql`
						WITH mutated AS (
							INSERT INTO hr_headcount_reservation (
								id, organization_id, plan_id, plan_line_id, requisition_id,
								reserved_fte, reserved_headcount, status, create_idempotency_key,
								create_request_fingerprint, version, created_by, updated_by
							) VALUES (
								${brandedId.data}, ${record.organizationId}, ${planLine.planId},
								${record.planLineId}, ${record.requisitionId}, ${record.reservedFte},
								${record.reservedHeadcount}, 'active', ${record.createIdempotencyKey},
								${record.createRequestFingerprint}, 1, ${record.createdBy}, ${record.createdBy}
							)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_headcount_reservation', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated JOIN audited ON true
					`,
			]);
			const row = rows[0];
			if (!row) return conflict("Unable to reserve headcount");
			return mapHeadcountReservationSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findHeadcountReservationByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.reservation);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueViolation(error)) {
				const message = uniqueConstraintMessage(error);
				if (
					/hr_headcount_reservation_org_requisition_active_uidx/i.test(message)
				) {
					return conflict(
						"Requisition already has an active headcount reservation",
					);
				}
			}
			return mapPersistenceFailure(error, "Failed to reserve headcount");
		}
	},

	async releaseHeadcountReservation(input, _ports, meta) {
		return transitionHeadcountReservationStatus(this, input, "released", meta);
	},

	async consumeHeadcountReservation(input, _ports, meta) {
		return transitionHeadcountReservationStatus(this, input, "consumed", meta);
	},

	async releaseActiveHeadcountReservationsForRequisition(input, ports, meta) {
		try {
			const rows = await db
				.select()
				.from(hrHeadcountReservation)
				.where(
					and(
						eq(hrHeadcountReservation.organizationId, input.organizationId),
						eq(hrHeadcountReservation.requisitionId, input.requisitionId),
						eq(hrHeadcountReservation.status, "active"),
					),
				);
			for (const row of rows) {
				const mapped = mapHeadcountReservation(row);
				if (!mapped.ok) return mapped;
				const released = await this.releaseHeadcountReservation(
					{
						organizationId: input.organizationId,
						reservationId: mapped.data.id,
						expectedVersion: mapped.data.version,
						actorUserId: input.actorUserId,
					},
					ports,
					meta,
				);
				if (!released.ok) return released;
			}
			return ok(undefined);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to release active headcount reservations for requisition",
			);
		}
	},

	async consumeActiveHeadcountReservationForRequisition(input, ports, meta) {
		const active = await this.findActiveHeadcountReservationForRequisition({
			organizationId: input.organizationId,
			requisitionId: input.requisitionId,
		});
		if (!active.ok) return active;
		if (active.data === null) return ok(undefined);
		const consumed = await this.consumeHeadcountReservation(
			{
				organizationId: input.organizationId,
				reservationId: active.data.id,
				expectedVersion: active.data.version,
				actorUserId: input.actorUserId,
			},
			ports,
			meta,
		);
		if (!consumed.ok) return consumed;
		return ok(undefined);
	},

	async listHeadcountReservations(input) {
		try {
			const conditions = [
				eq(hrHeadcountReservation.organizationId, input.organizationId),
			];
			if (input.planId !== undefined) {
				conditions.push(eq(hrHeadcountReservation.planId, input.planId));
			}
			if (input.requisitionId !== undefined) {
				conditions.push(
					eq(hrHeadcountReservation.requisitionId, input.requisitionId),
				);
			}
			const offset = (input.page - 1) * input.pageSize;
			const [rows, countRows] = await Promise.all([
				db
					.select()
					.from(hrHeadcountReservation)
					.where(and(...conditions))
					.orderBy(desc(hrHeadcountReservation.createdAt))
					.limit(input.pageSize)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(hrHeadcountReservation)
					.where(and(...conditions)),
			]);
			const reservations: HeadcountReservation[] = [];
			for (const row of rows) {
				const mapped = mapHeadcountReservation(row);
				if (!mapped.ok) return mapped;
				reservations.push(mapped.data);
			}
			return ok({
				reservations,
				totalCount: countRows[0]?.count ?? 0,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list headcount reservations",
			);
		}
	},

	async listHeadcountReservationsByPlanLineId(input) {
		try {
			const rows = await db
				.select()
				.from(hrHeadcountReservation)
				.where(
					and(
						eq(hrHeadcountReservation.organizationId, input.organizationId),
						eq(hrHeadcountReservation.planLineId, input.planLineId),
					),
				);
			const reservations: HeadcountReservation[] = [];
			for (const row of rows) {
				const mapped = mapHeadcountReservation(row);
				if (!mapped.ok) return mapped;
				reservations.push(mapped.data);
			}
			return ok(reservations);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list headcount reservations for plan line",
			);
		}
	},

	async getHeadcountAvailability(input) {
		try {
			const lineRows = await db
				.select()
				.from(hrHeadcountPlanLine)
				.where(
					and(
						eq(hrHeadcountPlanLine.organizationId, input.organizationId),
						eq(hrHeadcountPlanLine.id, input.planLineId),
					),
				)
				.limit(1);
			const lineRow = lineRows[0];
			if (!lineRow) return ok(null);
			const line = mapHeadcountPlanLine(lineRow);
			if (!line.ok) return line;

			const reservations = await this.listHeadcountReservationsByPlanLineId({
				organizationId: input.organizationId,
				planLineId: input.planLineId,
			});
			if (!reservations.ok) return reservations;

			const availability = computeLineAvailability({
				line: line.data,
				reservations: reservations.data,
			});
			return ok({
				planId: line.data.planId,
				planLineId: line.data.id,
				lines: [availability],
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load headcount availability",
			);
		}
	},

	async getRecruitmentHeadcountHandoff(input) {
		const active = await this.findActiveHeadcountReservationForRequisition({
			organizationId: input.organizationId,
			requisitionId: input.requisitionId,
		});
		if (!active.ok) return active;
		if (active.data === null) {
			return ok({
				organizationId: input.organizationId,
				requisitionId: input.requisitionId,
				approvedPlan: null,
				availability: null,
				activeReservation: null,
			});
		}

		const plan = await this.getHeadcountPlanById({
			organizationId: input.organizationId,
			planId: active.data.planId,
		});
		if (!plan.ok) return plan;

		const availability = await this.getHeadcountAvailability({
			organizationId: input.organizationId,
			planLineId: active.data.planLineId,
		});
		if (!availability.ok) return availability;

		return ok({
			organizationId: input.organizationId,
			requisitionId: input.requisitionId,
			approvedPlan: plan.data,
			availability: availability.data
				? (availability.data.lines[0] ?? null)
				: null,
			activeReservation: active.data,
		});
	},

	async getWorkforcePlanVariance(input) {
		try {
			const lineRows = await db
				.select()
				.from(hrHeadcountPlanLine)
				.where(
					and(
						eq(hrHeadcountPlanLine.organizationId, input.organizationId),
						eq(hrHeadcountPlanLine.planId, input.planId),
					),
				);
			const varianceLines: WorkforcePlanVarianceLine[] = [];
			for (const row of lineRows) {
				const line = mapHeadcountPlanLine(row);
				if (!line.ok) return line;
				const reservations = await this.listHeadcountReservationsByPlanLineId({
					organizationId: input.organizationId,
					planLineId: line.data.id,
				});
				if (!reservations.ok) return reservations;
				const availability = computeLineAvailability({
					line: line.data,
					reservations: reservations.data,
				});
				const plannedFte = Number(line.data.plannedFte);
				const consumedFte = Number(availability.consumedFte);
				varianceLines.push({
					...availability,
					varianceFte: (plannedFte - consumedFte).toFixed(4),
					varianceHeadcount:
						line.data.plannedHeadcount - availability.consumedHeadcount,
				});
			}
			return ok({ planId: input.planId, lines: varianceLines });
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to compute workforce plan variance",
			);
		}
	},
};

export function attachDrizzleWorkforcePlanning(
	target: WorkforcePlanningHost,
): void {
	Object.assign(target, drizzleWorkforcePlanningMethods);
}
