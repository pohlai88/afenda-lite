import { describe, expect, it } from "vitest";

import {
	resolveUniqueEffectiveRangeRecord,
	resolveUniqueEffectiveRangeRecordBy,
	selectUniqueEffectiveRangeRecord,
} from "../src/shared/effective-range";

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

	it("reports overlapping history even when the overlap is before asOf", () => {
		const resolved = resolveUniqueEffectiveRangeRecord({
			records: [
				{ id: "a", effectiveFrom: "2025-01-01", effectiveTo: "2025-08-31" },
				{ id: "b", effectiveFrom: "2025-07-01", effectiveTo: "2025-12-31" },
			],
			asOf: "2026-01-01",
		});

		expect(resolved).toEqual({ ok: false, reason: "OVERLAP" });
	});

	it("supports canonical selection for startsOn and endsOn records", () => {
		const resolved = resolveUniqueEffectiveRangeRecordBy({
			records: [
				{ key: "before", startsOn: "2025-01-01", endsOn: "2025-06-30" },
				{ key: "after", startsOn: "2025-07-01", endsOn: null },
			],
			asOf: "2025-08-01",
			getId: (record) => record.key,
			getEffectiveFrom: (record) => record.startsOn,
			getEffectiveTo: (record) => record.endsOn,
		});

		expect(resolved).toEqual({
			ok: true,
			record: { key: "after", startsOn: "2025-07-01", endsOn: null },
		});
	});

	it("reports duplicate record identities", () => {
		const resolved = resolveUniqueEffectiveRangeRecord({
			records: [
				{ id: "duplicate", effectiveFrom: "2025-01-01", effectiveTo: null },
				{ id: "duplicate", effectiveFrom: "2026-01-01", effectiveTo: null },
			],
			asOf: "2025-03-01",
		});

		expect(resolved).toEqual({ ok: false, reason: "DUPLICATE_ID" });
	});

	it("reports an inverted effective range", () => {
		const resolved = resolveUniqueEffectiveRangeRecord({
			records: [
				{
					id: "invalid",
					effectiveFrom: "2025-06-01",
					effectiveTo: "2025-05-31",
				},
			],
			asOf: "2025-03-01",
		});

		expect(resolved).toEqual({ ok: false, reason: "INVALID_RANGE" });
	});
});
