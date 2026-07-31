import { errorResult, type Result } from "@afenda/errors";
import {
	CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
	type CorporateAdministrationApprovalVerificationDependencies,
	requireCorporateAdministrationApprovalIfConfigured,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import { createCorporateAdministrationCommandFingerprint } from "../../command-identity";
import type {
	CorporateAdministrationApprovalCommandOptions,
	CorporateAdministrationCommandOptions,
} from "../../command-options";
import { parseCorporateAdministrationInput } from "../../parse-input";
import { normalizeCompanyName, validateCompanyNameLanguage } from "../rules";
import { addCompanyNameInputSchema, companyNameSchema } from "../schemas";
import type { CompanyNameCommandDependencies } from "../store";
import type { AddCompanyNameInput, CompanyName } from "../types";
import {
	type DurableLegalCompanyCommandDependencies,
	runDurableCompanyCommand,
} from "./durable-command";

type AddCompanyNameDependencies = CompanyNameCommandDependencies &
	Pick<DurableLegalCompanyCommandDependencies, "runtime" | "createEventId"> &
	CorporateAdministrationApprovalVerificationDependencies;

type AddCompanyNameOptions = CorporateAdministrationCommandOptions &
	Partial<
		Pick<
			CorporateAdministrationApprovalCommandOptions,
			"approvalDecisionId" | "approvalRequestId"
		>
	>;

export async function addCompanyName(
	input: AddCompanyNameInput,
	options: AddCompanyNameOptions,
	dependencies: AddCompanyNameDependencies,
): Promise<Result<CompanyName>> {
	const parsed = parseCorporateAdministrationInput(
		addCompanyNameInputSchema,
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
			permission: CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS.addCompanyName,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const identity = createCorporateAdministrationCommandFingerprint({
		schema: addCompanyNameInputSchema,
		organizationId: options.organizationId,
		commandId: "corporate-administration.legal-company.add-company-name",
		input: parsed.data,
	});
	if (!identity.ok) {
		return identity;
	}
	const approved = await requireCorporateAdministrationApprovalIfConfigured(
		dependencies,
		{
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			approvalRequestId: options.approvalRequestId,
			approvalDecisionId: options.approvalDecisionId,
			commandFingerprint: identity.data.fingerprint,
		},
	);
	if (!approved.ok) {
		return approved;
	}

	const language = validateCompanyNameLanguage(parsed.data.languageCode);
	if (!language.ok) {
		return language;
	}
	const languageReference = await dependencies.referenceData.resolveLanguage({
		organizationId: options.organizationId,
		languageCode: language.data,
	});
	if (!languageReference.ok) {
		return languageReference;
	}
	if (languageReference.data === null) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"Corporate Administration company name language is not configured.",
		});
	}
	if (!languageReference.data.active) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Corporate Administration company name language is inactive.",
		});
	}
	const sourceDocument = await validateOptionalSourceDocument({
		sourceDocumentId: parsed.data.sourceDocumentId ?? null,
		options,
		dependencies,
	});
	if (!sourceDocument.ok) {
		return sourceDocument;
	}

	const current = await dependencies.store.lockLegalCompany({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		expectedVersion: parsed.data.expectedCompanyVersion,
	});
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Corporate Administration legal company was not found.",
		});
	}
	if (current.data.version !== parsed.data.expectedCompanyVersion) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Corporate Administration legal company version is stale.",
		});
	}

	const effectivePeriod = {
		from: parsed.data.effectiveFrom,
		to: parsed.data.effectiveTo ?? null,
	} as const;
	const normalizedName = normalizeCompanyName(parsed.data.displayName);
	const overlap = await dependencies.nameStore.findOverlappingCompanyName({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		nameType: parsed.data.nameType,
		languageCode: parsed.data.languageCode,
		normalizedName,
		effectivePeriod,
	});
	if (!overlap.ok) {
		return overlap;
	}
	if (overlap.data !== null) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Corporate Administration company name overlaps an existing name for the same type and language.",
		});
	}

	return runDurableCompanyCommand({
		commandId: "corporate-administration.legal-company.add-company-name",
		fingerprintSchema: addCompanyNameInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: companyNameSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.legal_company.name_added.v1",
			operationType: "UPDATE",
			targetType: "ca_company_name",
			aggregateId: (result) => result.legalCompanyId,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				companyNameId: result.id,
				nameType: result.nameType,
				languageCode: result.languageCode,
				effectiveFrom: result.effectiveFrom,
				effectiveTo: result.effectiveTo,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
				...(context.causationId === undefined
					? {}
					: { causationId: context.causationId }),
			}),
			safeMetadata: {
				change_type: "company_name",
				name_type: parsed.data.nameType,
				language_code: parsed.data.languageCode,
			},
		},
		serializeResult: serializeCompanyNameForReplay,
		work: (transaction, context) =>
			dependencies.nameStore.addCompanyName({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				nameType: parsed.data.nameType,
				languageCode: parsed.data.languageCode,
				displayName: parsed.data.displayName,
				normalizedName,
				effectivePeriod,
				recordedAt: context.occurredAt,
				recordedByUserId: options.actorUserId,
				sourceDocumentId: sourceDocument.data,
				correctionReason: parsed.data.correctionReason,
				expectedCompanyVersion: parsed.data.expectedCompanyVersion,
				correlationId: options.correlationId,
				causationId: options.causationId,
				transaction,
			}),
	});
}

async function validateOptionalSourceDocument(input: {
	sourceDocumentId: string | null;
	options: CorporateAdministrationCommandOptions;
	dependencies: AddCompanyNameDependencies;
}): Promise<Result<string | null>> {
	if (input.sourceDocumentId === null) {
		return { ok: true, data: null };
	}
	const source = await input.dependencies.referenceData.validateSourceDocument({
		organizationId: input.options.organizationId,
		sourceDocumentId: input.sourceDocumentId,
	});
	if (!source.ok) {
		return source;
	}
	if (source.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Corporate Administration source document was not found.",
		});
	}
	if (!source.data.active) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Corporate Administration source document is inactive.",
		});
	}
	return { ok: true, data: source.data.sourceDocumentId };
}

function serializeCompanyNameForReplay(result: CompanyName): unknown {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
		supersededAt: result.supersededAt?.toISOString() ?? null,
		retiredAt: result.retiredAt?.toISOString() ?? null,
	};
}
