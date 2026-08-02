import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";
import type { CorporateAdministrationCommandOptions } from "../../../kernel/execution/command-options";
import { corporateAdministrationEffectiveRangeOverlapResult } from "../../../kernel/execution/error-codes";
import {
	authorizeCorporateAdministrationCommand,
	type CorporateAdministrationCommandKernelDependencies,
	executeCorporateAdministrationCommand,
} from "../../../kernel/internal/durable-command";
import { parseCorporateAdministrationInput } from "../../../kernel/validation/parse-input";
import {
	assertEffectivePeriodChronology,
	assertJurisdictionEntityTypeCompatible,
} from "../rules";
import {
	companyJurisdictionProfileSchema,
	setCompanyJurisdictionProfileInputSchema,
} from "../schemas";
import type { LegalCompanyCommandDependencies } from "../store";
import type { CompanyJurisdictionProfile } from "../types";

export type SetCompanyJurisdictionProfileInput = z.input<
	typeof setCompanyJurisdictionProfileInputSchema
>;

export async function setCompanyJurisdictionProfile(
	input: SetCompanyJurisdictionProfileInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: CorporateAdministrationCommandKernelDependencies &
		LegalCompanyCommandDependencies,
): Promise<Result<CompanyJurisdictionProfile>> {
	const parsed = parseCorporateAdministrationInput(
		setCompanyJurisdictionProfileInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const authorized = await authorizeCorporateAdministrationCommand(
		"setCompanyJurisdictionProfile",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}

	const chronology = assertEffectivePeriodChronology(
		parsed.data.effectiveRange,
	);
	if (!chronology.ok) {
		return chronology;
	}

	const currentCompany = await dependencies.store.lockLegalCompany({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		expectedVersion: parsed.data.expectedCompanyVersion,
	});
	if (!currentCompany.ok) {
		return currentCompany;
	}
	if (currentCompany.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Corporate Administration legal company was not found.",
		});
	}
	if (currentCompany.data.version !== parsed.data.expectedCompanyVersion) {
		const overlap = await dependencies.store.hasOverlappingJurisdictionProfile({
			organizationId: options.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			effectiveRange: parsed.data.effectiveRange,
		});
		if (!overlap.ok) {
			return overlap;
		}
		if (overlap.data) {
			return corporateAdministrationEffectiveRangeOverlapResult();
		}
		return errorResult.fail("CONFLICT", {
			publicMessage: "Corporate Administration legal company version is stale.",
		});
	}

	const rules = await dependencies.jurisdictionRules.listEntityTypeRules({
		organizationId: options.organizationId,
		jurisdictionCountryCode: parsed.data.jurisdictionCountryCode,
	});
	if (!rules.ok) {
		return rules;
	}
	const compatible = assertJurisdictionEntityTypeCompatible({
		jurisdictionCountryCode: parsed.data.jurisdictionCountryCode,
		entityType: parsed.data.entityType,
		rules: rules.data,
	});
	if (!compatible.ok) {
		return compatible;
	}

	const overlap = await dependencies.store.hasOverlappingJurisdictionProfile({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		effectiveRange: parsed.data.effectiveRange,
	});
	if (!overlap.ok) {
		return overlap;
	}
	if (overlap.data) {
		return corporateAdministrationEffectiveRangeOverlapResult();
	}

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: setCompanyJurisdictionProfileInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: companyJurisdictionProfileSchema,
		dependencies,
		event: {
			operationType: "UPDATE",
			targetType: "ca_company_jurisdiction_profile",
			aggregateId: (result) => result.legalCompanyId,
			aggregateVersion: () => parsed.data.expectedCompanyVersion + 1,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				profileVersion: result.version,
				jurisdictionProfileId: result.jurisdictionProfileId,
				jurisdictionCode: result.jurisdictionCountryCode,
				entityTypeCode: result.entityType,
				effectiveFrom: result.effectiveRange.from,
				effectiveTo: result.effectiveRange.to,
				supersedesId: null,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
				...(context.causationId === undefined
					? {}
					: { causationId: context.causationId }),
			}),
			safeMetadata: { change_type: "jurisdiction_profile" },
		},
		work: (transaction) =>
			dependencies.store.insertJurisdictionProfile({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				jurisdictionCountryCode: parsed.data.jurisdictionCountryCode,
				entityType: parsed.data.entityType,
				effectiveRange: parsed.data.effectiveRange,
				recordedAt: parsed.data.recordedAt,
				recordedByUserId: options.actorUserId,
				sourceReference: parsed.data.sourceReference,
				expectedCompanyVersion: parsed.data.expectedCompanyVersion,
				correlationId: options.correlationId,
				causationId: options.causationId,
				transaction,
			}),
	});
}
