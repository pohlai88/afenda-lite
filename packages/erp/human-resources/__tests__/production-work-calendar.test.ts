import { describe, expect, it } from "vitest";

import { createProductionWorkCalendar } from "../src/production-work-calendar";
import { createMemoryWorkCalendarLookup } from "../src/testing";
import { resolveWorkCalendarCivilDay } from "../src/time/calendar-resolution";

describe("createProductionWorkCalendar", () => {
	it("skips weekends for day-based leave using timezone weekday", async () => {
		const calendar = createProductionWorkCalendar({
			lookup: createMemoryWorkCalendarLookup({ timezone: "UTC" }),
		});
		const expanded = await calendar.expandLeaveSegments({
			organizationId: "org-cal",
			employeeId: "emp-1",
			employmentId: "empl-1",
			startDate: "2025-01-03", // Friday
			endDate: "2025-01-06", // Monday
			unit: "days",
		});
		expect(expanded.ok).toBe(true);
		if (!expanded.ok) return;
		expect(expanded.data.map((s) => s.date)).toEqual([
			"2025-01-03",
			"2025-01-06",
		]);
		expect(
			expanded.data.every((s) => s.calendarVersion === "memory-lookup-v1"),
		).toBe(true);
	});

	it("skips configured holidays", async () => {
		const calendar = createProductionWorkCalendar({
			lookup: createMemoryWorkCalendarLookup({
				timezone: "UTC",
				holidays: [
					{
						date: "2025-01-06",
						locationCode: null,
						jurisdiction: null,
						label: "Observed",
						overrideKind: "holiday",
						isWorkingDay: false,
						expectedMinutes: null,
					},
				],
			}),
		});
		const expanded = await calendar.expandLeaveSegments({
			organizationId: "org-cal",
			employeeId: "emp-1",
			employmentId: "empl-1",
			startDate: "2025-01-06",
			endDate: "2025-01-07",
			unit: "days",
		});
		expect(expanded.ok).toBe(true);
		if (!expanded.ok) return;
		expect(expanded.data.map((s) => s.date)).toEqual(["2025-01-07"]);
	});

	it("keeps half-day override as a working day with reduced minutes", async () => {
		const lookup = createMemoryWorkCalendarLookup({
			timezone: "UTC",
			holidays: [
				{
					date: "2025-01-07",
					locationCode: null,
					jurisdiction: null,
					label: "Half day",
					overrideKind: "half_day",
					isWorkingDay: true,
					expectedMinutes: 240,
				},
			],
		});
		const context = await lookup.resolveCalendarContext({
			organizationId: "org-cal",
			employeeId: "emp-1",
			employmentId: "empl-1",
			fromDate: "2025-01-07",
			toDate: "2025-01-07",
		});
		expect(context.ok).toBe(true);
		if (!context.ok) return;
		const day = resolveWorkCalendarCivilDay(context.data, "2025-01-07");
		expect(day.isWorkingDay).toBe(true);
		expect(day.expectedMinutes).toBe(240);
		expect(day.overrideKind).toBe("half_day");

		const calendar = createProductionWorkCalendar({ lookup });
		const working = await calendar.isWorkingDay({
			organizationId: "org-cal",
			employeeId: "emp-1",
			employmentId: "empl-1",
			date: "2025-01-07",
		});
		expect(working.ok).toBe(true);
		if (!working.ok) return;
		expect(working.data).toBe(true);
	});

	it("treats replacement workday as working on a weekend", async () => {
		const lookup = createMemoryWorkCalendarLookup({
			timezone: "UTC",
			holidays: [
				{
					date: "2025-01-11",
					locationCode: null,
					jurisdiction: null,
					label: "Replacement",
					overrideKind: "replacement_workday",
					isWorkingDay: true,
					expectedMinutes: null,
				},
			],
		});
		const context = await lookup.resolveCalendarContext({
			organizationId: "org-cal",
			employeeId: "emp-1",
			employmentId: "empl-1",
			fromDate: "2025-01-11",
			toDate: "2025-01-11",
		});
		expect(context.ok).toBe(true);
		if (!context.ok) return;
		const day = resolveWorkCalendarCivilDay(context.data, "2025-01-11");
		expect(day.isWorkingDay).toBe(true);
		expect(day.overrideKind).toBe("replacement_workday");
		expect(day.expectedMinutes).toBe(480);

		const calendar = createProductionWorkCalendar({ lookup });
		const expanded = await calendar.expandLeaveSegments({
			organizationId: "org-cal",
			employeeId: "emp-1",
			employmentId: "empl-1",
			startDate: "2025-01-11",
			endDate: "2025-01-11",
			unit: "days",
		});
		expect(expanded.ok).toBe(true);
		if (!expanded.ok) return;
		expect(expanded.data.map((s) => s.date)).toEqual(["2025-01-11"]);
	});

	it("supports non Monday–Friday work weeks", async () => {
		const calendar = createProductionWorkCalendar({
			lookup: createMemoryWorkCalendarLookup({
				timezone: "UTC",
				workWeek: [
					{
						dayOfWeek: 0,
						isWorkingDay: true,
						standardStartTime: "09:00",
						standardEndTime: "17:00",
						standardMinutes: 480,
					},
					{
						dayOfWeek: 1,
						isWorkingDay: false,
						standardStartTime: null,
						standardEndTime: null,
						standardMinutes: null,
					},
					{
						dayOfWeek: 2,
						isWorkingDay: false,
						standardStartTime: null,
						standardEndTime: null,
						standardMinutes: null,
					},
					{
						dayOfWeek: 3,
						isWorkingDay: false,
						standardStartTime: null,
						standardEndTime: null,
						standardMinutes: null,
					},
					{
						dayOfWeek: 4,
						isWorkingDay: false,
						standardStartTime: null,
						standardEndTime: null,
						standardMinutes: null,
					},
					{
						dayOfWeek: 5,
						isWorkingDay: true,
						standardStartTime: "09:00",
						standardEndTime: "17:00",
						standardMinutes: 480,
					},
					{
						dayOfWeek: 6,
						isWorkingDay: true,
						standardStartTime: "09:00",
						standardEndTime: "17:00",
						standardMinutes: 480,
					},
				],
			}),
		});
		// 2025-01-03 Fri, 04 Sat, 05 Sun
		const expanded = await calendar.expandLeaveSegments({
			organizationId: "org-cal",
			employeeId: "emp-1",
			employmentId: "empl-1",
			startDate: "2025-01-03",
			endDate: "2025-01-05",
			unit: "days",
		});
		expect(expanded.ok).toBe(true);
		if (!expanded.ok) return;
		// Fri(5), Sat(6), Sun(0) are working in this pattern
		expect(expanded.data.map((s) => s.date)).toEqual([
			"2025-01-03",
			"2025-01-04",
			"2025-01-05",
		]);
	});

	it("expands partial-day and hourly quantities from standard hours", async () => {
		const calendar = createProductionWorkCalendar({
			lookup: createMemoryWorkCalendarLookup({
				timezone: "UTC",
				standardHoursPerDay: 8,
			}),
		});
		const half = await calendar.expandLeaveSegments({
			organizationId: "org-cal",
			employeeId: "emp-1",
			employmentId: "empl-1",
			startDate: "2025-01-06",
			endDate: "2025-01-06",
			unit: "days",
			partialDay: "morning",
		});
		expect(half.ok).toBe(true);
		if (!half.ok) return;
		expect(half.data[0]?.quantity).toBe("0.5");

		const hours = await calendar.expandLeaveSegments({
			organizationId: "org-cal",
			employeeId: "emp-1",
			employmentId: "empl-1",
			startDate: "2025-01-06",
			endDate: "2025-01-06",
			unit: "hours",
			partialDay: "full",
		});
		expect(hours.ok).toBe(true);
		if (!hours.ok) return;
		expect(hours.data[0]?.quantity).toBe("8");
	});
});
