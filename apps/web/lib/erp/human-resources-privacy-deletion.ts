import { type AuditRecorder, createAuditRecorder } from "@afenda/audit";
import { errorResult, type Result } from "@afenda/errors";
import {
	decideHumanResourcesSubjectDeletion,
	executeHumanResourcesDeletionDecision,
	HUMAN_RESOURCES_RETENTION_CLASSIFICATIONS,
	type HumanResourcesDeletionDecision,
	type HumanResourcesDeletionDecisionInput,
	type HumanResourcesEmployeeId,
	type HumanResourcesPrivacyDeletionPort,
	type HumanResourcesPrivacyPort,
	type HumanResourcesPrivacyProcessorBoundary,
	type HumanResourcesRetentionClassification,
} from "@afenda/human-resources";

import { createHumanResourcesPrivacyPort } from "@/lib/erp/human-resources-privacy-port";

const HUMAN_RESOURCES_PRIVACY_MODULE_ID = "human-resources" as const;
const PROCESSOR_BOUNDARY_VERSION = "human-resources-privacy-boundary.v1";
const PROCESSOR_BOUNDARY_VERIFIED_AT = "2026-07-28T00:00:00.000Z";
const retentionClassifications = new Set<string>(
	HUMAN_RESOURCES_RETENTION_CLASSIFICATIONS,
);

export interface HumanResourcesPrivacyDeletionRequest {
	actorUserId: string;
	classifications: HumanResourcesDeletionDecisionInput["classifications"];
	correlationId: string;
	legalBasis: string;
	organizationId: string;
	requestedAt: string;
	subjectEmployeeId: HumanResourcesEmployeeId;
}

export interface HumanResourcesPrivacyDeletionCompositionDeps {
	audit?: Pick<AuditRecorder, "record">;
	privacy?: HumanResourcesPrivacyPort;
	resolveProcessorBoundary?: (input: {
		organizationId: string;
		correlationId: string;
	}) => Promise<Result<HumanResourcesPrivacyProcessorBoundary>>;
}

function isRetentionClassification(
	value: string,
): value is HumanResourcesRetentionClassification {
	return retentionClassifications.has(value);
}

export function resolveHumanResourcesPrivacyProcessorBoundary(input: {
	organizationId: string;
}): Result<HumanResourcesPrivacyProcessorBoundary> {
	if (input.organizationId.trim().length === 0) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Organization is required",
		});
	}
	return errorResult.ok({
		organizationId: input.organizationId,
		boundaryVersion: PROCESSOR_BOUNDARY_VERSION,
		controllerReference: `control://organizations/${input.organizationId}/privacy-controller`,
		primaryProcessor: {
			processorId: "platform-privacy",
			role: "processor",
			parentProcessorId: null,
			contractReference: "control://privacy/processors/platform-privacy/v1",
			verifiedAt: PROCESSOR_BOUNDARY_VERIFIED_AT,
			status: "active",
			purpose: "tenant-scoped privacy decision and execution",
			classifications: HUMAN_RESOURCES_RETENTION_CLASSIFICATIONS,
			deletionCapability: "delete",
		},
		subprocessors: [
			{
				processorId: "human-resources-data-plane",
				role: "subprocessor",
				parentProcessorId: "platform-privacy",
				contractReference:
					"control://privacy/subprocessors/human-resources-data-plane/v1",
				verifiedAt: PROCESSOR_BOUNDARY_VERIFIED_AT,
				status: "active",
				purpose: "tenant-scoped Human Resources record processing",
				classifications: HUMAN_RESOURCES_RETENTION_CLASSIFICATIONS,
				deletionCapability: "delete",
			},
		],
	});
}

function activeLegalHoldsFromCase(
	holds: readonly {
		legalHoldId: string;
		classifications: readonly string[];
	}[],
): Result<HumanResourcesDeletionDecisionInput["activeLegalHolds"]> {
	const mapped: HumanResourcesDeletionDecisionInput["activeLegalHolds"][number][] =
		[];
	for (const hold of holds) {
		if (!hold.classifications.every(isRetentionClassification)) {
			return errorResult.fail("CONFLICT", {
				publicMessage:
					"Privacy legal hold contains an unsupported classification",
			});
		}
		mapped.push({
			legalHoldId: hold.legalHoldId,
			classifications: hold.classifications,
		});
	}
	return errorResult.ok(mapped);
}

function createDeletionPort(
	request: HumanResourcesPrivacyDeletionRequest,
	privacy: HumanResourcesPrivacyPort,
	audit: Pick<AuditRecorder, "record">,
	resolveProcessorBoundary: NonNullable<
		HumanResourcesPrivacyDeletionCompositionDeps["resolveProcessorBoundary"]
	>,
): HumanResourcesPrivacyDeletionPort {
	return {
		getProcessorBoundary: resolveProcessorBoundary,
		async recordDeletionDecision(evidence) {
			const recorded = await audit.record({
				organizationId: evidence.organizationId,
				actorUserId: evidence.actorUserId,
				correlationId: evidence.correlationId,
				module: "privacy",
				entity: "human_resources_deletion_decision",
				entityId: evidence.decisionId,
				action: "CREATE",
				metadata: {
					sourceModuleId: HUMAN_RESOURCES_PRIVACY_MODULE_ID,
					status: evidence.status,
					dispositions: evidence.dispositions,
					processorBoundaryVersion: evidence.processorBoundaryVersion,
					subjectReferenceHash: evidence.subjectReferenceHash,
					evidenceHash: evidence.evidenceHash,
				},
			});
			if (!recorded.ok) {
				return recorded;
			}
			if (recorded.data.organizationId !== evidence.organizationId) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok({
				evidenceReference: `audit://privacy/${recorded.data.id}`,
			});
		},
		async executeDeletionDecision(input) {
			if (input.organizationId !== request.organizationId) {
				return errorResult.fail("FORBIDDEN");
			}
			const classifications = input.dispositions.map(
				(disposition) => disposition.classification,
			);
			const executed = await privacy.anonymizeSubject({
				organizationId: request.organizationId,
				actorUserId: request.actorUserId,
				correlationId: request.correlationId,
				subjectEmployeeId: request.subjectEmployeeId,
				requestedAt: request.requestedAt,
				legalBasis: request.legalBasis,
				classifications,
			});
			if (!executed.ok) {
				return executed;
			}
			return errorResult.ok({
				affectedRecordCount: executed.data.anonymizedRecordCount,
				executionReference: `privacy://organizations/${request.organizationId}/deletion-executions/${encodeURIComponent(input.decisionId)}`,
			});
		},
	};
}

async function evaluateWithComposition(
	request: HumanResourcesPrivacyDeletionRequest,
	deps: HumanResourcesPrivacyDeletionCompositionDeps,
): Promise<
	Result<{
		decision: HumanResourcesDeletionDecision;
		port: HumanResourcesPrivacyDeletionPort;
	}>
> {
	const privacy = deps.privacy ?? createHumanResourcesPrivacyPort();
	const audit = deps.audit ?? createAuditRecorder();
	const boundaryResolver =
		deps.resolveProcessorBoundary ??
		(async (input) =>
			resolveHumanResourcesPrivacyProcessorBoundary({
				organizationId: input.organizationId,
			}));
	const privacyCase = await privacy.getSubjectPrivacyCase({
		organizationId: request.organizationId,
		actorUserId: request.actorUserId,
		correlationId: request.correlationId,
		subjectEmployeeId: request.subjectEmployeeId,
		requestedAt: request.requestedAt,
		legalBasis: request.legalBasis,
	});
	if (!privacyCase.ok) {
		return privacyCase;
	}
	if (privacyCase.data.organizationId !== request.organizationId) {
		return errorResult.fail("FORBIDDEN");
	}
	const activeLegalHolds = activeLegalHoldsFromCase(
		privacyCase.data.activeLegalHolds,
	);
	if (!activeLegalHolds.ok) {
		return activeLegalHolds;
	}
	const port = createDeletionPort(request, privacy, audit, boundaryResolver);
	const decision = await decideHumanResourcesSubjectDeletion(
		{
			...request,
			activeLegalHolds: activeLegalHolds.data,
		},
		port,
	);
	if (!decision.ok) {
		return decision;
	}
	return errorResult.ok({ decision: decision.data, port });
}

export async function evaluateHumanResourcesPrivacyDeletion(
	request: HumanResourcesPrivacyDeletionRequest,
	deps: HumanResourcesPrivacyDeletionCompositionDeps = {},
): Promise<Result<HumanResourcesDeletionDecision>> {
	const evaluated = await evaluateWithComposition(request, deps);
	return evaluated.ok ? errorResult.ok(evaluated.data.decision) : evaluated;
}

export async function executeApprovedHumanResourcesPrivacyDeletion(
	request: HumanResourcesPrivacyDeletionRequest,
	deps: HumanResourcesPrivacyDeletionCompositionDeps = {},
): Promise<
	Result<{
		decision: HumanResourcesDeletionDecision;
		affectedRecordCount: number;
		executionReference: string;
	}>
> {
	const evaluated = await evaluateWithComposition(request, deps);
	if (!evaluated.ok) {
		return evaluated;
	}
	const executed = await executeHumanResourcesDeletionDecision(
		evaluated.data.decision,
		evaluated.data.port,
	);
	if (!executed.ok) {
		return executed;
	}
	return errorResult.ok({
		decision: evaluated.data.decision,
		...executed.data,
	});
}
