import { createHash } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_RETENTION_POLICIES,
	type HumanResourcesRetentionClassification,
} from "../privacy";
import {
	type HumanResourcesPrivacyProcessorBoundary,
	processorBoundarySupportsDisposition,
	verifyHumanResourcesPrivacyProcessorBoundary,
} from "./processor-boundary";

export type HumanResourcesDeletionDecisionInput = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	subjectEmployeeId: string;
	requestedAt: string;
	legalBasis: string;
	classifications: readonly {
		classification: HumanResourcesRetentionClassification;
		retentionEndsAt: string | null;
	}[];
	activeLegalHolds: readonly {
		legalHoldId: string;
		classifications: readonly HumanResourcesRetentionClassification[];
	}[];
};

export type HumanResourcesDeletionDisposition = {
	classification: HumanResourcesRetentionClassification;
	disposition: "delete" | "anonymize" | "retain";
	reason:
		| "retention_satisfied"
		| "retention_active"
		| "retention_evidence_missing"
		| "legal_hold"
		| "legal_record_required"
		| "processor_boundary_unsupported";
};

export type HumanResourcesDeletionDecision = {
	decisionId: string;
	organizationId: string;
	correlationId: string;
	requestedAt: string;
	legalBasis: string;
	status: "approved" | "partially_approved" | "denied";
	dispositions: readonly HumanResourcesDeletionDisposition[];
	processorBoundaryVersion: string;
	subjectReferenceHash: string;
	evidenceHash: string;
	evidenceReference: string;
};

export type HumanResourcesDeletionDecisionEvidence = Omit<
	HumanResourcesDeletionDecision,
	"evidenceReference"
> & { actorUserId: string };

export type HumanResourcesPrivacyDeletionPort = {
	getProcessorBoundary(input: {
		organizationId: string;
		correlationId: string;
	}): Promise<Result<HumanResourcesPrivacyProcessorBoundary>>;
	recordDeletionDecision(
		input: HumanResourcesDeletionDecisionEvidence,
	): Promise<Result<{ evidenceReference: string }>>;
	executeDeletionDecision(input: {
		organizationId: string;
		decisionId: string;
		evidenceReference: string;
		correlationId: string;
		dispositions: readonly HumanResourcesDeletionDisposition[];
	}): Promise<
		Result<{ affectedRecordCount: number; executionReference: string }>
	>;
};

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
	)
		return fail("VALIDATION_ERROR", "Invalid privacy deletion decision input");
	const classifications = new Set<HumanResourcesRetentionClassification>();
	for (const item of input.classifications) {
		if (classifications.has(item.classification))
			return fail(
				"VALIDATION_ERROR",
				"Deletion classifications must be unique",
			);
		if (
			item.retentionEndsAt !== null &&
			Number.isNaN(Date.parse(item.retentionEndsAt))
		)
			return fail("VALIDATION_ERROR", "Retention end date is invalid");
		classifications.add(item.classification);
	}
	return ok(undefined);
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
	if (held)
		return {
			classification: input.classification,
			disposition: "retain",
			reason: "legal_hold",
		};
	if (input.retentionEndsAt === null)
		return {
			classification: input.classification,
			disposition: "retain",
			reason: "retention_evidence_missing",
		};
	if (Date.parse(input.retentionEndsAt) > Date.parse(input.request.requestedAt))
		return {
			classification: input.classification,
			disposition: "retain",
			reason: "retention_active",
		};
	const mode =
		HUMAN_RESOURCES_RETENTION_POLICIES[input.classification].anonymizationMode;
	if (mode === "retain_legal_record")
		return {
			classification: input.classification,
			disposition: "retain",
			reason: "legal_record_required",
		};
	const disposition = mode === "delete_identifiers" ? "delete" : "anonymize";
	if (
		!processorBoundarySupportsDisposition({
			boundary: input.boundary,
			classification: input.classification,
			disposition,
		})
	)
		return {
			classification: input.classification,
			disposition: "retain",
			reason: "processor_boundary_unsupported",
		};
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
	if (!validated.ok) return validated;
	const boundaryResult = await port.getProcessorBoundary({
		organizationId: input.organizationId,
		correlationId: input.correlationId,
	});
	if (!boundaryResult.ok) return boundaryResult;
	if (boundaryResult.data.organizationId !== input.organizationId)
		return fail("FORBIDDEN", "Privacy processor boundary crossed the tenant");
	const verifiedBoundary = verifyHumanResourcesPrivacyProcessorBoundary(
		boundaryResult.data,
	);
	if (!verifiedBoundary.ok) return verifiedBoundary;
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
	const status: HumanResourcesDeletionDecision["status"] =
		actionable === 0
			? "denied"
			: actionable === dispositions.length
				? "approved"
				: "partially_approved";
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
	if (!recorded.ok) return recorded;
	return ok({
		...evidenceSeed,
		decisionId,
		evidenceHash,
		evidenceReference: recorded.data.evidenceReference,
	});
}

export async function executeHumanResourcesDeletionDecision(
	decision: HumanResourcesDeletionDecision,
	port: HumanResourcesPrivacyDeletionPort,
): Promise<
	Result<{ affectedRecordCount: number; executionReference: string }>
> {
	if (decision.status === "denied")
		return fail("CONFLICT", "Denied deletion decision cannot be executed");
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
