import { randomUUID } from "node:crypto";

import {
	audit as afendaAudit,
	type PreparedDerivedEntityAuditInsertValues,
	type PreparedTransactionalAuditInsertValues,
} from "@afenda/audit";
import {
	database as afendaDatabase,
	and,
	eq,
	hrEmployeeCompensation,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import { HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT } from "@afenda/events/schemas";
import type { HumanResourcesStore } from "../../../composition/store/index";
import type { EmployeeCompensation } from "../../../kernel/contracts";
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
	mapPersistenceFailure,
} from "../../../kernel/execution/persistence-errors";
import type { MutationPorts } from "../../../kernel/execution/ports";
import {
	type HumanResourcesCompensationGradeId,
	type HumanResourcesEmployeeCompensationId,
	type HumanResourcesEmploymentId,
	type HumanResourcesSalaryBandId,
	parseHumanResourcesEmployeeCompensationId,
} from "../../../kernel/identity/brands";
import {
	dayBeforeIsoDate,
	isEmployeeCompensationCorrectable,
	isEmployeeCompensationDraft,
	isEmployeeCompensationScheduled,
	resolveEmployeeCompensationApprovalStatus,
} from "../employee-compensation-lifecycle";
import type { PayFrequency } from "../status";
import { isEmployeeCompensationActive } from "../status";
import { mapEmployeeCompensationSql } from "./compensation-benefits.drizzle";

const EMPLOYEE_COMPENSATION_AUDIT_SOURCE =
	"human-resources.employee-compensation-lifecycle-drizzle";

function prepareEmployeeCompensationAudit(input: {
	action: "CREATE" | "UPDATE";
	actorUserId: string;
	correlationId: string;
	entityId: string;
	meta: HumanResourcesMutationMeta;
	newValue?: Record<string, unknown> | null | undefined;
	oldValue?: Record<string, unknown> | null | undefined;
	organizationId: string;
	reasonCode: string;
}): Result<PreparedTransactionalAuditInsertValues> {
	return afendaAudit.transaction.prepare({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		module: "human-resources",
		entity: "hr_employee_compensation",
		entityId: input.entityId,
		action: input.action,
		oldValue: input.oldValue,
		newValue: input.newValue,
		eventContext: {
			version: 1,
			outcome: "SUCCEEDED",
			source: EMPLOYEE_COMPENSATION_AUDIT_SOURCE,
			causationId:
				input.meta.causationId ??
				input.meta.idempotencyKey ??
				input.correlationId,
			reasonCode: input.reasonCode,
		},
	});
}

function prepareDerivedEmployeeCompensationAudit(input: {
	actorUserId: string;
	correlationId: string;
	meta: HumanResourcesMutationMeta;
	newValue: Record<string, unknown>;
	oldValue: Record<string, unknown>;
	organizationId: string;
	reasonCode: string;
}): Result<PreparedDerivedEntityAuditInsertValues> {
	return afendaAudit.transaction.prepareDerived({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		module: "human-resources",
		entity: "hr_employee_compensation",
		action: "UPDATE",
		oldValue: input.oldValue,
		newValue: input.newValue,
		eventContext: {
			version: 1,
			outcome: "SUCCEEDED",
			source: EMPLOYEE_COMPENSATION_AUDIT_SOURCE,
			causationId:
				input.meta.causationId ??
				input.meta.idempotencyKey ??
				input.correlationId,
			reasonCode: input.reasonCode,
		},
	});
}

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
		const rows = await afendaDatabase.client
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
		const [row] = rows;
		if (!row) {
			return errorResult.ok(null);
		}
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
		baseAmount?: string | undefined;
		currencyCode?: string | undefined;
		payFrequency?: PayFrequency | undefined;
		effectiveFrom?: string | undefined;
		effectiveTo?: string | null | undefined;
		reason?: string | undefined;
		gradeId?: HumanResourcesCompensationGradeId | null | undefined;
		salaryBandId?: HumanResourcesSalaryBandId | null | undefined;
		confidentialNote?: string | null | undefined;
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
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return notFound(
			"Employee compensation not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const comp = existing.data;
	const versionCheck = assertExpectedVersion(
		comp.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}
	if (!isEmployeeCompensationDraft(comp.status)) {
		return invalidState("Only draft compensation agreements can be amended");
	}

	const nextBaseAmount = input.baseAmount ?? comp.baseAmount;
	const nextCurrencyCode = input.currencyCode ?? comp.currencyCode;
	const nextPayFrequency = input.payFrequency ?? comp.payFrequency;
	const nextEffectiveFrom = input.effectiveFrom ?? comp.effectiveFrom;
	const nextEffectiveTo =
		input.effectiveTo === undefined ? comp.effectiveTo : input.effectiveTo;
	const nextReason = input.reason ?? comp.reason;
	const nextGradeId =
		input.gradeId === undefined ? comp.gradeId : input.gradeId;
	const nextSalaryBandId =
		input.salaryBandId === undefined ? comp.salaryBandId : input.salaryBandId;
	const nextConfidentialNote =
		input.confidentialNote === undefined
			? comp.confidentialNote
			: input.confidentialNote;

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
	const preparedAudit = prepareEmployeeCompensationAudit({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		entityId: input.compensationId,
		action: "UPDATE",
		oldValue: {
			baseAmount: comp.baseAmount,
			currencyCode: comp.currencyCode,
			payFrequency: comp.payFrequency,
			effectiveFrom: comp.effectiveFrom,
			effectiveTo: comp.effectiveTo,
			gradeId: comp.gradeId,
			salaryBandId: comp.salaryBandId,
			version: comp.version,
		},
		newValue: {
			baseAmount: nextBaseAmount,
			currencyCode: nextCurrencyCode,
			payFrequency: nextPayFrequency,
			effectiveFrom: nextEffectiveFrom,
			effectiveTo: nextEffectiveTo,
			gradeId: nextGradeId,
			salaryBandId: nextSalaryBandId,
			version: nextVersion,
		},
		meta,
		reasonCode: "AMEND_DRAFT",
	});
	if (!preparedAudit.ok) {
		return preparedAudit;
	}
	const audit = preparedAudit.data;

	try {
		const [rows] = await afendaDatabase.transaction((sqlTag) => [
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
							${eventId}, organization_id, ${HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
		]);
		const [row] = rows;
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
			"Failed to amend employee compensation",
		);
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
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return notFound(
			"Employee compensation not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const comp = existing.data;
	const versionCheck = assertExpectedVersion(
		comp.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}
	if (!isEmployeeCompensationDraft(comp.status)) {
		return invalidState("Only draft compensation agreements can be approved");
	}

	const nextStatus = resolveEmployeeCompensationApprovalStatus(
		comp.effectiveFrom,
	);
	if (nextStatus === "scheduled") {
		const scheduled = await findEmployeeCompensationByEmploymentAndStatus(
			input.organizationId,
			comp.employmentId,
			"scheduled",
		);
		if (!scheduled.ok) {
			return scheduled;
		}
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
	const preparedApprovedAudit = prepareEmployeeCompensationAudit({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		entityId: input.compensationId,
		action: "UPDATE",
		oldValue: { status: comp.status, version: comp.version },
		newValue: { status: nextStatus, version: nextVersion },
		meta,
		reasonCode: "APPROVE",
	});
	if (!preparedApprovedAudit.ok) {
		return preparedApprovedAudit;
	}
	const approvedAudit = preparedApprovedAudit.data;
	const preparedEndedAudit =
		nextStatus === "active"
			? prepareDerivedEmployeeCompensationAudit({
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: meta.correlationId,
					oldValue: { status: "active" },
					newValue: {
						status: "ended",
						effectiveTo: predecessorEffectiveTo,
					},
					meta,
					reasonCode: "END_ACTIVE_PREDECESSOR",
				})
			: null;
	let endedAudit: PreparedDerivedEntityAuditInsertValues | null = null;
	if (preparedEndedAudit !== null) {
		if (!preparedEndedAudit.ok) {
			return preparedEndedAudit;
		}
		endedAudit = preparedEndedAudit.data;
	}

	try {
		const [rows] = await afendaDatabase.transaction((sqlTag) => [
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
								version = hr_employee_compensation.version + 1,
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditEndedId}, ${endedAudit?.organizationId ?? null},
								${endedAudit?.actorUserId ?? null}, ${endedAudit?.correlationId ?? null},
								${endedAudit?.module ?? null}, ${endedAudit?.entity ?? null}, id,
								${endedAudit?.action ?? null}, ${endedAudit?.changesJson ?? null}::jsonb,
								${endedAudit?.oldValueJson ?? null}::jsonb,
								${endedAudit?.newValueJson ?? null}::jsonb,
								${endedAudit?.metadataJson ?? null}::jsonb,
								${endedAudit?.ipAddress ?? null}, ${endedAudit?.userAgent ?? null}
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditApprovedId}, ${approvedAudit.organizationId},
								${approvedAudit.actorUserId}, ${approvedAudit.correlationId},
								${approvedAudit.module}, ${approvedAudit.entity}, ${approvedAudit.entityId},
								${approvedAudit.action}, ${approvedAudit.changesJson}::jsonb,
								${approvedAudit.oldValueJson}::jsonb, ${approvedAudit.newValueJson}::jsonb,
								${approvedAudit.metadataJson}::jsonb, ${approvedAudit.ipAddress},
								${approvedAudit.userAgent}
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditApprovedId}, ${approvedAudit.organizationId},
								${approvedAudit.actorUserId}, ${approvedAudit.correlationId},
								${approvedAudit.module}, ${approvedAudit.entity}, ${approvedAudit.entityId},
								${approvedAudit.action}, ${approvedAudit.changesJson}::jsonb,
								${approvedAudit.oldValueJson}::jsonb, ${approvedAudit.newValueJson}::jsonb,
								${approvedAudit.metadataJson}::jsonb, ${approvedAudit.ipAddress},
								${approvedAudit.userAgent}
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
		]);
		const [row] = rows;
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
	if (!active.ok) {
		return active;
	}
	if (active.data === null) {
		return notFound(
			"Employee compensation not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	if (!isEmployeeCompensationActive(active.data.status)) {
		return invalidState(
			"Scheduled changes require an active compensation agreement",
		);
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
	if (!created.ok) {
		return created;
	}

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
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return notFound(
			"Employee compensation not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const comp = existing.data;
	const versionCheck = assertExpectedVersion(
		comp.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}
	if (!isEmployeeCompensationScheduled(comp.status)) {
		return invalidState(
			"Only scheduled compensation agreements can be activated",
		);
	}
	if (
		resolveEmployeeCompensationApprovalStatus(comp.effectiveFrom) !== "active"
	) {
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
	const preparedEndedAudit = prepareDerivedEmployeeCompensationAudit({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		oldValue: { status: "active" },
		newValue: { status: "ended", effectiveTo: predecessorEffectiveTo },
		meta,
		reasonCode: "END_ACTIVE_PREDECESSOR",
	});
	if (!preparedEndedAudit.ok) {
		return preparedEndedAudit;
	}
	const endedAudit = preparedEndedAudit.data;
	const preparedActivatedAudit = prepareEmployeeCompensationAudit({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		entityId: input.compensationId,
		action: "UPDATE",
		oldValue: { status: comp.status, version: comp.version },
		newValue: { status: "active", version: nextVersion },
		meta,
		reasonCode: "ACTIVATE",
	});
	if (!preparedActivatedAudit.ok) {
		return preparedActivatedAudit;
	}
	const activatedAudit = preparedActivatedAudit.data;

	try {
		const [, rows] = await afendaDatabase.transaction((sqlTag) => [
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
							version = hr_employee_compensation.version + 1,
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditEndedId}, ${endedAudit.organizationId}, ${endedAudit.actorUserId},
							${endedAudit.correlationId}, ${endedAudit.module}, ${endedAudit.entity}, id,
							${endedAudit.action}, ${endedAudit.changesJson}::jsonb,
							${endedAudit.oldValueJson}::jsonb, ${endedAudit.newValueJson}::jsonb,
							${endedAudit.metadataJson}::jsonb, ${endedAudit.ipAddress},
							${endedAudit.userAgent}
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
					)
					SELECT ended_comp.id
					FROM ended_comp, audit_ended, outbox_ended
				`,
			sqlTag`
					WITH
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditActivatedId}, ${activatedAudit.organizationId},
							${activatedAudit.actorUserId}, ${activatedAudit.correlationId},
							${activatedAudit.module}, ${activatedAudit.entity}, ${activatedAudit.entityId},
							${activatedAudit.action}, ${activatedAudit.changesJson}::jsonb,
							${activatedAudit.oldValueJson}::jsonb,
							${activatedAudit.newValueJson}::jsonb,
							${activatedAudit.metadataJson}::jsonb, ${activatedAudit.ipAddress},
							${activatedAudit.userAgent}
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
		]);
		const [row] = rows;
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

function prepareEmployeeCompensationCorrectionAudits(input: {
	actorUserId: string;
	compensationId: HumanResourcesEmployeeCompensationId;
	correlationId: string;
	meta: HumanResourcesMutationMeta;
	organizationId: string;
	predecessor: EmployeeCompensation;
	predecessorEffectiveTo: string;
	predecessorEffectiveToForActiveEnd: string;
	successorEffectiveFrom: string;
	successorEffectiveTo: string | null;
	successorId: HumanResourcesEmployeeCompensationId;
	successorStatus: EmployeeCompensation["status"];
}): Result<{
	endedAudit: PreparedDerivedEntityAuditInsertValues | null;
	successorAudit: PreparedTransactionalAuditInsertValues;
	supersededAudit: PreparedTransactionalAuditInsertValues;
}> {
	const preparedSupersededAudit = prepareEmployeeCompensationAudit({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		entityId: input.compensationId,
		action: "UPDATE",
		oldValue: {
			status: input.predecessor.status,
			effectiveTo: input.predecessor.effectiveTo,
			version: input.predecessor.version,
		},
		newValue: {
			status: "superseded",
			effectiveTo: input.predecessorEffectiveTo,
			version: input.predecessor.version + 1,
		},
		meta: input.meta,
		reasonCode: "CORRECTION_SUPERSEDE",
	});
	if (!preparedSupersededAudit.ok) {
		return preparedSupersededAudit;
	}

	const preparedEndedAudit =
		input.successorStatus === "active"
			? prepareDerivedEmployeeCompensationAudit({
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					oldValue: { status: "active" },
					newValue: {
						status: "ended",
						effectiveTo: input.predecessorEffectiveToForActiveEnd,
					},
					meta: input.meta,
					reasonCode: "END_ACTIVE_PREDECESSOR",
				})
			: null;
	let endedAudit: PreparedDerivedEntityAuditInsertValues | null = null;
	if (preparedEndedAudit !== null) {
		if (!preparedEndedAudit.ok) {
			return preparedEndedAudit;
		}
		endedAudit = preparedEndedAudit.data;
	}

	const preparedSuccessorAudit = prepareEmployeeCompensationAudit({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		entityId: input.successorId,
		action: "CREATE",
		newValue: {
			status: input.successorStatus,
			effectiveFrom: input.successorEffectiveFrom,
			effectiveTo: input.successorEffectiveTo,
			supersedesCompensationId: input.compensationId,
			version: 1,
		},
		meta: input.meta,
		reasonCode: "CORRECTION_SUCCESSOR",
	});
	if (!preparedSuccessorAudit.ok) {
		return preparedSuccessorAudit;
	}

	return errorResult.ok({
		endedAudit,
		successorAudit: preparedSuccessorAudit.data,
		supersededAudit: preparedSupersededAudit.data,
	});
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
	if (!existingReplay.ok) {
		return existingReplay;
	}
	if (existingReplay.data !== null) {
		return errorResult.ok(existingReplay.data);
	}

	const predecessorResult = await host.getEmployeeCompensation({
		organizationId: input.organizationId,
		compensationId: input.compensationId,
	});
	if (!predecessorResult.ok) {
		return predecessorResult;
	}
	if (predecessorResult.data === null) {
		return notFound(
			"Employee compensation not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const predecessor = predecessorResult.data;
	if (!isEmployeeCompensationCorrectable(predecessor.status)) {
		return invalidState(
			"Compensation cannot be corrected in its current status",
		);
	}

	const reason =
		input.evidenceReference === null
			? input.reason
			: `${input.reason} (${input.evidenceReference})`;
	const successorStatus = resolveEmployeeCompensationApprovalStatus(
		input.effectiveFrom,
	);
	const correctionPredecessorEnd = dayBeforeIsoDate(input.effectiveFrom);
	const predecessorEffectiveTo =
		predecessor.effectiveTo ??
		(correctionPredecessorEnd < predecessor.effectiveFrom
			? predecessor.effectiveFrom
			: correctionPredecessorEnd);

	const id = randomUUID();
	const brandedId = parseHumanResourcesEmployeeCompensationId(id);
	if (!brandedId.ok) {
		return brandedId;
	}

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
	const predecessorEffectiveToForActiveEnd = dayBeforeIsoDate(
		input.effectiveFrom,
	);
	const preparedAudits = prepareEmployeeCompensationCorrectionAudits({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		compensationId: input.compensationId,
		meta,
		predecessor,
		predecessorEffectiveTo,
		predecessorEffectiveToForActiveEnd,
		successorEffectiveFrom: input.effectiveFrom,
		successorEffectiveTo: input.effectiveTo,
		successorId: brandedId.data,
		successorStatus,
	});
	if (!preparedAudits.ok) {
		return preparedAudits;
	}
	const { endedAudit, successorAudit, supersededAudit } = preparedAudits.data;

	try {
		const [, rows] = await afendaDatabase.transaction((sqlTag) => [
			successorStatus === "active"
				? sqlTag`
						WITH superseded AS (
							UPDATE hr_employee_compensation
							SET status = 'superseded',
								effective_to = ${predecessorEffectiveTo},
								version = hr_employee_compensation.version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.compensationId}
								AND organization_id = ${input.organizationId}
							RETURNING *
						),
						audit_superseded AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditSupersededId}, ${supersededAudit.organizationId},
								${supersededAudit.actorUserId}, ${supersededAudit.correlationId},
								${supersededAudit.module}, ${supersededAudit.entity},
								${supersededAudit.entityId}, ${supersededAudit.action},
								${supersededAudit.changesJson}::jsonb, ${supersededAudit.oldValueJson}::jsonb,
								${supersededAudit.newValueJson}::jsonb, ${supersededAudit.metadataJson}::jsonb,
								${supersededAudit.ipAddress}, ${supersededAudit.userAgent}
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
								AND id <> ${input.compensationId}
								AND status = 'active'
							FOR UPDATE
						),
						ended_comp AS (
							UPDATE hr_employee_compensation
							SET status = 'ended',
								effective_to = ${predecessorEffectiveToForActiveEnd},
								version = hr_employee_compensation.version + 1,
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditEndedId}, ${endedAudit?.organizationId ?? null},
								${endedAudit?.actorUserId ?? null}, ${endedAudit?.correlationId ?? null},
								${endedAudit?.module ?? null}, ${endedAudit?.entity ?? null}, id,
								${endedAudit?.action ?? null}, ${endedAudit?.changesJson ?? null}::jsonb,
								${endedAudit?.oldValueJson ?? null}::jsonb,
								${endedAudit?.newValueJson ?? null}::jsonb,
								${endedAudit?.metadataJson ?? null}::jsonb,
								${endedAudit?.ipAddress ?? null}, ${endedAudit?.userAgent ?? null}
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
						)
						SELECT superseded.id
						FROM superseded, audit_superseded, outbox_superseded
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditSupersededId}, ${supersededAudit.organizationId},
								${supersededAudit.actorUserId}, ${supersededAudit.correlationId},
								${supersededAudit.module}, ${supersededAudit.entity},
								${supersededAudit.entityId}, ${supersededAudit.action},
								${supersededAudit.changesJson}::jsonb, ${supersededAudit.oldValueJson}::jsonb,
								${supersededAudit.newValueJson}::jsonb, ${supersededAudit.metadataJson}::jsonb,
								${supersededAudit.ipAddress}, ${supersededAudit.userAgent}
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
						)
						SELECT superseded.id
						FROM superseded, audit_superseded, outbox_superseded
					`,
			sqlTag`
					WITH mutated AS (
							INSERT INTO hr_employee_compensation (
								id, organization_id, employee_id, employment_id, grade_id,
								salary_band_id, base_amount, currency_code, pay_frequency,
								effective_from, effective_to, reason, confidential_note,
								supersedes_compensation_id, approved_at, approved_by, status,
								source_review_id, create_idempotency_key, create_request_fingerprint,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, predecessor.organization_id, predecessor.employee_id,
								predecessor.employment_id, ${input.gradeId}, ${input.salaryBandId},
								${input.baseAmount}, ${input.currencyCode}, ${input.payFrequency},
								${input.effectiveFrom}, ${input.effectiveTo}, ${reason},
								${input.confidentialNote}, predecessor.id, now(), ${input.actorUserId},
								${successorStatus}, predecessor.source_review_id,
								${input.createIdempotencyKey}, ${input.createRequestFingerprint},
								1, ${input.actorUserId}, ${input.actorUserId}
							FROM hr_employee_compensation AS predecessor
							WHERE predecessor.id = ${input.compensationId}
								AND predecessor.organization_id = ${input.organizationId}
								AND predecessor.status = 'superseded'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditSuccessorId}, ${successorAudit.organizationId},
								${successorAudit.actorUserId}, ${successorAudit.correlationId},
								${successorAudit.module}, ${successorAudit.entity}, ${successorAudit.entityId},
								${successorAudit.action}, ${successorAudit.changesJson}::jsonb,
								${successorAudit.oldValueJson}::jsonb, ${successorAudit.newValueJson}::jsonb,
								${successorAudit.metadataJson}::jsonb, ${successorAudit.ipAddress},
								${successorAudit.userAgent}
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
		]);
		const [row] = rows;
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
			if (!replay.ok) {
				return replay;
			}
			if (replay.data !== null) {
				return errorResult.ok(replay.data);
			}
		}
		return mapPersistenceFailure(
			error,
			"Failed to correct employee compensation",
		);
	}
}
