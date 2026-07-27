import { fail, type Result } from "@afenda/errors/result";
import type { z } from "zod";
import {
	CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import type { CorporateAdministrationCommandOptions } from "../../command-options";
import { corporateAdministrationErrorDetails } from "../../error-codes";
import { parseCorporateAdministrationInput } from "../../parse-input";
import {
	assertEffectivePeriodChronology,
	assertJurisdictionEntityTypeCompatible,
	assertSupersessionEligible,
} from "../rules";
import {
	companyJurisdictionProfileSchema,
	supersedeCompanyJurisdictionProfileInputSchema,
} from "../schemas";
import type { CompanyJurisdictionProfile } from "../types";
import {
	type DurableLegalCompanyCommandDependencies,
	runDurableCompanyCommand,
} from "./durable-command";

export type SupersedeCompanyJurisdictionProfileInput = z.input<
	typeof supersedeCompanyJurisdictionProfileInputSchema
>;

export async function supersedeCompanyJurisdictionProfile(
	input: SupersedeCompanyJurisdictionProfileInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: DurableLegalCompanyCommandDependencies,
): Promise<Result<CompanyJurisdictionProfile>> {
	const parsed = parseCorporateAdministrationInput(
		supersedeCompanyJurisdictionProfileInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const authorized = await requireCorporateAdministrationPermission(
		options.authorization,
		{
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			permission:
				CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS.supersedeCompanyJurisdictionProfile,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const chronology = assertEffectivePeriodChronology(
		parsed.data.replacement.effectiveRange,
	);
	if (!chronology.ok) {
		return chronology;
	}

	const lockedCompany = await dependencies.store.lockLegalCompany({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
	});
	if (!lockedCompany.ok) {
		return lockedCompany;
	}
	if (lockedCompany.data === null) {
		return fail(
			"NOT_FOUND",
			"Corporate Administration legal company was not found.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_NOT_FOUND",
				{ entityType: "legalCompany" },
			),
		);
	}

	const existingProfiles = await dependencies.store.listJurisdictionProfiles({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
	});
	if (!existingProfiles.ok) {
		return existingProfiles;
	}
	const currentProfile =
		existingProfiles.data.find(
			(profile) =>
				profile.jurisdictionProfileId === parsed.data.jurisdictionProfileId,
		) ?? null;
	const eligible = assertSupersessionEligible({
		profile: currentProfile,
		expectedVersion: parsed.data.expectedProfileVersion,
	});
	if (!eligible.ok) {
		return eligible;
	}

	const rules = await dependencies.jurisdictionRules.listEntityTypeRules({
		organizationId: options.organizationId,
		jurisdictionCountryCode: parsed.data.replacement.jurisdictionCountryCode,
	});
	if (!rules.ok) {
		return rules;
	}
	const compatible = assertJurisdictionEntityTypeCompatible({
		jurisdictionCountryCode: parsed.data.replacement.jurisdictionCountryCode,
		entityType: parsed.data.replacement.entityType,
		rules: rules.data,
	});
	if (!compatible.ok) {
		return compatible;
	}

	const overlap = await dependencies.store.hasOverlappingJurisdictionProfile({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		effectiveRange: parsed.data.replacement.effectiveRange,
		ignoreJurisdictionProfileId: parsed.data.jurisdictionProfileId,
	});
	if (!overlap.ok) {
		return overlap;
	}
	if (overlap.data) {
		return fail(
			"CONFLICT",
			"Corporate Administration jurisdiction profile overlaps an existing profile.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
				{ field: "effectiveRange" },
			),
		);
	}

	return runDurableCompanyCommand({
		commandId:
			"corporate-administration.legal-company.supersede-jurisdiction-profile",
		fingerprintSchema: supersedeCompanyJurisdictionProfileInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: companyJurisdictionProfileSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.legal_company.jurisdiction_profile_set.v1",
			operationType: "UPDATE",
			targetType: "ca_company_jurisdiction_profile",
			aggregateId: (result) => result.legalCompanyId,
			aggregateVersion: () => lockedCompany.data?.version ?? 1,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				profileVersion: result.version,
				jurisdictionProfileId: result.jurisdictionProfileId,
				jurisdictionCode: result.jurisdictionCountryCode,
				entityTypeCode: result.entityType,
				effectiveFrom: result.effectiveRange.from,
				effectiveTo: result.effectiveRange.to,
				supersedesId: parsed.data.jurisdictionProfileId,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
				...(context.causationId === undefined
					? {}
					: { causationId: context.causationId }),
			}),
			safeMetadata: { change_type: "jurisdiction_profile_supersession" },
		},
		work: (transaction) =>
			dependencies.store.supersedeJurisdictionProfile({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				jurisdictionProfileId: parsed.data.jurisdictionProfileId,
				replacement: parsed.data.replacement,
				expectedProfileVersion: parsed.data.expectedProfileVersion,
				recordedByUserId: options.actorUserId,
				correlationId: options.correlationId,
				causationId: options.causationId,
				transaction,
			}),
	});
}
