import { errorResult, type Result } from "@afenda/errors";

import type { CorporateAdministrationQueryOptions } from "../../kernel/execution/command-options";
import {
	type CorporateAdministrationQueryKernelDependencies,
	executeCorporateAdministrationQuery,
} from "../../kernel/internal/query";
import { parseCorporateAdministrationInput } from "../../kernel/validation/parse-input";
import { calculateOfficerEligibilityAsOf } from "./compliance-rules";
import {
	getOfficerEligibilityAsOfInputSchema,
	listActiveDisqualificationsInputSchema,
	listConflictsForMatterInputSchema,
	listExpiringDeclarationsInputSchema,
} from "./compliance-schemas";
import type { OfficerComplianceStore } from "./compliance-store";
import type {
	ConflictDisclosureListPage,
	GetOfficerEligibilityAsOfInput,
	ListActiveDisqualificationsInput,
	ListConflictsForMatterInput,
	ListExpiringDeclarationsInput,
	OfficerDeclarationListPage,
	OfficerDisqualificationListPage,
	OfficerEligibilityAsOf,
} from "./compliance-types";

export type OfficerComplianceQueryDependencies =
	CorporateAdministrationQueryKernelDependencies &
		Readonly<{
			officerComplianceStore: OfficerComplianceStore;
		}>;

export async function getOfficerEligibilityAsOf(
	input: GetOfficerEligibilityAsOfInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: OfficerComplianceQueryDependencies,
): Promise<Result<OfficerEligibilityAsOf>> {
	const parsed = parseCorporateAdministrationInput(
		getOfficerEligibilityAsOfInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "getOfficerEligibilityAsOf",
		options,
		dependencies,
		work: async () => {
			const declarations =
				await dependencies.officerComplianceStore.listOfficerDeclarations({
					organizationId: options.organizationId,
					officerAppointmentId: parsed.data.officerAppointmentId,
				});
			if (!declarations.ok) {
				return declarations;
			}
			const disqualifications =
				await dependencies.officerComplianceStore.listOfficerDisqualifications({
					organizationId: options.organizationId,
					officerAppointmentId: parsed.data.officerAppointmentId,
				});
			if (!disqualifications.ok) {
				return disqualifications;
			}
			return errorResult.ok(
				calculateOfficerEligibilityAsOf({
					officerAppointmentId: parsed.data.officerAppointmentId,
					asOf: parsed.data.asOf,
					declarations: declarations.data,
					disqualifications: disqualifications.data,
				}),
			);
		},
	});
}

export async function listExpiringDeclarations(
	input: ListExpiringDeclarationsInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: OfficerComplianceQueryDependencies,
): Promise<Result<OfficerDeclarationListPage>> {
	const parsed = parseCorporateAdministrationInput(
		listExpiringDeclarationsInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "listExpiringDeclarations",
		options,
		dependencies,
		work: () =>
			dependencies.officerComplianceStore.listExpiringDeclarations({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				asOf: parsed.data.asOf,
				windowDays: parsed.data.windowDays,
				declarationType: parsed.data.declarationType,
				cursor: parsed.data.cursor,
				pageSize: parsed.data.pageSize,
			}),
	});
}

export async function listActiveDisqualifications(
	input: ListActiveDisqualificationsInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: OfficerComplianceQueryDependencies,
): Promise<Result<OfficerDisqualificationListPage>> {
	const parsed = parseCorporateAdministrationInput(
		listActiveDisqualificationsInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "listActiveDisqualifications",
		options,
		dependencies,
		work: () =>
			dependencies.officerComplianceStore.listActiveDisqualifications({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				asOf: parsed.data.asOf,
				officerAppointmentId: parsed.data.officerAppointmentId,
				cursor: parsed.data.cursor,
				pageSize: parsed.data.pageSize,
			}),
	});
}

export async function listConflictsForMatter(
	input: ListConflictsForMatterInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: OfficerComplianceQueryDependencies,
): Promise<Result<ConflictDisclosureListPage>> {
	const parsed = parseCorporateAdministrationInput(
		listConflictsForMatterInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	return await executeCorporateAdministrationQuery({
		operationId: "listConflictsForMatter",
		options,
		dependencies,
		work: () =>
			dependencies.officerComplianceStore.listConflictsForMatter({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				matterType: parsed.data.matterType,
				matterId: parsed.data.matterId,
				includeCleared: parsed.data.includeCleared,
				cursor: parsed.data.cursor,
				pageSize: parsed.data.pageSize,
			}),
	});
}

export function officerComplianceNotFound(_entityType: string): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Corporate Administration record was not found.",
	});
}
