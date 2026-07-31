import { createHash } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import {
	HUMAN_RESOURCES_RETENTION_POLICIES,
	type HumanResourcesRetentionClassification,
} from "../privacy";
import {
	type HumanResourcesPrivacyProcessorBoundary,
	processorBoundarySupportsDisposition,
	verifyHumanResourcesPrivacyProcessorBoundary,
} from "./processor-boundary";

export interface HumanResourcesDeletionDecisionInput {
	activeLegalHolds: readonly {
		legalHoldId: string;
		classifications: readonly HumanResourcesRetentionClassification[];
	}[];
	actorUserId: string;
	classifications: readonly {
		classification: HumanResourcesRetentionClassification;
		retentionEndsAt: string | null;
	}[];
	correlationId: string;
	legalBasis: string;
	organizationId: string;
	requestedAt: string;
	subjectEmployeeId: string;
}

export interface HumanResourcesDeletionDisposition {
	classification: HumanResourcesRetentionClassification;
	disposition: "delete" | "anonymize" | "retain";
	reason:
		| "retention_satisfied"
		| "retention_active"
		| "retention_evidence_missing"
		| "legal_hold"
		| "legal_record_required"
		| "processor_boundary_unsupported";
}

export interface HumanResourcesDeletionDecision {
	correlationId: string;
	decisionId: string;
	dispositions: readonly HumanResourcesDeletionDisposition[];
	evidenceHash: string;
	evidenceReference: string;
	legalBasis: string;
	organizationId: string;
	processorBoundaryVersion: string;
	requestedAt: string;
	status: "approved" | "partially_approved" | "denied";
	subjectReferenceHash: string;
}

export type HumanResourcesDeletionDecisionEvidence = Omit<
	HumanResourcesDeletionDecision,
	"evidenceReference"
> & { actorUserId: string };

export interface HumanResourcesPrivacyDeletionPort {
	executeDeletionDecision: (input: {
		organizationId: string;
		decisionId: string;
		evidenceReference: string;
		correlationId: string;
		dispositions: readonly HumanResourcesDeletionDisposition[];
	}) => Promise<
		Result<{ affectedRecordCount: number; executionReference: string }>
	>;
	getProcessorBoundary: (input: {
		organizationId: string;
		correlationId: string;
	}) => Promise<Result<HumanResourcesPrivacyProcessorBoundary>>;
	recordDeletionDecision: (
		input: HumanResourcesDeletionDecisionEvidence,
	) => Promise<Result<{ evidenceReference: string }>>;
}

function hash(value: unknown): string {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function validateInput(
	input: HumanResourcesDeletionDecisionInput,
): Result<void> {
	if (
		input.organizationId.trim().length === 0 ||
		input.actorUserId.trim().length === 0 ||
		input.correlationId.trim().length === 0 ||
		input.subjectEmployeeId.trim().length === 0 ||
		input.legalBasis.trim().length === 0 ||
		Number.isNaN(Date.parse(input.requestedAt)) ||
		input.classifications.length === 0
	) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
		});
	}
	const classifications = new Set<HumanResourcesRetentionClassification>();
	for (const item of input.classifications) {
		if (classifications.has(item.classification)) {
			return errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted data is invalid",
			});
		}
		if (
			item.retentionEndsAt !== null &&
			Number.isNaN(Date.parse(item.retentionEndsAt))
		) {
			return errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted data is invalid",
			});
		}
		classifications.add(item.classification);
	}
	return errorResult.ok(undefined);
}

function dispositionForClassification(input: {
	request: HumanResourcesDeletionDecisionInput;
	classification: HumanResourcesRetentionClassification;
	retentionEndsAt: string | null;
	boundary: HumanResourcesPrivacyProcessorBoundary;
}): HumanResourcesDeletionDisposition {
	const held = input.request.activeLegalHolds.some((hold) =>
		hold.classifications.includes(input.classification),
	);
	if (held) {
		return {
			classification: input.classification,
			disposition: "retain",
			reason: "legal_hold",
		};
	}
	if (input.retentionEndsAt === null) {
		return {
			classification: input.classification,
			disposition: "retain",
			reason: "retention_evidence_missing",
		};
	}
	if (
		Date.parse(input.retentionEndsAt) > Date.parse(input.request.requestedAt)
	) {
		return {
			classification: input.classification,
			disposition: "retain",
			reason: "retention_active",
		};
	}
	const mode =
		HUMAN_RESOURCES_RETENTION_POLICIES[input.classification].anonymizationMode;
	if (mode === "retain_legal_record") {
		return {
			classification: input.classification,
			disposition: "retain",
			reason: "legal_record_required",
		};
	}
	const disposition = mode === "delete_identifiers" ? "delete" : "anonymize";
	if (
		!processorBoundarySupportsDisposition({
			boundary: input.boundary,
			classification: input.classification,
			disposition,
		})
	) {
		return {
			classification: input.classification,
			disposition: "retain",
			reason: "processor_boundary_unsupported",
		};
	}
	return {
		classification: input.classification,
		disposition,
		reason: "retention_satisfied",
	};
}

export async function decideHumanResourcesSubjectDeletion(
	input: HumanResourcesDeletionDecisionInput,
	port: HumanResourcesPrivacyDeletionPort,
): Promise<Result<HumanResourcesDeletionDecision>> {
	const validated = validateInput(input);
	if (!validated.ok) {
		return validated;
	}
	const boundaryResult = await port.getProcessorBoundary({
		organizationId: input.organizationId,
		correlationId: input.correlationId,
	});
	if (!boundaryResult.ok) {
		return boundaryResult;
	}
	if (boundaryResult.data.organizationId !== input.organizationId) {
		return errorResult.fail("FORBIDDEN");
	}
	const verifiedBoundary = verifyHumanResourcesPrivacyProcessorBoundary(
		boundaryResult.data,
	);
	if (!verifiedBoundary.ok) {
		return verifiedBoundary;
	}
	const dispositions = input.classifications.map((item) =>
		dispositionForClassification({
			request: input,
			classification: item.classification,
			retentionEndsAt: item.retentionEndsAt,
			boundary: verifiedBoundary.data,
		}),
	);
	const actionable = dispositions.filter(
		(item) => item.disposition !== "retain",
	).length;
	let status: HumanResourcesDeletionDecision["status"] = "partially_approved";
	if (actionable === 0) {
		status = "denied";
	} else if (actionable === dispositions.length) {
		status = "approved";
	}
	const subjectReferenceHash = hash({
		organizationId: input.organizationId,
		subjectEmployeeId: input.subjectEmployeeId,
	});
	const evidenceSeed = {
		organizationId: input.organizationId,
		correlationId: input.correlationId,
		requestedAt: input.requestedAt,
		legalBasis: input.legalBasis,
		status,
		dispositions,
		processorBoundaryVersion: verifiedBoundary.data.boundaryVersion,
		subjectReferenceHash,
	};
	const evidenceHash = hash(evidenceSeed);
	const decisionId = `hr-privacy-deletion:${evidenceHash}`;
	const evidence: HumanResourcesDeletionDecisionEvidence = {
		decisionId,
		...evidenceSeed,
		evidenceHash,
		actorUserId: input.actorUserId,
	};
	const recorded = await port.recordDeletionDecision(evidence);
	if (!recorded.ok) {
		return recorded;
	}
	return errorResult.ok({
		...evidenceSeed,
		decisionId,
		evidenceHash,
		evidenceReference: recorded.data.evidenceReference,
	});
}

export function executeHumanResourcesDeletionDecision(
	decision: HumanResourcesDeletionDecision,
	port: HumanResourcesPrivacyDeletionPort,
): Promise<
	Result<{ affectedRecordCount: number; executionReference: string }>
> {
	if (decision.status === "denied") {
		return Promise.resolve(
			errorResult.fail("CONFLICT", {
				publicMessage: "The request conflicts with current state",
			}),
		);
	}
	return port.executeDeletionDecision({
		organizationId: decision.organizationId,
		decisionId: decision.decisionId,
		evidenceReference: decision.evidenceReference,
		correlationId: decision.correlationId,
		dispositions: decision.dispositions.filter(
			(item) => item.disposition !== "retain",
		),
	});
}
