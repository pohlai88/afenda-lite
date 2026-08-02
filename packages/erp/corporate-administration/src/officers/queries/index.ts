import { errorResult, type Result } from "@afenda/errors";

import type { CorporateAdministrationQueryOptions } from "../../command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../internal/query";
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

type Dependencies = OfficerQueryDependencies &
	CorporateAdministrationQueryKernelDependencies;

export async function listRequiredStatutoryOffices(
	input: ListRequiredStatutoryOfficesInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: Dependencies,
): Promise<Result<readonly StatutoryOffice[]>> {
	const parsed = parseCorporateAdministrationInput(
		listRequiredStatutoryOfficesInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "listRequiredStatutoryOffices",
		options,
		dependencies,
		work: () =>
			dependencies.officerStore.listRequiredStatutoryOffices({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				asOf: parsed.data.asOf,
				jurisdictionCode: parsed.data.jurisdictionCode,
				includeOptional: parsed.data.includeOptional,
			}),
	});
}

export async function listOfficersAsOf(
	input: ListOfficersAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: Dependencies,
): Promise<Result<readonly OfficerAppointment[]>> {
	const parsed = parseCorporateAdministrationInput(
		listOfficersAsOfInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "listOfficersAsOf",
		options,
		dependencies,
		work: () =>
			dependencies.officerStore.listOfficersAsOf({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				asOf: parsed.data.asOf,
				statutoryOfficeId: parsed.data.statutoryOfficeId,
				officerPartyId: parsed.data.officerPartyId,
			}),
	});
}

export async function getOfficerAppointment(
	input: GetOfficerAppointmentInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: Dependencies,
): Promise<Result<OfficerAppointment>> {
	const parsed = parseCorporateAdministrationInput(
		getOfficerAppointmentInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "getOfficerAppointment",
		options,
		dependencies,
		work: async () => {
			const result = await dependencies.officerStore.getOfficerAppointment({
				organizationId: options.organizationId,
				officerAppointmentId: parsed.data.officerAppointmentId,
			});
			if (!result.ok) {
				return result;
			}
			return result.data === null
				? notFound("officerAppointment")
				: errorResult.ok(result.data);
		},
	});
}

export async function getOfficerVacancyStatus(
	input: GetOfficerVacancyStatusInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: Dependencies,
): Promise<Result<OfficerVacancyStatus>> {
	const parsed = parseCorporateAdministrationInput(
		getOfficerVacancyStatusInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "getOfficerVacancyStatus",
		options,
		dependencies,
		work: async () => {
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
			const appointments =
				await dependencies.officerStore.listOfficerAppointments({
					organizationId: options.organizationId,
					statutoryOfficeId: parsed.data.statutoryOfficeId,
				});
			if (!appointments.ok) {
				return appointments;
			}
			return errorResult.ok(
				calculateOfficerVacancyStatus({
					office: office.data,
					activeAppointments: appointments.data,
					asOf: parsed.data.asOf,
				}),
			);
		},
	});
}

function notFound(_entityType: string): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Corporate Administration record was not found.",
	});
}
