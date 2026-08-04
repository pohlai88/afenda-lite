import { randomUUID } from "node:crypto";
import {
	audit as afendaAudit,
	type PreparedTransactionalAuditInsertValues,
} from "@afenda/audit";
import {
	database as afendaDatabase,
	and,
	desc,
	eq,
	hrHeadcountPlan,
	hrHeadcountPlanLine,
	hrHeadcountReservation,
	sql,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import {
	HUMAN_RESOURCES_HEADCOUNT_PLAN_APPROVED_EVENT,
	HUMAN_RESOURCES_HEADCOUNT_RESERVATION_CONSUMED_EVENT,
	HUMAN_RESOURCES_HEADCOUNT_RESERVATION_RELEASED_EVENT,
	HUMAN_RESOURCES_HEADCOUNT_RESERVED_EVENT,
} from "@afenda/events/schemas";
import type { HumanResourcesStore } from "../../../composition/store/index";
import type {
	HeadcountPlan,
	HeadcountPlanLine,
	HeadcountReservation,
	WorkforcePlanVariance,
} from "../../../kernel/contracts";
import type { HumanResourcesMutationMeta } from "../../../kernel/emissions/mutation-meta";
import { assertExpectedVersion } from "../../../kernel/execution/concurrency";
import {
	conflict,
	invalidState,
	missAfterOptimisticUpdate,
	notFound,
} from "../../../kernel/execution/domain-guards";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../../../kernel/execution/error-codes";
import {
	isCreateIdempotencyUniqueViolation,
	isPostgresUniqueConstraint,
	mapPersistenceFailure,
} from "../../../kernel/execution/persistence-errors";
import {
	runSequential,
	sequentialReturn,
} from "../../../kernel/execution/run-sequential";
import {
	type HumanResourcesHeadcountReservationId,
	parseHumanResourcesDepartmentId,
	parseHumanResourcesHeadcountPlanId,
	parseHumanResourcesHeadcountPlanLineId,
	parseHumanResourcesHeadcountReservationId,
	parseHumanResourcesJobId,
	parseHumanResourcesPositionId,
	parseHumanResourcesRequisitionId,
} from "../../../kernel/identity/brands";
import { computeLineAvailability } from "../availability";
import {
	assertHeadcountPlanStatusTransition,
	assertReservationWithinAvailability,
	assertValidHeadcountPeriod,
} from "../guards";
import {
	type HeadcountReservationStatus,
	headcountEmploymentTypeSchema,
	headcountPlanStatusSchema,
	headcountReservationStatusSchema,
} from "../status";
import { computeWorkforcePlanVarianceLine } from "../variance";

const HR_REGEX_1 = /hr_headcount_plan_org_code_uidx/i;
const HR_REGEX_2 = /hr_headcount_plan_org_scope_period_approved_uidx/i;
const HR_REGEX_3 = /hr_headcount_reservation_org_requisition_active_uidx/i;
const WORKFORCE_PLANNING_AUDIT_SOURCE =
	"human-resources.workforce-planning-drizzle";

function prepareWorkforcePlanningAudit(input: {
	action: "CREATE" | "DELETE" | "UPDATE";
	actorUserId: string;
	correlationId: string;
	entity:
		| "hr_headcount_plan"
		| "hr_headcount_plan_line"
		| "hr_headcount_reservation";
	entityId: string;
	meta: HumanResourcesMutationMeta;
	newValue?: Record<string, unknown> | null | undefined;
	oldValue?: Record<string, unknown> | null | undefined;
	organizationId: string;
	reasonCode?: string | null | undefined;
}): Result<PreparedTransactionalAuditInsertValues> {
	return afendaAudit.transaction.prepare({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		module: "human-resources",
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		oldValue: input.oldValue,
		newValue: input.newValue,
		eventContext: {
			version: 1,
			outcome: "SUCCEEDED",
			source: WORKFORCE_PLANNING_AUDIT_SOURCE,
			causationId:
				input.meta.causationId ??
				input.meta.idempotencyKey ??
				input.correlationId,
			reasonCode: input.reasonCode ?? null,
		},
	});
}

function retainWhenUndefined<T>(next: T | undefined, current: T): T {
	return next === undefined ? current : next;
}

type WorkforcePlanVarianceLine = WorkforcePlanVariance["lines"][number];

interface HeadcountPlanSqlRow {
	approved_at: Date | null;
	approved_by: string | null;
	code: string;
	cost_envelope_amount: string | null;
	cost_envelope_currency_code: string | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	id: string;
	organization_id: string;
	period_end: string;
	period_start: string;
	plan_version: number;
	planning_scope_key: string;
	rejected_at: Date | null;
	rejected_by: string | null;
	rejection_reason: string | null;
	status: string;
	supersedes_plan_id: string | null;
	title: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface HeadcountPlanLineSqlRow {
	cost_envelope_amount: string | null;
	cost_envelope_currency_code: string | null;
	created_at: Date;
	created_by: string;
	department_id: string | null;
	employment_type: string | null;
	id: string;
	job_id: string | null;
	location_code: string | null;
	organization_id: string;
	plan_id: string;
	planned_fte: string;
	planned_headcount: number;
	position_id: string | null;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface HeadcountReservationSqlRow {
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	id: string;
	organization_id: string;
	plan_id: string;
	plan_line_id: string;
	requisition_id: string;
	reserved_fte: string;
	reserved_headcount: number;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

function mapHeadcountPlan(
	row: typeof hrHeadcountPlan.$inferSelect,
): Result<HeadcountPlan> {
	const id = parseHumanResourcesHeadcountPlanId(row.id);
	if (!id.ok) {
		return id;
	}
	let supersedesPlanId: HeadcountPlan["supersedesPlanId"] = null;
	if (row.supersedesPlanId !== null) {
		const parsed = parseHumanResourcesHeadcountPlanId(row.supersedesPlanId);
		if (!parsed.ok) {
			return parsed;
		}
		supersedesPlanId = parsed.data;
	}
	const status = headcountPlanStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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
	if (!id.ok) {
		return id;
	}
	let supersedesPlanId: HeadcountPlan["supersedesPlanId"] = null;
	if (row.supersedes_plan_id !== null) {
		const parsed = parseHumanResourcesHeadcountPlanId(row.supersedes_plan_id);
		if (!parsed.ok) {
			return parsed;
		}
		supersedesPlanId = parsed.data;
	}
	const status = headcountPlanStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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
	if (!id.ok) {
		return id;
	}
	const planId = parseHumanResourcesHeadcountPlanId(row.planId);
	if (!planId.ok) {
		return planId;
	}
	let departmentId: HeadcountPlanLine["departmentId"] = null;
	if (row.departmentId !== null) {
		const parsed = parseHumanResourcesDepartmentId(row.departmentId);
		if (!parsed.ok) {
			return parsed;
		}
		departmentId = parsed.data;
	}
	let jobId: HeadcountPlanLine["jobId"] = null;
	if (row.jobId !== null) {
		const parsed = parseHumanResourcesJobId(row.jobId);
		if (!parsed.ok) {
			return parsed;
		}
		jobId = parsed.data;
	}
	let positionId: HeadcountPlanLine["positionId"] = null;
	if (row.positionId !== null) {
		const parsed = parseHumanResourcesPositionId(row.positionId);
		if (!parsed.ok) {
			return parsed;
		}
		positionId = parsed.data;
	}
	const employmentType = headcountEmploymentTypeSchema
		.nullable()
		.safeParse(row.employmentType);
	if (!employmentType.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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
	if (!id.ok) {
		return id;
	}
	const planId = parseHumanResourcesHeadcountPlanId(row.plan_id);
	if (!planId.ok) {
		return planId;
	}
	let departmentId: HeadcountPlanLine["departmentId"] = null;
	if (row.department_id !== null) {
		const parsed = parseHumanResourcesDepartmentId(row.department_id);
		if (!parsed.ok) {
			return parsed;
		}
		departmentId = parsed.data;
	}
	let jobId: HeadcountPlanLine["jobId"] = null;
	if (row.job_id !== null) {
		const parsed = parseHumanResourcesJobId(row.job_id);
		if (!parsed.ok) {
			return parsed;
		}
		jobId = parsed.data;
	}
	let positionId: HeadcountPlanLine["positionId"] = null;
	if (row.position_id !== null) {
		const parsed = parseHumanResourcesPositionId(row.position_id);
		if (!parsed.ok) {
			return parsed;
		}
		positionId = parsed.data;
	}
	const employmentType = headcountEmploymentTypeSchema
		.nullable()
		.safeParse(row.employment_type);
	if (!employmentType.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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
	if (!id.ok) {
		return id;
	}
	const planId = parseHumanResourcesHeadcountPlanId(row.planId);
	if (!planId.ok) {
		return planId;
	}
	const planLineId = parseHumanResourcesHeadcountPlanLineId(row.planLineId);
	if (!planLineId.ok) {
		return planLineId;
	}
	const requisitionId = parseHumanResourcesRequisitionId(row.requisitionId);
	if (!requisitionId.ok) {
		return requisitionId;
	}
	const status = headcountReservationStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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
	if (!id.ok) {
		return id;
	}
	const planId = parseHumanResourcesHeadcountPlanId(row.plan_id);
	if (!planId.ok) {
		return planId;
	}
	const planLineId = parseHumanResourcesHeadcountPlanLineId(row.plan_line_id);
	if (!planLineId.ok) {
		return planLineId;
	}
	const requisitionId = parseHumanResourcesRequisitionId(row.requisition_id);
	if (!requisitionId.ok) {
		return requisitionId;
	}
	const status = headcountReservationStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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

type WorkforcePlanningHost = Pick<
	HumanResourcesStore,
	"getRequisitionById" | "listWorkforcePlanActualAssignments"
>;

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

function headcountEventPayloadJson(input: {
	organizationId: string;
	entityType: string;
	entityId: string;
	actorId: string;
	correlationId: string;
}): string {
	return JSON.stringify({
		organizationId: input.organizationId,
		entityType: input.entityType,
		entityId: input.entityId,
		actorId: input.actorId,
		correlationId: input.correlationId,
	});
}

async function transitionHeadcountReservationStatus(
	host: WorkforcePlanningHost & DrizzleWorkforcePlanningMethods,
	input: {
		organizationId: string;
		reservationId: HumanResourcesHeadcountReservationId;
		expectedVersion: number;
		actorUserId: string;
	},
	nextStatus: HeadcountReservationStatus,
	meta: HumanResourcesMutationMeta,
): Promise<Result<HeadcountReservation>> {
	const auditId = randomUUID();
	const nextVersion = input.expectedVersion + 1;
	const eventId = randomUUID();
	const eventType =
		nextStatus === "released"
			? HUMAN_RESOURCES_HEADCOUNT_RESERVATION_RELEASED_EVENT
			: HUMAN_RESOURCES_HEADCOUNT_RESERVATION_CONSUMED_EVENT;
	const payloadJson = headcountEventPayloadJson({
		organizationId: input.organizationId,
		entityType: "hr_headcount_reservation",
		entityId: input.reservationId,
		actorId: input.actorUserId,
		correlationId: meta.correlationId,
	});
	const preparedAudit = prepareWorkforcePlanningAudit({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		entity: "hr_headcount_reservation",
		entityId: input.reservationId,
		action: "UPDATE",
		oldValue: { status: "active", version: input.expectedVersion },
		newValue: { status: nextStatus, version: nextVersion },
		meta,
		reasonCode: nextStatus.toUpperCase(),
	});
	if (!preparedAudit.ok) {
		return preparedAudit;
	}
	const audit = preparedAudit.data;
	try {
		const [rows] = await afendaDatabase.transaction((sqlValue9) => [
			sqlValue9`
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
							${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
							${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
							${audit.ipAddress}, ${audit.userAgent}
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${eventType},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated JOIN audited ON true JOIN outboxed ON true
				`,
		]);
		const [row] = rows;
		if (!row) {
			const again = await host.getHeadcountReservationById({
				organizationId: input.organizationId,
				reservationId: input.reservationId,
			});
			if (!again.ok) {
				return again;
			}
			if (again.data === null) {
				return notFound("Headcount reservation not found");
			}
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrHeadcountPlan)
				.where(
					and(
						eq(hrHeadcountPlan.organizationId, input.organizationId),
						eq(hrHeadcountPlan.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const mapped = mapHeadcountPlan(row);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrHeadcountPlan)
				.where(
					and(
						eq(hrHeadcountPlan.organizationId, input.organizationId),
						eq(hrHeadcountPlan.id, input.planId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapHeadcountPlan(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load headcount plan");
		}
	},

	async findApprovedHeadcountPlanForScope(input) {
		try {
			const rows = await afendaDatabase.client
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
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
		if (!periodCheck.ok) {
			return periodCheck;
		}

		const brandedId = parseHumanResourcesHeadcountPlanId(randomUUID());
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const preparedAudit = prepareWorkforcePlanningAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_headcount_plan",
			entityId: brandedId.data,
			action: "CREATE",
			newValue: {
				code: record.code,
				planningScopeKey: record.planningScopeKey,
				status: "draft",
				version: 1,
			},
			meta,
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;

		try {
			const [rows] = await afendaDatabase.transaction((sqlValue8) => [
				sqlValue8`
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
								${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated JOIN audited ON true
					`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict("Unable to create headcount plan");
			}
			return mapHeadcountPlanSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const existing = await this.findHeadcountPlanByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!existing.ok) {
					return existing;
				}
				if (existing.data !== null) {
					if (
						existing.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return errorResult.ok(existing.data.plan);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueConstraint(error, HR_REGEX_1)) {
				return conflict("Headcount plan code already exists");
			}
			return mapPersistenceFailure(error, "Failed to create headcount plan");
		}
	},

	async updateHeadcountPlan(input, _ports, meta) {
		const existing = await this.getHeadcountPlanById({
			organizationId: input.organizationId,
			planId: input.planId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Headcount plan not found");
		}
		const plan = existing.data;
		const versionCheck = assertExpectedVersion(
			plan.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		if (plan.status !== "draft" && plan.status !== "submitted") {
			return invalidState("Approved headcount plans are immutable");
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const nextTitle = input.title ?? plan.title;
		const nextCostAmount =
			input.costEnvelopeAmount === undefined
				? plan.costEnvelopeAmount
				: input.costEnvelopeAmount;
		const nextCostCurrency =
			input.costEnvelopeCurrencyCode === undefined
				? plan.costEnvelopeCurrencyCode
				: input.costEnvelopeCurrencyCode;
		const preparedAudit = prepareWorkforcePlanningAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_headcount_plan",
			entityId: input.planId,
			action: "UPDATE",
			oldValue: {
				title: plan.title,
				costEnvelopeAmount: plan.costEnvelopeAmount,
				costEnvelopeCurrencyCode: plan.costEnvelopeCurrencyCode,
				version: plan.version,
			},
			newValue: {
				title: nextTitle,
				costEnvelopeAmount: nextCostAmount,
				costEnvelopeCurrencyCode: nextCostCurrency,
				version: nextVersion,
			},
			meta,
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;

		try {
			const [rows] = await afendaDatabase.transaction((sqlValue7) => [
				sqlValue7`
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
								${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated JOIN audited ON true
					`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getHeadcountPlanById({
					organizationId: input.organizationId,
					planId: input.planId,
				});
				if (!again.ok) {
					return again;
				}
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Headcount plan not found");
		}
		const plan = existing.data;
		const versionCheck = assertExpectedVersion(
			plan.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transitionCheck = assertHeadcountPlanStatusTransition(
			plan.status,
			input.status,
		);
		if (!transitionCheck.ok) {
			return transitionCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const supersedeAuditId = randomUUID();
		const outboxId = input.status === "approved" ? randomUUID() : null;
		const outboxPayload =
			input.status === "approved"
				? headcountEventPayloadJson({
						organizationId: input.organizationId,
						entityType: "hr_headcount_plan",
						entityId: input.planId,
						actorId: input.actorUserId,
						correlationId: meta.correlationId,
					})
				: null;
		const rejectionReason =
			input.status === "rejected" ? (input.rejectionReason ?? null) : null;
		const preparedAudit = prepareWorkforcePlanningAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_headcount_plan",
			entityId: input.planId,
			action: "UPDATE",
			oldValue: { status: plan.status, version: plan.version },
			newValue: {
				status: input.status,
				version: nextVersion,
				rejectionReason,
			},
			meta,
			reasonCode: input.status.toUpperCase(),
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const preparedSupersededAudit =
			input.status === "approved" && plan.supersedesPlanId !== null
				? prepareWorkforcePlanningAudit({
						organizationId: input.organizationId,
						actorUserId: input.actorUserId,
						correlationId: meta.correlationId,
						entity: "hr_headcount_plan",
						entityId: plan.supersedesPlanId,
						action: "UPDATE",
						oldValue: { status: "approved" },
						newValue: { status: "superseded" },
						meta,
						reasonCode: "SUPERSEDED_BY_APPROVED_REVISION",
					})
				: null;
		let supersededAudit: PreparedTransactionalAuditInsertValues | null = null;
		if (preparedSupersededAudit !== null) {
			if (!preparedSupersededAudit.ok) {
				return preparedSupersededAudit;
			}
			supersededAudit = preparedSupersededAudit.data;
		}

		try {
			const [rows] = await afendaDatabase.transaction((sqlValue6) => [
				sqlValue6`
						WITH mutated AS (
							UPDATE hr_headcount_plan AS plan
							SET status = ${input.status},
								approved_by = CASE WHEN ${input.status} = 'approved' THEN ${input.actorUserId} ELSE plan.approved_by END,
								approved_at = CASE WHEN ${input.status} = 'approved' THEN now() ELSE plan.approved_at END,
								rejected_by = CASE WHEN ${input.status} = 'rejected' THEN ${input.actorUserId} ELSE plan.rejected_by END,
								rejected_at = CASE WHEN ${input.status} = 'rejected' THEN now() ELSE plan.rejected_at END,
								rejection_reason = CASE WHEN ${input.status} = 'rejected' THEN ${rejectionReason} ELSE plan.rejection_reason END,
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE plan.id = ${input.planId}
								AND plan.organization_id = ${input.organizationId}
								AND plan.version = ${input.expectedVersion}
							RETURNING plan.*
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
								${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${supersedeAuditId}, ${supersededAudit?.organizationId ?? null},
								${supersededAudit?.actorUserId ?? null},
								${supersededAudit?.correlationId ?? null}, ${supersededAudit?.module ?? null},
								${supersededAudit?.entity ?? null}, ${supersededAudit?.entityId ?? null},
								${supersededAudit?.action ?? null},
								${supersededAudit?.changesJson ?? null}::jsonb,
								${supersededAudit?.oldValueJson ?? null}::jsonb,
								${supersededAudit?.newValueJson ?? null}::jsonb,
								${supersededAudit?.metadataJson ?? null}::jsonb,
								${supersededAudit?.ipAddress ?? null}, ${supersededAudit?.userAgent ?? null}
							FROM superseded_prior
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${outboxId}, organization_id,
								${HUMAN_RESOURCES_HEADCOUNT_PLAN_APPROVED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${outboxPayload}::jsonb, 'pending', 0
							FROM mutated
							WHERE ${input.status} = 'approved'
							RETURNING id
						)
						SELECT mutated.* FROM mutated
						JOIN audited ON true
						LEFT JOIN superseded_prior ON true
						LEFT JOIN superseded_audited ON true
						LEFT JOIN outboxed ON true
					`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getHeadcountPlanById({
					organizationId: input.organizationId,
					planId: input.planId,
				});
				if (!again.ok) {
					return again;
				}
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Headcount plan",
				});
			}
			return mapHeadcountPlanSql(row);
		} catch (error) {
			if (isPostgresUniqueConstraint(error, HR_REGEX_2)) {
				return conflict(
					"An approved headcount plan already exists for this scope and period",
				);
			}
			return mapPersistenceFailure(
				error,
				"Failed to transition headcount plan status",
			);
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async supersedeHeadcountPlan(record, _ports, meta) {
		const source = await this.getHeadcountPlanById({
			organizationId: record.organizationId,
			planId: record.sourcePlanId,
		});
		if (!source.ok) {
			return source;
		}
		if (source.data === null) {
			return notFound("Headcount plan not found");
		}
		if (source.data.status !== "approved") {
			return invalidState("Only approved headcount plans can be superseded");
		}
		const sourcePlan = source.data;
		const versionCheck = assertExpectedVersion(
			sourcePlan.version,
			record.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const brandedId = parseHumanResourcesHeadcountPlanId(randomUUID());
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const preparedAudit = prepareWorkforcePlanningAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_headcount_plan",
			entityId: brandedId.data,
			action: "CREATE",
			newValue: {
				planVersion: sourcePlan.planVersion + 1,
				status: "draft",
				supersedesPlanId: record.sourcePlanId,
				version: 1,
			},
			meta,
			reasonCode: "SUPERSEDE_DRAFT_CREATED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;

		try {
			const [rows] = await afendaDatabase.transaction((sqlValue5) => [
				sqlValue5`
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
								${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated JOIN audited ON true
					`,
				sqlValue5`
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
						FROM hr_headcount_plan_line AS source_line
						WHERE source_line.plan_id = ${record.sourcePlanId}
							AND source_line.organization_id = ${record.organizationId}
							AND EXISTS (
								SELECT 1 FROM hr_headcount_plan AS target_plan
								WHERE target_plan.id = ${brandedId.data}
									AND target_plan.organization_id = ${record.organizationId}
							)
					`,
			]);
			const [row] = rows;
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
				if (!existing.ok) {
					return existing;
				}
				if (existing.data !== null) {
					if (
						existing.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return errorResult.ok(existing.data.plan);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueConstraint(error, HR_REGEX_1)) {
				return conflict("Headcount plan code already exists");
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
				afendaDatabase.client
					.select()
					.from(hrHeadcountPlan)
					.where(and(...conditions))
					.orderBy(desc(hrHeadcountPlan.createdAt))
					.limit(input.pageSize)
					.offset(offset),
				afendaDatabase.client
					.select({ count: sql<number>`count(*)::int` })
					.from(hrHeadcountPlan)
					.where(and(...conditions)),
			]);
			const plans: HeadcountPlan[] = [];
			for (const row of rows) {
				const mapped = mapHeadcountPlan(row);
				if (!mapped.ok) {
					return mapped;
				}
				plans.push(mapped.data);
			}
			return errorResult.ok({
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrHeadcountPlanLine)
				.where(
					and(
						eq(hrHeadcountPlanLine.organizationId, input.organizationId),
						eq(hrHeadcountPlanLine.id, input.planLineId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapHeadcountPlanLine(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load headcount plan line");
		}
	},

	async listHeadcountPlanLinesByPlanId(input) {
		try {
			const rows = await afendaDatabase.client
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
				if (!mapped.ok) {
					return mapped;
				}
				lines.push(mapped.data);
			}
			return errorResult.ok(lines);
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
		if (!plan.ok) {
			return plan;
		}
		if (plan.data === null) {
			return notFound("Headcount plan not found");
		}
		if (plan.data.status !== "draft" && plan.data.status !== "submitted") {
			return invalidState("Approved headcount plans are immutable");
		}

		const brandedId = parseHumanResourcesHeadcountPlanLineId(randomUUID());
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const preparedAudit = prepareWorkforcePlanningAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_headcount_plan_line",
			entityId: brandedId.data,
			action: "CREATE",
			newValue: {
				planId: record.planId,
				plannedFte: record.plannedFte,
				plannedHeadcount: record.plannedHeadcount,
				version: 1,
			},
			meta,
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;

		try {
			const [rows] = await afendaDatabase.transaction((sqlValue4) => [
				sqlValue4`
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
								${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated JOIN audited ON true
					`,
			]);
			const [row] = rows;
			if (!row) {
				return invalidState("Approved headcount plans are immutable");
			}
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
		if (!line.ok) {
			return line;
		}
		if (line.data === null) {
			return notFound("Headcount plan line not found");
		}
		const plan = await this.getHeadcountPlanById({
			organizationId: input.organizationId,
			planId: line.data.planId,
		});
		if (!plan.ok) {
			return plan;
		}
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
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const nextDepartmentId = retainWhenUndefined(
			input.departmentId,
			line.data.departmentId,
		);
		const nextJobId = retainWhenUndefined(input.jobId, line.data.jobId);
		const nextPositionId = retainWhenUndefined(
			input.positionId,
			line.data.positionId,
		);
		const nextLocationCode = retainWhenUndefined(
			input.locationCode,
			line.data.locationCode,
		);
		const nextEmploymentType = retainWhenUndefined(
			input.employmentType,
			line.data.employmentType,
		);
		const nextPlannedFte = input.plannedFte ?? line.data.plannedFte;
		const nextPlannedHeadcount =
			input.plannedHeadcount ?? line.data.plannedHeadcount;
		const nextCostAmount = retainWhenUndefined(
			input.costEnvelopeAmount,
			line.data.costEnvelopeAmount,
		);
		const nextCostCurrency = retainWhenUndefined(
			input.costEnvelopeCurrencyCode,
			line.data.costEnvelopeCurrencyCode,
		);
		const preparedAudit = prepareWorkforcePlanningAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_headcount_plan_line",
			entityId: input.planLineId,
			action: "UPDATE",
			oldValue: {
				departmentId: line.data.departmentId,
				jobId: line.data.jobId,
				positionId: line.data.positionId,
				locationCode: line.data.locationCode,
				employmentType: line.data.employmentType,
				plannedFte: line.data.plannedFte,
				plannedHeadcount: line.data.plannedHeadcount,
				costEnvelopeAmount: line.data.costEnvelopeAmount,
				costEnvelopeCurrencyCode: line.data.costEnvelopeCurrencyCode,
				version: line.data.version,
			},
			newValue: {
				departmentId: nextDepartmentId,
				jobId: nextJobId,
				positionId: nextPositionId,
				locationCode: nextLocationCode,
				employmentType: nextEmploymentType,
				plannedFte: nextPlannedFte,
				plannedHeadcount: nextPlannedHeadcount,
				costEnvelopeAmount: nextCostAmount,
				costEnvelopeCurrencyCode: nextCostCurrency,
				version: nextVersion,
			},
			meta,
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;

		try {
			const [rows] = await afendaDatabase.transaction((sqlValue3) => [
				sqlValue3`
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
							AND p.organization_id = l.organization_id
							AND p.status IN ('draft', 'submitted')
							RETURNING l.*
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
								${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated JOIN audited ON true
					`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getHeadcountPlanLineById({
					organizationId: input.organizationId,
					planLineId: input.planLineId,
				});
				if (!again.ok) {
					return again;
				}
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
		if (!line.ok) {
			return line;
		}
		if (line.data === null) {
			return notFound("Headcount plan line not found");
		}
		const plan = await this.getHeadcountPlanById({
			organizationId: input.organizationId,
			planId: line.data.planId,
		});
		if (!plan.ok) {
			return plan;
		}
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
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const auditId = randomUUID();
		const preparedAudit = prepareWorkforcePlanningAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_headcount_plan_line",
			entityId: input.planLineId,
			action: "DELETE",
			oldValue: {
				planId: line.data.planId,
				plannedFte: line.data.plannedFte,
				plannedHeadcount: line.data.plannedHeadcount,
				version: line.data.version,
			},
			meta,
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;

		try {
			const [rows] = await afendaDatabase.transaction((sqlValue2) => [
				sqlValue2`
						WITH mutated AS (
							DELETE FROM hr_headcount_plan_line l
							USING hr_headcount_plan p
							WHERE l.id = ${input.planLineId}
								AND l.organization_id = ${input.organizationId}
							AND l.version = ${input.expectedVersion}
							AND p.id = l.plan_id
							AND p.organization_id = l.organization_id
							AND p.status IN ('draft', 'submitted')
							RETURNING l.id, l.organization_id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
								${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.id FROM mutated JOIN audited ON true
					`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getHeadcountPlanLineById({
					organizationId: input.organizationId,
					planLineId: input.planLineId,
				});
				if (!again.ok) {
					return again;
				}
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Headcount plan line",
				});
			}
			return errorResult.ok(undefined);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to remove headcount plan line",
			);
		}
	},

	async findHeadcountReservationByIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const mapped = mapHeadcountReservation(row);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrHeadcountReservation)
				.where(
					and(
						eq(hrHeadcountReservation.organizationId, input.organizationId),
						eq(hrHeadcountReservation.id, input.reservationId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
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
			const rows = await afendaDatabase.client
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapHeadcountReservation(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find active headcount reservation for requisition",
			);
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async reserveHeadcount(record, _ports, meta) {
		const existingIdempotent =
			await this.findHeadcountReservationByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.createIdempotencyKey,
			});
		if (!existingIdempotent.ok) {
			return existingIdempotent;
		}
		if (existingIdempotent.data !== null) {
			if (
				existingIdempotent.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return errorResult.ok(existingIdempotent.data.reservation);
			}
			return conflict("Idempotency key already used with different data");
		}

		const requisition = await this.getRequisitionById({
			organizationId: record.organizationId,
			requisitionId: record.requisitionId,
		});
		if (!requisition.ok) {
			return requisition;
		}
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
		if (!line.ok) {
			return line;
		}
		if (line.data === null) {
			return notFound("Headcount plan line not found");
		}
		const planLine = line.data;

		const plan = await this.getHeadcountPlanById({
			organizationId: record.organizationId,
			planId: planLine.planId,
		});
		if (!plan.ok) {
			return plan;
		}
		if (plan.data === null || plan.data.status !== "approved") {
			return invalidState("Headcount reservations require an approved plan");
		}

		const existingReservations =
			await this.listHeadcountReservationsByPlanLineId({
				organizationId: record.organizationId,
				planLineId: record.planLineId,
			});
		if (!existingReservations.ok) {
			return existingReservations;
		}
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
		if (!availabilityCheck.ok) {
			return availabilityCheck;
		}

		const brandedId = parseHumanResourcesHeadcountReservationId(randomUUID());
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = headcountEventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_headcount_reservation",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		const preparedAudit = prepareWorkforcePlanningAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_headcount_reservation",
			entityId: brandedId.data,
			action: "CREATE",
			newValue: {
				planId: planLine.planId,
				planLineId: record.planLineId,
				requisitionId: record.requisitionId,
				reservedFte: record.reservedFte,
				reservedHeadcount: record.reservedHeadcount,
				status: "active",
				version: 1,
			},
			meta,
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;

		try {
			const [rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
								${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id,
								${HUMAN_RESOURCES_HEADCOUNT_RESERVED_EVENT},
								'human-resources', ${meta.correlationId}, created_by,
								${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated JOIN audited ON true JOIN outboxed ON true
					`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict("Unable to reserve headcount");
			}
			return mapHeadcountReservationSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findHeadcountReservationByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return errorResult.ok(replay.data.reservation);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueConstraint(error, HR_REGEX_3)) {
				return conflict(
					"Requisition already has an active headcount reservation",
				);
			}
			return mapPersistenceFailure(error, "Failed to reserve headcount");
		}
	},

	async releaseHeadcountReservation(input, _ports, meta) {
		return await transitionHeadcountReservationStatus(
			this,
			input,
			"released",
			meta,
		);
	},

	async consumeHeadcountReservation(input, _ports, meta) {
		return await transitionHeadcountReservationStatus(
			this,
			input,
			"consumed",
			meta,
		);
	},

	async releaseActiveHeadcountReservationsForRequisition(input, ports, meta) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrHeadcountReservation)
				.where(
					and(
						eq(hrHeadcountReservation.organizationId, input.organizationId),
						eq(hrHeadcountReservation.requisitionId, input.requisitionId),
						eq(hrHeadcountReservation.status, "active"),
					),
				);
			const sequentialOutcome1 = await runSequential(rows, async (row) => {
				const mapped = mapHeadcountReservation(row);
				if (!mapped.ok) {
					return sequentialReturn(mapped);
				}
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
				if (!released.ok) {
					return sequentialReturn(released);
				}
			});
			if (sequentialOutcome1.kind === "return") {
				return sequentialOutcome1.value;
			}
			return errorResult.ok(undefined);
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
		if (!active.ok) {
			return active;
		}
		if (active.data === null) {
			return errorResult.ok(undefined);
		}
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
		if (!consumed.ok) {
			return consumed;
		}
		return errorResult.ok(undefined);
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
				afendaDatabase.client
					.select()
					.from(hrHeadcountReservation)
					.where(and(...conditions))
					.orderBy(desc(hrHeadcountReservation.createdAt))
					.limit(input.pageSize)
					.offset(offset),
				afendaDatabase.client
					.select({ count: sql<number>`count(*)::int` })
					.from(hrHeadcountReservation)
					.where(and(...conditions)),
			]);
			const reservations: HeadcountReservation[] = [];
			for (const row of rows) {
				const mapped = mapHeadcountReservation(row);
				if (!mapped.ok) {
					return mapped;
				}
				reservations.push(mapped.data);
			}
			return errorResult.ok({
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
			const rows = await afendaDatabase.client
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
				if (!mapped.ok) {
					return mapped;
				}
				reservations.push(mapped.data);
			}
			return errorResult.ok(reservations);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list headcount reservations for plan line",
			);
		}
	},

	async getHeadcountAvailability(input) {
		try {
			const lineRows = await afendaDatabase.client
				.select()
				.from(hrHeadcountPlanLine)
				.where(
					and(
						eq(hrHeadcountPlanLine.organizationId, input.organizationId),
						eq(hrHeadcountPlanLine.id, input.planLineId),
					),
				)
				.limit(1);
			const [lineRow] = lineRows;
			if (!lineRow) {
				return errorResult.ok(null);
			}
			const line = mapHeadcountPlanLine(lineRow);
			if (!line.ok) {
				return line;
			}

			const reservations = await this.listHeadcountReservationsByPlanLineId({
				organizationId: input.organizationId,
				planLineId: input.planLineId,
			});
			if (!reservations.ok) {
				return reservations;
			}

			const availability = computeLineAvailability({
				line: line.data,
				reservations: reservations.data,
			});
			return errorResult.ok({
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
		if (!active.ok) {
			return active;
		}
		if (active.data === null) {
			return errorResult.ok({
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
		if (!plan.ok) {
			return plan;
		}

		const availability = await this.getHeadcountAvailability({
			organizationId: input.organizationId,
			planLineId: active.data.planLineId,
		});
		if (!availability.ok) {
			return availability;
		}

		return errorResult.ok({
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
			const plan = await this.getHeadcountPlanById({
				organizationId: input.organizationId,
				planId: input.planId,
			});
			if (!plan.ok) {
				return plan;
			}
			if (plan.data === null) {
				return notFound("Headcount plan not found");
			}
			const asOf = input.asOf ?? plan.data.periodEnd;
			const actuals = await this.listWorkforcePlanActualAssignments({
				organizationId: input.organizationId,
				asOf,
			});
			if (!actuals.ok) {
				return actuals;
			}

			const lineRows = await afendaDatabase.client
				.select()
				.from(hrHeadcountPlanLine)
				.where(
					and(
						eq(hrHeadcountPlanLine.organizationId, input.organizationId),
						eq(hrHeadcountPlanLine.planId, input.planId),
					),
				);
			const varianceLines: WorkforcePlanVarianceLine[] = [];
			const sequentialOutcome2 = await runSequential(lineRows, async (row) => {
				const line = mapHeadcountPlanLine(row);
				if (!line.ok) {
					return sequentialReturn(line);
				}
				const reservations = await this.listHeadcountReservationsByPlanLineId({
					organizationId: input.organizationId,
					planLineId: line.data.id,
				});
				if (!reservations.ok) {
					return sequentialReturn(reservations);
				}
				const availability = computeLineAvailability({
					line: line.data,
					reservations: reservations.data,
				});
				varianceLines.push(
					computeWorkforcePlanVarianceLine({
						line: line.data,
						availability,
						actuals: actuals.data,
					}),
				);
			});
			if (sequentialOutcome2.kind === "return") {
				return sequentialOutcome2.value;
			}
			return errorResult.ok({
				planId: input.planId,
				asOf,
				lines: varianceLines,
			});
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
