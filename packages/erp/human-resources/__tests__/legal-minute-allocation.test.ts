import { describe, expect, it } from "vitest";

import {
	allocateWorkedMinutesByCivilDate,
	civilDateInTimeZone,
} from "../src/time/legal-minute-allocation";

describe("legal-minute-allocation", () => {
	it("allocates worked minutes across civil dates for overnight sessions", () => {
		const allocated = allocateWorkedMinutesByCivilDate({
			firstClockInAt: new Date("2025-08-13T05:00:00.000Z"),
			finalClockOutAt: new Date("2025-08-13T13:00:00.000Z"),
			breakIntervals: [
				{
					startedAt: new Date("2025-08-13T08:00:00.000Z"),
					endedAt: new Date("2025-08-13T08:15:00.000Z"),
				},
				{
					startedAt: new Date("2025-08-13T10:00:00.000Z"),
					endedAt: new Date("2025-08-13T10:15:00.000Z"),
				},
			],
			timeZone: "America/Los_Angeles",
		});

		expect(allocated.get("2025-08-12")).toBe(120);
		expect(allocated.get("2025-08-13")).toBe(330);
	});

	it("uses event source timezone civil dates for travelling employees", () => {
		const occurredAt = new Date("2025-08-13T05:00:00.000Z");
		expect(civilDateInTimeZone(occurredAt, "America/Los_Angeles")).toBe(
			"2025-08-12",
		);
		expect(civilDateInTimeZone(occurredAt, "Asia/Singapore")).toBe(
			"2025-08-13",
		);
	});
});
