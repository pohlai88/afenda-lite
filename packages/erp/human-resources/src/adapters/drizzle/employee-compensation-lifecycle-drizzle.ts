import { randomUUID } from "node:crypto";

import { and, db, eq, hrEmployeeCompensation, runNeonHttpTransaction } from "@afenda/db";
import { ok, type Result } from "@afenda/errors/result";
import { HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT } from "@afenda/events/schemas";

import {
	parseHumanResourcesEmployeeCompensationId,
	type HumanResourcesCompensationGradeId,
	type HumanResourcesEmployeeCompensationId,
	type HumanResourcesEmploymentId,
	type HumanResourcesSalaryBandId,
} from "../../brands";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../../error-codes";
import type { MutationPorts } from "../../ports";
import type { PayFrequency } from "../../shared/compensation-status";
import { isEmployeeCompensationActive } from "../../shared/compensation-status";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	conflict,
	invalidState,
	missAfterOptimisticUpdate,
	notFound,
} from "../../shared/domain-guards";
import {
	dayBeforeIsoDate,
	isEmployeeCompensationDraft,
	isEmployeeCompensationCorrectable,
	isEmployeeCompensationScheduled,
	resolveEmployeeCompensationApprovalStatus,
} from "../../shared/employee-compensation-lifecycle";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import {
	isCreateIdempotencyUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import type { HumanResourcesStore } from "../../store";
import type { EmployeeCompensation } from "../../types";
import {
	type EmployeeCompensationSqlRow,
	mapEmployeeCompensationSql,
} from "./compensation-benefits";

function eventPayloadJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

export type EmployeeCompensationLifecycleHost = Pick<
	HumanResourcesStore,
	| "getEmployeeCompensation"
	| "findEmployeeCompensationByIdempotencyKey"
	| "createEmployeeCompensation"
	| "approveEmployeeCompensation"
	| "getEmploymentById"
>;

async function findEmployeeCompensationByEmploymentAndStatus(
	organizationId: string,
	employmentId: HumanResourcesEmploymentId,
	status: EmployeeCompensation["status"],
): Promise<Result<EmployeeCompensation | null>> {
	try {
		const rows = await db
			.select()
			.from(hrEmployeeCompensation)
			.where(
				and(
					eq(hrEmployeeCompensation.organizationId, organizationId),
					eq(hrEmployeeCompensation.employmentId, employmentId),
					eq(hrEmployeeCompensation.status, status),
				),
			)
			.limit(1);
		const row = rows[0];
		if (!row) return ok(null);
		return mapEmployeeCompensationSql({
			id: row.id,
			organization_id: row.organizationId,
			employee_id: row.employeeId,
			employment_id: row.employmentId,
			grade_id: row.gradeId,
			salary_band_id: row.salaryBandId,
			base_amount: row.baseAmount,
			currency_code: row.currencyCode,
			pay_frequency: row.payFrequency,
			effective_from: row.effectiveFrom,
			effective_to: row.effectiveTo,
			reason: row.reason,
			confidential_note: row.confidentialNote,
			supersedes_compensation_id: row.supersedesCompensationId,
			approved_at: row.approvedAt,
			approved_by: row.approvedBy,
			status: row.status,
			source_review_id: row.sourceReviewId,
			create_idempotency_key: row.createIdempotencyKey,
			create_request_fingerprint: row.createRequestFingerprint,
			version: row.version,
			created_by: row.createdBy,
			updated_by: row.updatedBy,
			created_at: row.createdAt,
			updated_at: row.updatedAt,
		});
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to find employee compensation by employment status",
		);
	}
}

export async function drizzleAmendEmployeeCompensation(
	host: EmployeeCompensationLifecycleHost,
	input: {
		organizationId: string;
		compensationId: HumanResourcesEmployeeCompensationId;
		baseAmount?: string;
		currencyCode?: string;
		payFrequency?: PayFrequency;
		effectiveFrom?: string;
		effectiveTo?: string | null;
		reason?: string;
		gradeId?: HumanResourcesCompensationGradeId | null;
		salaryBandId?: HumanResourcesSalaryBandId | null;
		confidentialNote?: string | null;
		expectedVersion: number;
		actorUserId: string;
	},
	_ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<EmployeeCompensation>> {
	const existing = await host.getEmployeeCompensation({
		organizationId: input.organizationId,
		compensationId: input.compensationId,
	});
	if (!existing.ok) return existing;
	if (existing.data === null) {
		return notFound(
			"Employee compensation not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const comp = existing.data;
	const versionCheck = assertExpectedVersion(comp.version, input.expectedVersion);
	if (!versionCheck.ok) return versionCheck;
	if (!isEmployeeCompensationDraft(comp.status)) {
		return invalidState("Only draft compensation agreements can be amended");
	}

	const nextBaseAmount = input.baseAmount ?? comp.baseAmount;
	const nextCurrencyCode = input.currencyCode ?? comp.currencyCode;
	const nextPayFrequency = input.payFrequency ?? comp.payFrequency;
	const nextEffectiveFrom = input.effectiveFrom ?? comp.effectiveFrom;
	const nextEffectiveTo =
		input.effectiveTo !== undefined ? input.effectiveTo : comp.effectiveTo;
	const nextReason = input.reason ?? comp.reason;
	const nextGradeId =
		input.gradeId !== undefined ? input.gradeId : comp.gradeId;
	const nextSalaryBandId =
		input.salaryBandId !== undefined ? input.salaryBandId : comp.salaryBandId;
	const nextConfidentialNote =
		input.confidentialNote !== undefined
			? input.confidentialNote
			: comp.confidentialNote;

	const nextVersion = input.expectedVersion + 1;
	const auditId = randomUUID();
	const eventId = randomUUID();
	const payloadJson = eventPayloadJson({
		organizationId: input.organizationId,
		entityType: "hr_employee_compensation",
		entityId: input.compensationId,
		actorId: input.actorUserId,
		correlationId: meta.correlationId,
	});

	try {
		const [rows] = await runNeonHttpTransaction<[EmployeeCompensationSqlRow[]]>(
			(sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_employee_compensation
						SET base_amount = ${nextBaseAmount},
							currency_code = ${nextCurrencyCode},
							pay_frequency = ${nextPayFrequency},
							effective_from = ${nextEffectiveFrom},
							effective_to = ${nextEffectiveTo},
							reason = ${nextReason},
							grade_id = ${nextGradeId},
							salary_band_id = ${nextSalaryBandId},
							confidential_note = ${nextConfidentialNote},
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.compensationId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status = 'draft'
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_employee_compensation', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			],
		);
		const row = rows[0];
		if (!row) {
			return missAfterOptimisticUpdate({
				found: true,
				entityLabel: "Employee compensation",
			});
		}
		return mapEmployeeCompensationSql(row);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to amend employee compensation");
	}
}

export async function drizzleApproveEmployeeCompensation(
	host: EmployeeCompensationLifecycleHost,
	input: {
		organizationId: string;
		compensationId: HumanResourcesEmployeeCompensationId;
		expectedVersion: number;
		actorUserId: string;
	},
	_ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<EmployeeCompensation>> {
	const existing = await host.getEmployeeCompensation({
		organizationId: input.organizationId,
		compensationId: input.compensationId,
	});
	if (!existing.ok) return existing;
	if (existing.data === null) {
		return notFound(
			"Employee compensation not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const comp = existing.data;
	const versionCheck = assertExpectedVersion(comp.version, input.expectedVersion);
	if (!versionCheck.ok) return versionCheck;
	if (!isEmployeeCompensationDraft(comp.status)) {
		return invalidState("Only draft compensation agreements can be approved");
	}

	const nextStatus = resolveEmployeeCompensationApprovalStatus(comp.effectiveFrom);
	if (nextStatus === "scheduled") {
		const scheduled = await findEmployeeCompensationByEmploymentAndStatus(
			input.organizationId,
			comp.employmentId,
			"scheduled",
		);
		if (!scheduled.ok) return scheduled;
		if (scheduled.data !== null) {
			return conflict("A scheduled compensation agreement already exists");
		}
	}

	const nextVersion = input.expectedVersion + 1;
	const predecessorEffectiveTo = dayBeforeIsoDate(comp.effectiveFrom);
	const auditEndedId = randomUUID();
	const eventEndedId = randomUUID();
	const auditApprovedId = randomUUID();
	const eventApprovedId = randomUUID();
	const payloadEndedJson = eventPayloadJson({
		organizationId: input.organizationId,
		entityType: "hr_employee_compensation",
		entityId: "TO_BE_DETERMINED",
		actorId: input.actorUserId,
		correlationId: meta.correlationId,
	});
	const payloadApprovedJson = eventPayloadJson({
		organizationId: input.organizationId,
		entityType: "hr_employee_compensation",
		entityId: input.compensationId,
		actorId: input.actorUserId,
		correlationId: meta.correlationId,
	});

	try {
		const [rows] = await runNeonHttpTransaction<[EmployeeCompensationSqlRow[]]>(
			(sqlTag) => [
				nextStatus === "active"
					? sqlTag`
						WITH active_comp AS (
							SELECT id, version
							FROM hr_employee_compensation
							WHERE organization_id = ${input.organizationId}
								AND employment_id = ${comp.employmentId}
								AND status = 'active'
							FOR UPDATE
						),
						ended_comp AS (
							UPDATE hr_employee_compensation
							SET status = 'ended',
								effective_to = ${predecessorEffectiveTo},
								version = version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM active_comp
							WHERE hr_employee_compensation.id = active_comp.id
								AND hr_employee_compensation.version = active_comp.version
							RETURNING hr_employee_compensation.id, hr_employee_compensation.organization_id
						),
						audit_ended AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditEndedId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_employee_compensation', id, 'UPDATE', '[]'::jsonb
							FROM ended_comp
							RETURNING id
						),
						outbox_ended AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventEndedId}, organization_id, ${HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								jsonb_set(${payloadEndedJson}::jsonb, '{entityId}', to_jsonb(id::text)),
								'pending', 0
							FROM ended_comp
							RETURNING id
						),
						mutated AS (
							UPDATE hr_employee_compensation
							SET status = ${nextStatus},
								approved_at = now(),
								approved_by = ${input.actorUserId},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.compensationId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'draft'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditApprovedId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_employee_compensation', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventApprovedId}, organization_id, ${HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${payloadApprovedJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`
					: sqlTag`
						WITH mutated AS (
							UPDATE hr_employee_compensation
							SET status = ${nextStatus},
								approved_at = now(),
								approved_by = ${input.actorUserId},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.compensationId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'draft'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditApprovedId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_employee_compensation', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventApprovedId}, organization_id, ${HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${payloadApprovedJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			],
		);
		const row = rows[0];
		if (!row) {
			return missAfterOptimisticUpdate({
				found: true,
				entityLabel: "Employee compensation",
			});
		}
		return mapEmployeeCompensationSql(row);
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to approve employee compensation",
		);
	}
}

export async function drizzleScheduleEmployeeCompensationChange(
	host: EmployeeCompensationLifecycleHost,
	input: {
		organizationId: string;
		compensationId: HumanResourcesEmployeeCompensationId;
		baseAmount: string;
		currencyCode: string;
		payFrequency: PayFrequency;
		effectiveFrom: string;
		reason: string;
		gradeId: HumanResourcesCompensationGradeId | null;
		salaryBandId: HumanResourcesSalaryBandId | null;
		confidentialNote: string | null;
		createIdempotencyKey: string;
		createRequestFingerprint: string;
		actorUserId: string;
	},
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<EmployeeCompensation>> {
	const active = await host.getEmployeeCompensation({
		organizationId: input.organizationId,
		compensationId: input.compensationId,
	});
	if (!active.ok) return active;
	if (active.data === null) {
		return notFound(
			"Employee compensation not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	if (!isEmployeeCompensationActive(active.data.status)) {
		return invalidState("Scheduled changes require an active compensation agreement");
	}
	if (input.effectiveFrom <= active.data.effectiveFrom) {
		return invalidState("Scheduled change must have a future effective date");
	}

	const created = await host.createEmployeeCompensation(
		{
			organizationId: input.organizationId,
			employeeId: active.data.employeeId,
			employmentId: active.data.employmentId,
			gradeId: input.gradeId,
			salaryBandId: input.salaryBandId,
			baseAmount: input.baseAmount,
			currencyCode: input.currencyCode,
			payFrequency: input.payFrequency,
			effectiveFrom: input.effectiveFrom,
			effectiveTo: null,
			reason: input.reason,
			confidentialNote: input.confidentialNote,
			supersedesCompensationId: active.data.id,
			sourceReviewId: null,
			createIdempotencyKey: input.createIdempotencyKey,
			createRequestFingerprint: input.createRequestFingerprint,
			createdBy: input.actorUserId,
		},
		ports,
		meta,
	);
	if (!created.ok) return created;

	return host.approveEmployeeCompensation(
		{
			organizationId: input.organizationId,
			compensationId: created.data.id,
			expectedVersion: created.data.version,
			actorUserId: input.actorUserId,
		},
		ports,
		meta,
	);
}

export async function drizzleActivateEmployeeCompensation(
	host: EmployeeCompensationLifecycleHost,
	input: {
		organizationId: string;
		compensationId: HumanResourcesEmployeeCompensationId;
		expectedVersion: number;
		actorUserId: string;
	},
	_ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<EmployeeCompensation>> {
	const existing = await host.getEmployeeCompensation({
		organizationId: input.organizationId,
		compensationId: input.compensationId,
	});
	if (!existing.ok) return existing;
	if (existing.data === null) {
		return notFound(
			"Employee compensation not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const comp = existing.data;
	const versionCheck = assertExpectedVersion(comp.version, input.expectedVersion);
	if (!versionCheck.ok) return versionCheck;
	if (!isEmployeeCompensationScheduled(comp.status)) {
		return invalidState("Only scheduled compensation agreements can be activated");
	}
	if (resolveEmployeeCompensationApprovalStatus(comp.effectiveFrom) !== "active") {
		return invalidState("Compensation effective date is still in the future");
	}

	const nextVersion = input.expectedVersion + 1;
	const predecessorEffectiveTo = dayBeforeIsoDate(comp.effectiveFrom);
	const auditEndedId = randomUUID();
	const eventEndedId = randomUUID();
	const auditActivatedId = randomUUID();
	const eventActivatedId = randomUUID();
	const payloadEndedJson = eventPayloadJson({
		organizationId: input.organizationId,
		entityType: "hr_employee_compensation",
		entityId: "TO_BE_DETERMINED",
		actorId: input.actorUserId,
		correlationId: meta.correlationId,
	});
	const payloadActivatedJson = eventPayloadJson({
		organizationId: input.organizationId,
		entityType: "hr_employee_compensation",
		entityId: input.compensationId,
		actorId: input.actorUserId,
		correlationId: meta.correlationId,
	});

	try {
		const [rows] = await runNeonHttpTransaction<[EmployeeCompensationSqlRow[]]>(
			(sqlTag) => [
				sqlTag`
					WITH active_comp AS (
						SELECT id, version
						FROM hr_employee_compensation
						WHERE organization_id = ${input.organizationId}
							AND employment_id = ${comp.employmentId}
							AND status = 'active'
						FOR UPDATE
					),
					ended_comp AS (
						UPDATE hr_employee_compensation
						SET status = 'ended',
							effective_to = ${predecessorEffectiveTo},
							version = version + 1,
							updated_by = ${input.actorUserId},
							updated_at = now()
						FROM active_comp
						WHERE hr_employee_compensation.id = active_comp.id
							AND hr_employee_compensation.version = active_comp.version
						RETURNING hr_employee_compensation.id, hr_employee_compensation.organization_id
					),
					audit_ended AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditEndedId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_employee_compensation', id, 'UPDATE', '[]'::jsonb
						FROM ended_comp
						RETURNING id
					),
					outbox_ended AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${eventEndedId}, organization_id, ${HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							jsonb_set(${payloadEndedJson}::jsonb, '{entityId}', to_jsonb(id::text)),
							'pending', 0
						FROM ended_comp
						RETURNING id
					),
					mutated AS (
						UPDATE hr_employee_compensation
						SET status = 'active',
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.compensationId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status = 'scheduled'
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditActivatedId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_employee_compensation', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${eventActivatedId}, organization_id, ${HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							${payloadActivatedJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			],
		);
		const row = rows[0];
		if (!row) {
			return missAfterOptimisticUpdate({
				found: true,
				entityLabel: "Employee compensation",
			});
		}
		return mapEmployeeCompensationSql(row);
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to activate employee compensation",
		);
	}
}

export async function drizzleCorrectEmployeeCompensation(
	host: EmployeeCompensationLifecycleHost,
	input: {
		organizationId: string;
		compensationId: HumanResourcesEmployeeCompensationId;
		baseAmount: string;
		currencyCode: string;
		payFrequency: PayFrequency;
		effectiveFrom: string;
		effectiveTo: string | null;
		reason: string;
		evidenceReference: string | null;
		gradeId: HumanResourcesCompensationGradeId | null;
		salaryBandId: HumanResourcesSalaryBandId | null;
		confidentialNote: string | null;
		createIdempotencyKey: string;
		createRequestFingerprint: string;
		actorUserId: string;
	},
	_ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<EmployeeCompensation>> {
	const existingReplay = await host.findEmployeeCompensationByIdempotencyKey({
		organizationId: input.organizationId,
		idempotencyKey: input.createIdempotencyKey,
	});
	if (!existingReplay.ok) return existingReplay;
	if (existingReplay.data !== null) {
		return ok(existingReplay.data);
	}

	const predecessorResult = await host.getEmployeeCompensation({
		organizationId: input.organizationId,
		compensationId: input.compensationId,
	});
	if (!predecessorResult.ok) return predecessorResult;
	if (predecessorResult.data === null) {
		return notFound(
			"Employee compensation not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const predecessor = predecessorResult.data;
	if (!isEmployeeCompensationCorrectable(predecessor.status)) {
		return invalidState("Compensation cannot be corrected in its current status");
	}

	const reason =
		input.evidenceReference === null
			? input.reason
			: `${input.reason} (${input.evidenceReference})`;
	const successorStatus = resolveEmployeeCompensationApprovalStatus(
		input.effectiveFrom,
	);
	const predecessorEffectiveTo =
		predecessor.effectiveTo ?? dayBeforeIsoDate(input.effectiveFrom);

	const id = randomUUID();
	const brandedId = parseHumanResourcesEmployeeCompensationId(id);
	if (!brandedId.ok) return brandedId;

	const auditSupersededId = randomUUID();
	const eventSupersededId = randomUUID();
	const auditSuccessorId = randomUUID();
	const eventSuccessorId = randomUUID();
	const auditEndedId = randomUUID();
	const eventEndedId = randomUUID();
	const payloadSupersededJson = eventPayloadJson({
		organizationId: input.organizationId,
		entityType: "hr_employee_compensation",
		entityId: input.compensationId,
		actorId: input.actorUserId,
		correlationId: meta.correlationId,
	});
	const payloadSuccessorJson = eventPayloadJson({
		organizationId: input.organizationId,
		entityType: "hr_employee_compensation",
		entityId: brandedId.data,
		actorId: input.actorUserId,
		correlationId: meta.correlationId,
	});
	const payloadEndedJson = eventPayloadJson({
		organizationId: input.organizationId,
		entityType: "hr_employee_compensation",
		entityId: "TO_BE_DETERMINED",
		actorId: input.actorUserId,
		correlationId: meta.correlationId,
	});
	const predecessorEffectiveToForActiveEnd = dayBeforeIsoDate(input.effectiveFrom);

	try {
		const [rows] = await runNeonHttpTransaction<[EmployeeCompensationSqlRow[]]>(
			(sqlTag) => [
				successorStatus === "active"
					? sqlTag`
						WITH superseded AS (
							UPDATE hr_employee_compensation
							SET status = 'superseded',
								effective_to = ${predecessorEffectiveTo},
								version = version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.compensationId}
								AND organization_id = ${input.organizationId}
							RETURNING *
						),
						audit_superseded AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditSupersededId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_employee_compensation', id, 'UPDATE', '[]'::jsonb
							FROM superseded
							RETURNING id
						),
						outbox_superseded AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventSupersededId}, organization_id, ${HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${payloadSupersededJson}::jsonb, 'pending', 0
							FROM superseded
							RETURNING id
						),
						active_comp AS (
							SELECT id, version
							FROM hr_employee_compensation
							WHERE organization_id = ${input.organizationId}
								AND employment_id = ${predecessor.employmentId}
								AND status = 'active'
							FOR UPDATE
						),
						ended_comp AS (
							UPDATE hr_employee_compensation
							SET status = 'ended',
								effective_to = ${predecessorEffectiveToForActiveEnd},
								version = version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM active_comp
							WHERE hr_employee_compensation.id = active_comp.id
								AND hr_employee_compensation.version = active_comp.version
							RETURNING hr_employee_compensation.id, hr_employee_compensation.organization_id
						),
						audit_ended AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditEndedId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_employee_compensation', id, 'UPDATE', '[]'::jsonb
							FROM ended_comp
							RETURNING id
						),
						outbox_ended AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventEndedId}, organization_id, ${HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								jsonb_set(${payloadEndedJson}::jsonb, '{entityId}', to_jsonb(id::text)),
								'pending', 0
							FROM ended_comp
							RETURNING id
						),
						mutated AS (
							INSERT INTO hr_employee_compensation (
								id, organization_id, employee_id, employment_id, grade_id,
								salary_band_id, base_amount, currency_code, pay_frequency,
								effective_from, effective_to, reason, confidential_note,
								supersedes_compensation_id, approved_at, approved_by, status,
								source_review_id, create_idempotency_key, create_request_fingerprint,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, superseded.organization_id, superseded.employee_id,
								superseded.employment_id, ${input.gradeId}, ${input.salaryBandId},
								${input.baseAmount}, ${input.currencyCode}, ${input.payFrequency},
								${input.effectiveFrom}, ${input.effectiveTo}, ${reason},
								${input.confidentialNote}, superseded.id, now(), ${input.actorUserId},
								${successorStatus}, superseded.source_review_id,
								${input.createIdempotencyKey}, ${input.createRequestFingerprint},
								1, ${input.actorUserId}, ${input.actorUserId}
							FROM superseded
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditSuccessorId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_employee_compensation', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventSuccessorId}, organization_id, ${HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT},
								'human-resources', ${meta.correlationId}, created_by,
								${payloadSuccessorJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`
					: sqlTag`
						WITH superseded AS (
							UPDATE hr_employee_compensation
							SET status = 'superseded',
								effective_to = ${predecessorEffectiveTo},
								version = version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.compensationId}
								AND organization_id = ${input.organizationId}
							RETURNING *
						),
						audit_superseded AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditSupersededId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_employee_compensation', id, 'UPDATE', '[]'::jsonb
							FROM superseded
							RETURNING id
						),
						outbox_superseded AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventSupersededId}, organization_id, ${HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${payloadSupersededJson}::jsonb, 'pending', 0
							FROM superseded
							RETURNING id
						),
						mutated AS (
							INSERT INTO hr_employee_compensation (
								id, organization_id, employee_id, employment_id, grade_id,
								salary_band_id, base_amount, currency_code, pay_frequency,
								effective_from, effective_to, reason, confidential_note,
								supersedes_compensation_id, approved_at, approved_by, status,
								source_review_id, create_idempotency_key, create_request_fingerprint,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, superseded.organization_id, superseded.employee_id,
								superseded.employment_id, ${input.gradeId}, ${input.salaryBandId},
								${input.baseAmount}, ${input.currencyCode}, ${input.payFrequency},
								${input.effectiveFrom}, ${input.effectiveTo}, ${reason},
								${input.confidentialNote}, superseded.id, now(), ${input.actorUserId},
								${successorStatus}, superseded.source_review_id,
								${input.createIdempotencyKey}, ${input.createRequestFingerprint},
								1, ${input.actorUserId}, ${input.actorUserId}
							FROM superseded
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditSuccessorId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_employee_compensation', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventSuccessorId}, organization_id, ${HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT},
								'human-resources', ${meta.correlationId}, created_by,
								${payloadSuccessorJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			],
		);
		const row = rows[0];
		if (!row) {
			return notFound(
				"Employee compensation not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		return mapEmployeeCompensationSql(row);
	} catch (error) {
		if (isCreateIdempotencyUniqueViolation(error)) {
			const replay = await host.findEmployeeCompensationByIdempotencyKey({
				organizationId: input.organizationId,
				idempotencyKey: input.createIdempotencyKey,
			});
			if (!replay.ok) return replay;
			if (replay.data !== null) {
				return ok(replay.data);
			}
		}
		return mapPersistenceFailure(error, "Failed to correct employee compensation");
	}
}
