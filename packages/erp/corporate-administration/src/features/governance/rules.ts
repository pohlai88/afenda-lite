import { errorResult, type Result } from "@afenda/errors";
import type { CanonicalDate } from "../../kernel/dates";
import {
	type EffectiveRange,
	effectiveRangesOverlap,
	isDateInEffectiveRange,
} from "../../kernel/effective-range";
import type { GovernanceBody, GovernanceMembership } from "./types";

export function normalizeGovernanceBodyCode(value: string): string {
	return value
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9._-]/g, "");
}

export function governanceBodyMatchesAsOf(
	body: Pick<GovernanceBody, "effectiveFrom" | "effectiveTo" | "status">,
	asOf: CanonicalDate,
	includeRetired = false,
): boolean {
	return (
		isDateInEffectiveRange(asOf, {
			from: body.effectiveFrom,
			to: body.effectiveTo,
		}) &&
		(includeRetired || body.status === "active")
	);
}

export function governanceMembershipMatchesAsOf(
	membership: Pick<GovernanceMembership, "termFrom" | "termTo" | "status">,
	asOf: CanonicalDate,
): boolean {
	return (
		membership.status === "active" &&
		isDateInEffectiveRange(asOf, {
			from: membership.termFrom,
			to: membership.termTo,
		})
	);
}

export function validateMembershipWithinBody(input: {
	body: GovernanceBody;
	term: EffectiveRange;
}): Result<void> {
	if (
		input.term.from < input.body.effectiveFrom ||
		(input.body.effectiveTo !== null &&
			(input.term.to === null || input.term.to > input.body.effectiveTo))
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Governance membership term must stay within the governance body term.",
		});
	}
	return errorResult.ok(undefined);
}

export function assertNoGovernanceMembershipConflict(input: {
	candidate: Pick<
		GovernanceMembership,
		| "memberKind"
		| "memberPartyId"
		| "roleSeatCode"
		| "isChair"
		| "termFrom"
		| "termTo"
		| "id"
	>;
	existing: readonly GovernanceMembership[];
}): Result<void> {
	for (const row of input.existing) {
		if (row.id === input.candidate.id || row.status !== "active") {
			continue;
		}
		const overlaps = effectiveRangesOverlap(
			{ from: input.candidate.termFrom, to: input.candidate.termTo },
			{ from: row.termFrom, to: row.termTo },
		);
		if (!overlaps) {
			continue;
		}
		if (input.candidate.isChair && row.isChair) {
			return conflict("isChair");
		}
		if (
			input.candidate.memberKind === row.memberKind &&
			input.candidate.memberPartyId === row.memberPartyId &&
			input.candidate.roleSeatCode === row.roleSeatCode
		) {
			return conflict(
				input.candidate.memberKind === "party"
					? "memberPartyId"
					: "roleSeatCode",
			);
		}
	}
	return errorResult.ok(undefined);
}

function conflict(_field: string): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage:
			"Governance membership conflicts with existing active membership.",
	});
}
