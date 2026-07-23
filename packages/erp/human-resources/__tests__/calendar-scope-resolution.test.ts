import { describe, expect, it } from "vitest";

import {
	type ScopedCalendarAssignmentCandidate,
	selectScopedWorkCalendarAssignment,
} from "../src/time/calendar-scope-resolution";

function candidate(
	overrides: Partial<ScopedCalendarAssignmentCandidate> &
		Pick<ScopedCalendarAssignmentCandidate, "scopeType" | "scopeKey" | "calendarId">,
): ScopedCalendarAssignmentCandidate {
	return {
		effectiveFrom: "2025-01-01",
		effectiveTo: null,
		...overrides,
	};
}

describe("calendar-scope-resolution", () => {
	it("prefers employment over location and organization defaults", () => {
		const selected = selectScopedWorkCalendarAssignment({
			asOf: "2025-07-01",
			candidates: [
				candidate({
					scopeType: "organization",
					scopeKey: "default",
					calendarId: "org-cal",
				}),
				candidate({
					scopeType: "location",
					scopeKey: "SG-HQ",
					calendarId: "loc-cal",
				}),
				candidate({
					scopeType: "employment",
					scopeKey: "employment-1",
					calendarId: "emp-cal",
				}),
			],
		});
		expect(selected).toEqual({ calendarId: "emp-cal" });
	});

	it("prefers employee over location, department, legal entity, and organization", () => {
		const selected = selectScopedWorkCalendarAssignment({
			asOf: "2025-07-01",
			candidates: [
				candidate({
					scopeType: "organization",
					scopeKey: "org-1",
					calendarId: "org-cal",
				}),
				candidate({
					scopeType: "legal_entity",
					scopeKey: "le-1",
					calendarId: "legal-cal",
				}),
				candidate({
					scopeType: "department",
					scopeKey: "dept-1",
					calendarId: "dept-cal",
				}),
				candidate({
					scopeType: "location",
					scopeKey: "loc-1",
					calendarId: "loc-cal",
				}),
				candidate({
					scopeType: "employee",
					scopeKey: "employee-1",
					calendarId: "employee-cal",
				}),
			],
		});
		expect(selected).toEqual({ calendarId: "employee-cal" });
	});

	it("prefers location over department, legal entity, and organization", () => {
		const selected = selectScopedWorkCalendarAssignment({
			asOf: "2025-07-01",
			candidates: [
				candidate({
					scopeType: "organization",
					scopeKey: "org-1",
					calendarId: "org-cal",
				}),
				candidate({
					scopeType: "legal_entity",
					scopeKey: "le-1",
					calendarId: "legal-cal",
				}),
				candidate({
					scopeType: "department",
					scopeKey: "dept-1",
					calendarId: "dept-cal",
				}),
				candidate({
					scopeType: "location",
					scopeKey: "loc-1",
					calendarId: "loc-cal",
				}),
			],
		});
		expect(selected).toEqual({ calendarId: "loc-cal" });
	});

	it("prefers department over legal entity and organization", () => {
		const selected = selectScopedWorkCalendarAssignment({
			asOf: "2025-07-01",
			candidates: [
				candidate({
					scopeType: "organization",
					scopeKey: "org-1",
					calendarId: "org-cal",
				}),
				candidate({
					scopeType: "legal_entity",
					scopeKey: "le-1",
					calendarId: "legal-cal",
				}),
				candidate({
					scopeType: "department",
					scopeKey: "dept-1",
					calendarId: "dept-cal",
				}),
			],
		});
		expect(selected).toEqual({ calendarId: "dept-cal" });
	});

	it("prefers legal entity over organization default", () => {
		const selected = selectScopedWorkCalendarAssignment({
			asOf: "2025-07-01",
			candidates: [
				candidate({
					scopeType: "organization",
					scopeKey: "org-1",
					calendarId: "org-cal",
				}),
				candidate({
					scopeType: "legal_entity",
					scopeKey: "le-1",
					calendarId: "legal-cal",
				}),
			],
		});
		expect(selected).toEqual({ calendarId: "legal-cal" });
	});

	it("rejects ties at the same scope level", () => {
		const selected = selectScopedWorkCalendarAssignment({
			asOf: "2025-07-01",
			candidates: [
				candidate({
					scopeType: "department",
					scopeKey: "dept-a",
					calendarId: "dept-cal-a",
				}),
				candidate({
					scopeType: "department",
					scopeKey: "dept-b",
					calendarId: "dept-cal-b",
				}),
			],
		});
		expect(selected).toEqual({ conflict: "tie" });
	});
});
