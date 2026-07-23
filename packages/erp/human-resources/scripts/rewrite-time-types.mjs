import fs from "node:fs";

const path = new URL("../src/types.ts", import.meta.url);
const s = fs.readFileSync(path, "utf8");
const start = s.indexOf("// Time Management Types");
if (start < 0) {
	console.error("marker not found");
	process.exit(1);
}

let header = s.slice(0, start);
if (!header.includes("HumanResourcesWorkCalendarId")) {
	header = header.replace(
		"HumanResourcesShiftId,",
		`HumanResourcesWorkCalendarId,
	HumanResourcesWorkCalendarHolidayId,
	HumanResourcesEmploymentCalendarAssignmentId,
	HumanResourcesShiftId,
	HumanResourcesShiftBreakId,
	HumanResourcesShiftAssignmentId,
	HumanResourcesAttendanceSessionId,
	HumanResourcesAttendanceExceptionId,
	HumanResourcesTimesheetEntryId,
	HumanResourcesOvertimeRequestId,`,
	);
}

const replacement = fs.readFileSync(
	new URL("./time-types-fragment.ts.txt", import.meta.url),
	"utf8",
);
fs.writeFileSync(path, header + replacement);
console.log("types.ts time section replaced");
