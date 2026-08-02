import { errorResult, type Result } from "@afenda/errors";

import type { HumanResourcesRetentionClassification } from "./contract";

export interface HumanResourcesPrivacyProcessor {
	classifications: readonly HumanResourcesRetentionClassification[];
	contractReference: string;
	deletionCapability: "delete" | "anonymize" | "retain_only";
	parentProcessorId: string | null;
	processorId: string;
	purpose: string;
	role: "processor" | "subprocessor";
	status: "active" | "suspended" | "terminated";
	verifiedAt: string;
}

export interface HumanResourcesPrivacyProcessorBoundary {
	boundaryVersion: string;
	controllerReference: string;
	organizationId: string;
	primaryProcessor: HumanResourcesPrivacyProcessor;
	subprocessors: readonly HumanResourcesPrivacyProcessor[];
}

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
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
		});
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
			return errorResult.fail("CONFLICT", {
				publicMessage: "The request conflicts with current state",
			});
		}
		processorIds.add(subprocessor.processorId);
	}
	return errorResult.ok(boundary);
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
