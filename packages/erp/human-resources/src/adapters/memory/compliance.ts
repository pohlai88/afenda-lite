import { randomUUID } from "node:crypto";
import { ok, type Result } from "@afenda/errors/result";
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
	type HumanResourcesEventType,
} from "@afenda/events/schemas";
import {
	type HumanResourcesDocumentRequirementId,
	type HumanResourcesEmployeeDocumentId,
	type HumanResourcesEmployeeId,
	type HumanResourcesPolicyAcknowledgementId,
	type HumanResourcesWorkEligibilityId,
	parseHumanResourcesDocumentRequirementId,
	parseHumanResourcesEmployeeDocumentId,
	parseHumanResourcesPolicyAcknowledgementId,
	parseHumanResourcesWorkEligibilityId,
} from "../../brands";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../../error-codes";
import type { MutationPorts } from "../../ports";
import {
	buildCreateAuditFact,
	buildStatusTransitionAuditFact,
	buildUpdateAuditFact,
} from "../../shared/audit-facts";
import {
	assertDocumentRequirementStatusTransition,
	assertEmployeeDocumentVerificationTransition,
	assertPolicyAcknowledgementStatusTransition,
	assertRejectionReasonProvided,
	assertValidDocumentDateRange,
	assertWorkEligibilityStatusTransition,
	isDocumentRequirementApplicable,
	isNearingExpiry,
	isWithinInclusiveDateWindow,
} from "../../shared/compliance-guards";
import { toEmployeeDocumentListItem } from "../../shared/compliance-privacy";
import {
	type DocumentRequirementApplicability,
	isDocumentRequirementEditable,
	isEmployeeDocumentVerified,
	isPolicyAcknowledgementOutstanding,
} from "../../shared/compliance-status";
import { assertExpectedVersion } from "../../shared/concurrency";
import { conflict, invalidState, notFound } from "../../shared/domain-guards";
import { buildHumanResourcesEntityEventPayload } from "../../shared/event-payload";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import { runRollbacks } from "../../shared/rollback";
import { runSequential, sequentialReturn } from "../../shared/run-sequential";
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
import type { CoreMemoryState } from "./core";
import { idempotencyMapKey } from "./shared";

export interface ComplianceMemoryState {
	documentRequirements: Map<
		HumanResourcesDocumentRequirementId,
		DocumentRequirement
	>;
	employeeDocumentIdempotencyByKey: Map<
		string,
		IdempotentEmployeeDocumentRecord
	>;
	employeeDocuments: Map<HumanResourcesEmployeeDocumentId, EmployeeDocument>;
	policyAcknowledgementIdempotencyByKey: Map<
		string,
		IdempotentPolicyAcknowledgementRecord
	>;
	policyAcknowledgements: Map<
		HumanResourcesPolicyAcknowledgementId,
		PolicyAcknowledgement
	>;
	workEligibilities: Map<HumanResourcesWorkEligibilityId, WorkEligibility>;
	workEligibilityIdempotencyByKey: Map<string, IdempotentWorkEligibilityRecord>;
}

export type ComplianceMemoryHost = Pick<HumanResourcesStore, "getEmployeeById">;

export type MemoryComplianceMethods = Pick<
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

export function createComplianceMemoryState(): ComplianceMemoryState {
	return {
		documentRequirements: new Map(),
		employeeDocuments: new Map(),
		employeeDocumentIdempotencyByKey: new Map(),
		workEligibilities: new Map(),
		workEligibilityIdempotencyByKey: new Map(),
		policyAcknowledgements: new Map(),
		policyAcknowledgementIdempotencyByKey: new Map(),
	};
}

export function resetComplianceMemoryState(state: ComplianceMemoryState): void {
	state.documentRequirements.clear();
	state.employeeDocuments.clear();
	state.employeeDocumentIdempotencyByKey.clear();
	state.workEligibilities.clear();
	state.workEligibilityIdempotencyByKey.clear();
	state.policyAcknowledgements.clear();
	state.policyAcknowledgementIdempotencyByKey.clear();
}

function employeeHasVerifiedDocumentForRequirement(
	state: ComplianceMemoryState,
	input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		requirementId: HumanResourcesDocumentRequirementId;
	},
): boolean {
	return Array.from(state.employeeDocuments.values()).some(
		(document) =>
			document.organizationId === input.organizationId &&
			document.employeeId === input.employeeId &&
			document.requirementId === input.requirementId &&
			isEmployeeDocumentVerified(document.verificationStatus),
	);
}

async function recordComplianceAudit(
	_state: ComplianceMemoryState,
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
	input: {
		organizationId: string;
		actorUserId: string;
		entity: string;
		entityId: string;
		action: "CREATE" | "UPDATE";
		oldValue?: Record<string, unknown> | null | undefined;
		newValue?: Record<string, unknown> | null | undefined;
		statusField?: string | undefined;
		oldStatus?: string | null | undefined;
		newStatus?: string | undefined;
	},
): Promise<Result<{ id: string }>> {
	const context = {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		entity: input.entity,
		entityId: input.entityId,
		meta,
	};
	if (
		input.action === "UPDATE" &&
		input.oldStatus !== undefined &&
		input.newStatus !== undefined
	) {
		return await ports.audit.record(
			buildStatusTransitionAuditFact({
				context,
				field: input.statusField,
				oldStatus: input.oldStatus,
				newStatus: input.newStatus,
				oldValue: input.oldValue,
				newValue: input.newValue,
			}),
		);
	}
	if (input.action === "CREATE") {
		return await ports.audit.record(
			buildCreateAuditFact({
				context,
				newValue: input.newValue ?? { id: input.entityId },
			}),
		);
	}
	return await ports.audit.record(
		buildUpdateAuditFact({
			context,
			oldValue: input.oldValue ?? {},
			newValue: input.newValue ?? { id: input.entityId },
		}),
	);
}

async function appendComplianceOutbox(
	_state: ComplianceMemoryState,
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
	input: {
		organizationId: string;
		actorUserId: string;
		type: HumanResourcesEventType;
		entityType: string;
		entityId: string;
	},
): Promise<Result<{ id: string }>> {
	return await ports.outbox.append({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		type: input.type,
		payload: {
			...buildHumanResourcesEntityEventPayload({
				organizationId: input.organizationId,
				entityType: input.entityType,
				entityId: input.entityId,
				actorUserId: input.actorUserId,
				meta,
			}),
		},
	});
}

async function emitDocumentNearingExpiryIfNeeded(
	state: ComplianceMemoryState,
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
	input: {
		document: EmployeeDocument;
		actorUserId: string;
		asOf: string;
	},
): Promise<Result<void>> {
	if (
		!isNearingExpiry({
			expiresOn: input.document.expiresOn,
			asOf: input.asOf,
		})
	) {
		return ok(undefined);
	}
	const outbox = await appendComplianceOutbox(state, ports, meta, {
		organizationId: input.document.organizationId,
		actorUserId: input.actorUserId,
		type: HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT,
		entityType: "hr_employee_document",
		entityId: input.document.id,
	});
	return outbox.ok ? ok(undefined) : outbox;
}

async function transitionDocumentRequirementStatus(
	state: ComplianceMemoryState,
	input: {
		organizationId: string;
		requirementId: HumanResourcesDocumentRequirementId;
		expectedVersion: number;
		actorUserId: string;
		nextStatus: DocumentRequirement["status"];
		ports: MutationPorts;
		meta: HumanResourcesMutationMeta;
	},
): Promise<Result<DocumentRequirement>> {
	const requirement = state.documentRequirements.get(input.requirementId);
	if (!requirement) {
		return notFound("Document requirement not found");
	}
	if (requirement.organizationId !== input.organizationId) {
		return notFound(
			"Document requirement not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}

	const versionCheck = assertExpectedVersion(
		requirement.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}

	const transition = assertDocumentRequirementStatusTransition(
		requirement.status,
		input.nextStatus,
	);
	if (!transition.ok) {
		return transition;
	}

	const previous = { ...requirement };
	const now = new Date();
	const updated: DocumentRequirement = {
		...requirement,
		status: input.nextStatus,
		version: requirement.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	state.documentRequirements.set(updated.id, updated);

	const audit = await recordComplianceAudit(state, input.ports, input.meta, {
		organizationId: updated.organizationId,
		actorUserId: input.actorUserId,
		entity: "hr_document_requirement",
		entityId: updated.id,
		action: "UPDATE",
		oldStatus: previous.status,
		newStatus: updated.status,
		oldValue: { status: previous.status, version: previous.version },
		newValue: { status: updated.status, version: updated.version },
	});
	if (!audit.ok) {
		state.documentRequirements.set(updated.id, previous);
		return audit;
	}

	return ok({ ...updated });
}

async function transitionEmployeeDocumentStatus(
	state: ComplianceMemoryState,
	input: {
		organizationId: string;
		documentId: HumanResourcesEmployeeDocumentId;
		expectedVersion: number;
		actorUserId: string;
		nextStatus: EmployeeDocument["verificationStatus"];
		patch?: Partial<
			Pick<
				EmployeeDocument,
				| "rejectionReason"
				| "verifiedBy"
				| "verifiedAt"
				| "expiresOn"
				| "issuingJurisdiction"
				| "metadata"
			>
		>;
		events?: HumanResourcesEventType[] | undefined;
		ports: MutationPorts;
		meta: HumanResourcesMutationMeta;
	},
): Promise<Result<EmployeeDocument>> {
	const document = state.employeeDocuments.get(input.documentId);
	if (!document) {
		return notFound("Employee document not found");
	}
	if (document.organizationId !== input.organizationId) {
		return notFound(
			"Employee document not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}

	const versionCheck = assertExpectedVersion(
		document.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}

	const transition = assertEmployeeDocumentVerificationTransition(
		document.verificationStatus,
		input.nextStatus,
	);
	if (!transition.ok) {
		return transition;
	}

	const previous = { ...document };
	const now = new Date();
	const clearedVerification =
		input.nextStatus === "expired"
			? { verifiedBy: null, verifiedAt: null }
			: {};
	const updated: EmployeeDocument = {
		...document,
		...input.patch,
		...clearedVerification,
		verificationStatus: input.nextStatus,
		version: document.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	state.employeeDocuments.set(updated.id, updated);

	const rollback: Array<() => void> = [
		() => state.employeeDocuments.set(updated.id, previous),
	];

	const audit = await recordComplianceAudit(state, input.ports, input.meta, {
		organizationId: updated.organizationId,
		actorUserId: input.actorUserId,
		entity: "hr_employee_document",
		entityId: updated.id,
		action: "UPDATE",
		statusField: "verificationStatus",
		oldStatus: previous.verificationStatus,
		newStatus: updated.verificationStatus,
		oldValue: {
			verificationStatus: previous.verificationStatus,
			version: previous.version,
		},
		newValue: {
			verificationStatus: updated.verificationStatus,
			version: updated.version,
		},
	});
	if (!audit.ok) {
		runRollbacks(rollback);
		return audit;
	}

	const sequentialOutcome1 = await runSequential(
		input.events ?? [],
		async (eventType) => {
			const outbox = await appendComplianceOutbox(
				state,
				input.ports,
				input.meta,
				{
					organizationId: updated.organizationId,
					actorUserId: input.actorUserId,
					type: eventType,
					entityType: "hr_employee_document",
					entityId: updated.id,
				},
			);
			if (!outbox.ok) {
				runRollbacks(rollback);
				return sequentialReturn(outbox);
			}
		},
	);
	if (sequentialOutcome1.kind === "return") {
		return sequentialOutcome1.value;
	}

	return ok({ ...updated });
}

async function transitionWorkEligibilityStatus(
	state: ComplianceMemoryState,
	input: {
		organizationId: string;
		eligibilityId: HumanResourcesWorkEligibilityId;
		expectedVersion: number;
		actorUserId: string;
		nextStatus: WorkEligibility["status"];
		patch?: Partial<
			Pick<
				WorkEligibility,
				"issuedOn" | "expiresOn" | "documentRef" | "verifiedBy" | "verifiedAt"
			>
		>;
		events?: HumanResourcesEventType[] | undefined;
		ports: MutationPorts;
		meta: HumanResourcesMutationMeta;
	},
): Promise<Result<WorkEligibility>> {
	const eligibility = state.workEligibilities.get(input.eligibilityId);
	if (!eligibility) {
		return notFound("Work eligibility not found");
	}
	if (eligibility.organizationId !== input.organizationId) {
		return notFound(
			"Work eligibility not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}

	const versionCheck = assertExpectedVersion(
		eligibility.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}

	const transition = assertWorkEligibilityStatusTransition(
		eligibility.status,
		input.nextStatus,
	);
	if (!transition.ok) {
		return transition;
	}

	const previous = { ...eligibility };
	const now = new Date();
	const updated: WorkEligibility = {
		...eligibility,
		...input.patch,
		status: input.nextStatus,
		version: eligibility.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	state.workEligibilities.set(updated.id, updated);

	const rollback: Array<() => void> = [
		() => state.workEligibilities.set(updated.id, previous),
	];

	const audit = await recordComplianceAudit(state, input.ports, input.meta, {
		organizationId: updated.organizationId,
		actorUserId: input.actorUserId,
		entity: "hr_work_eligibility",
		entityId: updated.id,
		action: "UPDATE",
		oldStatus: previous.status,
		newStatus: updated.status,
		oldValue: { status: previous.status, version: previous.version },
		newValue: { status: updated.status, version: updated.version },
	});
	if (!audit.ok) {
		runRollbacks(rollback);
		return audit;
	}

	const sequentialOutcome2 = await runSequential(
		input.events ?? [],
		async (eventType) => {
			const outbox = await appendComplianceOutbox(
				state,
				input.ports,
				input.meta,
				{
					organizationId: updated.organizationId,
					actorUserId: input.actorUserId,
					type: eventType,
					entityType: "hr_work_eligibility",
					entityId: updated.id,
				},
			);
			if (!outbox.ok) {
				runRollbacks(rollback);
				return sequentialReturn(outbox);
			}
		},
	);
	if (sequentialOutcome2.kind === "return") {
		return sequentialOutcome2.value;
	}

	return ok({ ...updated });
}

async function transitionPolicyAcknowledgementStatus(
	state: ComplianceMemoryState,
	input: {
		organizationId: string;
		acknowledgementId: HumanResourcesPolicyAcknowledgementId;
		expectedVersion: number;
		actorUserId: string;
		nextStatus: PolicyAcknowledgement["requirementStatus"];
		patch?: Partial<
			Pick<
				PolicyAcknowledgement,
				"acknowledgedAt" | "acknowledgedBy" | "policyVersion"
			>
		>;
		events?: Array<
			| typeof HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_OUTSTANDING_EVENT
			| typeof HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGED_EVENT
		>;
		ports: MutationPorts;
		meta: HumanResourcesMutationMeta;
	},
): Promise<Result<PolicyAcknowledgement>> {
	const acknowledgement = state.policyAcknowledgements.get(
		input.acknowledgementId,
	);
	if (!acknowledgement) {
		return notFound("Policy acknowledgement not found");
	}
	if (acknowledgement.organizationId !== input.organizationId) {
		return notFound(
			"Policy acknowledgement not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}

	const versionCheck = assertExpectedVersion(
		acknowledgement.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}

	const transition = assertPolicyAcknowledgementStatusTransition(
		acknowledgement.requirementStatus,
		input.nextStatus,
	);
	if (!transition.ok) {
		return transition;
	}

	const previous = { ...acknowledgement };
	const now = new Date();
	const updated: PolicyAcknowledgement = {
		...acknowledgement,
		...input.patch,
		requirementStatus: input.nextStatus,
		version: acknowledgement.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	state.policyAcknowledgements.set(updated.id, updated);

	const rollback: Array<() => void> = [
		() => state.policyAcknowledgements.set(updated.id, previous),
	];

	const audit = await recordComplianceAudit(state, input.ports, input.meta, {
		organizationId: updated.organizationId,
		actorUserId: input.actorUserId,
		entity: "hr_policy_acknowledgement",
		entityId: updated.id,
		action: "UPDATE",
		statusField: "requirementStatus",
		oldStatus: previous.requirementStatus,
		newStatus: updated.requirementStatus,
		oldValue: {
			requirementStatus: previous.requirementStatus,
			version: previous.version,
		},
		newValue: {
			requirementStatus: updated.requirementStatus,
			version: updated.version,
		},
	});
	if (!audit.ok) {
		runRollbacks(rollback);
		return audit;
	}

	const sequentialOutcome3 = await runSequential(
		input.events ?? [],
		async (eventType) => {
			const outbox = await appendComplianceOutbox(
				state,
				input.ports,
				input.meta,
				{
					organizationId: updated.organizationId,
					actorUserId: input.actorUserId,
					type: eventType,
					entityType: "hr_policy_acknowledgement",
					entityId: updated.id,
				},
			);
			if (!outbox.ok) {
				runRollbacks(rollback);
				return sequentialReturn(outbox);
			}
		},
	);
	if (sequentialOutcome3.kind === "return") {
		return sequentialOutcome3.value;
	}

	return ok({ ...updated });
}

// --- Document Requirement ---

export function createMemoryComplianceMethods(
	state: ComplianceMemoryState,
	core: CoreMemoryState,
): MemoryComplianceMethods &
	ThisType<ComplianceMemoryHost & MemoryComplianceMethods> {
	return {
		async getDocumentRequirementById(input: {
			organizationId: string;
			requirementId: HumanResourcesDocumentRequirementId;
		}): Promise<Result<DocumentRequirement | null>> {
			const requirement = state.documentRequirements.get(input.requirementId);
			if (!requirement || requirement.organizationId !== input.organizationId) {
				return await ok(null);
			}
			return await ok({ ...requirement });
		},

		async findDocumentRequirementByCode(input: {
			organizationId: string;
			code: string;
		}): Promise<Result<DocumentRequirement | null>> {
			const requirement =
				Array.from(state.documentRequirements.values()).find(
					(row) =>
						row.organizationId === input.organizationId &&
						row.code === input.code,
				) ?? null;
			return await ok(requirement === null ? null : { ...requirement });
		},

		async createDocumentRequirement(
			record: {
				organizationId: string;
				code: string;
				name: string;
				documentType: string;
				issuingJurisdiction: string | null;
				appliesToNote: string | null;
				applicability: DocumentRequirementApplicability;
				createdBy: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<DocumentRequirement>> {
			const existing = Array.from(state.documentRequirements.values()).find(
				(row) =>
					row.organizationId === record.organizationId &&
					row.code === record.code,
			);
			if (existing) {
				return conflict("Document requirement code already exists");
			}

			const idResult = parseHumanResourcesDocumentRequirementId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const requirement: DocumentRequirement = {
				id: idResult.data,
				organizationId: record.organizationId,
				code: record.code,
				name: record.name,
				documentType: record.documentType,
				issuingJurisdiction: record.issuingJurisdiction,
				appliesToNote: record.appliesToNote,
				applicability: record.applicability,
				status: "draft",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.documentRequirements.set(requirement.id, requirement);

			const audit = await recordComplianceAudit(state, ports, meta, {
				organizationId: requirement.organizationId,
				actorUserId: record.createdBy,
				entity: "hr_document_requirement",
				entityId: requirement.id,
				action: "CREATE",
				newValue: { id: requirement.id },
			});
			if (!audit.ok) {
				state.documentRequirements.delete(requirement.id);
				return audit;
			}

			return ok({ ...requirement });
		},

		async updateDocumentRequirement(
			input: {
				organizationId: string;
				requirementId: HumanResourcesDocumentRequirementId;
				name?: string | undefined;
				documentType?: string | undefined;
				issuingJurisdiction?: string | null | undefined;
				appliesToNote?: string | null | undefined;
				applicability?: DocumentRequirementApplicability | undefined;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<DocumentRequirement>> {
			const requirement = state.documentRequirements.get(input.requirementId);
			if (!requirement) {
				return notFound("Document requirement not found");
			}
			if (requirement.organizationId !== input.organizationId) {
				return notFound(
					"Document requirement not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const versionCheck = assertExpectedVersion(
				requirement.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			if (!isDocumentRequirementEditable(requirement.status)) {
				return invalidState("Document requirement is not editable");
			}

			const previous = { ...requirement };
			const now = new Date();
			const updated: DocumentRequirement = {
				...requirement,
				name: input.name ?? requirement.name,
				documentType: input.documentType ?? requirement.documentType,
				issuingJurisdiction:
					input.issuingJurisdiction === undefined
						? requirement.issuingJurisdiction
						: input.issuingJurisdiction,
				appliesToNote:
					input.appliesToNote === undefined
						? requirement.appliesToNote
						: input.appliesToNote,
				applicability: input.applicability ?? requirement.applicability,
				version: requirement.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.documentRequirements.set(updated.id, updated);

			const audit = await recordComplianceAudit(state, ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_document_requirement",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.documentRequirements.set(updated.id, previous);
				return audit;
			}

			return ok({ ...updated });
		},

		async publishDocumentRequirement(
			input: {
				organizationId: string;
				requirementId: HumanResourcesDocumentRequirementId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<DocumentRequirement>> {
			return await transitionDocumentRequirementStatus(state, {
				organizationId: input.organizationId,
				requirementId: input.requirementId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				nextStatus: "published",
				ports,
				meta,
			});
		},

		async retireDocumentRequirement(
			input: {
				organizationId: string;
				requirementId: HumanResourcesDocumentRequirementId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<DocumentRequirement>> {
			return await transitionDocumentRequirementStatus(state, {
				organizationId: input.organizationId,
				requirementId: input.requirementId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				nextStatus: "retired",
				ports,
				meta,
			});
		},

		async listPublishedDocumentRequirements(input: {
			organizationId: string;
			page: number;
			pageSize: number;
		}): Promise<Result<DocumentRequirementListPage>> {
			const filtered = Array.from(state.documentRequirements.values())
				.filter(
					(row) =>
						row.organizationId === input.organizationId &&
						row.status === "published",
				)
				.sort((a, b) => a.code.localeCompare(b.code));

			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const requirements = filtered
				.slice(start, start + input.pageSize)
				.map((row) => ({ ...row }));

			return await ok({
				requirements,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// --- Employee Document ---

		async getEmployeeDocumentById(input: {
			organizationId: string;
			documentId: HumanResourcesEmployeeDocumentId;
		}): Promise<Result<EmployeeDocument | null>> {
			const document = state.employeeDocuments.get(input.documentId);
			if (!document || document.organizationId !== input.organizationId) {
				return await ok(null);
			}
			return await ok({ ...document });
		},

		async findEmployeeDocumentByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentEmployeeDocumentRecord | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.employeeDocumentIdempotencyByKey.get(key);
			if (!record) {
				return await ok(null);
			}
			return await ok({ ...record, document: { ...record.document } });
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async registerEmployeeDocument(
			record: {
				organizationId: string;
				employeeId: HumanResourcesEmployeeId;
				requirementId: HumanResourcesDocumentRequirementId | null;
				documentType: string;
				issuingJurisdiction: string | null;
				issuedOn: string;
				expiresOn: string | null;
				documentRef: string;
				identifierLast4: string | null;
				identifierFingerprint: string | null;
				metadata: Record<string, unknown> | null;
				createIdempotencyKey: string;
				createRequestFingerprint: string;
				createdBy: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<EmployeeDocument>> {
			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			const existing =
				state.employeeDocumentIdempotencyByKey.get(idempotencyKey);
			if (existing) {
				if (
					existing.createRequestFingerprint !== record.createRequestFingerprint
				) {
					return conflict("Idempotency key reused with different payload");
				}
				return ok({ ...existing.document });
			}

			const employeeResult = await this.getEmployeeById({
				organizationId: record.organizationId,
				employeeId: record.employeeId,
			});
			if (!employeeResult.ok) {
				return employeeResult;
			}
			const employee = employeeResult.data;
			if (
				employee === null ||
				employee.organizationId !== record.organizationId
			) {
				return notFound(
					"Employee not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			if (record.requirementId !== null) {
				const requirement = state.documentRequirements.get(
					record.requirementId,
				);
				if (
					!requirement ||
					requirement.organizationId !== record.organizationId
				) {
					return notFound(
						"Document requirement not found",
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					);
				}
				if (requirement.status !== "published") {
					return invalidState("Document requirement is not published");
				}
			}

			const dateRange = assertValidDocumentDateRange({
				issuedOn: record.issuedOn,
				expiresOn: record.expiresOn,
			});
			if (!dateRange.ok) {
				return dateRange;
			}

			const idResult = parseHumanResourcesEmployeeDocumentId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const document: EmployeeDocument = {
				id: idResult.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				requirementId: record.requirementId,
				documentType: record.documentType,
				issuingJurisdiction: record.issuingJurisdiction,
				issuedOn: record.issuedOn,
				expiresOn: record.expiresOn,
				verificationStatus: "pending",
				verifiedBy: null,
				verifiedAt: null,
				rejectionReason: null,
				documentRef: record.documentRef,
				identifierLast4: record.identifierLast4,
				identifierFingerprint: record.identifierFingerprint,
				metadata: record.metadata,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.employeeDocuments.set(document.id, document);
			state.employeeDocumentIdempotencyByKey.set(idempotencyKey, {
				document: { ...document },
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const rollback: Array<() => void> = [
				() => {
					state.employeeDocuments.delete(document.id);
					state.employeeDocumentIdempotencyByKey.delete(idempotencyKey);
				},
			];

			const audit = await recordComplianceAudit(state, ports, meta, {
				organizationId: document.organizationId,
				actorUserId: record.createdBy,
				entity: "hr_employee_document",
				entityId: document.id,
				action: "CREATE",
				newValue: { id: document.id },
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			const events: Array<
				| typeof HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REGISTERED_EVENT
				| typeof HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT
			> = [HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REGISTERED_EVENT];
			if (
				isNearingExpiry({
					expiresOn: document.expiresOn,
					asOf: record.issuedOn,
				})
			) {
				events.push(HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT);
			}

			const sequentialOutcome4 = await runSequential(
				events,
				async (eventType) => {
					const outbox = await appendComplianceOutbox(state, ports, meta, {
						organizationId: document.organizationId,
						actorUserId: record.createdBy,
						type: eventType,
						entityType: "hr_employee_document",
						entityId: document.id,
					});
					if (!outbox.ok) {
						runRollbacks(rollback);
						return sequentialReturn(outbox);
					}
				},
			);
			if (sequentialOutcome4.kind === "return") {
				return sequentialOutcome4.value;
			}

			return ok({ ...document });
		},

		async updateEmployeeDocumentMetadata(
			input: {
				organizationId: string;
				documentId: HumanResourcesEmployeeDocumentId;
				issuingJurisdiction?: string | null | undefined;
				expiresOn?: string | null | undefined;
				metadata?: Record<string, unknown> | null | undefined;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<EmployeeDocument>> {
			const document = state.employeeDocuments.get(input.documentId);
			if (!document) {
				return notFound("Employee document not found");
			}
			if (document.organizationId !== input.organizationId) {
				return notFound(
					"Employee document not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const versionCheck = assertExpectedVersion(
				document.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const nextExpiresOn =
				input.expiresOn === undefined ? document.expiresOn : input.expiresOn;
			const dateRange = assertValidDocumentDateRange({
				issuedOn: document.issuedOn,
				expiresOn: nextExpiresOn,
			});
			if (!dateRange.ok) {
				return dateRange;
			}

			const previous = { ...document };
			const now = new Date();
			const updated: EmployeeDocument = {
				...document,
				issuingJurisdiction:
					input.issuingJurisdiction === undefined
						? document.issuingJurisdiction
						: input.issuingJurisdiction,
				expiresOn: nextExpiresOn,
				metadata:
					input.metadata === undefined ? document.metadata : input.metadata,
				version: document.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.employeeDocuments.set(updated.id, updated);

			const rollback: Array<() => void> = [
				() => state.employeeDocuments.set(updated.id, previous),
			];

			const audit = await recordComplianceAudit(state, ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_employee_document",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			const nearingExpiry = await emitDocumentNearingExpiryIfNeeded(
				state,
				ports,
				meta,
				{
					document: updated,
					actorUserId: input.actorUserId,
					asOf: now.toISOString().slice(0, 10),
				},
			);
			if (!nearingExpiry.ok) {
				runRollbacks(rollback);
				return nearingExpiry;
			}

			return ok({ ...updated });
		},

		async verifyEmployeeDocument(
			input: {
				organizationId: string;
				documentId: HumanResourcesEmployeeDocumentId;
				evidenceDate: string;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<EmployeeDocument>> {
			return await transitionEmployeeDocumentStatus(state, {
				organizationId: input.organizationId,
				documentId: input.documentId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				nextStatus: "verified",
				patch: {
					verifiedBy: input.actorUserId,
					verifiedAt: new Date(`${input.evidenceDate}T00:00:00.000Z`),
					rejectionReason: null,
				},
				events: [HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_VERIFIED_EVENT],
				ports,
				meta,
			});
		},

		async rejectEmployeeDocument(
			input: {
				organizationId: string;
				documentId: HumanResourcesEmployeeDocumentId;
				rejectionReason: string;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<EmployeeDocument>> {
			const reasonCheck = assertRejectionReasonProvided(input.rejectionReason);
			if (!reasonCheck.ok) {
				return await reasonCheck;
			}

			return await transitionEmployeeDocumentStatus(state, {
				organizationId: input.organizationId,
				documentId: input.documentId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				nextStatus: "rejected",
				patch: {
					rejectionReason: input.rejectionReason.trim(),
					verifiedBy: null,
					verifiedAt: null,
				},
				events: [HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REJECTED_EVENT],
				ports,
				meta,
			});
		},

		async revokeEmployeeDocumentVerification(
			input: {
				organizationId: string;
				documentId: HumanResourcesEmployeeDocumentId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<EmployeeDocument>> {
			return await transitionEmployeeDocumentStatus(state, {
				organizationId: input.organizationId,
				documentId: input.documentId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				nextStatus: "revoked",
				ports,
				meta,
			});
		},

		async markEmployeeDocumentExpired(
			input: {
				organizationId: string;
				documentId: HumanResourcesEmployeeDocumentId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<EmployeeDocument>> {
			return await transitionEmployeeDocumentStatus(state, {
				organizationId: input.organizationId,
				documentId: input.documentId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				nextStatus: "expired",
				events: [HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_EXPIRED_EVENT],
				ports,
				meta,
			});
		},

		async listEmployeeDocuments(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			employeeId?: HumanResourcesEmployeeId | undefined;
			verificationStatus?: EmployeeDocument["verificationStatus"] | undefined;
		}): Promise<Result<EmployeeDocumentListPage>> {
			let filtered = Array.from(state.employeeDocuments.values()).filter(
				(row) => row.organizationId === input.organizationId,
			);

			if (input.employeeId !== undefined) {
				filtered = filtered.filter(
					(row) => row.employeeId === input.employeeId,
				);
			}
			if (input.verificationStatus !== undefined) {
				filtered = filtered.filter(
					(row) => row.verificationStatus === input.verificationStatus,
				);
			}

			filtered.sort((a, b) => b.issuedOn.localeCompare(a.issuedOn));

			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const documents = filtered
				.slice(start, start + input.pageSize)
				.map((row) => toEmployeeDocumentListItem(row));

			return await ok({
				documents,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async listMissingRequiredDocuments(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			employeeId?: HumanResourcesEmployeeId | undefined;
		}): Promise<Result<DocumentRequirementListPage>> {
			const published = Array.from(state.documentRequirements.values()).filter(
				(row) =>
					row.organizationId === input.organizationId &&
					row.status === "published",
			);

			const organizationEmployeeIds = Array.from(core.employees.values())
				.filter((employee) => employee.organizationId === input.organizationId)
				.map((employee) => employee.id);
			const employeeIds =
				input.employeeId === undefined
					? organizationEmployeeIds
					: organizationEmployeeIds.filter(
							(employeeId) => employeeId === input.employeeId,
						);
			const missing = published.filter((requirement) =>
				employeeIds.some(
					(employeeId) =>
						isDocumentRequirementApplicable({
							applicability: requirement.applicability,
							employeeId,
						}) &&
						!employeeHasVerifiedDocumentForRequirement(state, {
							organizationId: input.organizationId,
							employeeId,
							requirementId: requirement.id,
						}),
				),
			);

			missing.sort((a, b) => a.code.localeCompare(b.code));

			const totalCount = missing.length;
			const start = (input.page - 1) * input.pageSize;
			const requirements = missing
				.slice(start, start + input.pageSize)
				.map((row) => ({ ...row }));

			return await ok({
				requirements,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async listExpiringEmployeeDocuments(input: {
			organizationId: string;
			asOf: string;
			withinDays: number;
			page: number;
			pageSize: number;
			employeeId?: HumanResourcesEmployeeId | undefined;
		}): Promise<Result<EmployeeDocumentListPage>> {
			let filtered = Array.from(state.employeeDocuments.values()).filter(
				(row) =>
					row.organizationId === input.organizationId &&
					row.verificationStatus !== "expired" &&
					isWithinInclusiveDateWindow({
						date: row.expiresOn,
						asOf: input.asOf,
						withinDays: input.withinDays,
					}),
			);

			if (input.employeeId !== undefined) {
				filtered = filtered.filter(
					(row) => row.employeeId === input.employeeId,
				);
			}

			filtered.sort((a, b) => {
				const expiresCompare = (a.expiresOn ?? "").localeCompare(
					b.expiresOn ?? "",
				);
				if (expiresCompare !== 0) {
					return expiresCompare;
				}
				return b.issuedOn.localeCompare(a.issuedOn);
			});

			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const documents = filtered
				.slice(start, start + input.pageSize)
				.map((row) => toEmployeeDocumentListItem(row));

			return await ok({
				documents,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// --- Work Eligibility ---

		async getWorkEligibilityById(input: {
			organizationId: string;
			eligibilityId: HumanResourcesWorkEligibilityId;
		}): Promise<Result<WorkEligibility | null>> {
			const eligibility = state.workEligibilities.get(input.eligibilityId);
			if (!eligibility || eligibility.organizationId !== input.organizationId) {
				return await ok(null);
			}
			return await ok({ ...eligibility });
		},

		async getActiveWorkEligibilityForEmployee(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
		}): Promise<Result<WorkEligibility | null>> {
			const active = Array.from(state.workEligibilities.values())
				.filter(
					(row) =>
						row.organizationId === input.organizationId &&
						row.employeeId === input.employeeId &&
						row.status === "active",
				)
				.sort((a, b) => b.issuedOn.localeCompare(a.issuedOn));

			const eligibility = active[0] ?? null;
			return await ok(eligibility === null ? null : { ...eligibility });
		},

		async findWorkEligibilityByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentWorkEligibilityRecord | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.workEligibilityIdempotencyByKey.get(key);
			if (!record) {
				return await ok(null);
			}
			return await ok({ ...record, eligibility: { ...record.eligibility } });
		},

		async recordWorkEligibility(
			record: {
				organizationId: string;
				employeeId: HumanResourcesEmployeeId;
				countryCode: string;
				jurisdiction: string | null;
				issuedOn: string;
				expiresOn: string | null;
				documentRef: string | null;
				createIdempotencyKey: string;
				createRequestFingerprint: string;
				createdBy: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<WorkEligibility>> {
			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			const existing =
				state.workEligibilityIdempotencyByKey.get(idempotencyKey);
			if (existing) {
				if (
					existing.createRequestFingerprint !== record.createRequestFingerprint
				) {
					return conflict("Idempotency key reused with different payload");
				}
				return ok({ ...existing.eligibility });
			}

			const employeeResult = await this.getEmployeeById({
				organizationId: record.organizationId,
				employeeId: record.employeeId,
			});
			if (!employeeResult.ok) {
				return employeeResult;
			}
			const employee = employeeResult.data;
			if (
				employee === null ||
				employee.organizationId !== record.organizationId
			) {
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

			const idResult = parseHumanResourcesWorkEligibilityId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const eligibility: WorkEligibility = {
				id: idResult.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				countryCode: record.countryCode,
				jurisdiction: record.jurisdiction,
				status: "pending",
				issuedOn: record.issuedOn,
				expiresOn: record.expiresOn,
				verifiedBy: null,
				verifiedAt: null,
				documentRef: record.documentRef,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.workEligibilities.set(eligibility.id, eligibility);
			state.workEligibilityIdempotencyByKey.set(idempotencyKey, {
				eligibility: { ...eligibility },
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const rollback: Array<() => void> = [
				() => {
					state.workEligibilities.delete(eligibility.id);
					state.workEligibilityIdempotencyByKey.delete(idempotencyKey);
				},
			];

			const audit = await recordComplianceAudit(state, ports, meta, {
				organizationId: eligibility.organizationId,
				actorUserId: record.createdBy,
				entity: "hr_work_eligibility",
				entityId: eligibility.id,
				action: "CREATE",
				newValue: { id: eligibility.id },
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			return ok({ ...eligibility });
		},

		async verifyWorkEligibility(
			input: {
				organizationId: string;
				eligibilityId: HumanResourcesWorkEligibilityId;
				evidenceDate: string;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<WorkEligibility>> {
			return await transitionWorkEligibilityStatus(state, {
				organizationId: input.organizationId,
				eligibilityId: input.eligibilityId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				nextStatus: "active",
				patch: {
					verifiedBy: input.actorUserId,
					verifiedAt: new Date(`${input.evidenceDate}T00:00:00.000Z`),
				},
				events: [HUMAN_RESOURCES_WORK_ELIGIBILITY_VERIFIED_EVENT],
				ports,
				meta,
			});
		},

		async suspendWorkEligibility(
			input: {
				organizationId: string;
				eligibilityId: HumanResourcesWorkEligibilityId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<WorkEligibility>> {
			return await transitionWorkEligibilityStatus(state, {
				organizationId: input.organizationId,
				eligibilityId: input.eligibilityId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				nextStatus: "suspended",
				events: [HUMAN_RESOURCES_WORK_ELIGIBILITY_SUSPENDED_EVENT],
				ports,
				meta,
			});
		},

		async renewWorkEligibility(
			input: {
				organizationId: string;
				eligibilityId: HumanResourcesWorkEligibilityId;
				issuedOn: string;
				expiresOn: string | null;
				documentRef: string | null;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<WorkEligibility>> {
			const eligibility = state.workEligibilities.get(input.eligibilityId);
			if (!eligibility) {
				return notFound("Work eligibility not found");
			}
			if (eligibility.organizationId !== input.organizationId) {
				return notFound(
					"Work eligibility not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const dateRange = assertValidDocumentDateRange({
				issuedOn: input.issuedOn,
				expiresOn: input.expiresOn,
			});
			if (!dateRange.ok) {
				return dateRange;
			}

			if (
				eligibility.status === "expired" ||
				eligibility.status === "suspended"
			) {
				return transitionWorkEligibilityStatus(state, {
					organizationId: input.organizationId,
					eligibilityId: input.eligibilityId,
					expectedVersion: input.expectedVersion,
					actorUserId: input.actorUserId,
					nextStatus: "active",
					patch: {
						issuedOn: input.issuedOn,
						expiresOn: input.expiresOn,
						documentRef: input.documentRef ?? eligibility.documentRef,
					},
					events: [HUMAN_RESOURCES_WORK_ELIGIBILITY_RENEWED_EVENT],
					ports,
					meta,
				});
			}

			if (eligibility.status !== "active") {
				return invalidState("Work eligibility cannot be renewed");
			}

			const versionCheck = assertExpectedVersion(
				eligibility.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const previous = { ...eligibility };
			const now = new Date();
			const updated: WorkEligibility = {
				...eligibility,
				issuedOn: input.issuedOn,
				expiresOn: input.expiresOn,
				documentRef: input.documentRef ?? eligibility.documentRef,
				version: eligibility.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.workEligibilities.set(updated.id, updated);

			const audit = await recordComplianceAudit(state, ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_work_eligibility",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.workEligibilities.set(updated.id, previous);
				return audit;
			}

			const outbox = await appendComplianceOutbox(state, ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_WORK_ELIGIBILITY_RENEWED_EVENT,
				entityType: "hr_work_eligibility",
				entityId: updated.id,
			});
			if (!outbox.ok) {
				state.workEligibilities.set(updated.id, previous);
				return outbox;
			}

			return ok({ ...updated });
		},

		async closeWorkEligibility(
			input: {
				organizationId: string;
				eligibilityId: HumanResourcesWorkEligibilityId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<WorkEligibility>> {
			return await transitionWorkEligibilityStatus(state, {
				organizationId: input.organizationId,
				eligibilityId: input.eligibilityId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				nextStatus: "closed",
				events: [HUMAN_RESOURCES_WORK_ELIGIBILITY_EXPIRED_EVENT],
				ports,
				meta,
			});
		},

		async listEmployeesWithWorkEligibilityRisk(input: {
			organizationId: string;
			asOf: string;
			withinDays: number;
			page: number;
			pageSize: number;
		}): Promise<Result<WorkEligibilityRiskListPage>> {
			const filtered = Array.from(state.workEligibilities.values())
				.filter(
					(row) =>
						row.organizationId === input.organizationId &&
						row.status !== "closed" &&
						(row.status === "pending" ||
							row.status === "suspended" ||
							row.status === "expired" ||
							(row.expiresOn !== null && row.expiresOn < input.asOf) ||
							isWithinInclusiveDateWindow({
								date: row.expiresOn,
								asOf: input.asOf,
								withinDays: input.withinDays,
							})),
				)
				.sort((a, b) => {
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

			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const eligibilities = filtered
				.slice(start, start + input.pageSize)
				.map((row) => ({ ...row }));

			return await ok({
				eligibilities,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// --- Policy Acknowledgement ---

		async getPolicyAcknowledgementById(input: {
			organizationId: string;
			acknowledgementId: HumanResourcesPolicyAcknowledgementId;
		}): Promise<Result<PolicyAcknowledgement | null>> {
			const acknowledgement = state.policyAcknowledgements.get(
				input.acknowledgementId,
			);
			if (
				!acknowledgement ||
				acknowledgement.organizationId !== input.organizationId
			) {
				return await ok(null);
			}
			return await ok({ ...acknowledgement });
		},

		async findPolicyAcknowledgementByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentPolicyAcknowledgementRecord | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.policyAcknowledgementIdempotencyByKey.get(key);
			if (!record) {
				return await ok(null);
			}
			return await ok({
				...record,
				acknowledgement: { ...record.acknowledgement },
			});
		},

		async issuePolicyAcknowledgementRequirement(
			record: {
				organizationId: string;
				employeeId: HumanResourcesEmployeeId;
				policyCode: string;
				policyVersion: string;
				dueOn: string;
				createIdempotencyKey: string;
				createRequestFingerprint: string;
				createdBy: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PolicyAcknowledgement>> {
			const idempotencyKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			const existing =
				state.policyAcknowledgementIdempotencyByKey.get(idempotencyKey);
			if (existing) {
				if (
					existing.createRequestFingerprint !== record.createRequestFingerprint
				) {
					return conflict("Idempotency key reused with different payload");
				}
				return ok({ ...existing.acknowledgement });
			}

			const employeeResult = await this.getEmployeeById({
				organizationId: record.organizationId,
				employeeId: record.employeeId,
			});
			if (!employeeResult.ok) {
				return employeeResult;
			}
			const employee = employeeResult.data;
			if (
				employee === null ||
				employee.organizationId !== record.organizationId
			) {
				return notFound(
					"Employee not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const outstandingExists = Array.from(
				state.policyAcknowledgements.values(),
			).some(
				(row) =>
					row.organizationId === record.organizationId &&
					row.employeeId === record.employeeId &&
					row.policyCode === record.policyCode &&
					isPolicyAcknowledgementOutstanding(row.requirementStatus),
			);
			if (outstandingExists) {
				return conflict("An outstanding policy acknowledgement already exists");
			}

			const idResult = parseHumanResourcesPolicyAcknowledgementId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const acknowledgement: PolicyAcknowledgement = {
				id: idResult.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				policyCode: record.policyCode,
				policyVersion: record.policyVersion,
				requirementStatus: "outstanding",
				issuedAt: now,
				dueOn: record.dueOn,
				acknowledgedAt: null,
				acknowledgedBy: null,
				supersedesAcknowledgementId: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.policyAcknowledgements.set(acknowledgement.id, acknowledgement);
			state.policyAcknowledgementIdempotencyByKey.set(idempotencyKey, {
				acknowledgement: { ...acknowledgement },
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const rollback: Array<() => void> = [
				() => {
					state.policyAcknowledgements.delete(acknowledgement.id);
					state.policyAcknowledgementIdempotencyByKey.delete(idempotencyKey);
				},
			];

			const audit = await recordComplianceAudit(state, ports, meta, {
				organizationId: acknowledgement.organizationId,
				actorUserId: record.createdBy,
				entity: "hr_policy_acknowledgement",
				entityId: acknowledgement.id,
				action: "CREATE",
				newValue: { id: acknowledgement.id },
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			const outbox = await appendComplianceOutbox(state, ports, meta, {
				organizationId: acknowledgement.organizationId,
				actorUserId: record.createdBy,
				type: HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_OUTSTANDING_EVENT,
				entityType: "hr_policy_acknowledgement",
				entityId: acknowledgement.id,
			});
			if (!outbox.ok) {
				runRollbacks(rollback);
				return outbox;
			}

			return ok({ ...acknowledgement });
		},

		async acknowledgePolicy(
			input: {
				organizationId: string;
				acknowledgementId: HumanResourcesPolicyAcknowledgementId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PolicyAcknowledgement>> {
			const now = new Date();
			return await transitionPolicyAcknowledgementStatus(state, {
				organizationId: input.organizationId,
				acknowledgementId: input.acknowledgementId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				nextStatus: "acknowledged",
				patch: {
					acknowledgedAt: now,
					acknowledgedBy: input.actorUserId,
				},
				events: [HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGED_EVENT],
				ports,
				meta,
			});
		},

		async revokePolicyAcknowledgement(
			input: {
				organizationId: string;
				acknowledgementId: HumanResourcesPolicyAcknowledgementId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PolicyAcknowledgement>> {
			return await transitionPolicyAcknowledgementStatus(state, {
				organizationId: input.organizationId,
				acknowledgementId: input.acknowledgementId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				nextStatus: "revoked",
				ports,
				meta,
			});
		},

		async supersedePolicyAcknowledgementRequirement(
			input: {
				organizationId: string;
				acknowledgementId: HumanResourcesPolicyAcknowledgementId;
				newPolicyVersion: string;
				newDueOn: string;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PolicyAcknowledgement>> {
			const existing = state.policyAcknowledgements.get(
				input.acknowledgementId,
			);
			if (!existing) {
				return notFound("Policy acknowledgement not found");
			}
			if (existing.organizationId !== input.organizationId) {
				return notFound(
					"Policy acknowledgement not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const versionCheck = assertExpectedVersion(
				existing.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			if (isPolicyAcknowledgementOutstanding(existing.requirementStatus)) {
				const superseded = await transitionPolicyAcknowledgementStatus(state, {
					organizationId: input.organizationId,
					acknowledgementId: input.acknowledgementId,
					expectedVersion: input.expectedVersion,
					actorUserId: input.actorUserId,
					nextStatus: "superseded",
					ports,
					meta,
				});
				if (!superseded.ok) {
					return superseded;
				}
			}

			const idResult = parseHumanResourcesPolicyAcknowledgementId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const replacement: PolicyAcknowledgement = {
				id: idResult.data,
				organizationId: existing.organizationId,
				employeeId: existing.employeeId,
				policyCode: existing.policyCode,
				policyVersion: input.newPolicyVersion,
				requirementStatus: "outstanding",
				issuedAt: now,
				dueOn: input.newDueOn,
				acknowledgedAt: null,
				acknowledgedBy: null,
				supersedesAcknowledgementId: existing.id,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};

			state.policyAcknowledgements.set(replacement.id, replacement);

			const rollback: Array<() => void> = [
				() => state.policyAcknowledgements.delete(replacement.id),
			];

			const audit = await recordComplianceAudit(state, ports, meta, {
				organizationId: replacement.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_policy_acknowledgement",
				entityId: replacement.id,
				action: "CREATE",
				newValue: { id: replacement.id },
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			const outbox = await appendComplianceOutbox(state, ports, meta, {
				organizationId: replacement.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_OUTSTANDING_EVENT,
				entityType: "hr_policy_acknowledgement",
				entityId: replacement.id,
			});
			if (!outbox.ok) {
				runRollbacks(rollback);
				return outbox;
			}

			return ok({ ...replacement });
		},

		async getPolicyAcknowledgementStatus(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			policyCode: string;
			policyVersion?: string | undefined;
		}): Promise<Result<PolicyAcknowledgement | null>> {
			let matches = Array.from(state.policyAcknowledgements.values()).filter(
				(row) =>
					row.organizationId === input.organizationId &&
					row.employeeId === input.employeeId &&
					row.policyCode === input.policyCode,
			);

			if (input.policyVersion !== undefined) {
				matches = matches.filter(
					(row) => row.policyVersion === input.policyVersion,
				);
			}

			if (matches.length === 0) {
				return await ok(null);
			}

			matches.sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
			const [latest] = matches;
			if (!latest) {
				return await ok(null);
			}
			return await ok({ ...latest });
		},

		async listOutstandingPolicyAcknowledgements(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			employeeId?: HumanResourcesEmployeeId | undefined;
		}): Promise<Result<PolicyAcknowledgementListPage>> {
			let filtered = Array.from(state.policyAcknowledgements.values()).filter(
				(row) =>
					row.organizationId === input.organizationId &&
					isPolicyAcknowledgementOutstanding(row.requirementStatus),
			);

			if (input.employeeId !== undefined) {
				filtered = filtered.filter(
					(row) => row.employeeId === input.employeeId,
				);
			}

			filtered.sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());

			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const acknowledgements = filtered
				.slice(start, start + input.pageSize)
				.map((row) => ({ ...row }));

			return await ok({
				acknowledgements,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async listOverduePolicyAcknowledgements(input: {
			organizationId: string;
			asOf: string;
			page: number;
			pageSize: number;
			employeeId?: HumanResourcesEmployeeId | undefined;
		}): Promise<Result<PolicyAcknowledgementListPage>> {
			let filtered = Array.from(state.policyAcknowledgements.values()).filter(
				(row) =>
					row.organizationId === input.organizationId &&
					isPolicyAcknowledgementOutstanding(row.requirementStatus) &&
					row.dueOn < input.asOf,
			);
			if (input.employeeId !== undefined) {
				filtered = filtered.filter(
					(row) => row.employeeId === input.employeeId,
				);
			}
			filtered.sort((a, b) => {
				const dueCompare = a.dueOn.localeCompare(b.dueOn);
				return dueCompare === 0
					? b.issuedAt.getTime() - a.issuedAt.getTime()
					: dueCompare;
			});
			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			return await ok({
				acknowledgements: filtered
					.slice(start, start + input.pageSize)
					.map((row) => ({ ...row })),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// --- Compliance Summary ---

		async getEmployeeComplianceSummary(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			asOf?: string | undefined;
		}): Promise<Result<EmployeeComplianceSummary>> {
			const employeeResult = await this.getEmployeeById({
				organizationId: input.organizationId,
				employeeId: input.employeeId,
			});
			if (!employeeResult.ok) {
				return employeeResult;
			}
			const employee = employeeResult.data;
			if (
				employee === null ||
				employee.organizationId !== input.organizationId
			) {
				return notFound(
					"Employee not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const asOf = input.asOf ?? new Date().toISOString().slice(0, 10);
			const missingRequiredDocumentCount = Array.from(
				state.documentRequirements.values(),
			).filter(
				(requirement) =>
					requirement.organizationId === input.organizationId &&
					requirement.status === "published" &&
					isDocumentRequirementApplicable({
						applicability: requirement.applicability,
						employeeId: input.employeeId,
					}) &&
					!employeeHasVerifiedDocumentForRequirement(state, {
						organizationId: input.organizationId,
						employeeId: input.employeeId,
						requirementId: requirement.id,
					}),
			).length;

			const expiringDocumentCount = Array.from(
				state.employeeDocuments.values(),
			).filter(
				(document) =>
					document.organizationId === input.organizationId &&
					document.employeeId === input.employeeId &&
					document.verificationStatus !== "expired" &&
					isWithinInclusiveDateWindow({
						date: document.expiresOn,
						asOf,
						withinDays: 30,
					}),
			).length;

			const employeeEligibilities = Array.from(
				state.workEligibilities.values(),
			).filter(
				(row) =>
					row.organizationId === input.organizationId &&
					row.employeeId === input.employeeId,
			);
			const workEligibilityAtRisk =
				employeeEligibilities.length === 0 ||
				employeeEligibilities.some(
					(row) =>
						row.status === "pending" ||
						row.status === "suspended" ||
						row.status === "expired" ||
						(row.expiresOn !== null && row.expiresOn < asOf) ||
						isWithinInclusiveDateWindow({
							date: row.expiresOn,
							asOf,
							withinDays: 30,
						}),
				);

			const outstandingPolicyAcknowledgementCount = Array.from(
				state.policyAcknowledgements.values(),
			).filter(
				(row) =>
					row.organizationId === input.organizationId &&
					row.employeeId === input.employeeId &&
					isPolicyAcknowledgementOutstanding(row.requirementStatus),
			).length;

			return ok({
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				missingRequiredDocumentCount,
				expiringDocumentCount,
				workEligibilityAtRisk,
				outstandingPolicyAcknowledgementCount,
			});
		},
	};
}
