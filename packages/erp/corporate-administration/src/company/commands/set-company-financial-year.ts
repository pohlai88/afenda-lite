import { fail, type Result } from "@afenda/errors/result";
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
import { corporateAdministrationErrorDetails } from "../../error-codes";
import { parseCorporateAdministrationInput } from "../../parse-input";
import {
	validateFinancialYearChronology,
	validateFinancialYearEnd,
} from "../rules";
import {
	companyFinancialYearSchema,
	setCompanyFinancialYearInputSchema,
} from "../schemas";
import type { CompanyFinancialYearCommandDependencies } from "../store";
import type {
	CompanyFinancialYear,
	SetCompanyFinancialYearInput,
} from "../types";
import {
	type DurableLegalCompanyCommandDependencies,
	runDurableCompanyCommand,
} from "./durable-command";

type SetCompanyFinancialYearDependencies =
	CompanyFinancialYearCommandDependencies &
		Pick<DurableLegalCompanyCommandDependencies, "runtime" | "createEventId"> &
		CorporateAdministrationApprovalVerificationDependencies;

type SetCompanyFinancialYearOptions = CorporateAdministrationCommandOptions &
	Partial<
		Pick<
			CorporateAdministrationApprovalCommandOptions,
			"approvalDecisionId" | "approvalRequestId"
		>
	>;

export async function setCompanyFinancialYear(
	input: SetCompanyFinancialYearInput,
	options: SetCompanyFinancialYearOptions,
	dependencies: SetCompanyFinancialYearDependencies,
): Promise<Result<CompanyFinancialYear>> {
	const parsed = parseCorporateAdministrationInput(
		setCompanyFinancialYearInputSchema,
		input,
	);
	if (!parsed.ok) return parsed;

	const authorized = await requireCorporateAdministrationPermission(
		options.authorization,
		{
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			permission:
				CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS.setCompanyFinancialYear,
		},
	);
	if (!authorized.ok) return authorized;

	const identity = createCorporateAdministrationCommandFingerprint({
		schema: setCompanyFinancialYearInputSchema,
		organizationId: options.organizationId,
		commandId: "corporate-administration.legal-company.set-financial-year",
		input: parsed.data,
	});
	if (!identity.ok) return identity;
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
	if (!approved.ok) return approved;

	const financialYearEnd = validateFinancialYearEnd({
		month: parsed.data.fiscalYearStartMonth,
		day: parsed.data.fiscalYearStartDay,
		allowFebruary29: true,
	});
	if (!financialYearEnd.ok) return financialYearEnd;

	const current = await dependencies.store.lockLegalCompany({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		expectedVersion: parsed.data.expectedCompanyVersion,
	});
	if (!current.ok) return current;
	if (current.data === null) return legalCompanyNotFound();
	if (current.data.version !== parsed.data.expectedCompanyVersion) {
		return staleCompanyVersion(
			parsed.data.expectedCompanyVersion,
			current.data.version,
		);
	}

	const currency = await dependencies.referenceData.resolveCurrency({
		organizationId: options.organizationId,
		currencyCode: parsed.data.reportingCurrencyCode,
		effectiveDate: parsed.data.effectiveFrom,
	});
	if (!currency.ok) return currency;
	if (currency.data === null || !currency.data.active) {
		return inactiveReference("reportingCurrencyCode", currency.data === null);
	}

	const source = await dependencies.referenceData.validateSourceDocument({
		organizationId: options.organizationId,
		sourceDocumentId: parsed.data.sourceDocumentId,
	});
	if (!source.ok) return source;
	if (source.data === null || !source.data.active) {
		return inactiveReference("sourceDocumentId", source.data === null);
	}
	const sourceDocumentId = source.data.sourceDocumentId;

	const effectivePeriod = {
		from: parsed.data.effectiveFrom,
		to: parsed.data.effectiveTo ?? null,
	} as const;
	const overlap =
		await dependencies.financialYearStore.findOverlappingCompanyFinancialYear({
			organizationId: options.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			effectivePeriod,
		});
	if (!overlap.ok) return overlap;
	const chronology = validateFinancialYearChronology({
		candidate: effectivePeriod,
		existing: overlap.data === null ? [] : [overlap.data],
	});
	if (!chronology.ok) return chronology;

	return runDurableCompanyCommand({
		commandId: "corporate-administration.legal-company.set-financial-year",
		fingerprintSchema: setCompanyFinancialYearInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: companyFinancialYearSchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.legal_company.financial_year_set.v1",
			operationType: "UPDATE",
			targetType: "ca_company_financial_year",
			aggregateId: (result) => result.legalCompanyId,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				companyFinancialYearId: result.id,
				yearEndMonth: result.fiscalYearStartMonth,
				yearEndDay: result.fiscalYearStartDay,
				functionalCurrencyCode: result.reportingCurrencyCode,
				effectiveFrom: result.effectiveFrom,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
			safeMetadata: { change_type: "company_financial_year" },
		},
		serializeResult: serializeFinancialYearForReplay,
		work: (transaction, context) =>
			dependencies.financialYearStore.setCompanyFinancialYear({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				fiscalYearStartMonth: parsed.data.fiscalYearStartMonth,
				fiscalYearStartDay: parsed.data.fiscalYearStartDay,
				reportingCurrencyCode: parsed.data.reportingCurrencyCode,
				effectivePeriod,
				recordedAt: context.occurredAt,
				recordedByUserId: options.actorUserId,
				sourceDocumentId,
				correctionReason: parsed.data.correctionReason,
				expectedCompanyVersion: parsed.data.expectedCompanyVersion,
				correlationId: options.correlationId,
				causationId: options.causationId,
				transaction,
			}),
	});
}

function serializeFinancialYearForReplay(
	result: CompanyFinancialYear,
): unknown {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
	};
}

function legalCompanyNotFound(): Result<never> {
	return fail(
		"NOT_FOUND",
		"Corporate Administration legal company was not found.",
		corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_NOT_FOUND", {
			entityType: "legalCompany",
		}),
	);
}

function staleCompanyVersion(
	expectedVersion: number,
	actualVersion: number,
): Result<never> {
	return fail(
		"CONFLICT",
		"Corporate Administration legal company version is stale.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_STALE_VERSION",
			{ expectedVersion, actualVersion },
		),
	);
}

function inactiveReference(field: string, missing: boolean): Result<never> {
	return fail(
		missing ? "VALIDATION_ERROR" : "CONFLICT",
		"Corporate Administration reference is not active.",
		corporateAdministrationErrorDetails(
			missing
				? "CORPORATE_ADMINISTRATION_REFERENCE_INVALID"
				: "CORPORATE_ADMINISTRATION_REFERENCE_INACTIVE",
			{ field },
		),
	);
}
