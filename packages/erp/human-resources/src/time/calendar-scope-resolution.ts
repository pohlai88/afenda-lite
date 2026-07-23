/**
 * C01-A scoped calendar precedence: employment > employee > location >
 * department > legal entity > organization default. Rejects ties at the same level.
 */

export type WorkCalendarScopeType =
	| "employment"
	| "employee"
	| "location"
	| "department"
	| "legal_entity"
	| "organization";

export type ScopedCalendarAssignmentCandidate = {
	scopeType: WorkCalendarScopeType;
	scopeKey: string;
	calendarId: string;
	effectiveFrom: string;
	effectiveTo: string | null;
};

const SCOPE_PRECEDENCE: readonly WorkCalendarScopeType[] = [
	"employment",
	"employee",
	"location",
	"department",
	"legal_entity",
	"organization",
];

function isEffectiveOn(
	assignment: ScopedCalendarAssignmentCandidate,
	asOf: string,
): boolean {
	if (asOf < assignment.effectiveFrom) {
		return false;
	}
	if (assignment.effectiveTo !== null && asOf > assignment.effectiveTo) {
		return false;
	}
	return true;
}

export function selectScopedWorkCalendarAssignment(input: {
	asOf: string;
	candidates: readonly ScopedCalendarAssignmentCandidate[];
}): { calendarId: string } | { conflict: "tie" } | null {
	const effective = input.candidates.filter((candidate) =>
		isEffectiveOn(candidate, input.asOf),
	);
	if (effective.length === 0) {
		return null;
	}

	for (const scopeType of SCOPE_PRECEDENCE) {
		const scoped = effective.filter(
			(candidate) => candidate.scopeType === scopeType,
		);
		if (scoped.length === 0) {
			continue;
		}
		const calendarIds = new Set(scoped.map((candidate) => candidate.calendarId));
		if (calendarIds.size > 1) {
			return { conflict: "tie" };
		}
		return { calendarId: scoped[0]!.calendarId };
	}

	return null;
}
