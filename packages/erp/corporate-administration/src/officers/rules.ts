import { errorResult, type Result } from "@afenda/errors";
import type { CanonicalDate } from "../kernel/dates";
import {
	effectiveRangesOverlap,
	isDateInEffectiveRange,
} from "../kernel/effective-range";
import type {
	OfficerAppointment,
	OfficerQualification,
	OfficerVacancyStatus,
	StatutoryOffice,
} from "./types";

export function statutoryOfficeMatchesAsOf(
	office: Pick<StatutoryOffice, "effectiveFrom" | "effectiveTo" | "status">,
	asOf: CanonicalDate,
	includeRetired = false,
): boolean {
	return (
		isDateInEffectiveRange(asOf, {
			from: office.effectiveFrom,
			to: office.effectiveTo,
		}) &&
		(includeRetired || office.status === "active")
	);
}

export function officerAppointmentMatchesAsOf(
	appointment: Pick<
		OfficerAppointment,
		"effectiveFrom" | "effectiveTo" | "status"
	>,
	asOf: CanonicalDate,
): boolean {
	return (
		appointment.status === "active" &&
		isDateInEffectiveRange(asOf, {
			from: appointment.effectiveFrom,
			to: appointment.effectiveTo,
		})
	);
}

export function officerQualificationMatchesAsOf(
	qualification: Pick<
		OfficerQualification,
		"validFrom" | "validTo" | "verificationStatus"
	>,
	asOf: CanonicalDate,
): boolean {
	return (
		qualification.verificationStatus === "verified" &&
		isDateInEffectiveRange(asOf, {
			from: qualification.validFrom,
			to: qualification.validTo,
		})
	);
}

export function assertAppointmentWithinOffice(input: {
	office: StatutoryOffice;
	appointment: Pick<OfficerAppointment, "effectiveFrom" | "effectiveTo">;
}): Result<void> {
	if (
		input.appointment.effectiveFrom < input.office.effectiveFrom ||
		(input.office.effectiveTo !== null &&
			(input.appointment.effectiveTo === null ||
				input.appointment.effectiveTo > input.office.effectiveTo))
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Officer appointment must stay within the statutory office term.",
		});
	}
	return errorResult.ok(undefined);
}

export function assertNoOfficerAppointmentConflict(input: {
	candidate: Pick<
		OfficerAppointment,
		| "id"
		| "statutoryOfficeId"
		| "officerPartyId"
		| "effectiveFrom"
		| "effectiveTo"
	>;
	office: Pick<StatutoryOffice, "maximumHolders">;
	existing: readonly OfficerAppointment[];
}): Result<void> {
	const overlapping = input.existing.filter(
		(row) =>
			row.id !== input.candidate.id &&
			row.status === "active" &&
			row.statutoryOfficeId === input.candidate.statutoryOfficeId &&
			effectiveRangesOverlap(
				{
					from: input.candidate.effectiveFrom,
					to: input.candidate.effectiveTo,
				},
				{ from: row.effectiveFrom, to: row.effectiveTo },
			),
	);
	if (
		overlapping.some(
			(row) => row.officerPartyId === input.candidate.officerPartyId,
		)
	) {
		return conflict("officerPartyId");
	}
	if (
		input.office.maximumHolders !== null &&
		overlapping.length + 1 > input.office.maximumHolders
	) {
		return conflict("maximumHolders");
	}
	return errorResult.ok(undefined);
}

export function calculateOfficerVacancyStatus(input: {
	office: StatutoryOffice;
	activeAppointments: readonly OfficerAppointment[];
	asOf: CanonicalDate;
}): OfficerVacancyStatus {
	const activeHolderCount = input.activeAppointments.filter((appointment) =>
		officerAppointmentMatchesAsOf(appointment, input.asOf),
	).length;
	const vacant =
		input.office.required && activeHolderCount < input.office.minimumHolders;
	const overfilled =
		input.office.maximumHolders !== null &&
		activeHolderCount > input.office.maximumHolders;
	const gracePeriodEndsOn = vacant
		? addDays(input.asOf, input.office.vacancyGraceDays)
		: null;
	return {
		statutoryOfficeId: input.office.id,
		legalCompanyId: input.office.legalCompanyId,
		asOf: input.asOf,
		required: input.office.required,
		minimumHolders: input.office.minimumHolders,
		maximumHolders: input.office.maximumHolders,
		activeHolderCount,
		vacant,
		overfilled,
		gracePeriodEndsOn,
		withinGracePeriod: vacant && input.office.vacancyGraceDays > 0,
	};
}

export function assertOfficerQualificationCurrent(input: {
	qualification: OfficerQualification;
	asOf: CanonicalDate;
}): Result<void> {
	return officerQualificationMatchesAsOf(input.qualification, input.asOf)
		? errorResult.ok(undefined)
		: errorResult.fail("CONFLICT", {
				publicMessage: "Officer qualification is not verified and current.",
			});
}

function addDays(value: CanonicalDate, days: number): CanonicalDate {
	const date = new Date(`${value}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10) as CanonicalDate;
}

function conflict(_field: string): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage:
			"Officer appointment conflicts with existing statutory office history.",
	});
}
