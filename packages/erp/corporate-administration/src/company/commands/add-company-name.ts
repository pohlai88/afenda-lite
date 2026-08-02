import { errorResult, type Result } from "@afenda/errors";
import type { CorporateAdministrationApprovalVerificationDependencies } from "../../authorization";
import type {
	CorporateAdministrationApprovalCommandOptions,
	CorporateAdministrationCommandOptions,
} from "../../command-options";
import {
	authorizeCorporateAdministrationCommand,
	type CorporateAdministrationCommandKernelDependencies,
	executeCorporateAdministrationCommand,
} from "../../internal/durable-command";
import { parseCorporateAdministrationInput } from "../../parse-input";
import { normalizeCompanyName, validateCompanyNameLanguage } from "../rules";
import { addCompanyNameInputSchema, companyNameSchema } from "../schemas";
import type { CompanyNameCommandDependencies } from "../store";
import type { AddCompanyNameInput, CompanyName } from "../types";

type AddCompanyNameDependencies = CompanyNameCommandDependencies &
	Pick<
		CorporateAdministrationCommandKernelDependencies,
		"runtime" | "createEventId"
	> &
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

	const authorized = await authorizeCorporateAdministrationCommand(
		"addCompanyName",
		options,
	);
	if (!authorized.ok) {
		return authorized;
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

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: addCompanyNameInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: companyNameSchema,
		dependencies,
		event: {
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
