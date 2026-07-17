import { describe, expect, it } from "vitest";

import {
	formatInstantUtc,
	formatInstantUtcDate,
} from "../modules/platform/format/instant";

describe("formatInstantUtc (hydration-stable)", () => {
	it("formats ISO instants in fixed UTC locale", () => {
		expect(formatInstantUtc("2026-07-12T03:57:14.000Z")).toBe(
			"12 Jul 2026, 03:57:14 UTC",
		);
	});

	it("formats date-only columns in UTC", () => {
		expect(formatInstantUtcDate("2026-07-12T03:57:14.000Z")).toBe(
			"12 Jul 2026",
		);
	});

	it("returns em dash for empty and passthrough for invalid", () => {
		expect(formatInstantUtc(null)).toBe("—");
		expect(formatInstantUtc("")).toBe("—");
		expect(formatInstantUtc("not-a-date")).toBe("not-a-date");
	});
});
