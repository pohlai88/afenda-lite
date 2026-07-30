import { describe, expect, it } from "vitest";

import {
	assertLineageSegmentMutable,
	validateLineageSegmentEffectiveOn,
} from "../src/workforce-foundation/lineage-segment";

describe("lineage segment guards", () => {
	it("rejects mutation of superseded lineage segments", () => {
		const result = assertLineageSegmentMutable({ lineageStatus: "superseded" });
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.code).toBe("CONFLICT");
	});

	it("allows mutation of active lineage segments", () => {
		const result = assertLineageSegmentMutable({ lineageStatus: "active" });
		expect(result.ok).toBe(true);
	});

	it("requires effectiveOn after the open segment start date", () => {
		const result = validateLineageSegmentEffectiveOn({
			openEffectiveFrom: "2026-01-01",
			effectiveOn: "2026-01-01",
		});
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.code).toBe("VALIDATION_ERROR");
	});

	it("accepts effectiveOn strictly after the open segment start date", () => {
		const result = validateLineageSegmentEffectiveOn({
			openEffectiveFrom: "2026-01-01",
			effectiveOn: "2026-02-01",
		});
		expect(result.ok).toBe(true);
	});
});
