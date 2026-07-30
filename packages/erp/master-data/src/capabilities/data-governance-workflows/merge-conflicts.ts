import { ok, type Result } from "@afenda/errors/result";

import {
	governanceMergeConflictInvalid,
	governanceMergeConflictUnresolved,
} from "./governance-errors";

export const MERGE_CONFLICT_AREAS = [
	"party_roles",
	"addresses",
	"contacts",
	"external_identifiers",
	"tax_registrations",
	"relationships",
	"names_aliases",
] as const;
export type MergeConflictArea = (typeof MERGE_CONFLICT_AREAS)[number];

export const MERGE_CONFLICT_DECISIONS = [
	"keep_target",
	"adopt_source",
	"retain_both",
	"archive_source_value",
	"manual_resolution_required",
] as const;
export type MergeConflictDecision = (typeof MERGE_CONFLICT_DECISIONS)[number];

export const MERGE_CONFLICT_SENSITIVITY_LEVELS = [
	"standard",
	"sensitive",
	"restricted",
] as const;
export type MergeConflictSensitivityLevel =
	(typeof MERGE_CONFLICT_SENSITIVITY_LEVELS)[number];

export const MERGE_CONFLICT_VALUE_KINDS = [
	"single",
	"unique",
	"collection",
] as const;
export type MergeConflictValueKind =
	(typeof MERGE_CONFLICT_VALUE_KINDS)[number];

export type MergeConflictValueReference = Readonly<{
	id: string;
	expectedVersion: number;
	displayValue: string | null;
}>;

export type MergeConflictResolution = Readonly<{
	id: string;
	area: MergeConflictArea;
	field: string;
	valueKind: MergeConflictValueKind;
	sourceValue: MergeConflictValueReference | null;
	targetValue: MergeConflictValueReference | null;
	decision: MergeConflictDecision;
	reason: string | null;
	sensitivityLevel: MergeConflictSensitivityLevel;
	resolvedBy: string | null;
	resolvedAt: Date | null;
}>;

export type MergeConflictResolutionSummary = Readonly<{
	totalCount: number;
	resolvedCount: number;
	unresolvedCount: number;
	sensitiveCount: number;
	restrictedCount: number;
	unresolved: readonly MergeConflictResolution[];
}>;

const DOMAIN_FIELD_PATTERN = /^[a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9]*)*$/;

const DECISIONS_REQUIRING_REASON: ReadonlySet<MergeConflictDecision> = new Set([
	"adopt_source",
	"archive_source_value",
	"manual_resolution_required",
]);

const ALLOWED_DECISIONS_BY_AREA: Readonly<
	Record<MergeConflictArea, ReadonlySet<MergeConflictDecision>>
> = {
	party_roles: new Set([
		"keep_target",
		"adopt_source",
		"retain_both",
		"archive_source_value",
		"manual_resolution_required",
	]),
	addresses: new Set([
		"keep_target",
		"adopt_source",
		"retain_both",
		"archive_source_value",
		"manual_resolution_required",
	]),
	contacts: new Set([
		"keep_target",
		"adopt_source",
		"retain_both",
		"archive_source_value",
		"manual_resolution_required",
	]),
	external_identifiers: new Set([
		"keep_target",
		"adopt_source",
		"archive_source_value",
		"manual_resolution_required",
	]),
	tax_registrations: new Set([
		"keep_target",
		"adopt_source",
		"archive_source_value",
		"manual_resolution_required",
	]),
	relationships: new Set([
		"keep_target",
		"adopt_source",
		"retain_both",
		"archive_source_value",
		"manual_resolution_required",
	]),
	names_aliases: new Set([
		"keep_target",
		"adopt_source",
		"retain_both",
		"archive_source_value",
		"manual_resolution_required",
	]),
};

export function validateMergeConflictResolutions(input: {
	mergeRequestId: string;
	resolutions: readonly MergeConflictResolution[];
}): Result<true> {
	const seenConflictIds = new Set<string>();
	const seenConflictKeys = new Set<string>();

	for (const resolution of input.resolutions) {
		const validation = validateMergeConflictResolution(resolution);
		if (!validation.ok) {
			return validation;
		}

		if (seenConflictIds.has(resolution.id)) {
			return governanceMergeConflictInvalid({
				operation: "party.merge.validate_conflicts",
				mergeRequestId: input.mergeRequestId,
				conflictId: resolution.id,
				area: resolution.area,
				field: resolution.field,
				validationReason: "duplicate_conflict_id",
			});
		}
		seenConflictIds.add(resolution.id);

		const conflictKey = buildMergeConflictKey(resolution);
		if (seenConflictKeys.has(conflictKey)) {
			return governanceMergeConflictInvalid({
				operation: "party.merge.validate_conflicts",
				mergeRequestId: input.mergeRequestId,
				conflictId: resolution.id,
				area: resolution.area,
				field: resolution.field,
				validationReason: "duplicate_conflict_resolution",
			});
		}
		seenConflictKeys.add(conflictKey);
	}

	const unresolved = unresolvedMergeConflicts(input.resolutions);
	if (unresolved.length > 0) {
		return governanceMergeConflictUnresolved({
			operation: "party.merge",
			mergeRequestId: input.mergeRequestId,
			conflictIds: unresolved.map((resolution) => resolution.id),
			fields: unresolved.map(
				(resolution) => `${resolution.area}.${resolution.field}`,
			),
		});
	}

	return ok(true);
}

export function unresolvedMergeConflicts(
	resolutions: readonly MergeConflictResolution[],
): readonly MergeConflictResolution[] {
	return resolutions
		.filter((resolution) => {
			if (resolution.decision === "manual_resolution_required") {
				return true;
			}

			if (
				resolution.sensitivityLevel !== "standard" &&
				(!resolution.reason?.trim() ||
					resolution.resolvedBy === null ||
					resolution.resolvedAt === null)
			) {
				return true;
			}

			return false;
		})
		.sort(compareMergeConflictResolutions);
}

export function unresolvedSensitiveMergeConflicts(
	resolutions: readonly MergeConflictResolution[],
): readonly MergeConflictResolution[] {
	return unresolvedMergeConflicts(resolutions).filter(
		(resolution) =>
			resolution.sensitivityLevel === "sensitive" ||
			resolution.sensitivityLevel === "restricted",
	);
}

export function summarizeMergeConflictResolutions(
	resolutions: readonly MergeConflictResolution[],
): MergeConflictResolutionSummary {
	const unresolved = unresolvedMergeConflicts(resolutions);

	return {
		totalCount: resolutions.length,
		resolvedCount: resolutions.length - unresolved.length,
		unresolvedCount: unresolved.length,
		sensitiveCount: resolutions.filter(
			(resolution) => resolution.sensitivityLevel === "sensitive",
		).length,
		restrictedCount: resolutions.filter(
			(resolution) => resolution.sensitivityLevel === "restricted",
		).length,
		unresolved,
	};
}

export function buildMergeConflictKey(
	resolution: Pick<
		MergeConflictResolution,
		"area" | "field" | "sourceValue" | "targetValue"
	>,
): string {
	return [
		encodeKeyPart(resolution.area),
		encodeKeyPart(resolution.field),
		encodeKeyPart(resolution.sourceValue?.id ?? ""),
		encodeKeyPart(resolution.targetValue?.id ?? ""),
	].join("|");
}

function validateMergeConflictResolution(
	resolution: MergeConflictResolution,
): Result<true> {
	const validationReason =
		validateConflictIdentityAndValues(resolution) ??
		validateConflictDecision(resolution) ??
		validateConflictEvidence(resolution);
	if (validationReason !== null) {
		return invalidResolution(resolution, validationReason);
	}
	return ok(true);
}

function validateConflictIdentityAndValues(
	resolution: MergeConflictResolution,
): string | null {
	if (!resolution.id.trim()) {
		return "conflict_id_required";
	}

	if (
		!(resolution.field.trim() && DOMAIN_FIELD_PATTERN.test(resolution.field))
	) {
		return "invalid_domain_field_identifier";
	}

	if (resolution.sourceValue === null && resolution.targetValue === null) {
		return "source_or_target_value_required";
	}

	const sourceValidation = validateValueReference(resolution.sourceValue);
	if (sourceValidation !== null) {
		return sourceValidation;
	}

	return validateValueReference(resolution.targetValue);
}

function validateConflictDecision(
	resolution: MergeConflictResolution,
): string | null {
	const allowedDecisions = ALLOWED_DECISIONS_BY_AREA[resolution.area];
	if (!allowedDecisions.has(resolution.decision)) {
		return "decision_not_allowed_for_conflict_area";
	}

	if (
		resolution.valueKind === "unique" &&
		resolution.decision === "retain_both"
	) {
		return "unique_value_cannot_retain_both";
	}

	if (
		resolution.area === "tax_registrations" &&
		resolution.decision === "retain_both"
	) {
		return "tax_registration_cannot_retain_both";
	}

	if (
		resolution.area === "external_identifiers" &&
		resolution.valueKind === "unique" &&
		resolution.decision === "retain_both"
	) {
		return "unique_external_identifier_cannot_retain_both";
	}

	const reasonRequired =
		resolution.sensitivityLevel !== "standard" ||
		DECISIONS_REQUIRING_REASON.has(resolution.decision);

	if (reasonRequired && !resolution.reason?.trim()) {
		return "resolution_reason_required";
	}
	return null;
}

function validateConflictEvidence(
	resolution: MergeConflictResolution,
): string | null {
	const hasResolvedBy = resolution.resolvedBy !== null;
	const hasResolvedAt = resolution.resolvedAt !== null;
	if (hasResolvedBy !== hasResolvedAt) {
		return "resolution_actor_timestamp_mismatch";
	}

	if (resolution.resolvedBy !== null && !resolution.resolvedBy.trim()) {
		return "resolved_by_must_not_be_blank";
	}

	if (
		resolution.resolvedAt !== null &&
		!Number.isFinite(resolution.resolvedAt.getTime())
	) {
		return "invalid_resolved_at";
	}

	if (
		resolution.decision === "manual_resolution_required" &&
		(resolution.resolvedBy !== null || resolution.resolvedAt !== null)
	) {
		return "manual_resolution_must_remain_unresolved";
	}

	if (
		resolution.decision !== "manual_resolution_required" &&
		(resolution.resolvedBy === null || resolution.resolvedAt === null)
	) {
		return "resolution_evidence_required";
	}

	return null;
}

function validateValueReference(
	value: MergeConflictValueReference | null,
): string | null {
	if (value === null) {
		return null;
	}

	if (!value.id.trim()) {
		return "value_reference_id_required";
	}

	if (
		!Number.isSafeInteger(value.expectedVersion) ||
		value.expectedVersion < 1
	) {
		return "invalid_value_reference_version";
	}

	if (value.displayValue !== null && value.displayValue.length > 256) {
		return "display_value_exceeds_limit";
	}

	return null;
}

function invalidResolution(
	resolution: Pick<MergeConflictResolution, "id" | "area" | "field">,
	validationReason: string,
): Result<never> {
	return governanceMergeConflictInvalid({
		operation: "party.merge.validate_conflict",
		conflictId: resolution.id,
		area: resolution.area,
		field: resolution.field,
		validationReason,
	});
}

function compareMergeConflictResolutions(
	left: MergeConflictResolution,
	right: MergeConflictResolution,
): number {
	const areaComparison = left.area.localeCompare(right.area);
	if (areaComparison !== 0) {
		return areaComparison;
	}

	const fieldComparison = left.field.localeCompare(right.field);
	if (fieldComparison !== 0) {
		return fieldComparison;
	}

	return left.id.localeCompare(right.id);
}

function encodeKeyPart(value: string): string {
	return `${value.length}:${value}`;
}
