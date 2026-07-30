import { fail, ok, type Result } from "@afenda/errors/result";

import {
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../authorization";
import type { CorporateAdministrationQueryOptions } from "../command-options";
import { corporateAdministrationErrorDetails } from "../error-codes";
import { parseCorporateAdministrationInput } from "../parse-input";
import { calculateOfficerEligibilityAsOf } from "./compliance-rules";
import {
	getOfficerEligibilityAsOfInputSchema,
	listActiveDisqualificationsInputSchema,
	listConflictsForMatterInputSchema,
	listExpiringDeclarationsInputSchema,
} from "./compliance-schemas";
import type { OfficerComplianceStore } from "./compliance-store";
import type {
	ConflictDisclosure,
	GetOfficerEligibilityAsOfInput,
	ListActiveDisqualificationsInput,
	ListConflictsForMatterInput,
	ListExpiringDeclarationsInput,
	OfficerDeclaration,
	OfficerDisqualification,
	OfficerEligibilityAsOf,
} from "./compliance-types";

export type OfficerComplianceQueryDependencies = Readonly<{
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
	const authorized = await authorize(options, "getOfficerEligibilityAsOf");
	if (!authorized.ok) {
		return authorized;
	}
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
	return ok(
		calculateOfficerEligibilityAsOf({
			officerAppointmentId: parsed.data.officerAppointmentId,
			asOf: parsed.data.asOf,
			declarations: declarations.data,
			disqualifications: disqualifications.data,
		}),
	);
}

export async function listExpiringDeclarations(
	input: ListExpiringDeclarationsInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: OfficerComplianceQueryDependencies,
): Promise<Result<readonly OfficerDeclaration[]>> {
	const parsed = parseCorporateAdministrationInput(
		listExpiringDeclarationsInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "listExpiringDeclarations");
	if (!authorized.ok) {
		return authorized;
	}
	return dependencies.officerComplianceStore.listExpiringDeclarations({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		asOf: parsed.data.asOf,
		windowDays: parsed.data.windowDays,
		declarationType: parsed.data.declarationType,
	});
}

export async function listActiveDisqualifications(
	input: ListActiveDisqualificationsInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: OfficerComplianceQueryDependencies,
): Promise<Result<readonly OfficerDisqualification[]>> {
	const parsed = parseCorporateAdministrationInput(
		listActiveDisqualificationsInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "listActiveDisqualifications");
	if (!authorized.ok) {
		return authorized;
	}
	return dependencies.officerComplianceStore.listActiveDisqualifications({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		asOf: parsed.data.asOf,
		officerAppointmentId: parsed.data.officerAppointmentId,
	});
}

export async function listConflictsForMatter(
	input: ListConflictsForMatterInput,
	options: CorporateAdministrationQueryOptions,
	dependencies: OfficerComplianceQueryDependencies,
): Promise<Result<readonly ConflictDisclosure[]>> {
	const parsed = parseCorporateAdministrationInput(
		listConflictsForMatterInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const authorized = await authorize(options, "listConflictsForMatter");
	if (!authorized.ok) {
		return authorized;
	}
	return dependencies.officerComplianceStore.listConflictsForMatter({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		matterType: parsed.data.matterType,
		matterId: parsed.data.matterId,
		includeCleared: parsed.data.includeCleared,
	});
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

export function officerComplianceNotFound(entityType: string): Result<never> {
	return fail(
		"NOT_FOUND",
		"Corporate Administration record was not found.",
		corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_NOT_FOUND", {
			entityType,
		}),
	);
}
