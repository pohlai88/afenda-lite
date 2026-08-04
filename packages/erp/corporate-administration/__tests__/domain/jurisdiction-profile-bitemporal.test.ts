import {
	type CompanyJurisdictionProfile,
	isVisibleAtKnownTime,
	matchesAsOf,
} from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";

function profile(input: {
	id: string;
	from: string;
	to?: string | null;
	recordedAt: string;
	supersededAt?: string | null;
}): CompanyJurisdictionProfile {
	return {
		jurisdictionProfileId: input.id,
		organizationId: "org-bitemporal",
		legalCompanyId: "018f4ace-5986-73a2-9c4d-111111111111",
		jurisdictionCountryCode: "MY",
		entityType: "private_limited_company",
		effectiveRange: { from: input.from, to: input.to ?? null },
		recordedAt: input.recordedAt,
		recordedByUserId: "user-bitemporal",
		sourceReference: "bitemporal-test",
		supersededAt: input.supersededAt ?? null,
		supersededByProfileId: null,
		version: 1,
	};
}

function visibleAsOf(
	profiles: readonly CompanyJurisdictionProfile[],
	input: { asOf: string; knownAt?: string },
) {
	return profiles
		.filter(
			(candidate) =>
				matchesAsOf({ profile: candidate, asOf: input.asOf }) &&
				isVisibleAtKnownTime({
					profile: candidate,
					knownAt: input.knownAt,
				}),
		)
		.sort((left, right) => right.recordedAt.localeCompare(left.recordedAt))[0];
}

describe("Corporate Administration jurisdiction profile bitemporal rules", () => {
	it("resolves the current profile", () => {
		const current = profile({
			id: "018f4ace-5986-73a2-9c4d-111111111111",
			from: "2026-01-01",
			recordedAt: "2026-01-02T00:00:00.000Z",
		});

		expect(visibleAsOf([current], { asOf: "2026-07-26" })).toBe(current);
	});

	it("does not resolve a future-dated profile before its effective date", () => {
		const future = profile({
			id: "018f4ace-5986-73a2-9c4d-222222222222",
			from: "2027-01-01",
			recordedAt: "2026-07-26T00:00:00.000Z",
		});

		expect(visibleAsOf([future], { asOf: "2026-12-31" })).toBeUndefined();
		expect(visibleAsOf([future], { asOf: "2027-01-01" })).toBe(future);
	});

	it("resolves historical asOf dates", () => {
		const historical = profile({
			id: "018f4ace-5986-73a2-9c4d-333333333333",
			from: "2025-01-01",
			to: "2026-01-01",
			recordedAt: "2025-01-02T00:00:00.000Z",
		});
		const current = profile({
			id: "018f4ace-5986-73a2-9c4d-444444444444",
			from: "2026-01-01",
			recordedAt: "2026-01-02T00:00:00.000Z",
		});

		expect(visibleAsOf([historical, current], { asOf: "2025-06-01" })).toBe(
			historical,
		);
	});

	it("prefers a later-known retroactive correction for the same asOf date", () => {
		const original = profile({
			id: "018f4ace-5986-73a2-9c4d-555555555555",
			from: "2026-01-01",
			recordedAt: "2026-01-02T00:00:00.000Z",
		});
		const correction = profile({
			id: "018f4ace-5986-73a2-9c4d-666666666666",
			from: "2026-01-01",
			recordedAt: "2026-03-01T00:00:00.000Z",
		});

		expect(visibleAsOf([original, correction], { asOf: "2026-02-01" })).toBe(
			correction,
		);
	});

	it("knownAt excludes facts not yet recorded", () => {
		const original = profile({
			id: "018f4ace-5986-73a2-9c4d-777777777777",
			from: "2026-01-01",
			recordedAt: "2026-01-02T00:00:00.000Z",
		});
		const correction = profile({
			id: "018f4ace-5986-73a2-9c4d-888888888888",
			from: "2026-01-01",
			recordedAt: "2026-03-01T00:00:00.000Z",
		});

		expect(
			visibleAsOf([original, correction], {
				asOf: "2026-02-01",
				knownAt: "2026-02-15T00:00:00.000Z",
			}),
		).toBe(original);
	});

	it("combines asOf and knownAt visibility", () => {
		const futureKnownEarly = profile({
			id: "018f4ace-5986-73a2-9c4d-999999999999",
			from: "2027-01-01",
			recordedAt: "2026-03-01T00:00:00.000Z",
		});

		expect(
			visibleAsOf([futureKnownEarly], {
				asOf: "2026-12-31",
				knownAt: "2026-12-31T00:00:00.000Z",
			}),
		).toBeUndefined();
		expect(
			visibleAsOf([futureKnownEarly], {
				asOf: "2027-01-01",
				knownAt: "2026-12-31T00:00:00.000Z",
			}),
		).toBe(futureKnownEarly);
	});

	it("keeps a superseded predecessor visible before the supersession was known", () => {
		const predecessor = profile({
			id: "018f4ace-5986-73a2-9c4d-aaaaaaaaaaaa",
			from: "2026-01-01",
			recordedAt: "2026-01-02T00:00:00.000Z",
			supersededAt: "2026-06-01T00:00:00.000Z",
		});

		expect(
			visibleAsOf([predecessor], {
				asOf: "2026-03-01",
				knownAt: "2026-05-01T00:00:00.000Z",
			}),
		).toBe(predecessor);
		expect(
			visibleAsOf([predecessor], {
				asOf: "2026-03-01",
				knownAt: "2026-07-01T00:00:00.000Z",
			}),
		).toBeUndefined();
	});
});
