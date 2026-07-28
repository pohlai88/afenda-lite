import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesRetentionClassification } from "../privacy";

export type HumanResourcesPrivacyProcessor = {
	processorId: string;
	role: "processor" | "subprocessor";
	parentProcessorId: string | null;
	contractReference: string;
	verifiedAt: string;
	status: "active" | "suspended" | "terminated";
	purpose: string;
	classifications: readonly HumanResourcesRetentionClassification[];
	deletionCapability: "delete" | "anonymize" | "retain_only";
};

export type HumanResourcesPrivacyProcessorBoundary = {
	organizationId: string;
	boundaryVersion: string;
	controllerReference: string;
	primaryProcessor: HumanResourcesPrivacyProcessor;
	subprocessors: readonly HumanResourcesPrivacyProcessor[];
};

export function verifyHumanResourcesPrivacyProcessorBoundary(
	boundary: HumanResourcesPrivacyProcessorBoundary,
): Result<HumanResourcesPrivacyProcessorBoundary> {
	const primary = boundary.primaryProcessor;
	if (
		boundary.organizationId.trim().length === 0 ||
		boundary.boundaryVersion.trim().length === 0 ||
		boundary.controllerReference.trim().length === 0 ||
		primary.role !== "processor" ||
		primary.parentProcessorId !== null ||
		primary.status !== "active" ||
		primary.contractReference.trim().length === 0 ||
		Number.isNaN(Date.parse(primary.verifiedAt))
	) {
		return fail("CONFLICT", "Privacy processor boundary is not verified");
	}
	const processorIds = new Set([primary.processorId]);
	for (const subprocessor of boundary.subprocessors) {
		if (
			subprocessor.role !== "subprocessor" ||
			subprocessor.parentProcessorId !== primary.processorId ||
			subprocessor.status !== "active" ||
			subprocessor.contractReference.trim().length === 0 ||
			subprocessor.purpose.trim().length === 0 ||
			Number.isNaN(Date.parse(subprocessor.verifiedAt)) ||
			processorIds.has(subprocessor.processorId)
		) {
			return fail("CONFLICT", "Privacy subprocessor boundary is not verified");
		}
		processorIds.add(subprocessor.processorId);
	}
	return ok(boundary);
}

export function processorBoundarySupportsDisposition(input: {
	boundary: HumanResourcesPrivacyProcessorBoundary;
	classification: HumanResourcesRetentionClassification;
	disposition: "delete" | "anonymize";
}): boolean {
	const processors = [
		input.boundary.primaryProcessor,
		...input.boundary.subprocessors,
	].filter((processor) =>
		processor.classifications.includes(input.classification),
	);
	return (
		processors.length > 0 &&
		processors.every((processor) =>
			input.disposition === "delete"
				? processor.deletionCapability === "delete"
				: processor.deletionCapability === "delete" ||
					processor.deletionCapability === "anonymize",
		)
	);
}
