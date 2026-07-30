import { randomUUID } from "node:crypto";

import {
	and,
	db,
	eq,
	hrBenefitEligibility,
	type hrBenefitEnrollment,
	hrBenefitEnrollmentDependent,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
import { HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT } from "@afenda/events/schemas";

import {
	type HumanResourcesBenefitEnrollmentDependentId,
	type HumanResourcesBenefitEnrollmentId,
	type HumanResourcesBenefitPlanId,
	parseHumanResourcesBenefitEnrollmentDependentId,
	parseHumanResourcesBenefitEnrollmentId,
	parseHumanResourcesBenefitPlanId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentId,
} from "../../brands";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../../error-codes";
import type { MutationPorts } from "../../ports";
import {
	assertEffectiveRange,
	isEmployeeEligibleForBenefitPlan,
	tenureDaysOn,
} from "../../shared/benefit-guards";
import {
	benefitDependentRelationshipSchema,
	benefitEnrollmentStatusSchema,
	isBenefitEnrollmentActive,
	isBenefitEnrollmentOpen,
	isBenefitPlanActive,
	payFrequencySchema,
} from "../../shared/compensation-status";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	invalidInput,
	invalidState,
	missAfterOptimisticUpdate,
	notFound,
} from "../../shared/domain-guards";
import { employmentStatusSchema } from "../../shared/employment-status";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import { mapPersistenceFailure } from "../../shared/persistence-errors";
import type { HumanResourcesStore } from "../../store";
import type {
	BenefitEnrollment,
	BenefitEnrollmentDependent,
	BenefitPlanEligibility,
} from "../../types";

export function parseBenefitEnrollmentContributionFrequency(
	value: string | null,
): Result<BenefitEnrollment["contributionFrequency"]> {
	if (value === null) {
		return ok(null);
	}
	const parsed = payFrequencySchema.safeParse(value);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid benefit enrollment contribution frequency",
		);
	}
	return ok(parsed.data);
}

export interface BenefitEnrollmentSqlRow {
	contribution_currency_code: string | null;
	contribution_frequency: string | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	effective_from: string;
	effective_to: string | null;
	employee_contribution_amount: string | null;
	employee_id: string;
	employer_contribution_amount: string | null;
	employment_id: string;
	id: string;
	organization_id: string;
	plan_id: string;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
	waiver_reason: string | null;
}

export function mapBenefitEnrollmentSql(
	row: BenefitEnrollmentSqlRow,
): Result<BenefitEnrollment> {
	const id = parseHumanResourcesBenefitEnrollmentId(row.id);
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employee_id);
	if (!employeeId.ok) {
		return employeeId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employment_id);
	if (!employmentId.ok) {
		return employmentId;
	}
	const planId = parseHumanResourcesBenefitPlanId(row.plan_id);
	if (!planId.ok) {
		return planId;
	}
	const status = benefitEnrollmentStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid benefit enrollment status");
	}
	const contributionFrequency = parseBenefitEnrollmentContributionFrequency(
		row.contribution_frequency,
	);
	if (!contributionFrequency.ok) {
		return contributionFrequency;
	}
	return ok({
		id: id.data,
		organizationId: row.organization_id,
		employeeId: employeeId.data,
		employmentId: employmentId.data,
		planId: planId.data,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		status: status.data,
		employeeContributionAmount: row.employee_contribution_amount,
		employerContributionAmount: row.employer_contribution_amount,
		contributionCurrencyCode: row.contribution_currency_code,
		contributionFrequency: contributionFrequency.data,
		waiverReason: row.waiver_reason,
		createIdempotencyKey: row.create_idempotency_key,
		fingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

export function mapBenefitEnrollmentFromDbRow(
	row: typeof hrBenefitEnrollment.$inferSelect,
): Result<BenefitEnrollment> {
	const id = parseHumanResourcesBenefitEnrollmentId(row.id);
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	const planId = parseHumanResourcesBenefitPlanId(row.planId);
	if (!planId.ok) {
		return planId;
	}
	const status = benefitEnrollmentStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid benefit enrollment status");
	}
	const contributionFrequency = parseBenefitEnrollmentContributionFrequency(
		row.contributionFrequency,
	);
	if (!contributionFrequency.ok) {
		return contributionFrequency;
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		employmentId: employmentId.data,
		planId: planId.data,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		status: status.data,
		employeeContributionAmount: row.employeeContributionAmount,
		employerContributionAmount: row.employerContributionAmount,
		contributionCurrencyCode: row.contributionCurrencyCode,
		contributionFrequency: contributionFrequency.data,
		waiverReason: row.waiverReason,
		createIdempotencyKey: row.createIdempotencyKey,
		fingerprint: row.createRequestFingerprint,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function eventPayloadJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

interface BenefitEligibilitySqlRow {
	allowed_employment_statuses: string;
	created_at: Date;
	created_by: string;
	id: string;
	min_tenure_days: number | null;
	organization_id: string;
	plan_id: string;
	updated_at: Date;
	updated_by: string;
}

interface BenefitEnrollmentDependentSqlRow {
	created_at: Date;
	created_by: string;
	dependent_name: string;
	effective_from: string;
	effective_to: string | null;
	enrollment_id: string;
	id: string;
	organization_id: string;
	relationship: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

function mapBenefitPlanEligibility(
	row: BenefitEligibilitySqlRow,
): Result<BenefitPlanEligibility> {
	const planId = parseHumanResourcesBenefitPlanId(row.plan_id);
	if (!planId.ok) {
		return planId;
	}
	const statuses = row.allowed_employment_statuses
		.split(",")
		.map((value) => value.trim())
		.filter((value) => value.length > 0);
	const allowedEmploymentStatuses: BenefitPlanEligibility["allowedEmploymentStatuses"] =
		[];
	for (const status of statuses) {
		const parsed = employmentStatusSchema.safeParse(status);
		if (!parsed.success) {
			return fail(
				"INTERNAL_ERROR",
				"Invalid benefit eligibility employment status",
			);
		}
		allowedEmploymentStatuses.push(parsed.data);
	}
	return ok({
		id: row.id,
		organizationId: row.organization_id,
		planId: planId.data,
		minTenureDays: row.min_tenure_days,
		allowedEmploymentStatuses,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapBenefitEnrollmentDependent(
	row: BenefitEnrollmentDependentSqlRow,
): Result<BenefitEnrollmentDependent> {
	const id = parseHumanResourcesBenefitEnrollmentDependentId(row.id);
	if (!id.ok) {
		return id;
	}
	const enrollmentId = parseHumanResourcesBenefitEnrollmentId(
		row.enrollment_id,
	);
	if (!enrollmentId.ok) {
		return enrollmentId;
	}
	const relationship = benefitDependentRelationshipSchema.safeParse(
		row.relationship,
	);
	if (!relationship.success) {
		return fail("INTERNAL_ERROR", "Invalid benefit dependent relationship");
	}
	return ok({
		id: id.data,
		organizationId: row.organization_id,
		enrollmentId: enrollmentId.data,
		dependentName: row.dependent_name,
		relationship: relationship.data,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

export type BenefitDrizzleHost = Pick<
	HumanResourcesStore,
	"getBenefitPlan" | "getBenefitEnrollment" | "getEmploymentById"
>;

export async function drizzleGetBenefitPlanEligibility(input: {
	organizationId: string;
	planId: HumanResourcesBenefitPlanId;
}): Promise<Result<BenefitPlanEligibility | null>> {
	try {
		const rows = await db
			.select()
			.from(hrBenefitEligibility)
			.where(
				and(
					eq(hrBenefitEligibility.organizationId, input.organizationId),
					eq(hrBenefitEligibility.planId, input.planId),
				),
			)
			.limit(1);
		const [row] = rows;
		if (!row) {
			return ok(null);
		}
		return mapBenefitPlanEligibility({
			id: row.id,
			organization_id: row.organizationId,
			plan_id: row.planId,
			min_tenure_days: row.minTenureDays,
			allowed_employment_statuses: row.allowedEmploymentStatuses,
			created_by: row.createdBy,
			updated_by: row.updatedBy,
			created_at: row.createdAt,
			updated_at: row.updatedAt,
		});
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to load benefit plan eligibility",
		);
	}
}

export async function drizzleSetBenefitPlanEligibility(
	host: BenefitDrizzleHost,
	input: {
		organizationId: string;
		planId: HumanResourcesBenefitPlanId;
		minTenureDays: number | null;
		allowedEmploymentStatuses: BenefitPlanEligibility["allowedEmploymentStatuses"];
		actorUserId: string;
	},
	_ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<BenefitPlanEligibility>> {
	const plan = await host.getBenefitPlan({
		organizationId: input.organizationId,
		planId: input.planId,
	});
	if (!plan.ok) {
		return plan;
	}
	if (plan.data === null) {
		return notFound(
			"Benefit plan not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}

	const existing = await drizzleGetBenefitPlanEligibility({
		organizationId: input.organizationId,
		planId: input.planId,
	});
	if (!existing.ok) {
		return existing;
	}

	const id = existing.data?.id ?? randomUUID();
	const auditId = randomUUID();
	const allowedStatuses = input.allowedEmploymentStatuses.join(",");

	try {
		const [rows] = await runNeonHttpTransaction<[BenefitEligibilitySqlRow[]]>(
			(sqlTag) => [
				sqlTag`
					WITH mutated AS (
						INSERT INTO hr_benefit_eligibility (
							id, organization_id, plan_id, min_tenure_days,
							allowed_employment_statuses, created_by, updated_by
						)
						VALUES (
							${id}, ${input.organizationId}, ${input.planId}, ${input.minTenureDays},
							${allowedStatuses}, ${input.actorUserId}, ${input.actorUserId}
						)
						ON CONFLICT (organization_id, plan_id)
						DO UPDATE SET
							min_tenure_days = EXCLUDED.min_tenure_days,
							allowed_employment_statuses = EXCLUDED.allowed_employment_statuses,
							updated_by = EXCLUDED.updated_by,
							updated_at = now()
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_benefit_eligibility', id,
							${existing.data === null ? "CREATE" : "UPDATE"}, '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			],
		);
		const [row] = rows;
		if (!row) {
			return fail("INTERNAL_ERROR", "Failed to set benefit plan eligibility");
		}
		return mapBenefitPlanEligibility(row);
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to set benefit plan eligibility",
		);
	}
}

export async function drizzleWaiveBenefit(
	host: BenefitDrizzleHost,
	input: {
		organizationId: string;
		enrollmentId: HumanResourcesBenefitEnrollmentId;
		waiverReason: string;
		effectiveTo: string | null;
		expectedVersion: number;
		actorUserId: string;
	},
	_ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<BenefitEnrollment>> {
	const existing = await host.getBenefitEnrollment({
		organizationId: input.organizationId,
		enrollmentId: input.enrollmentId,
	});
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return notFound("Benefit enrollment not found");
	}
	const versionCheck = assertExpectedVersion(
		existing.data.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}
	if (!isBenefitEnrollmentActive(existing.data.status)) {
		return invalidState("Only active benefit enrollments can be waived");
	}
	const rangeCheck = assertEffectiveRange({
		effectiveFrom: existing.data.effectiveFrom,
		effectiveTo: input.effectiveTo,
	});
	if (!rangeCheck.ok) {
		return rangeCheck;
	}

	const nextVersion = input.expectedVersion + 1;
	const auditId = randomUUID();
	const eventId = randomUUID();
	const payloadJson = eventPayloadJson({
		organizationId: input.organizationId,
		entityType: "hr_benefit_enrollment",
		entityId: input.enrollmentId,
		actorId: input.actorUserId,
		correlationId: meta.correlationId,
	});

	try {
		const [rows] = await runNeonHttpTransaction<[BenefitEnrollmentSqlRow[]]>(
			(sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_benefit_enrollment
						SET status = 'waived',
							waiver_reason = ${input.waiverReason},
							effective_to = ${input.effectiveTo},
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.enrollmentId}
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
							'human-resources', 'hr_benefit_enrollment', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			],
		);
		const [row] = rows;
		if (!row) {
			return missAfterOptimisticUpdate({
				found: true,
				entityLabel: "Benefit enrollment",
			});
		}
		return mapBenefitEnrollmentSql(row);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to waive benefit enrollment");
	}
}

export async function drizzleGetBenefitEnrollmentDependent(input: {
	organizationId: string;
	dependentId: HumanResourcesBenefitEnrollmentDependentId;
}): Promise<Result<BenefitEnrollmentDependent | null>> {
	try {
		const rows = await db
			.select()
			.from(hrBenefitEnrollmentDependent)
			.where(
				and(
					eq(hrBenefitEnrollmentDependent.organizationId, input.organizationId),
					eq(hrBenefitEnrollmentDependent.id, input.dependentId),
				),
			)
			.limit(1);
		const [row] = rows;
		if (!row) {
			return ok(null);
		}
		return mapBenefitEnrollmentDependent({
			id: row.id,
			organization_id: row.organizationId,
			enrollment_id: row.enrollmentId,
			dependent_name: row.dependentName,
			relationship: row.relationship,
			effective_from: row.effectiveFrom,
			effective_to: row.effectiveTo,
			version: row.version,
			created_by: row.createdBy,
			updated_by: row.updatedBy,
			created_at: row.createdAt,
			updated_at: row.updatedAt,
		});
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to load benefit enrollment dependent",
		);
	}
}

export async function drizzleListBenefitEnrollmentDependentsByEnrollment(input: {
	organizationId: string;
	enrollmentId: HumanResourcesBenefitEnrollmentId;
}): Promise<Result<BenefitEnrollmentDependent[]>> {
	try {
		const rows = await db
			.select()
			.from(hrBenefitEnrollmentDependent)
			.where(
				and(
					eq(hrBenefitEnrollmentDependent.organizationId, input.organizationId),
					eq(hrBenefitEnrollmentDependent.enrollmentId, input.enrollmentId),
				),
			);
		const dependents: BenefitEnrollmentDependent[] = [];
		for (const row of rows) {
			const mapped = mapBenefitEnrollmentDependent({
				id: row.id,
				organization_id: row.organizationId,
				enrollment_id: row.enrollmentId,
				dependent_name: row.dependentName,
				relationship: row.relationship,
				effective_from: row.effectiveFrom,
				effective_to: row.effectiveTo,
				version: row.version,
				created_by: row.createdBy,
				updated_by: row.updatedBy,
				created_at: row.createdAt,
				updated_at: row.updatedAt,
			});
			if (!mapped.ok) {
				return mapped;
			}
			dependents.push(mapped.data);
		}
		dependents.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
		return ok(dependents);
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to list benefit enrollment dependents",
		);
	}
}

export async function drizzleAddBenefitEnrollmentDependent(
	host: BenefitDrizzleHost,
	input: {
		organizationId: string;
		enrollmentId: HumanResourcesBenefitEnrollmentId;
		dependentName: string;
		relationship: BenefitEnrollmentDependent["relationship"];
		effectiveFrom: string;
		actorUserId: string;
	},
	_ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<BenefitEnrollmentDependent>> {
	const enrollment = await host.getBenefitEnrollment({
		organizationId: input.organizationId,
		enrollmentId: input.enrollmentId,
	});
	if (!enrollment.ok) {
		return enrollment;
	}
	if (enrollment.data === null) {
		return notFound(
			"Benefit enrollment not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	if (!isBenefitEnrollmentActive(enrollment.data.status)) {
		return invalidState(
			"Dependents can only be added to active benefit enrollments",
		);
	}
	const rangeCheck = assertEffectiveRange({
		effectiveFrom: input.effectiveFrom,
		effectiveTo: enrollment.data.effectiveTo,
	});
	if (!rangeCheck.ok) {
		return rangeCheck;
	}
	if (input.effectiveFrom < enrollment.data.effectiveFrom) {
		return invalidInput(
			"Dependent effective date must be on or after enrollment effective date",
		);
	}

	const id = randomUUID();
	const brandedId = parseHumanResourcesBenefitEnrollmentDependentId(id);
	if (!brandedId.ok) {
		return brandedId;
	}
	const auditId = randomUUID();

	try {
		const [rows] = await runNeonHttpTransaction<
			[BenefitEnrollmentDependentSqlRow[]]
		>((sqlTag) => [
			sqlTag`
				WITH mutated AS (
					INSERT INTO hr_benefit_enrollment_dependent (
						id, organization_id, enrollment_id, dependent_name, relationship,
						effective_from, effective_to, version, created_by, updated_by
					)
					VALUES (
						${brandedId.data}, ${input.organizationId}, ${input.enrollmentId},
						${input.dependentName}, ${input.relationship}, ${input.effectiveFrom},
						NULL, 1, ${input.actorUserId}, ${input.actorUserId}
					)
					RETURNING *
				),
				audited AS (
					INSERT INTO platform_audit_log (
						id, organization_id, actor_user_id, correlation_id, module, entity,
						entity_id, action, changes
					)
					SELECT
						${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
						'human-resources', 'hr_benefit_enrollment_dependent', id, 'CREATE', '[]'::jsonb
					FROM mutated
					RETURNING id
				)
				SELECT mutated.* FROM mutated, audited
			`,
		]);
		const [row] = rows;
		if (!row) {
			return fail(
				"INTERNAL_ERROR",
				"Failed to add benefit enrollment dependent",
			);
		}
		return mapBenefitEnrollmentDependent(row);
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to add benefit enrollment dependent",
		);
	}
}

export async function drizzleEndBenefitEnrollmentDependent(
	input: {
		organizationId: string;
		dependentId: HumanResourcesBenefitEnrollmentDependentId;
		endsOn: string;
		expectedVersion: number;
		actorUserId: string;
	},
	_ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<BenefitEnrollmentDependent>> {
	const existing = await drizzleGetBenefitEnrollmentDependent({
		organizationId: input.organizationId,
		dependentId: input.dependentId,
	});
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return notFound(
			"Benefit enrollment dependent not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const versionCheck = assertExpectedVersion(
		existing.data.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}
	if (existing.data.effectiveTo !== null) {
		return invalidState("Benefit enrollment dependent is already ended");
	}
	const rangeCheck = assertEffectiveRange({
		effectiveFrom: existing.data.effectiveFrom,
		effectiveTo: input.endsOn,
	});
	if (!rangeCheck.ok) {
		return rangeCheck;
	}

	const nextVersion = input.expectedVersion + 1;
	const auditId = randomUUID();

	try {
		const [rows] = await runNeonHttpTransaction<
			[BenefitEnrollmentDependentSqlRow[]]
		>((sqlTag) => [
			sqlTag`
				WITH mutated AS (
					UPDATE hr_benefit_enrollment_dependent
					SET effective_to = ${input.endsOn},
						version = ${nextVersion},
						updated_by = ${input.actorUserId},
						updated_at = now()
					WHERE id = ${input.dependentId}
						AND organization_id = ${input.organizationId}
						AND version = ${input.expectedVersion}
						AND effective_to IS NULL
					RETURNING *
				),
				audited AS (
					INSERT INTO platform_audit_log (
						id, organization_id, actor_user_id, correlation_id, module, entity,
						entity_id, action, changes
					)
					SELECT
						${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
						'human-resources', 'hr_benefit_enrollment_dependent', id, 'UPDATE', '[]'::jsonb
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
				entityLabel: "Benefit enrollment dependent",
			});
		}
		return mapBenefitEnrollmentDependent(row);
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to end benefit enrollment dependent",
		);
	}
}

export async function assertDrizzleBenefitEnrollmentPreconditions(
	host: BenefitDrizzleHost,
	record: {
		organizationId: string;
		employeeId: BenefitEnrollment["employeeId"];
		employmentId: BenefitEnrollment["employmentId"];
		planId: HumanResourcesBenefitPlanId;
		effectiveFrom: string;
		effectiveTo: string | null;
	},
): Promise<Result<void>> {
	const rangeCheck = assertEffectiveRange({
		effectiveFrom: record.effectiveFrom,
		effectiveTo: record.effectiveTo,
	});
	if (!rangeCheck.ok) {
		return rangeCheck;
	}

	const plan = await host.getBenefitPlan({
		organizationId: record.organizationId,
		planId: record.planId,
	});
	if (!plan.ok) {
		return plan;
	}
	if (plan.data === null) {
		return notFound(
			"Benefit plan not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	if (!isBenefitPlanActive(plan.data.status)) {
		return invalidState("Benefit plan is not active");
	}

	const employment = await host.getEmploymentById({
		organizationId: record.organizationId,
		employmentId: record.employmentId,
	});
	if (!employment.ok) {
		return employment;
	}
	if (employment.data === null) {
		return notFound(
			"Employment not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	if (employment.data.employeeId !== record.employeeId) {
		return invalidInput("Employee does not match employment assignment");
	}

	const eligibility = await drizzleGetBenefitPlanEligibility({
		organizationId: record.organizationId,
		planId: record.planId,
	});
	if (!eligibility.ok) {
		return eligibility;
	}
	if (eligibility.data !== null) {
		const eligible = isEmployeeEligibleForBenefitPlan({
			eligibility: eligibility.data,
			employmentStatus: employment.data.status,
			tenureDays: tenureDaysOn(employment.data.startsOn, record.effectiveFrom),
		});
		if (!eligible) {
			return invalidState("Employee is not eligible for this benefit plan");
		}
	}

	return ok(undefined);
}

export function isBenefitEnrollmentStatusOpen(
	status: string,
): status is "active" | "waived" {
	const parsed = benefitEnrollmentStatusSchema.safeParse(status);
	return parsed.success && isBenefitEnrollmentOpen(parsed.data);
}
