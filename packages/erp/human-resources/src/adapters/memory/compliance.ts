import { randomUUID } from "node:crypto";

import { ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REGISTERED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_VERIFIED_EVENT,
	HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGED_EVENT,
	HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_OUTSTANDING_EVENT,
	HUMAN_RESOURCES_WORK_ELIGIBILITY_SUSPENDED_EVENT,
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
	isNearingExpiry,
} from "../../shared/compliance-guards";
import { toEmployeeDocumentListItem } from "../../shared/compliance-privacy";
import {
	isDocumentRequirementEditable,
	isEmployeeDocumentVerified,
	isPolicyAcknowledgementOutstanding,
} from "../../shared/compliance-status";
import { assertExpectedVersion } from "../../shared/concurrency";
import { conflict, invalidState, notFound } from "../../shared/domain-guards";
import { buildHumanResourcesEntityEventPayload } from "../../shared/event-payload";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
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

export type ComplianceMemoryState = {
	documentRequirements: Map<
		HumanResourcesDocumentRequirementId,
		DocumentRequirement
	>;
	employeeDocuments: Map<HumanResourcesEmployeeDocumentId, EmployeeDocument>;
	employeeDocumentIdempotencyByKey: Map<
		string,
		IdempotentEmployeeDocumentRecord
	>;
	workEligibilities: Map<HumanResourcesWorkEligibilityId, WorkEligibility>;
	workEligibilityIdempotencyByKey: Map<string, IdempotentWorkEligibilityRecord>;
	policyAcknowledgements: Map<
		HumanResourcesPolicyAcknowledgementId,
		PolicyAcknowledgement
	>;
	policyAcknowledgementIdempotencyByKey: Map<
		string,
		IdempotentPolicyAcknowledgementRecord
	>;
};

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
		oldValue?: Record<string, unknown> | null;
		newValue?: Record<string, unknown> | null;
		statusField?: string;
		oldStatus?: string | null;
		newStatus?: string;
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
		return ports.audit.record(
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
		return ports.audit.record(
			buildCreateAuditFact({
				context,
				newValue: input.newValue ?? { id: input.entityId },
			}),
		);
	}
	return ports.audit.record(
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
		type:
			| typeof HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REGISTERED_EVENT
			| typeof HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_VERIFIED_EVENT
			| typeof HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT
			| typeof HUMAN_RESOURCES_WORK_ELIGIBILITY_SUSPENDED_EVENT
			| typeof HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_OUTSTANDING_EVENT
			| typeof HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGED_EVENT;
		entityType: string;
		entityId: string;
	},
): Promise<Result<{ id: string }>> {
	return ports.outbox.append({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		type: input.type,
		payload: buildHumanResourcesEntityEventPayload({
			organizationId: input.organizationId,
			entityType: input.entityType,
			entityId: input.entityId,
			actorUserId: input.actorUserId,
			meta,
		}),
	});
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
		events?: Array<
			| typeof HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REGISTERED_EVENT
			| typeof HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_VERIFIED_EVENT
			| typeof HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT
		>;
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
		for (const undo of rollback) undo();
		return audit;
	}

	for (const eventType of input.events ?? []) {
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
			for (const undo of rollback) undo();
			return outbox;
		}
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
		events?: Array<typeof HUMAN_RESOURCES_WORK_ELIGIBILITY_SUSPENDED_EVENT>;
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
		for (const undo of rollback) undo();
		return audit;
	}

	for (const eventType of input.events ?? []) {
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
			for (const undo of rollback) undo();
			return outbox;
		}
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
		for (const undo of rollback) undo();
		return audit;
	}

	for (const eventType of input.events ?? []) {
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
			for (const undo of rollback) undo();
			return outbox;
		}
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
				return ok(null);
			}
			return ok({ ...requirement });
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
			return ok(requirement === null ? null : { ...requirement });
		},

		async createDocumentRequirement(
			record: {
				organizationId: string;
				code: string;
				name: string;
				documentType: string;
				issuingJurisdiction: string | null;
				appliesToNote: string | null;
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
				name?: string;
				documentType?: string;
				issuingJurisdiction?: string | null;
				appliesToNote?: string | null;
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
					input.issuingJurisdiction !== undefined
						? input.issuingJurisdiction
						: requirement.issuingJurisdiction,
				appliesToNote:
					input.appliesToNote !== undefined
						? input.appliesToNote
						: requirement.appliesToNote,
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
			return transitionDocumentRequirementStatus(state, {
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
			return transitionDocumentRequirementStatus(state, {
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

			return ok({
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
				return ok(null);
			}
			return ok({ ...document });
		},

		async findEmployeeDocumentByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentEmployeeDocumentRecord | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.employeeDocumentIdempotencyByKey.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({ ...record, document: { ...record.document } });
		},

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
				for (const undo of rollback) undo();
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

			for (const eventType of events) {
				const outbox = await appendComplianceOutbox(state, ports, meta, {
					organizationId: document.organizationId,
					actorUserId: record.createdBy,
					type: eventType,
					entityType: "hr_employee_document",
					entityId: document.id,
				});
				if (!outbox.ok) {
					for (const undo of rollback) undo();
					return outbox;
				}
			}

			return ok({ ...document });
		},

		async updateEmployeeDocumentMetadata(
			input: {
				organizationId: string;
				documentId: HumanResourcesEmployeeDocumentId;
				issuingJurisdiction?: string | null;
				expiresOn?: string | null;
				metadata?: Record<string, unknown> | null;
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
				input.expiresOn !== undefined ? input.expiresOn : document.expiresOn;
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
					input.issuingJurisdiction !== undefined
						? input.issuingJurisdiction
						: document.issuingJurisdiction,
				expiresOn: nextExpiresOn,
				metadata:
					input.metadata !== undefined ? input.metadata : document.metadata,
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
				for (const undo of rollback) undo();
				return audit;
			}

			const asOf = now.toISOString().slice(0, 10);
			if (
				isNearingExpiry({
					expiresOn: updated.expiresOn,
					asOf,
				})
			) {
				const outbox = await appendComplianceOutbox(state, ports, meta, {
					organizationId: updated.organizationId,
					actorUserId: input.actorUserId,
					type: HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT,
					entityType: "hr_employee_document",
					entityId: updated.id,
				});
				if (!outbox.ok) {
					for (const undo of rollback) undo();
					return outbox;
				}
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
			return transitionEmployeeDocumentStatus(state, {
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
				return reasonCheck;
			}

			return transitionEmployeeDocumentStatus(state, {
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
			return transitionEmployeeDocumentStatus(state, {
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
			return transitionEmployeeDocumentStatus(state, {
				organizationId: input.organizationId,
				documentId: input.documentId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				nextStatus: "expired",
				ports,
				meta,
			});
		},

		async listEmployeeDocuments(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			employeeId?: HumanResourcesEmployeeId;
			verificationStatus?: EmployeeDocument["verificationStatus"];
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

			return ok({
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
			employeeId?: HumanResourcesEmployeeId;
		}): Promise<Result<DocumentRequirementListPage>> {
			const published = Array.from(state.documentRequirements.values()).filter(
				(row) =>
					row.organizationId === input.organizationId &&
					row.status === "published",
			);

			let missing = published;
			if (input.employeeId !== undefined) {
				const employeeId = input.employeeId;
				missing = published.filter(
					(requirement) =>
						!employeeHasVerifiedDocumentForRequirement(state, {
							organizationId: input.organizationId,
							employeeId,
							requirementId: requirement.id,
						}),
				);
			} else {
				const employeeIds = Array.from(core.employees.values())
					.filter(
						(employee) => employee.organizationId === input.organizationId,
					)
					.map((employee) => employee.id);
				missing = published.filter((requirement) =>
					employeeIds.some(
						(employeeId) =>
							!employeeHasVerifiedDocumentForRequirement(state, {
								organizationId: input.organizationId,
								employeeId,
								requirementId: requirement.id,
							}),
					),
				);
			}

			missing.sort((a, b) => a.code.localeCompare(b.code));

			const totalCount = missing.length;
			const start = (input.page - 1) * input.pageSize;
			const requirements = missing
				.slice(start, start + input.pageSize)
				.map((row) => ({ ...row }));

			return ok({
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
			employeeId?: HumanResourcesEmployeeId;
		}): Promise<Result<EmployeeDocumentListPage>> {
			const windowEndDate = new Date(`${input.asOf}T00:00:00.000Z`);
			windowEndDate.setUTCDate(windowEndDate.getUTCDate() + input.withinDays);
			const windowEnd = windowEndDate.toISOString().slice(0, 10);

			let filtered = Array.from(state.employeeDocuments.values()).filter(
				(row) =>
					row.organizationId === input.organizationId &&
					row.verificationStatus !== "expired" &&
					row.expiresOn !== null &&
					row.expiresOn >= input.asOf &&
					row.expiresOn <= windowEnd,
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

			return ok({
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
				return ok(null);
			}
			return ok({ ...eligibility });
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
			return ok(eligibility === null ? null : { ...eligibility });
		},

		async findWorkEligibilityByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentWorkEligibilityRecord | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.workEligibilityIdempotencyByKey.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({ ...record, eligibility: { ...record.eligibility } });
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
				for (const undo of rollback) undo();
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
			return transitionWorkEligibilityStatus(state, {
				organizationId: input.organizationId,
				eligibilityId: input.eligibilityId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				nextStatus: "active",
				patch: {
					verifiedBy: input.actorUserId,
					verifiedAt: new Date(`${input.evidenceDate}T00:00:00.000Z`),
				},
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
			return transitionWorkEligibilityStatus(state, {
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
			return transitionWorkEligibilityStatus(state, {
				organizationId: input.organizationId,
				eligibilityId: input.eligibilityId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				nextStatus: "closed",
				ports,
				meta,
			});
		},

		async listEmployeesWithWorkEligibilityRisk(input: {
			organizationId: string;
			asOf: string;
			page: number;
			pageSize: number;
		}): Promise<Result<WorkEligibilityRiskListPage>> {
			const filtered = Array.from(state.workEligibilities.values())
				.filter(
					(row) =>
						row.organizationId === input.organizationId &&
						(row.status === "pending" ||
							row.status === "suspended" ||
							row.status === "expired" ||
							(row.expiresOn !== null && row.expiresOn < input.asOf)),
				)
				.sort((a, b) => {
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
			const eligibilities = filtered
				.slice(start, start + input.pageSize)
				.map((row) => ({ ...row }));

			return ok({
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
				return ok(null);
			}
			return ok({ ...acknowledgement });
		},

		async findPolicyAcknowledgementByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentPolicyAcknowledgementRecord | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const record = state.policyAcknowledgementIdempotencyByKey.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({
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
				for (const undo of rollback) undo();
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
				for (const undo of rollback) undo();
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
			return transitionPolicyAcknowledgementStatus(state, {
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
			return transitionPolicyAcknowledgementStatus(state, {
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
				for (const undo of rollback) undo();
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
				for (const undo of rollback) undo();
				return outbox;
			}

			return ok({ ...replacement });
		},

		async getPolicyAcknowledgementStatus(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			policyCode: string;
			policyVersion?: string;
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
				return ok(null);
			}

			matches.sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
			const latest = matches[0];
			if (!latest) {
				return ok(null);
			}
			return ok({ ...latest });
		},

		async listOutstandingPolicyAcknowledgements(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			employeeId?: HumanResourcesEmployeeId;
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

			return ok({
				acknowledgements,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// --- Compliance Summary ---

		async getEmployeeComplianceSummary(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			asOf?: string;
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
			const windowEndDate = new Date(`${asOf}T00:00:00.000Z`);
			windowEndDate.setUTCDate(windowEndDate.getUTCDate() + 30);
			const windowEnd = windowEndDate.toISOString().slice(0, 10);

			const missingRequiredDocumentCount = Array.from(
				state.documentRequirements.values(),
			).filter(
				(requirement) =>
					requirement.organizationId === input.organizationId &&
					requirement.status === "published" &&
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
					document.expiresOn !== null &&
					document.expiresOn >= asOf &&
					document.expiresOn <= windowEnd,
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
						(row.expiresOn !== null && row.expiresOn < asOf),
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
