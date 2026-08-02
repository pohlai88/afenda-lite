import { describe, expect, it } from "vitest";

import {
	allocateWorkedMinutesByCivilDate,
	civilDateInTimeZone,
} from "../src/features/time/legal-minute-allocation";

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
	}, 15_000);

	it("uses event source timezone civil dates for travelling employees", () => {
		const occurredAt = new Date("2025-08-13T05:00:00.000Z");
		expect(civilDateInTimeZone(occurredAt, "America/Los_Angeles")).toBe(
			"2025-08-12",
		);
		expect(civilDateInTimeZone(occurredAt, "Asia/Singapore")).toBe(
			"2025-08-13",
		);
	});

	it("allocates worked minutes across a daylight-saving spring-forward day", () => {
		const allocated = allocateWorkedMinutesByCivilDate({
			firstClockInAt: new Date("2025-03-09T06:30:00.000Z"),
			finalClockOutAt: new Date("2025-03-09T10:30:00.000Z"),
			breakIntervals: [],
			timeZone: "America/New_York",
		});

		expect(allocated.get("2025-03-09")).toBe(240);
		expect([...allocated.values()].reduce((sum, value) => sum + value, 0)).toBe(
			240,
		);
	});

	it("allocates worked minutes across a daylight-saving fall-back day", () => {
		const allocated = allocateWorkedMinutesByCivilDate({
			firstClockInAt: new Date("2025-11-02T05:30:00.000Z"),
			finalClockOutAt: new Date("2025-11-02T09:30:00.000Z"),
			breakIntervals: [],
			timeZone: "America/New_York",
		});

		expect(allocated.get("2025-11-02")).toBe(240);
		expect([...allocated.values()].reduce((sum, value) => sum + value, 0)).toBe(
			240,
		);
	});
});
