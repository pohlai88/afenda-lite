import { isValidIanaTimeZone } from "../iana-timezone";

export type AttendanceImportRowBasicIssue =
	| "DUPLICATE_SOURCE_REFERENCE"
	| "INVALID_TIMEZONE";

export const ATTENDANCE_IMPORT_ROW_BASIC_MESSAGES: Record<
	AttendanceImportRowBasicIssue,
	string
> = {
	DUPLICATE_SOURCE_REFERENCE: "Source reference is duplicated in this batch",
	INVALID_TIMEZONE: "Source timezone is not a valid IANA timezone",
};

export function assessAttendanceImportRowBasics(input: {
	seenReferences: Set<string>;
	sourceReference: string;
	sourceTimezone: string;
}): AttendanceImportRowBasicIssue | null {
	if (input.seenReferences.has(input.sourceReference)) {
		return "DUPLICATE_SOURCE_REFERENCE";
	}
	if (!isValidIanaTimeZone(input.sourceTimezone)) {
		return "INVALID_TIMEZONE";
	}
	return null;
}
