import { errorResult, type Result } from "@afenda/errors";
import { z } from "zod";
import type { CorporateAdministrationCommandOptions } from "../../command-options";
import {
	authorizeCorporateAdministrationCommand,
	type CorporateAdministrationCommandKernelDependencies,
	executeCorporateAdministrationCommand,
} from "../../internal/durable-command";
import {
	assertJurisdictionEntityTypeCompatible,
	normalizeLegalCompanyCode,
} from "../rules";
import {
	legalCompanySchema,
	registerLegalCompanyDraftInputSchema,
} from "../schemas";
import type { LegalCompanyCommandDependencies } from "../store";
import type { LegalCompany } from "../types";

export type RegisterLegalCompanyDraftInput = z.input<
	typeof registerLegalCompanyDraftInputSchema
>;

export type RegisterLegalCompanyDraftDependencies =
	LegalCompanyCommandDependencies &
		CorporateAdministrationCommandKernelDependencies;

const registerLegalCompanyDraftFingerprintSchema = z
	.object({
		companyCode: z.string().trim().min(1).max(64),
		displayName: z.string().trim().min(1).max(256),
		masterDataPartyId: z.string().trim().min(1).max(128),
		homeJurisdictionCountryCode: z
			.string()
			.trim()
			.regex(/^[A-Z]{2}$/),
		sourceReference: z.string().trim().min(1).max(256),
		normalizedCompanyCode: z.string().min(1).max(64),
	})
	.strict()
	.readonly();

export async function registerLegalCompanyDraft(
	input: RegisterLegalCompanyDraftInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: RegisterLegalCompanyDraftDependencies,
): Promise<Result<LegalCompany>> {
	const parsed = registerLegalCompanyDraftInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Corporate Administration input is invalid",
		});
	}

	const authorized = await authorizeCorporateAdministrationCommand(
		"registerLegalCompanyDraft",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}

	const normalizedCompanyCode = normalizeLegalCompanyCode(
		parsed.data.companyCode,
	);
	const normalizedInput = {
		...parsed.data,
		normalizedCompanyCode,
	} as const;
	const party = await dependencies.partyReferences.getOrganizationParty({
		organizationId: options.organizationId,
		partyId: parsed.data.masterDataPartyId,
	});
	if (!party.ok) {
		return party;
	}
	if (party.data === null || party.data.kind !== "organization") {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"Corporate Administration legal company requires an organization party.",
		});
	}
	if (!party.data.active) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Corporate Administration legal company party is inactive.",
		});
	}

	const rules = await dependencies.jurisdictionRules.listEntityTypeRules({
		organizationId: options.organizationId,
		jurisdictionCountryCode: parsed.data.homeJurisdictionCountryCode,
	});
	if (!rules.ok) {
		return rules;
	}
	const compatible = assertJurisdictionEntityTypeCompatible({
		jurisdictionCountryCode: parsed.data.homeJurisdictionCountryCode,
		entityType: "draft_legal_company",
		rules: rules.data,
	});
	if (!compatible.ok) {
		return compatible;
	}

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: registerLegalCompanyDraftFingerprintSchema,
		fingerprintInput: normalizedInput,
		outputSchema: legalCompanySchema,
		dependencies,
		event: {
			operationType: "CREATE",
			targetType: "ca_legal_company",
			aggregateId: (result) => result.legalCompanyId,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				companyCode: result.companyCode,
				profileVersion: result.version,
				state: result.state,
				homeJurisdictionCountryCode: result.homeJurisdictionCountryCode,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
				...(context.causationId === undefined
					? {}
					: { causationId: context.causationId }),
			}),
			safeMetadata: {
				company_state: "draft",
				home_jurisdiction: parsed.data.homeJurisdictionCountryCode,
			},
		},
		work: (transaction, context) =>
			dependencies.store.registerLegalCompanyDraft({
				organizationId: options.organizationId,
				companyCode: parsed.data.companyCode,
				normalizedCompanyCode,
				displayName: parsed.data.displayName,
				masterDataPartyId: parsed.data.masterDataPartyId,
				homeJurisdictionCountryCode: parsed.data.homeJurisdictionCountryCode,
				sourceReference: parsed.data.sourceReference,
				createdByUserId: options.actorUserId,
				correlationId: options.correlationId,
				causationId: options.causationId,
				createdAt: context.occurredAt,
				transaction,
			}),
	});
}
