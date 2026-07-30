import { fail, ok, type Result } from "@afenda/errors/result";

import {
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import type { CorporateAdministrationQueryOptions } from "../../command-options";
import { corporateAdministrationErrorDetails } from "../../error-codes";
import { parseCorporateAdministrationInput } from "../../parse-input";
import { calculateOfficerVacancyStatus } from "../rules";
import {
	getOfficerAppointmentInputSchema,
	getOfficerVacancyStatusInputSchema,
	listOfficersAsOfInputSchema,
	listRequiredStatutoryOfficesInputSchema,
} from "../schemas";
import type { OfficerQueryDependencies } from "../store";
import type {
	GetOfficerAppointmentInput,
	GetOfficerVacancyStatusInput,
	ListOfficersAsOfInput,
	ListRequiredStatutoryOfficesInput,
	OfficerAppointment,
	OfficerVacancyStatus,
	StatutoryOffice,
} from "../types";

export async function listRequiredStatutoryOffices(
	input: ListRequiredStatutoryOfficesInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: OfficerQueryDependencies,
): Promise<Result<readonly StatutoryOffice[]>> {
	const parsed = parseCorporateAdministrationInput(
		listRequiredStatutoryOfficesInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "listRequiredStatutoryOffices");
	if (!authorized.ok) {
		return authorized;
	}
	return dependencies.officerStore.listRequiredStatutoryOffices({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		asOf: parsed.data.asOf,
		jurisdictionCode: parsed.data.jurisdictionCode,
		includeOptional: parsed.data.includeOptional,
	});
}

export async function listOfficersAsOf(
	input: ListOfficersAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: OfficerQueryDependencies,
): Promise<Result<readonly OfficerAppointment[]>> {
	const parsed = parseCorporateAdministrationInput(
		listOfficersAsOfInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "listOfficersAsOf");
	if (!authorized.ok) {
		return authorized;
	}
	return dependencies.officerStore.listOfficersAsOf({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		asOf: parsed.data.asOf,
		statutoryOfficeId: parsed.data.statutoryOfficeId,
		officerPartyId: parsed.data.officerPartyId,
	});
}

export async function getOfficerAppointment(
	input: GetOfficerAppointmentInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: OfficerQueryDependencies,
): Promise<Result<OfficerAppointment>> {
	const parsed = parseCorporateAdministrationInput(
		getOfficerAppointmentInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "getOfficerAppointment");
	if (!authorized.ok) {
		return authorized;
	}
	const result = await dependencies.officerStore.getOfficerAppointment({
		organizationId: options.organizationId,
		officerAppointmentId: parsed.data.officerAppointmentId,
	});
	if (!result.ok) {
		return result;
	}
	return result.data === null
		? notFound("officerAppointment")
		: ok(result.data);
}

export async function getOfficerVacancyStatus(
	input: GetOfficerVacancyStatusInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: OfficerQueryDependencies,
): Promise<Result<OfficerVacancyStatus>> {
	const parsed = parseCorporateAdministrationInput(
		getOfficerVacancyStatusInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "getOfficerVacancyStatus");
	if (!authorized.ok) {
		return authorized;
	}
	const office = await dependencies.officerStore.getStatutoryOffice({
		organizationId: options.organizationId,
		statutoryOfficeId: parsed.data.statutoryOfficeId,
	});
	if (!office.ok) {
		return office;
	}
	if (office.data === null) {
		return notFound("statutoryOffice");
	}
	const appointments = await dependencies.officerStore.listOfficerAppointments({
		organizationId: options.organizationId,
		statutoryOfficeId: parsed.data.statutoryOfficeId,
	});
	if (!appointments.ok) {
		return appointments;
	}
	return ok(
		calculateOfficerVacancyStatus({
			office: office.data,
			activeAppointments: appointments.data,
			asOf: parsed.data.asOf,
		}),
	);
}

function authorize(
	options: CorporateAdministrationQueryOptions,
	query: keyof typeof CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
) {
	return requireCorporateAdministrationPermission(options.authorization, {
		organizationId: options.organizationId,
		actorUserId: options.actorUserId,
		permission: CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS[query],
	});
}

function notFound(entityType: string): Result<never> {
	return fail(
		"NOT_FOUND",
		"Corporate Administration record was not found.",
		corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_NOT_FOUND", {
			entityType,
		}),
	);
}
