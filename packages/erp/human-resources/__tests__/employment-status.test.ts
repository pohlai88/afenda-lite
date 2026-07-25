import { describe, expect, it } from "vitest";

import { HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION } from "../src/error-codes";
import {
	assertEmploymentStatusTransition,
	canTransitionEmploymentStatus,
} from "../src/shared/employment-status";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

describe("employment status transitions (Slice 5.4)", () => {
	it("allows hire and lifecycle paths", () => {
		expect(canTransitionEmploymentStatus("active", "notice")).toBe(true);
		expect(canTransitionEmploymentStatus("active", "terminated")).toBe(true);
		expect(canTransitionEmploymentStatus("notice", "active")).toBe(true);
		expect(canTransitionEmploymentStatus("notice", "terminated")).toBe(true);
	});

	it("rejects terminal and invalid paths", () => {
		expect(canTransitionEmploymentStatus("terminated", "active")).toBe(false);
		expect(canTransitionEmploymentStatus("terminated", "notice")).toBe(false);
		expect(canTransitionEmploymentStatus("active", "active")).toBe(false);
	});

	it("assertEmploymentStatusTransition returns semantic error on reactivate-from-terminated", () => {
		const result = assertEmploymentStatusTransition("terminated", "active");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(humanResourcesCodeFromResult(result)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}
	});
});
