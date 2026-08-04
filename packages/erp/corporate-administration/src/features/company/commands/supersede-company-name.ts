// biome-ignore-all lint/style/useDestructuring: Explicit predecessor access keeps name supersession evidence visible.
import { errorResult, type Result } from "@afenda/errors";
import type { CorporateAdministrationApprovalVerificationDependencies } from "../../../kernel/authorization/authorization";
import type {
	CorporateAdministrationApprovalCommandOptions,
	CorporateAdministrationCommandOptions,
} from "../../../kernel/execution/command-options";
import {
	authorizeCorporateAdministrationCommand,
	type CorporateAdministrationCommandKernelDependencies,
	executeCorporateAdministrationCommand,
} from "../../../kernel/internal/durable-command";
import { parseCorporateAdministrationInput } from "../../../kernel/validation/parse-input";
import {
	normalizeCompanyName,
	validateCompanyNameSupersession,
} from "../rules";
import { companyNameSchema, supersedeCompanyNameInputSchema } from "../schemas";
import type { CompanyNameCommandDependencies } from "../store";
import type { CompanyName, SupersedeCompanyNameInput } from "../types";

type SupersedeCompanyNameDependencies = CompanyNameCommandDependencies &
	Pick<
		CorporateAdministrationCommandKernelDependencies,
		"runtime" | "createEventId"
	> &
	CorporateAdministrationApprovalVerificationDependencies;

type SupersedeCompanyNameOptions = CorporateAdministrationCommandOptions &
	Partial<
		Pick<
			CorporateAdministrationApprovalCommandOptions,
			"approvalDecisionId" | "approvalRequestId"
		>
	>;

export async function supersedeCompanyName(
	input: SupersedeCompanyNameInput,
	options: SupersedeCompanyNameOptions,
	dependencies: SupersedeCompanyNameDependencies,
): Promise<Result<CompanyName>> {
	const parsed = parseCorporateAdministrationInput(
		supersedeCompanyNameInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const authorized = await authorizeCorporateAdministrationCommand(
		"supersedeCompanyName",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}

	const sourceDocument =
		await dependencies.referenceData.validateSourceDocument({
			organizationId: options.organizationId,
			sourceDocumentId: parsed.data.replacement.sourceDocumentId,
		});
	if (!sourceDocument.ok) {
		return sourceDocument;
	}
	if (sourceDocument.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Corporate Administration source document was not found.",
		});
	}
	if (!sourceDocument.data.active) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Corporate Administration source document is inactive.",
		});
	}
	const sourceDocumentId = sourceDocument.data.sourceDocumentId;

	const existing = await dependencies.nameStore.getCompanyName({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		companyNameId: parsed.data.companyNameId,
	});
	if (!existing.ok) {
		return existing;
	}
	const eligible = validateCompanyNameSupersession({
		name: existing.data,
		expectedVersion: parsed.data.expectedNameVersion,
	});
	if (!eligible.ok) {
		return eligible;
	}

	const normalizedName = normalizeCompanyName(
		parsed.data.replacement.displayName,
	);
	const effectivePeriod = {
		from: parsed.data.replacement.effectiveFrom,
		to: parsed.data.replacement.effectiveTo ?? null,
	} as const;
	const overlap = await dependencies.nameStore.findOverlappingCompanyName({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		nameType: parsed.data.replacement.nameType,
		languageCode: parsed.data.replacement.languageCode,
		normalizedName,
		effectivePeriod,
		ignoreCompanyNameId: parsed.data.companyNameId,
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
		fingerprintSchema: supersedeCompanyNameInputSchema,
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
				predecessorCompanyNameId: parsed.data.companyNameId,
				successorCompanyNameId: result.id,
				nameType: result.nameType,
				languageCode: result.languageCode,
				effectiveFrom: result.effectiveFrom,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
			safeMetadata: {
				change_type: "company_name_supersession",
				name_type: parsed.data.replacement.nameType,
				language_code: parsed.data.replacement.languageCode,
			},
		},
		serializeResult: serializeCompanyNameForReplay,
		work: (transaction, context) =>
			dependencies.nameStore.supersedeCompanyName({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				companyNameId: parsed.data.companyNameId,
				replacement: {
					nameType: parsed.data.replacement.nameType,
					languageCode: parsed.data.replacement.languageCode,
					displayName: parsed.data.replacement.displayName,
					normalizedName,
					effectivePeriod,
					recordedAt: context.occurredAt,
					sourceDocumentId,
					correctionReason: parsed.data.replacement.correctionReason,
				},
				expectedNameVersion: parsed.data.expectedNameVersion,
				recordedByUserId: options.actorUserId,
				correlationId: options.correlationId,
				causationId: options.causationId,
				transaction,
			}),
	});
}

function serializeCompanyNameForReplay(result: CompanyName): unknown {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
		supersededAt: result.supersededAt?.toISOString() ?? null,
		retiredAt: result.retiredAt?.toISOString() ?? null,
	};
}
