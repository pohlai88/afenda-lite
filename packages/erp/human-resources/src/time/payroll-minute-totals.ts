import type {
	OvertimeType,
	TimesheetEntry,
	TimesheetEntryTimeType,
} from "../types";

const OVERTIME_TYPES = new Set<OvertimeType>([
	"weekday_overtime",
	"rest_day_overtime",
	"public_holiday_overtime",
	"night_overtime",
	"call_back",
	"emergency_overtime",
]);

export interface PayrollMinuteTotals {
	nightMinutes: number;
	overtime: ReadonlyMap<OvertimeType, number>;
	paidLeaveMinutes: number;
	publicHolidayMinutes: number;
	regularMinutes: number;
	restDayMinutes: number;
	unpaidLeaveMinutes: number;
	unpaidMinutes: number;
}

function parseOvertimeType(value: string | null): OvertimeType | null {
	if (value === null || !OVERTIME_TYPES.has(value as OvertimeType)) {
		return null;
	}
	return value as OvertimeType;
}

type MutablePayrollMinuteTotals = {
	[K in keyof Omit<PayrollMinuteTotals, "overtime">]: number;
} & { overtime: Map<OvertimeType, number> };

type PayrollEntry = Pick<
	TimesheetEntry,
	"approvedMinutes" | "sourceReference" | "sourceType" | "timeType"
>;

type PayrollEntryHandler = (
	totals: MutablePayrollMinuteTotals,
	entry: PayrollEntry,
) => void;

function addPaidLeaveMinutes(
	totals: MutablePayrollMinuteTotals,
	entry: PayrollEntry,
): void {
	if (entry.sourceType === "leave") {
		totals.paidLeaveMinutes += entry.approvedMinutes;
	}
}

const PAYROLL_ENTRY_HANDLERS = {
	regular: (totals, entry) => {
		totals.regularMinutes += entry.approvedMinutes;
	},
	overtime: (totals, entry) => {
		const type = parseOvertimeType(entry.sourceReference) ?? "weekday_overtime";
		totals.overtime.set(
			type,
			(totals.overtime.get(type) ?? 0) + entry.approvedMinutes,
		);
	},
	public_holiday: (totals, entry) => {
		totals.publicHolidayMinutes += entry.approvedMinutes;
	},
	rest_day: (totals, entry) => {
		totals.restDayMinutes += entry.approvedMinutes;
	},
	night: (totals, entry) => {
		totals.nightMinutes += entry.approvedMinutes;
	},
	unpaid: (totals, entry) => {
		totals.unpaidMinutes += entry.approvedMinutes;
		if (entry.sourceType === "leave") {
			totals.unpaidLeaveMinutes += entry.approvedMinutes;
		}
	},
	call_back: (totals, entry) => {
		totals.overtime.set(
			"call_back",
			(totals.overtime.get("call_back") ?? 0) + entry.approvedMinutes,
		);
	},
	training: addPaidLeaveMinutes,
	travel: addPaidLeaveMinutes,
	standby: addPaidLeaveMinutes,
} satisfies Record<TimesheetEntryTimeType, PayrollEntryHandler>;

function addPayrollEntry(
	totals: MutablePayrollMinuteTotals,
	entry: PayrollEntry,
): void {
	PAYROLL_ENTRY_HANDLERS[entry.timeType](totals, entry);
}

export function aggregatePayrollMinutes(
	entries: readonly Pick<
		TimesheetEntry,
		"approvedMinutes" | "sourceReference" | "sourceType" | "timeType"
	>[],
): PayrollMinuteTotals {
	const totals: MutablePayrollMinuteTotals = {
		nightMinutes: 0,
		overtime: new Map<OvertimeType, number>(),
		paidLeaveMinutes: 0,
		publicHolidayMinutes: 0,
		regularMinutes: 0,
		restDayMinutes: 0,
		unpaidLeaveMinutes: 0,
		unpaidMinutes: 0,
	};

	for (const entry of entries) {
		addPayrollEntry(totals, entry);
	}

	return totals;
}
