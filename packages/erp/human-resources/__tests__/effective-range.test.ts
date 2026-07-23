import { describe, expect, it } from "vitest";

import { selectUniqueEffectiveRangeRecord } from "../src/shared/effective-range";

describe("selectUniqueEffectiveRangeRecord", () => {
	it("returns the sole matching record", () => {
		const selected = selectUniqueEffectiveRangeRecord({
			records: [
				{ id: "a", effectiveFrom: "2025-01-01", effectiveTo: "2025-06-30" },
				{ id: "b", effectiveFrom: "2025-07-01", effectiveTo: null },
			],
			asOf: "2025-03-01",
		});
		expect(selected?.id).toBe("a");
	});

	it("returns null when multiple records match", () => {
		const selected = selectUniqueEffectiveRangeRecord({
			records: [
				{ id: "a", effectiveFrom: "2025-01-01", effectiveTo: null },
				{ id: "b", effectiveFrom: "2025-01-01", effectiveTo: null },
			],
			asOf: "2025-03-01",
		});
		expect(selected).toBeNull();
	});
});
