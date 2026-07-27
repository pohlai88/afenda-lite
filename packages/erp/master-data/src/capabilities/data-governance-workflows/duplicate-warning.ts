/**
 * # Duplicate Warnings
 *
 * Duplicate detection produces advisory evidence only.
 *
 * A warning may support review or creation of a governed merge request, but it
 * must never authorize or directly execute a merge.
 *
 * Duplicate pairs are stored canonically so the same pair cannot be represented
 * twice with reversed source and candidate identifiers.
 */

export const DUPLICATE_WARNING_ENTITY_TYPES = ["party", "item"] as const;

export type DuplicateWarningEntityType =
	(typeof DUPLICATE_WARNING_ENTITY_TYPES)[number];

export const PARTY_DUPLICATE_SIGNALS = [
	"normalized_name",
	"registration_number",
	"tax_registration",
	"external_identifier",
	"email",
	"telephone",
	"postal_address",
] as const;

export type PartyDuplicateMatchingSignal =
	(typeof PARTY_DUPLICATE_SIGNALS)[number];

export const ITEM_DUPLICATE_SIGNALS = [
	"normalized_name",
	"barcode",
	"external_identifier",
	"alias",
	"manufacturer_code",
	"template_variant_combination",
] as const;

export type ItemDuplicateMatchingSignal =
	(typeof ITEM_DUPLICATE_SIGNALS)[number];

export type DuplicateMatchingSignal =
	| PartyDuplicateMatchingSignal
	| ItemDuplicateMatchingSignal;

const PARTY_DUPLICATE_SIGNAL_SET = new Set<string>(PARTY_DUPLICATE_SIGNALS);
const ITEM_DUPLICATE_SIGNAL_SET = new Set<string>(ITEM_DUPLICATE_SIGNALS);

export const DUPLICATE_WARNING_SEVERITIES = [
	"low",
	"medium",
	"high",
	"critical",
] as const;

export type DuplicateWarningSeverity =
	(typeof DUPLICATE_WARNING_SEVERITIES)[number];

export const DUPLICATE_WARNING_STATUSES = [
	"open",
	"confirmed_duplicate",
	"not_duplicate",
	"merge_requested",
	"resolved",
	"dismissed",
] as const;

export type DuplicateWarningStatus =
	(typeof DUPLICATE_WARNING_STATUSES)[number];

export const DUPLICATE_WARNING_RESOLUTIONS = [
	"confirmed_for_merge_review",
	"merged",
	"not_duplicate",
	"duplicate_record_removed",
	"records_kept_separate",
	"insufficient_evidence",
	"superseded_warning",
	"other",
] as const;

export type DuplicateWarningResolution =
	(typeof DUPLICATE_WARNING_RESOLUTIONS)[number];

type DuplicateWarningBase = Readonly<{
	id: string;
	organizationId: string;
	sourceEntityId: string;
	candidateEntityId: string;
	confidence: number;
	score: number;
	severity: DuplicateWarningSeverity;
	status: DuplicateWarningStatus;
	detectedAt: Date;
	reviewedBy: string | null;
	reviewedAt: Date | null;
	resolution: DuplicateWarningResolution | null;
	resolutionNote: string | null;
	relatedChangeRequestId: string | null;
	createdAt: Date;
	updatedAt: Date;
	version: number;
}>;

export type PartyDuplicateWarningRecord = DuplicateWarningBase &
	Readonly<{
		entityType: "party";
		matchingSignals: readonly PartyDuplicateMatchingSignal[];
	}>;

export type ItemDuplicateWarningRecord = DuplicateWarningBase &
	Readonly<{
		entityType: "item";
		matchingSignals: readonly ItemDuplicateMatchingSignal[];
	}>;

export type DuplicateWarningRecord =
	| PartyDuplicateWarningRecord
	| ItemDuplicateWarningRecord;

export type DuplicateWarningPair = Readonly<{
	sourceEntityId: string;
	candidateEntityId: string;
}>;

/**
 * Produces a stable pair ordering for persistence and uniqueness enforcement.
 *
 * Duplicate detection itself is normally directionless. Merge direction must be
 * selected and approved separately by the governed merge request.
 */
export function normalizeDuplicateWarningPair(
	leftEntityId: string,
	rightEntityId: string,
): DuplicateWarningPair {
	if (leftEntityId <= rightEntityId) {
		return {
			sourceEntityId: leftEntityId,
			candidateEntityId: rightEntityId,
		};
	}
	return {
		sourceEntityId: rightEntityId,
		candidateEntityId: leftEntityId,
	};
}

export function createDuplicateWarningPairKey(input: {
	organizationId: string;
	entityType: DuplicateWarningEntityType;
	sourceEntityId: string;
	candidateEntityId: string;
}): string {
	const pair = normalizeDuplicateWarningPair(
		input.sourceEntityId,
		input.candidateEntityId,
	);
	return [
		input.organizationId,
		input.entityType,
		pair.sourceEntityId,
		pair.candidateEntityId,
	].join(":");
}

export function isDuplicateMatchingSignalAllowed(
	entityType: DuplicateWarningEntityType,
	signal: DuplicateMatchingSignal,
): boolean {
	return entityType === "party"
		? PARTY_DUPLICATE_SIGNAL_SET.has(signal)
		: ITEM_DUPLICATE_SIGNAL_SET.has(signal);
}
