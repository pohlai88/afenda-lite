import { randomUUID } from "node:crypto";

import {
	type PreparedTransactionalAuditInsertValues,
	prepareTransactionalAuditInsertValues,
} from "@afenda/audit";
import {
	and,
	db,
	desc,
	eq,
	gte,
	hrDocumentRequirement,
	hrEmployee,
	hrEmployeeDocument,
	hrPolicyAcknowledgement,
	hrWorkEligibility,
	lte,
	ne,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_EXPIRED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REGISTERED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REJECTED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_VERIFIED_EVENT,
	HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGED_EVENT,
	HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_OUTSTANDING_EVENT,
	HUMAN_RESOURCES_WORK_ELIGIBILITY_EXPIRED_EVENT,
	HUMAN_RESOURCES_WORK_ELIGIBILITY_RENEWED_EVENT,
	HUMAN_RESOURCES_WORK_ELIGIBILITY_SUSPENDED_EVENT,
	HUMAN_RESOURCES_WORK_ELIGIBILITY_VERIFIED_EVENT,
} from "@afenda/events/schemas";

import {
	parseHumanResourcesDocumentRequirementId,
	parseHumanResourcesEmployeeDocumentId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesPolicyAcknowledgementId,
	parseHumanResourcesWorkEligibilityId,
} from "../../brands";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../../error-codes";
import {
	addIsoCalendarDays,
	assertDocumentRequirementStatusTransition,
	assertEmployeeDocumentVerificationTransition,
	assertPolicyAcknowledgementStatusTransition,
	assertRejectionReasonProvided,
	assertValidDocumentDateRange,
	assertWorkEligibilityStatusTransition,
	COMPLIANCE_NEARING_EXPIRY_DAYS,
	isDocumentRequirementApplicable,
	isNearingExpiry,
	isWithinInclusiveDateWindow,
} from "../../shared/compliance-guards";
import { toEmployeeDocumentListItem } from "../../shared/compliance-privacy";
import {
	documentRequirementApplicabilitySchema,
	documentRequirementStatusSchema,
	employeeDocumentVerificationStatusSchema,
	isDocumentRequirementEditable,
	isWorkEligibilityAtRisk,
	policyAcknowledgementStatusSchema,
	workEligibilityStatusSchema,
} from "../../shared/compliance-status";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	conflict,
	invalidState,
	missAfterOptimisticUpdate,
	notFound,
} from "../../shared/domain-guards";
import { humanResourcesEntityEventPayloadJson } from "../../shared/event-payload";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import {
	isCreateIdempotencyUniqueViolation,
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import type { HumanResourcesStore } from "../../store";
import type {
	DocumentRequirement,
	DocumentRequirementListPage,
	EmployeeComplianceSummary,
	EmployeeDocument,
	EmployeeDocumentListPage,
	IdempotentEmployeeDocumentRecord,
	IdempotentPolicyAcknowledgementRecord,
	IdempotentWorkEligibilityRecord,
	PolicyAcknowledgement,
	PolicyAcknowledgementListPage,
	WorkEligibility,
	WorkEligibilityRiskListPage,
} from "../../types";

const COMPLIANCE_AUDIT_SOURCE = "human-resources.compliance-drizzle";

type ComplianceAuditEntity =
	| "hr_document_requirement"
	| "hr_employee_document"
	| "hr_policy_acknowledgement"
	| "hr_work_eligibility";

interface ComplianceAuditInput {
	action: "CREATE" | "UPDATE";
	actorUserId: string;
	correlationId: string;
	entity: ComplianceAuditEntity;
	entityId: string;
	newValue?: Record<string, unknown> | null;
	oldValue?: Record<string, unknown> | null;
	organizationId: string;
	reasonCode: string;
}

function prepareComplianceAudit(
	input: ComplianceAuditInput,
): Result<PreparedTransactionalAuditInsertValues> {
	return prepareTransactionalAuditInsertValues({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		module: "human-resources",
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		oldValue: input.oldValue ?? null,
		newValue: input.newValue ?? null,
		eventContext: {
			version: 1,
			outcome: "SUCCEEDED",
			source: COMPLIANCE_AUDIT_SOURCE,
			occurredAt: null,
			causationId: null,
			reasonCode: input.reasonCode,
		},
	});
}

function complianceEntityPayload(input: {
	organizationId: string;
	entityType: string;
	entityId: string;
	actorId: string;
	meta: HumanResourcesMutationMeta;
}): string {
	return humanResourcesEntityEventPayloadJson({
		organizationId: input.organizationId,
		entityType: input.entityType,
		entityId: input.entityId,
		actorUserId: input.actorId,
		meta: input.meta,
	});
}

interface ComplianceHost {
	getEmployeeById: HumanResourcesStore["getEmployeeById"];
}

export type DrizzleComplianceMethods = Pick<
	HumanResourcesStore,
	| "getDocumentRequirementById"
	| "findDocumentRequirementByCode"
	| "createDocumentRequirement"
	| "updateDocumentRequirement"
	| "publishDocumentRequirement"
	| "retireDocumentRequirement"
	| "listPublishedDocumentRequirements"
	| "getEmployeeDocumentById"
	| "findEmployeeDocumentByIdempotencyKey"
	| "registerEmployeeDocument"
	| "updateEmployeeDocumentMetadata"
	| "verifyEmployeeDocument"
	| "rejectEmployeeDocument"
	| "revokeEmployeeDocumentVerification"
	| "markEmployeeDocumentExpired"
	| "listEmployeeDocuments"
	| "listMissingRequiredDocuments"
	| "listExpiringEmployeeDocuments"
	| "getWorkEligibilityById"
	| "getActiveWorkEligibilityForEmployee"
	| "findWorkEligibilityByIdempotencyKey"
	| "recordWorkEligibility"
	| "verifyWorkEligibility"
	| "suspendWorkEligibility"
	| "renewWorkEligibility"
	| "closeWorkEligibility"
	| "listEmployeesWithWorkEligibilityRisk"
	| "getPolicyAcknowledgementById"
	| "findPolicyAcknowledgementByIdempotencyKey"
	| "issuePolicyAcknowledgementRequirement"
	| "acknowledgePolicy"
	| "revokePolicyAcknowledgement"
	| "supersedePolicyAcknowledgementRequirement"
	| "getPolicyAcknowledgementStatus"
	| "listOutstandingPolicyAcknowledgements"
	| "listOverduePolicyAcknowledgements"
	| "getEmployeeComplianceSummary"
>;

interface DocumentRequirementSqlRow {
	applicability_json: unknown;
	applies_to_note: string | null;
	code: string;
	created_at: Date;
	created_by: string;
	document_type: string;
	id: string;
	issuing_jurisdiction: string | null;
	name: string;
	organization_id: string;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface EmployeeDocumentSqlRow {
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	created_at: Date;
	created_by: string;
	document_ref: string;
	document_type: string;
	employee_id: string;
	expires_on: string | null;
	id: string;
	identifier_fingerprint: string | null;
	identifier_last4: string | null;
	issued_on: string;
	issuing_jurisdiction: string | null;
	metadata_json: unknown;
	organization_id: string;
	rejection_reason: string | null;
	requirement_id: string | null;
	updated_at: Date;
	updated_by: string;
	verification_status: string;
	verified_at: Date | null;
	verified_by: string | null;
	version: number;
}

interface WorkEligibilitySqlRow {
	country_code: string;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	created_at: Date;
	created_by: string;
	document_ref: string | null;
	employee_id: string;
	expires_on: string | null;
	id: string;
	issued_on: string;
	jurisdiction: string | null;
	organization_id: string;
	status: string;
	updated_at: Date;
	updated_by: string;
	verified_at: Date | null;
	verified_by: string | null;
	version: number;
}

interface PolicyAcknowledgementSqlRow {
	acknowledged_at: Date | null;
	acknowledged_by: string | null;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	created_at: Date;
	created_by: string;
	due_on: string;
	employee_id: string;
	id: string;
	issued_at: Date;
	organization_id: string;
	policy_code: string;
	policy_version: string;
	requirement_status: string;
	supersedes_acknowledgement_id: string | null;
	updated_at: Date;
	updated_by: string;
	version: number;
}

function parseMetadataJson(value: unknown): Record<string, unknown> | null {
	if (value === null || value === undefined) {
		return null;
	}
	if (typeof value === "object" && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return null;
}

function mapDocumentRequirement(
	row: typeof hrDocumentRequirement.$inferSelect,
): Result<DocumentRequirement> {
	const id = parseHumanResourcesDocumentRequirementId(row.id);
	if (!id.ok) {
		return id;
	}
	const status = documentRequirementStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid document requirement status");
	}
	const applicability = documentRequirementApplicabilitySchema.safeParse(
		row.applicabilityJson,
	);
	if (!applicability.success) {
		return fail("INTERNAL_ERROR", "Invalid document requirement applicability");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		name: row.name,
		documentType: row.documentType,
		issuingJurisdiction: row.issuingJurisdiction,
		appliesToNote: row.appliesToNote,
		applicability: applicability.data,
		status: status.data,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapDocumentRequirementSql(
	row: DocumentRequirementSqlRow,
): Result<DocumentRequirement> {
	return mapDocumentRequirement({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		name: row.name,
		documentType: row.document_type,
		issuingJurisdiction: row.issuing_jurisdiction,
		appliesToNote: row.applies_to_note,
		applicabilityJson: row.applicability_json,
		status: row.status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapEmployeeDocument(
	row: typeof hrEmployeeDocument.$inferSelect,
): Result<EmployeeDocument> {
	const id = parseHumanResourcesEmployeeDocumentId(row.id);
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	let requirementId = null as EmployeeDocument["requirementId"];
	if (row.requirementId !== null) {
		const parsed = parseHumanResourcesDocumentRequirementId(row.requirementId);
		if (!parsed.ok) {
			return parsed;
		}
		requirementId = parsed.data;
	}
	const verificationStatus = employeeDocumentVerificationStatusSchema.safeParse(
		row.verificationStatus,
	);
	if (!verificationStatus.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employee document verification status",
		);
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		requirementId,
		documentType: row.documentType,
		issuingJurisdiction: row.issuingJurisdiction,
		issuedOn: row.issuedOn,
		expiresOn: row.expiresOn,
		verificationStatus: verificationStatus.data,
		verifiedBy: row.verifiedBy,
		verifiedAt: row.verifiedAt,
		rejectionReason: row.rejectionReason,
		documentRef: row.documentRef,
		identifierLast4: row.identifierLast4,
		identifierFingerprint: row.identifierFingerprint,
		metadata: parseMetadataJson(row.metadataJson),
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapEmployeeDocumentSql(
	row: EmployeeDocumentSqlRow,
): Result<EmployeeDocument> {
	return mapEmployeeDocument({
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		requirementId: row.requirement_id,
		documentType: row.document_type,
		issuingJurisdiction: row.issuing_jurisdiction,
		issuedOn: row.issued_on,
		expiresOn: row.expires_on,
		verificationStatus: row.verification_status,
		verifiedBy: row.verified_by,
		verifiedAt: row.verified_at,
		rejectionReason: row.rejection_reason,
		documentRef: row.document_ref,
		identifierLast4: row.identifier_last4,
		identifierFingerprint: row.identifier_fingerprint,
		metadataJson: row.metadata_json,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapWorkEligibility(
	row: typeof hrWorkEligibility.$inferSelect,
): Result<WorkEligibility> {
	const id = parseHumanResourcesWorkEligibilityId(row.id);
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	const status = workEligibilityStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid work eligibility status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		countryCode: row.countryCode,
		jurisdiction: row.jurisdiction,
		status: status.data,
		issuedOn: row.issuedOn,
		expiresOn: row.expiresOn,
		verifiedBy: row.verifiedBy,
		verifiedAt: row.verifiedAt,
		documentRef: row.documentRef,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapWorkEligibilitySql(
	row: WorkEligibilitySqlRow,
): Result<WorkEligibility> {
	return mapWorkEligibility({
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		countryCode: row.country_code,
		jurisdiction: row.jurisdiction,
		status: row.status,
		issuedOn: row.issued_on,
		expiresOn: row.expires_on,
		verifiedBy: row.verified_by,
		verifiedAt: row.verified_at,
		documentRef: row.document_ref,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapPolicyAcknowledgement(
	row: typeof hrPolicyAcknowledgement.$inferSelect,
): Result<PolicyAcknowledgement> {
	const id = parseHumanResourcesPolicyAcknowledgementId(row.id);
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	let supersedesAcknowledgementId =
		null as PolicyAcknowledgement["supersedesAcknowledgementId"];
	if (row.supersedesAcknowledgementId !== null) {
		const parsed = parseHumanResourcesPolicyAcknowledgementId(
			row.supersedesAcknowledgementId,
		);
		if (!parsed.ok) {
			return parsed;
		}
		supersedesAcknowledgementId = parsed.data;
	}
	const requirementStatus = policyAcknowledgementStatusSchema.safeParse(
		row.requirementStatus,
	);
	if (!requirementStatus.success) {
		return fail("INTERNAL_ERROR", "Invalid policy acknowledgement status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		policyCode: row.policyCode,
		policyVersion: row.policyVersion,
		requirementStatus: requirementStatus.data,
		issuedAt: row.issuedAt,
		dueOn: row.dueOn,
		acknowledgedAt: row.acknowledgedAt,
		acknowledgedBy: row.acknowledgedBy,
		supersedesAcknowledgementId,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapPolicyAcknowledgementSql(
	row: PolicyAcknowledgementSqlRow,
): Result<PolicyAcknowledgement> {
	return mapPolicyAcknowledgement({
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		policyCode: row.policy_code,
		policyVersion: row.policy_version,
		requirementStatus: row.requirement_status,
		issuedAt: row.issued_at,
		dueOn: row.due_on,
		acknowledgedAt: row.acknowledged_at,
		acknowledgedBy: row.acknowledged_by,
		supersedesAcknowledgementId: row.supersedes_acknowledgement_id,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

export const drizzleComplianceMethods: DrizzleComplianceMethods &
	ThisType<ComplianceHost & DrizzleComplianceMethods> = {
	async getDocumentRequirementById(input) {
		try {
			const rows = await db
				.select()
				.from(hrDocumentRequirement)
				.where(
					and(
						eq(hrDocumentRequirement.organizationId, input.organizationId),
						eq(hrDocumentRequirement.id, input.requirementId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return ok(null);
			}
			return mapDocumentRequirement(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load document requirement",
			);
		}
	},

	async findDocumentRequirementByCode(input) {
		try {
			const rows = await db
				.select()
				.from(hrDocumentRequirement)
				.where(
					and(
						eq(hrDocumentRequirement.organizationId, input.organizationId),
						eq(hrDocumentRequirement.code, input.code),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return ok(null);
			}
			return mapDocumentRequirement(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find document requirement by code",
			);
		}
	},

	async createDocumentRequirement(record, _ports, meta) {
		const existing = await this.findDocumentRequirementByCode({
			organizationId: record.organizationId,
			code: record.code,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			return conflict("Document requirement code already exists");
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesDocumentRequirementId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedAudit = prepareComplianceAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_document_requirement",
			entityId: brandedId.data,
			action: "CREATE",
			reasonCode: "DOCUMENT_REQUIREMENT_CREATED",
			newValue: {
				code: record.code,
				documentType: record.documentType,
				issuingJurisdiction: record.issuingJurisdiction,
				status: "draft",
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const applicabilityJson = JSON.stringify(record.applicability);

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							INSERT INTO hr_document_requirement (
								id, organization_id, code, name, document_type,
								issuing_jurisdiction, applies_to_note, applicability_json,
								status, version,
								created_by, updated_by
							)
							VALUES (
								${brandedId.data}, ${record.organizationId}, ${record.code},
								${record.name}, ${record.documentType},
								${record.issuingJurisdiction}, ${record.appliesToNote},
								${applicabilityJson}::jsonb, 'draft', 1,
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
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict("Unable to create document requirement");
			}
			return mapDocumentRequirementSql(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict("Document requirement code already exists");
			}
			return mapPersistenceFailure(
				error,
				"Failed to create document requirement",
			);
		}
	},

	async updateDocumentRequirement(input, _ports, meta) {
		const existing = await this.getDocumentRequirementById({
			organizationId: input.organizationId,
			requirementId: input.requirementId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Document requirement not found");
		}
		if (!isDocumentRequirementEditable(existing.data.status)) {
			return invalidState("Only draft document requirements can be updated");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = prepareComplianceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_document_requirement",
			entityId: input.requirementId,
			action: "UPDATE",
			reasonCode: "DOCUMENT_REQUIREMENT_UPDATED",
			oldValue: {
				documentType: existing.data.documentType,
				issuingJurisdiction: existing.data.issuingJurisdiction,
				status: existing.data.status,
			},
			newValue: {
				documentType: input.documentType ?? existing.data.documentType,
				issuingJurisdiction:
					input.issuingJurisdiction ?? existing.data.issuingJurisdiction,
				status: existing.data.status,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const applicabilityJson =
			input.applicability === undefined
				? null
				: JSON.stringify(input.applicability);

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_document_requirement
							SET name = COALESCE(${input.name}, name),
								document_type = COALESCE(${input.documentType}, document_type),
								issuing_jurisdiction = COALESCE(${input.issuingJurisdiction}, issuing_jurisdiction),
								applies_to_note = COALESCE(${input.appliesToNote}, applies_to_note),
								applicability_json = COALESCE(${applicabilityJson}::jsonb, applicability_json),
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.requirementId}
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
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
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
					entityLabel: "Document requirement",
				});
			}
			return mapDocumentRequirementSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to update document requirement",
			);
		}
	},

	async publishDocumentRequirement(input, _ports, meta) {
		const existing = await this.getDocumentRequirementById({
			organizationId: input.organizationId,
			requirementId: input.requirementId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Document requirement not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertDocumentRequirementStatusTransition(
			existing.data.status,
			"published",
		);
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = prepareComplianceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_document_requirement",
			entityId: input.requirementId,
			action: "UPDATE",
			reasonCode: "DOCUMENT_REQUIREMENT_PUBLISHED",
			oldValue: { status: existing.data.status },
			newValue: { status: "published" },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_document_requirement
							SET status = 'published',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.requirementId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = ${existing.data?.status}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
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
					entityLabel: "Document requirement",
				});
			}
			return mapDocumentRequirementSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to publish document requirement",
			);
		}
	},

	async retireDocumentRequirement(input, _ports, meta) {
		const existing = await this.getDocumentRequirementById({
			organizationId: input.organizationId,
			requirementId: input.requirementId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Document requirement not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertDocumentRequirementStatusTransition(
			existing.data.status,
			"retired",
		);
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = prepareComplianceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_document_requirement",
			entityId: input.requirementId,
			action: "UPDATE",
			reasonCode: "DOCUMENT_REQUIREMENT_RETIRED",
			oldValue: { status: existing.data.status },
			newValue: { status: "retired" },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_document_requirement
							SET status = 'retired',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.requirementId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = ${existing.data?.status}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
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
					entityLabel: "Document requirement",
				});
			}
			return mapDocumentRequirementSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to retire document requirement",
			);
		}
	},

	async listPublishedDocumentRequirements(input) {
		try {
			const rows = await db
				.select()
				.from(hrDocumentRequirement)
				.where(
					and(
						eq(hrDocumentRequirement.organizationId, input.organizationId),
						eq(hrDocumentRequirement.status, "published"),
					),
				);
			const requirements: DocumentRequirement[] = [];
			for (const row of rows) {
				const mapped = mapDocumentRequirement(row);
				if (!mapped.ok) {
					return mapped;
				}
				requirements.push(mapped.data);
			}
			requirements.sort((a, b) => a.code.localeCompare(b.code));
			const totalCount = requirements.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = requirements.slice(offset, offset + input.pageSize);
			return ok({
				requirements: paginated,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			} satisfies DocumentRequirementListPage);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list published document requirements",
			);
		}
	},

	async getEmployeeDocumentById(input) {
		try {
			const rows = await db
				.select()
				.from(hrEmployeeDocument)
				.where(
					and(
						eq(hrEmployeeDocument.organizationId, input.organizationId),
						eq(hrEmployeeDocument.id, input.documentId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return ok(null);
			}
			return mapEmployeeDocument(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load employee document");
		}
	},

	async findEmployeeDocumentByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrEmployeeDocument)
				.where(
					and(
						eq(hrEmployeeDocument.organizationId, input.organizationId),
						eq(hrEmployeeDocument.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return ok(null);
			}
			const mapped = mapEmployeeDocument(row);
			if (!mapped.ok) {
				return mapped;
			}
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return ok(null);
			}
			return ok({
				document: mapped.data,
				createRequestFingerprint: row.createRequestFingerprint,
			} satisfies IdempotentEmployeeDocumentRecord);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find employee document by idempotency key",
			);
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async registerEmployeeDocument(record, _ports, meta) {
		const replay = await this.findEmployeeDocumentByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!replay.ok) {
			return replay;
		}
		if (replay.data !== null) {
			if (
				replay.data.createRequestFingerprint !== record.createRequestFingerprint
			) {
				return conflict("Idempotency key reused with different payload");
			}
			return ok(replay.data.document);
		}

		const employee = await this.getEmployeeById({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!employee.ok) {
			return employee;
		}
		if (employee.data === null) {
			return notFound(
				"Employee not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		if (record.requirementId !== null) {
			const requirement = await this.getDocumentRequirementById({
				organizationId: record.organizationId,
				requirementId: record.requirementId,
			});
			if (!requirement.ok) {
				return requirement;
			}
			if (requirement.data === null) {
				return notFound(
					"Document requirement not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			if (requirement.data.status !== "published") {
				return invalidState("Document requirement must be published");
			}
		}

		const dateRange = assertValidDocumentDateRange({
			issuedOn: record.issuedOn,
			expiresOn: record.expiresOn,
		});
		if (!dateRange.ok) {
			return dateRange;
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesEmployeeDocumentId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedAudit = prepareComplianceAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_employee_document",
			entityId: brandedId.data,
			action: "CREATE",
			reasonCode: "EMPLOYEE_DOCUMENT_REGISTERED",
			newValue: {
				employeeId: record.employeeId,
				requirementId: record.requirementId,
				documentType: record.documentType,
				issuingJurisdiction: record.issuingJurisdiction,
				issuedOn: record.issuedOn,
				expiresOn: record.expiresOn,
				verificationStatus: "pending",
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const registeredEventId = randomUUID();
		const nearingExpiryEventId = randomUUID();
		const metadataJson =
			record.metadata === null ? null : JSON.stringify(record.metadata);
		const registeredPayload = complianceEntityPayload({
			organizationId: record.organizationId,
			entityType: "hr_employee_document",
			entityId: brandedId.data,
			actorId: record.createdBy,
			meta,
		});
		const nearingPayload = complianceEntityPayload({
			organizationId: record.organizationId,
			entityType: "hr_employee_document",
			entityId: brandedId.data,
			actorId: record.createdBy,
			meta,
		});
		const asOf = record.issuedOn;
		const emitNearingExpiry = isNearingExpiry({
			expiresOn: record.expiresOn,
			asOf,
		});

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH employee AS (
							SELECT id FROM hr_employee
							WHERE id = ${record.employeeId}
								AND organization_id = ${record.organizationId}
						),
						requirement_ok AS (
							SELECT 1 AS ok
							WHERE ${record.requirementId}::uuid IS NULL
							UNION ALL
							SELECT 1
							FROM hr_document_requirement dr
							WHERE dr.id = ${record.requirementId}
								AND dr.organization_id = ${record.organizationId}
								AND dr.status = 'published'
						),
						mutated AS (
							INSERT INTO hr_employee_document (
								id, organization_id, employee_id, requirement_id, document_type,
								issuing_jurisdiction, issued_on, expires_on, verification_status,
								document_ref, identifier_last4, identifier_fingerprint, metadata_json,
								create_idempotency_key, create_request_fingerprint, version,
								created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, employee.id,
								${record.requirementId}, ${record.documentType},
								${record.issuingJurisdiction}, ${record.issuedOn}, ${record.expiresOn},
								'pending', ${record.documentRef}, ${record.identifierLast4},
								${record.identifierFingerprint},
								${metadataJson}::jsonb,
								${record.createIdempotencyKey}, ${record.createRequestFingerprint},
								1, ${record.createdBy}, ${record.createdBy}
							FROM employee
							WHERE EXISTS (SELECT 1 FROM requirement_ok)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed_registered AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${registeredEventId}, organization_id,
								${HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REGISTERED_EVENT},
								'human-resources', ${meta.correlationId}, created_by,
								${registeredPayload}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						),
						outboxed_nearing AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${nearingExpiryEventId}, organization_id,
								${HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT},
								'human-resources', ${meta.correlationId}, created_by,
								${nearingPayload}::jsonb, 'pending', 0
							FROM mutated
							WHERE ${emitNearingExpiry}
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed_registered
					`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict("Unable to register employee document");
			}
			return mapEmployeeDocumentSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const retry = await this.findEmployeeDocumentByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!retry.ok) {
					return retry;
				}
				if (retry.data !== null) {
					if (
						retry.data.createRequestFingerprint !==
						record.createRequestFingerprint
					) {
						return conflict("Idempotency key reused with different payload");
					}
					return ok(retry.data.document);
				}
			}
			return mapPersistenceFailure(
				error,
				"Failed to register employee document",
			);
		}
	},

	async updateEmployeeDocumentMetadata(input, _ports, meta) {
		const existing = await this.getEmployeeDocumentById({
			organizationId: input.organizationId,
			documentId: input.documentId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Employee document not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const nextExpiresOn =
			input.expiresOn === undefined ? existing.data.expiresOn : input.expiresOn;
		const dateRange = assertValidDocumentDateRange({
			issuedOn: existing.data.issuedOn,
			expiresOn: nextExpiresOn,
		});
		if (!dateRange.ok) {
			return dateRange;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = prepareComplianceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employee_document",
			entityId: input.documentId,
			action: "UPDATE",
			reasonCode: "EMPLOYEE_DOCUMENT_METADATA_UPDATED",
			oldValue: {
				issuingJurisdiction: existing.data.issuingJurisdiction,
				expiresOn: existing.data.expiresOn,
				verificationStatus: existing.data.verificationStatus,
			},
			newValue: {
				issuingJurisdiction:
					input.issuingJurisdiction ?? existing.data.issuingJurisdiction,
				expiresOn: nextExpiresOn,
				verificationStatus: existing.data.verificationStatus,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const nearingExpiryEventId = randomUUID();
		const metadataJson = (() => {
			if (input.metadata === undefined) {
				return null;
			}
			if (input.metadata === null) {
				return null;
			}
			return JSON.stringify(input.metadata);
		})();
		const asOf = new Date().toISOString().slice(0, 10);
		const emitNearingExpiry = isNearingExpiry({
			expiresOn: nextExpiresOn,
			asOf,
		});
		const nearingPayload = complianceEntityPayload({
			organizationId: input.organizationId,
			entityType: "hr_employee_document",
			entityId: input.documentId,
			actorId: input.actorUserId,
			meta,
		});

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_employee_document
							SET issuing_jurisdiction = COALESCE(${input.issuingJurisdiction}, issuing_jurisdiction),
								expires_on = COALESCE(${input.expiresOn}, expires_on),
								metadata_json = COALESCE(${metadataJson}::jsonb, metadata_json),
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.documentId}
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
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed_nearing AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${nearingExpiryEventId}, organization_id,
								${HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${nearingPayload}::jsonb, 'pending', 0
							FROM mutated
							WHERE ${emitNearingExpiry}
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Employee document",
				});
			}
			return mapEmployeeDocumentSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to update employee document metadata",
			);
		}
	},

	async verifyEmployeeDocument(input, _ports, meta) {
		const existing = await this.getEmployeeDocumentById({
			organizationId: input.organizationId,
			documentId: input.documentId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Employee document not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertEmployeeDocumentVerificationTransition(
			existing.data.verificationStatus,
			"verified",
		);
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = prepareComplianceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employee_document",
			entityId: input.documentId,
			action: "UPDATE",
			reasonCode: "EMPLOYEE_DOCUMENT_VERIFIED",
			oldValue: { verificationStatus: existing.data.verificationStatus },
			newValue: { verificationStatus: "verified" },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = complianceEntityPayload({
			organizationId: input.organizationId,
			entityType: "hr_employee_document",
			entityId: input.documentId,
			actorId: input.actorUserId,
			meta,
		});

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_employee_document
							SET verification_status = 'verified',
								verified_by = ${input.actorUserId},
								verified_at = ${input.evidenceDate}::timestamptz,
								rejection_reason = NULL,
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.documentId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND verification_status = ${existing.data?.verificationStatus}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
								${HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_VERIFIED_EVENT},
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
					entityLabel: "Employee document",
				});
			}
			return mapEmployeeDocumentSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to verify employee document");
		}
	},

	async rejectEmployeeDocument(input, _ports, meta) {
		const existing = await this.getEmployeeDocumentById({
			organizationId: input.organizationId,
			documentId: input.documentId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Employee document not found");
		}
		const reasonCheck = assertRejectionReasonProvided(input.rejectionReason);
		if (!reasonCheck.ok) {
			return reasonCheck;
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertEmployeeDocumentVerificationTransition(
			existing.data.verificationStatus,
			"rejected",
		);
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = prepareComplianceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employee_document",
			entityId: input.documentId,
			action: "UPDATE",
			reasonCode: "EMPLOYEE_DOCUMENT_REJECTED",
			oldValue: { verificationStatus: existing.data.verificationStatus },
			newValue: { verificationStatus: "rejected" },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = complianceEntityPayload({
			organizationId: input.organizationId,
			entityType: "hr_employee_document",
			entityId: input.documentId,
			actorId: input.actorUserId,
			meta,
		});

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_employee_document
							SET verification_status = 'rejected',
								rejection_reason = ${input.rejectionReason},
								verified_by = NULL,
								verified_at = NULL,
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.documentId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND verification_status = ${existing.data?.verificationStatus}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
								${HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REJECTED_EVENT},
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
					entityLabel: "Employee document",
				});
			}
			return mapEmployeeDocumentSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to reject employee document");
		}
	},

	async revokeEmployeeDocumentVerification(input, _ports, meta) {
		const existing = await this.getEmployeeDocumentById({
			organizationId: input.organizationId,
			documentId: input.documentId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Employee document not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertEmployeeDocumentVerificationTransition(
			existing.data.verificationStatus,
			"revoked",
		);
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = prepareComplianceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employee_document",
			entityId: input.documentId,
			action: "UPDATE",
			reasonCode: "EMPLOYEE_DOCUMENT_VERIFICATION_REVOKED",
			oldValue: { verificationStatus: existing.data.verificationStatus },
			newValue: { verificationStatus: "revoked" },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_employee_document
							SET verification_status = 'revoked',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.documentId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND verification_status = ${existing.data?.verificationStatus}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
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
					entityLabel: "Employee document",
				});
			}
			return mapEmployeeDocumentSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to revoke employee document verification",
			);
		}
	},

	async markEmployeeDocumentExpired(input, _ports, meta) {
		const existing = await this.getEmployeeDocumentById({
			organizationId: input.organizationId,
			documentId: input.documentId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Employee document not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertEmployeeDocumentVerificationTransition(
			existing.data.verificationStatus,
			"expired",
		);
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = prepareComplianceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employee_document",
			entityId: input.documentId,
			action: "UPDATE",
			reasonCode: "EMPLOYEE_DOCUMENT_EXPIRED",
			oldValue: { verificationStatus: existing.data.verificationStatus },
			newValue: { verificationStatus: "expired" },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = complianceEntityPayload({
			organizationId: input.organizationId,
			entityType: "hr_employee_document",
			entityId: input.documentId,
			actorId: input.actorUserId,
			meta,
		});

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_employee_document
							SET verification_status = 'expired',
								verified_by = NULL,
								verified_at = NULL,
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.documentId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND verification_status = ${existing.data?.verificationStatus}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
								${HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_EXPIRED_EVENT},
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
					entityLabel: "Employee document",
				});
			}
			return mapEmployeeDocumentSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to mark employee document expired",
			);
		}
	},

	async listEmployeeDocuments(input) {
		try {
			const conditions = [
				eq(hrEmployeeDocument.organizationId, input.organizationId),
			];
			if (input.employeeId !== undefined) {
				conditions.push(eq(hrEmployeeDocument.employeeId, input.employeeId));
			}
			if (input.verificationStatus !== undefined) {
				conditions.push(
					eq(hrEmployeeDocument.verificationStatus, input.verificationStatus),
				);
			}
			const rows = await db
				.select()
				.from(hrEmployeeDocument)
				.where(and(...conditions));
			const documents: EmployeeDocumentListPage["documents"] = [];
			for (const row of rows) {
				const mapped = mapEmployeeDocument(row);
				if (!mapped.ok) {
					return mapped;
				}
				documents.push(toEmployeeDocumentListItem(mapped.data));
			}
			documents.sort((a, b) => b.issuedOn.localeCompare(a.issuedOn));
			const totalCount = documents.length;
			const offset = (input.page - 1) * input.pageSize;
			return ok({
				documents: documents.slice(offset, offset + input.pageSize),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			} satisfies EmployeeDocumentListPage);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list employee documents");
		}
	},

	async listMissingRequiredDocuments(input) {
		try {
			const published = await db
				.select()
				.from(hrDocumentRequirement)
				.where(
					and(
						eq(hrDocumentRequirement.organizationId, input.organizationId),
						eq(hrDocumentRequirement.status, "published"),
					),
				);
			const employeeRows = await db
				.select({ id: hrEmployee.id })
				.from(hrEmployee)
				.where(eq(hrEmployee.organizationId, input.organizationId));
			const employeeIds = employeeRows
				.map((employee) => employee.id)
				.filter(
					(employeeId) =>
						input.employeeId === undefined || employeeId === input.employeeId,
				);
			const verifiedDocs = await db
				.select({
					employeeId: hrEmployeeDocument.employeeId,
					requirementId: hrEmployeeDocument.requirementId,
				})
				.from(hrEmployeeDocument)
				.where(
					and(
						eq(hrEmployeeDocument.organizationId, input.organizationId),
						eq(hrEmployeeDocument.verificationStatus, "verified"),
					),
				);
			const satisfied = new Set(
				verifiedDocs
					.filter(
						(row): row is { employeeId: string; requirementId: string } =>
							row.requirementId !== null,
					)
					.map((row) => `${row.employeeId}:${row.requirementId}`),
			);
			const missing: DocumentRequirement[] = [];
			for (const row of published) {
				const mapped = mapDocumentRequirement(row);
				if (!mapped.ok) {
					return mapped;
				}
				const requirement = mapped.data;
				const isMissing = employeeIds.some(
					(employeeId) =>
						isDocumentRequirementApplicable({
							applicability: requirement.applicability,
							employeeId,
						}) && !satisfied.has(`${employeeId}:${requirement.id}`),
				);
				if (isMissing) {
					missing.push(requirement);
				}
			}
			missing.sort((a, b) => a.code.localeCompare(b.code));
			const totalCount = missing.length;
			const offset = (input.page - 1) * input.pageSize;
			return ok({
				requirements: missing.slice(offset, offset + input.pageSize),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			} satisfies DocumentRequirementListPage);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list missing required documents",
			);
		}
	},

	async listExpiringEmployeeDocuments(input) {
		const withinDays = input.withinDays ?? COMPLIANCE_NEARING_EXPIRY_DAYS;
		try {
			const endOn = addIsoCalendarDays(input.asOf, withinDays);
			const conditions = [
				eq(hrEmployeeDocument.organizationId, input.organizationId),
				ne(hrEmployeeDocument.verificationStatus, "expired"),
				gte(hrEmployeeDocument.expiresOn, input.asOf),
				lte(hrEmployeeDocument.expiresOn, endOn),
			];
			if (input.employeeId !== undefined) {
				conditions.push(eq(hrEmployeeDocument.employeeId, input.employeeId));
			}
			const rows = await db
				.select()
				.from(hrEmployeeDocument)
				.where(and(...conditions));
			const documents: EmployeeDocumentListPage["documents"] = [];
			for (const row of rows) {
				const mapped = mapEmployeeDocument(row);
				if (!mapped.ok) {
					return mapped;
				}
				documents.push(toEmployeeDocumentListItem(mapped.data));
			}
			documents.sort((a, b) => {
				const aExp = a.expiresOn ?? "";
				const bExp = b.expiresOn ?? "";
				return aExp.localeCompare(bExp);
			});
			const totalCount = documents.length;
			const offset = (input.page - 1) * input.pageSize;
			return ok({
				documents: documents.slice(offset, offset + input.pageSize),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			} satisfies EmployeeDocumentListPage);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list expiring employee documents",
			);
		}
	},

	async getWorkEligibilityById(input) {
		try {
			const rows = await db
				.select()
				.from(hrWorkEligibility)
				.where(
					and(
						eq(hrWorkEligibility.organizationId, input.organizationId),
						eq(hrWorkEligibility.id, input.eligibilityId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return ok(null);
			}
			return mapWorkEligibility(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load work eligibility");
		}
	},

	async getActiveWorkEligibilityForEmployee(input) {
		try {
			const rows = await db
				.select()
				.from(hrWorkEligibility)
				.where(
					and(
						eq(hrWorkEligibility.organizationId, input.organizationId),
						eq(hrWorkEligibility.employeeId, input.employeeId),
						eq(hrWorkEligibility.status, "active"),
					),
				)
				.orderBy(desc(hrWorkEligibility.issuedOn))
				.limit(1);
			const [row] = rows;
			if (!row) {
				return ok(null);
			}
			return mapWorkEligibility(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load active work eligibility",
			);
		}
	},

	async findWorkEligibilityByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrWorkEligibility)
				.where(
					and(
						eq(hrWorkEligibility.organizationId, input.organizationId),
						eq(hrWorkEligibility.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return ok(null);
			}
			const mapped = mapWorkEligibility(row);
			if (!mapped.ok) {
				return mapped;
			}
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return ok(null);
			}
			return ok({
				eligibility: mapped.data,
				createRequestFingerprint: row.createRequestFingerprint,
			} satisfies IdempotentWorkEligibilityRecord);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find work eligibility by idempotency key",
			);
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async recordWorkEligibility(record, _ports, meta) {
		const replay = await this.findWorkEligibilityByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!replay.ok) {
			return replay;
		}
		if (replay.data !== null) {
			if (
				replay.data.createRequestFingerprint !== record.createRequestFingerprint
			) {
				return conflict("Idempotency key reused with different payload");
			}
			return ok(replay.data.eligibility);
		}

		const employee = await this.getEmployeeById({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!employee.ok) {
			return employee;
		}
		if (employee.data === null) {
			return notFound(
				"Employee not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const dateRange = assertValidDocumentDateRange({
			issuedOn: record.issuedOn,
			expiresOn: record.expiresOn,
		});
		if (!dateRange.ok) {
			return dateRange;
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesWorkEligibilityId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedAudit = prepareComplianceAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_work_eligibility",
			entityId: brandedId.data,
			action: "CREATE",
			reasonCode: "WORK_ELIGIBILITY_RECORDED",
			newValue: {
				employeeId: record.employeeId,
				countryCode: record.countryCode,
				jurisdiction: record.jurisdiction,
				issuedOn: record.issuedOn,
				expiresOn: record.expiresOn,
				status: "pending",
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH employee AS (
							SELECT id FROM hr_employee
							WHERE id = ${record.employeeId}
								AND organization_id = ${record.organizationId}
						),
						mutated AS (
							INSERT INTO hr_work_eligibility (
								id, organization_id, employee_id, country_code, jurisdiction,
								status, issued_on, expires_on, document_ref,
								create_idempotency_key, create_request_fingerprint, version,
								created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, employee.id,
								${record.countryCode}, ${record.jurisdiction}, 'pending',
								${record.issuedOn}, ${record.expiresOn}, ${record.documentRef},
								${record.createIdempotencyKey}, ${record.createRequestFingerprint},
								1, ${record.createdBy}, ${record.createdBy}
							FROM employee
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict("Unable to record work eligibility");
			}
			return mapWorkEligibilitySql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const retry = await this.findWorkEligibilityByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!retry.ok) {
					return retry;
				}
				if (retry.data !== null) {
					if (
						retry.data.createRequestFingerprint !==
						record.createRequestFingerprint
					) {
						return conflict("Idempotency key reused with different payload");
					}
					return ok(retry.data.eligibility);
				}
			}
			return mapPersistenceFailure(error, "Failed to record work eligibility");
		}
	},

	async verifyWorkEligibility(input, _ports, meta) {
		const existing = await this.getWorkEligibilityById({
			organizationId: input.organizationId,
			eligibilityId: input.eligibilityId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Work eligibility not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertWorkEligibilityStatusTransition(
			existing.data.status,
			"active",
		);
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = prepareComplianceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_work_eligibility",
			entityId: input.eligibilityId,
			action: "UPDATE",
			reasonCode: "WORK_ELIGIBILITY_VERIFIED",
			oldValue: { status: existing.data.status },
			newValue: { status: "active" },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = complianceEntityPayload({
			organizationId: input.organizationId,
			entityType: "hr_work_eligibility",
			entityId: input.eligibilityId,
			actorId: input.actorUserId,
			meta,
		});

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_work_eligibility
							SET status = 'active',
								verified_by = ${input.actorUserId},
								verified_at = ${input.evidenceDate}::timestamptz,
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.eligibilityId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = ${existing.data?.status}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
								${HUMAN_RESOURCES_WORK_ELIGIBILITY_VERIFIED_EVENT},
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
					entityLabel: "Work eligibility",
				});
			}
			return mapWorkEligibilitySql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to verify work eligibility");
		}
	},

	async suspendWorkEligibility(input, _ports, meta) {
		const existing = await this.getWorkEligibilityById({
			organizationId: input.organizationId,
			eligibilityId: input.eligibilityId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Work eligibility not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertWorkEligibilityStatusTransition(
			existing.data.status,
			"suspended",
		);
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = prepareComplianceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_work_eligibility",
			entityId: input.eligibilityId,
			action: "UPDATE",
			reasonCode: "WORK_ELIGIBILITY_SUSPENDED",
			oldValue: { status: existing.data.status },
			newValue: { status: "suspended" },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = complianceEntityPayload({
			organizationId: input.organizationId,
			entityType: "hr_work_eligibility",
			entityId: input.eligibilityId,
			actorId: input.actorUserId,
			meta,
		});

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_work_eligibility
							SET status = 'suspended',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.eligibilityId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = ${existing.data?.status}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
								${HUMAN_RESOURCES_WORK_ELIGIBILITY_SUSPENDED_EVENT},
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
					entityLabel: "Work eligibility",
				});
			}
			return mapWorkEligibilitySql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to suspend work eligibility");
		}
	},

	async renewWorkEligibility(input, _ports, meta) {
		const existing = await this.getWorkEligibilityById({
			organizationId: input.organizationId,
			eligibilityId: input.eligibilityId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Work eligibility not found");
		}
		if (
			existing.data.status !== "active" &&
			existing.data.status !== "suspended" &&
			existing.data.status !== "pending"
		) {
			return invalidState(
				"Work eligibility cannot be renewed in its current status",
			);
		}
		const dateRange = assertValidDocumentDateRange({
			issuedOn: input.issuedOn,
			expiresOn: input.expiresOn,
		});
		if (!dateRange.ok) {
			return dateRange;
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = prepareComplianceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_work_eligibility",
			entityId: input.eligibilityId,
			action: "UPDATE",
			reasonCode: "WORK_ELIGIBILITY_RENEWED",
			oldValue: {
				issuedOn: existing.data.issuedOn,
				expiresOn: existing.data.expiresOn,
				status: existing.data.status,
			},
			newValue: {
				issuedOn: input.issuedOn,
				expiresOn: input.expiresOn,
				status: existing.data.status,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = complianceEntityPayload({
			organizationId: input.organizationId,
			entityType: "hr_work_eligibility",
			entityId: input.eligibilityId,
			actorId: input.actorUserId,
			meta,
		});

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_work_eligibility
							SET issued_on = ${input.issuedOn},
								expires_on = ${input.expiresOn},
								document_ref = COALESCE(${input.documentRef}, document_ref),
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.eligibilityId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status IN ('active', 'suspended', 'pending')
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
								${HUMAN_RESOURCES_WORK_ELIGIBILITY_RENEWED_EVENT},
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
					entityLabel: "Work eligibility",
				});
			}
			return mapWorkEligibilitySql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to renew work eligibility");
		}
	},

	async closeWorkEligibility(input, _ports, meta) {
		const existing = await this.getWorkEligibilityById({
			organizationId: input.organizationId,
			eligibilityId: input.eligibilityId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Work eligibility not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertWorkEligibilityStatusTransition(
			existing.data.status,
			"closed",
		);
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = prepareComplianceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_work_eligibility",
			entityId: input.eligibilityId,
			action: "UPDATE",
			reasonCode: "WORK_ELIGIBILITY_CLOSED",
			oldValue: { status: existing.data.status },
			newValue: { status: "closed" },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = complianceEntityPayload({
			organizationId: input.organizationId,
			entityType: "hr_work_eligibility",
			entityId: input.eligibilityId,
			actorId: input.actorUserId,
			meta,
		});

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_work_eligibility
							SET status = 'closed',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.eligibilityId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = ${existing.data?.status}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
								${HUMAN_RESOURCES_WORK_ELIGIBILITY_EXPIRED_EVENT},
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
					entityLabel: "Work eligibility",
				});
			}
			return mapWorkEligibilitySql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to close work eligibility");
		}
	},

	async listEmployeesWithWorkEligibilityRisk(input) {
		try {
			const rows = await db
				.select()
				.from(hrWorkEligibility)
				.where(eq(hrWorkEligibility.organizationId, input.organizationId));
			const eligibilities: WorkEligibility[] = [];
			for (const row of rows) {
				const mapped = mapWorkEligibility(row);
				if (!mapped.ok) {
					return mapped;
				}
				const eligibility = mapped.data;
				const expiredByDate =
					eligibility.expiresOn !== null && eligibility.expiresOn < input.asOf;
				const statusRisk =
					eligibility.status === "pending" ||
					eligibility.status === "suspended" ||
					eligibility.status === "expired";
				const nearingExpiry = isWithinInclusiveDateWindow({
					date: eligibility.expiresOn,
					asOf: input.asOf,
					withinDays: input.withinDays,
				});
				if (
					eligibility.status !== "closed" &&
					(statusRisk || expiredByDate || nearingExpiry)
				) {
					eligibilities.push(eligibility);
				}
			}
			eligibilities.sort((a, b) => {
				const expiresCompare = (a.expiresOn ?? "").localeCompare(
					b.expiresOn ?? "",
				);
				if (expiresCompare !== 0) {
					return expiresCompare;
				}
				const issuedCompare = b.issuedOn.localeCompare(a.issuedOn);
				return issuedCompare === 0
					? a.employeeId.localeCompare(b.employeeId)
					: issuedCompare;
			});
			const totalCount = eligibilities.length;
			const offset = (input.page - 1) * input.pageSize;
			return ok({
				eligibilities: eligibilities.slice(offset, offset + input.pageSize),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			} satisfies WorkEligibilityRiskListPage);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list employees with work eligibility risk",
			);
		}
	},

	async getPolicyAcknowledgementById(input) {
		try {
			const rows = await db
				.select()
				.from(hrPolicyAcknowledgement)
				.where(
					and(
						eq(hrPolicyAcknowledgement.organizationId, input.organizationId),
						eq(hrPolicyAcknowledgement.id, input.acknowledgementId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return ok(null);
			}
			return mapPolicyAcknowledgement(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load policy acknowledgement",
			);
		}
	},

	async findPolicyAcknowledgementByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrPolicyAcknowledgement)
				.where(
					and(
						eq(hrPolicyAcknowledgement.organizationId, input.organizationId),
						eq(
							hrPolicyAcknowledgement.createIdempotencyKey,
							input.idempotencyKey,
						),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return ok(null);
			}
			const mapped = mapPolicyAcknowledgement(row);
			if (!mapped.ok) {
				return mapped;
			}
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return ok(null);
			}
			return ok({
				acknowledgement: mapped.data,
				createRequestFingerprint: row.createRequestFingerprint,
			} satisfies IdempotentPolicyAcknowledgementRecord);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find policy acknowledgement by idempotency key",
			);
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async issuePolicyAcknowledgementRequirement(record, _ports, meta) {
		const replay = await this.findPolicyAcknowledgementByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!replay.ok) {
			return replay;
		}
		if (replay.data !== null) {
			if (
				replay.data.createRequestFingerprint !== record.createRequestFingerprint
			) {
				return conflict("Idempotency key reused with different payload");
			}
			return ok(replay.data.acknowledgement);
		}

		const employee = await this.getEmployeeById({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!employee.ok) {
			return employee;
		}
		if (employee.data === null) {
			return notFound(
				"Employee not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const outstanding = await db
			.select({ id: hrPolicyAcknowledgement.id })
			.from(hrPolicyAcknowledgement)
			.where(
				and(
					eq(hrPolicyAcknowledgement.organizationId, record.organizationId),
					eq(hrPolicyAcknowledgement.employeeId, record.employeeId),
					eq(hrPolicyAcknowledgement.policyCode, record.policyCode),
					eq(hrPolicyAcknowledgement.requirementStatus, "outstanding"),
				),
			)
			.limit(1);
		if (outstanding[0]) {
			return conflict("An outstanding policy acknowledgement already exists");
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesPolicyAcknowledgementId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedAudit = prepareComplianceAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_policy_acknowledgement",
			entityId: brandedId.data,
			action: "CREATE",
			reasonCode: "POLICY_ACKNOWLEDGEMENT_REQUIREMENT_ISSUED",
			newValue: {
				employeeId: record.employeeId,
				policyCode: record.policyCode,
				policyVersion: record.policyVersion,
				dueOn: record.dueOn,
				requirementStatus: "outstanding",
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = complianceEntityPayload({
			organizationId: record.organizationId,
			entityType: "hr_policy_acknowledgement",
			entityId: brandedId.data,
			actorId: record.createdBy,
			meta,
		});

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH employee AS (
							SELECT id FROM hr_employee
							WHERE id = ${record.employeeId}
								AND organization_id = ${record.organizationId}
						),
						mutated AS (
							INSERT INTO hr_policy_acknowledgement (
								id, organization_id, employee_id, policy_code, policy_version,
								requirement_status, issued_at, due_on, create_idempotency_key,
								create_request_fingerprint, version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, employee.id,
								${record.policyCode}, ${record.policyVersion}, 'outstanding',
								now(), ${record.dueOn}, ${record.createIdempotencyKey},
								${record.createRequestFingerprint}, 1,
								${record.createdBy}, ${record.createdBy}
							FROM employee
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
								${HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_OUTSTANDING_EVENT},
								'human-resources', ${meta.correlationId}, created_by,
								${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict("Unable to issue policy acknowledgement requirement");
			}
			return mapPolicyAcknowledgementSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const retry = await this.findPolicyAcknowledgementByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!retry.ok) {
					return retry;
				}
				if (retry.data !== null) {
					if (
						retry.data.createRequestFingerprint !==
						record.createRequestFingerprint
					) {
						return conflict("Idempotency key reused with different payload");
					}
					return ok(retry.data.acknowledgement);
				}
			}
			if (isPostgresUniqueViolation(error)) {
				return conflict("An outstanding policy acknowledgement already exists");
			}
			return mapPersistenceFailure(
				error,
				"Failed to issue policy acknowledgement requirement",
			);
		}
	},

	async acknowledgePolicy(input, _ports, meta) {
		const existing = await this.getPolicyAcknowledgementById({
			organizationId: input.organizationId,
			acknowledgementId: input.acknowledgementId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Policy acknowledgement not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertPolicyAcknowledgementStatusTransition(
			existing.data.requirementStatus,
			"acknowledged",
		);
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = prepareComplianceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_policy_acknowledgement",
			entityId: input.acknowledgementId,
			action: "UPDATE",
			reasonCode: "POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGED",
			oldValue: { requirementStatus: existing.data.requirementStatus },
			newValue: { requirementStatus: "acknowledged" },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = complianceEntityPayload({
			organizationId: input.organizationId,
			entityType: "hr_policy_acknowledgement",
			entityId: input.acknowledgementId,
			actorId: input.actorUserId,
			meta,
		});

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_policy_acknowledgement
							SET requirement_status = 'acknowledged',
								acknowledged_at = now(),
								acknowledged_by = ${input.actorUserId},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.acknowledgementId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND requirement_status = ${existing.data?.requirementStatus}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
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
								${HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGED_EVENT},
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
					entityLabel: "Policy acknowledgement",
				});
			}
			return mapPolicyAcknowledgementSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to acknowledge policy");
		}
	},

	async revokePolicyAcknowledgement(input, _ports, meta) {
		const existing = await this.getPolicyAcknowledgementById({
			organizationId: input.organizationId,
			acknowledgementId: input.acknowledgementId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Policy acknowledgement not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertPolicyAcknowledgementStatusTransition(
			existing.data.requirementStatus,
			"revoked",
		);
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = prepareComplianceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_policy_acknowledgement",
			entityId: input.acknowledgementId,
			action: "UPDATE",
			reasonCode: "POLICY_ACKNOWLEDGEMENT_REVOKED",
			oldValue: { requirementStatus: existing.data.requirementStatus },
			newValue: { requirementStatus: "revoked" },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_policy_acknowledgement
							SET requirement_status = 'revoked',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.acknowledgementId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND requirement_status = ${existing.data?.requirementStatus}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
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
					entityLabel: "Policy acknowledgement",
				});
			}
			return mapPolicyAcknowledgementSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to revoke policy acknowledgement",
			);
		}
	},

	async supersedePolicyAcknowledgementRequirement(input, _ports, meta) {
		const existing = await this.getPolicyAcknowledgementById({
			organizationId: input.organizationId,
			acknowledgementId: input.acknowledgementId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Policy acknowledgement not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const newId = randomUUID();
		const brandedNewId = parseHumanResourcesPolicyAcknowledgementId(newId);
		if (!brandedNewId.ok) {
			return brandedNewId;
		}
		const preparedSupersededAudit = prepareComplianceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_policy_acknowledgement",
			entityId: input.acknowledgementId,
			action: "UPDATE",
			reasonCode: "POLICY_ACKNOWLEDGEMENT_SUPERSEDED",
			oldValue: { requirementStatus: existing.data.requirementStatus },
			newValue: { requirementStatus: "superseded" },
		});
		if (!preparedSupersededAudit.ok) {
			return preparedSupersededAudit;
		}
		const supersededAudit = preparedSupersededAudit.data;
		const preparedReplacementAudit = prepareComplianceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_policy_acknowledgement",
			entityId: brandedNewId.data,
			action: "CREATE",
			reasonCode: "POLICY_ACKNOWLEDGEMENT_REPLACEMENT_ISSUED",
			newValue: {
				employeeId: existing.data.employeeId,
				policyCode: existing.data.policyCode,
				policyVersion: input.newPolicyVersion,
				dueOn: input.newDueOn,
				requirementStatus: "outstanding",
				supersedesAcknowledgementId: input.acknowledgementId,
			},
		});
		if (!preparedReplacementAudit.ok) {
			return preparedReplacementAudit;
		}
		const replacementAudit = preparedReplacementAudit.data;
		const supersededAuditId = randomUUID();
		const replacementAuditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH existing AS (
							SELECT *
							FROM hr_policy_acknowledgement
							WHERE id = ${input.acknowledgementId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
						),
						superseded AS (
							UPDATE hr_policy_acknowledgement pa
							SET requirement_status = 'superseded',
								version = pa.version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM existing e
							WHERE pa.id = e.id
								AND e.requirement_status = 'outstanding'
							RETURNING pa.id
						),
						mutated AS (
							INSERT INTO hr_policy_acknowledgement (
								id, organization_id, employee_id, policy_code, policy_version,
								requirement_status, issued_at, due_on, supersedes_acknowledgement_id,
								version, created_by, updated_by
							)
							SELECT
								${brandedNewId.data}, e.organization_id, e.employee_id, e.policy_code,
								${input.newPolicyVersion}, 'outstanding', now(), ${input.newDueOn},
								${input.acknowledgementId}, 1, ${input.actorUserId}, ${input.actorUserId}
							FROM existing e
							INNER JOIN superseded s ON s.id = e.id
							RETURNING *
						),
						audited_superseded AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${supersededAuditId}, ${supersededAudit.organizationId},
								${supersededAudit.actorUserId}, ${supersededAudit.correlationId},
								${supersededAudit.module}, ${supersededAudit.entity},
								${supersededAudit.entityId}, ${supersededAudit.action},
								${supersededAudit.changesJson}::jsonb,
								${supersededAudit.oldValueJson}::jsonb,
								${supersededAudit.newValueJson}::jsonb,
								${supersededAudit.metadataJson}::jsonb,
								${supersededAudit.ipAddress}, ${supersededAudit.userAgent}
							FROM superseded
							RETURNING id
						),
						audited_replacement AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${replacementAuditId}, ${replacementAudit.organizationId},
								${replacementAudit.actorUserId}, ${replacementAudit.correlationId},
								${replacementAudit.module}, ${replacementAudit.entity},
								${replacementAudit.entityId}, ${replacementAudit.action},
								${replacementAudit.changesJson}::jsonb,
								${replacementAudit.oldValueJson}::jsonb,
								${replacementAudit.newValueJson}::jsonb,
								${replacementAudit.metadataJson}::jsonb,
								${replacementAudit.ipAddress}, ${replacementAudit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.*
						FROM mutated, audited_superseded, audited_replacement
					`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Policy acknowledgement",
				});
			}
			return mapPolicyAcknowledgementSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to supersede policy acknowledgement requirement",
			);
		}
	},

	async getPolicyAcknowledgementStatus(input) {
		try {
			const conditions = [
				eq(hrPolicyAcknowledgement.organizationId, input.organizationId),
				eq(hrPolicyAcknowledgement.employeeId, input.employeeId),
				eq(hrPolicyAcknowledgement.policyCode, input.policyCode),
			];
			if (input.policyVersion !== undefined) {
				conditions.push(
					eq(hrPolicyAcknowledgement.policyVersion, input.policyVersion),
				);
			}
			const rows = await db
				.select()
				.from(hrPolicyAcknowledgement)
				.where(and(...conditions))
				.orderBy(desc(hrPolicyAcknowledgement.issuedAt))
				.limit(1);
			const [row] = rows;
			if (!row) {
				return ok(null);
			}
			return mapPolicyAcknowledgement(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to get policy acknowledgement status",
			);
		}
	},

	async listOutstandingPolicyAcknowledgements(input) {
		try {
			const conditions = [
				eq(hrPolicyAcknowledgement.organizationId, input.organizationId),
				eq(hrPolicyAcknowledgement.requirementStatus, "outstanding"),
			];
			if (input.employeeId !== undefined) {
				conditions.push(
					eq(hrPolicyAcknowledgement.employeeId, input.employeeId),
				);
			}
			const rows = await db
				.select()
				.from(hrPolicyAcknowledgement)
				.where(and(...conditions));
			const acknowledgements: PolicyAcknowledgement[] = [];
			for (const row of rows) {
				const mapped = mapPolicyAcknowledgement(row);
				if (!mapped.ok) {
					return mapped;
				}
				acknowledgements.push(mapped.data);
			}
			acknowledgements.sort(
				(a, b) => b.issuedAt.getTime() - a.issuedAt.getTime(),
			);
			const totalCount = acknowledgements.length;
			const offset = (input.page - 1) * input.pageSize;
			return ok({
				acknowledgements: acknowledgements.slice(
					offset,
					offset + input.pageSize,
				),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			} satisfies PolicyAcknowledgementListPage);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list outstanding policy acknowledgements",
			);
		}
	},

	async listOverduePolicyAcknowledgements(input) {
		try {
			const conditions = [
				eq(hrPolicyAcknowledgement.organizationId, input.organizationId),
				eq(hrPolicyAcknowledgement.requirementStatus, "outstanding"),
			];
			if (input.employeeId !== undefined) {
				conditions.push(
					eq(hrPolicyAcknowledgement.employeeId, input.employeeId),
				);
			}
			const rows = await db
				.select()
				.from(hrPolicyAcknowledgement)
				.where(and(...conditions));
			const acknowledgements: PolicyAcknowledgement[] = [];
			for (const row of rows) {
				const mapped = mapPolicyAcknowledgement(row);
				if (!mapped.ok) {
					return mapped;
				}
				if (mapped.data.dueOn < input.asOf) {
					acknowledgements.push(mapped.data);
				}
			}
			acknowledgements.sort((a, b) => {
				const dueCompare = a.dueOn.localeCompare(b.dueOn);
				return dueCompare === 0
					? b.issuedAt.getTime() - a.issuedAt.getTime()
					: dueCompare;
			});
			const totalCount = acknowledgements.length;
			const offset = (input.page - 1) * input.pageSize;
			return ok({
				acknowledgements: acknowledgements.slice(
					offset,
					offset + input.pageSize,
				),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			} satisfies PolicyAcknowledgementListPage);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list overdue policy acknowledgements",
			);
		}
	},

	async getEmployeeComplianceSummary(input) {
		const asOf = input.asOf ?? new Date().toISOString().slice(0, 10);
		const employee = await this.getEmployeeById({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
		});
		if (!employee.ok) {
			return employee;
		}
		if (employee.data === null) {
			return notFound(
				"Employee not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const missing = await this.listMissingRequiredDocuments({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
			page: 1,
			pageSize: 10_000,
		});
		if (!missing.ok) {
			return missing;
		}

		const expiring = await this.listExpiringEmployeeDocuments({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
			asOf,
			withinDays: COMPLIANCE_NEARING_EXPIRY_DAYS,
			page: 1,
			pageSize: 10_000,
		});
		if (!expiring.ok) {
			return expiring;
		}

		const outstanding = await this.listOutstandingPolicyAcknowledgements({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
			page: 1,
			pageSize: 10_000,
		});
		if (!outstanding.ok) {
			return outstanding;
		}

		const activeEligibility = await this.getActiveWorkEligibilityForEmployee({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
		});
		if (!activeEligibility.ok) {
			return activeEligibility;
		}

		let workEligibilityAtRisk = false;
		if (activeEligibility.data === null) {
			workEligibilityAtRisk = true;
		} else {
			const eligibility = activeEligibility.data;
			workEligibilityAtRisk =
				isWorkEligibilityAtRisk(eligibility.status) ||
				(eligibility.expiresOn !== null && eligibility.expiresOn < asOf);
		}

		if (!workEligibilityAtRisk) {
			const riskList = await this.listEmployeesWithWorkEligibilityRisk({
				organizationId: input.organizationId,
				asOf,
				withinDays: COMPLIANCE_NEARING_EXPIRY_DAYS,
				page: 1,
				pageSize: 10_000,
			});
			if (!riskList.ok) {
				return riskList;
			}
			workEligibilityAtRisk = riskList.data.eligibilities.some(
				(e) => e.employeeId === input.employeeId,
			);
		}

		return ok({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
			missingRequiredDocumentCount: missing.data.totalCount,
			expiringDocumentCount: expiring.data.totalCount,
			workEligibilityAtRisk,
			outstandingPolicyAcknowledgementCount: outstanding.data.totalCount,
		} satisfies EmployeeComplianceSummary);
	},
};

export function attachDrizzleCompliance(target: ComplianceHost): void {
	Object.assign(target, drizzleComplianceMethods);
}
