import { errorResult, type Result } from "@afenda/errors";
import type { CanonicalDate, CanonicalInstant } from "../kernel/dates";
import { effectiveRangesOverlap } from "../kernel/effective-range";
import type {
	EstablishmentStatusHistory,
	LegalEstablishmentStatus,
	RegisteredAddress,
} from "./types";

export function normalizeEstablishmentRegistrationIdentifier(
	value: string,
): string {
	return value
		.trim()
		.normalize("NFC")
		.replace(/[\s._-]+/g, "")
		.toUpperCase();
}

const allowedTransitions: Readonly<
	Record<LegalEstablishmentStatus, readonly LegalEstablishmentStatus[]>
> = {
	registered: ["active", "closed"],
	active: ["suspended", "closed"],
	suspended: ["active", "closed"],
	closed: [],
};

export function validateEstablishmentStatusTransition(input: {
	from: LegalEstablishmentStatus;
	to: LegalEstablishmentStatus;
}): Result<void> {
	return allowedTransitions[input.from].includes(input.to)
		? errorResult.ok(undefined)
		: errorResult.fail("CONFLICT", {
				publicMessage:
					"Corporate Administration establishment status transition is invalid.",
			});
}

export function validateEstablishmentChronology(input: {
	registeredFrom: CanonicalDate;
	transitionDate: CanonicalDate;
	companyCreatedAt: CanonicalInstant;
}): Result<void> {
	const companyStart = input.companyCreatedAt.slice(0, 10);
	if (
		input.registeredFrom < companyStart ||
		input.transitionDate < input.registeredFrom
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Corporate Administration establishment chronology is invalid.",
		});
	}
	return errorResult.ok(undefined);
}

export function assertNoRegisteredAddressOverlap(input: {
	candidate: Pick<RegisteredAddress, "effectiveFrom" | "effectiveTo">;
	existing: readonly Pick<RegisteredAddress, "effectiveFrom" | "effectiveTo">[];
}): Result<void> {
	const overlaps = input.existing.some((row) =>
		effectiveRangesOverlap(
			{ from: input.candidate.effectiveFrom, to: input.candidate.effectiveTo },
			{ from: row.effectiveFrom, to: row.effectiveTo },
		),
	);
	return overlaps
		? errorResult.fail("CONFLICT", {
				publicMessage:
					"Corporate Administration registered address effective range overlaps.",
			})
		: errorResult.ok(undefined);
}

export function matchesEstablishmentAsOf(
	effectiveFrom: CanonicalDate,
	effectiveTo: CanonicalDate | null,
	asOf: CanonicalDate,
): boolean {
	return effectiveFrom <= asOf && (effectiveTo === null || asOf < effectiveTo);
}

export function visibleAtKnownTime(
	recordedAt: Date,
	knownAt?: CanonicalInstant,
): boolean {
	return knownAt === undefined || recordedAt.toISOString() <= knownAt;
}

export function resolveEstablishmentStatusAsOf(input: {
	history: readonly EstablishmentStatusHistory[];
	asOf: CanonicalDate;
	knownAt?: CanonicalInstant | undefined;
}): EstablishmentStatusHistory | null {
	return (
		input.history
			.filter(
				(row) =>
					matchesEstablishmentAsOf(
						row.effectiveFrom,
						row.effectiveTo,
						input.asOf,
					) && visibleAtKnownTime(row.recordedAt, input.knownAt),
			)
			.sort(
				(left, right) =>
					right.effectiveFrom.localeCompare(left.effectiveFrom) ||
					right.recordedAt.getTime() - left.recordedAt.getTime() ||
					right.id.localeCompare(left.id),
			)[0] ?? null
	);
}
