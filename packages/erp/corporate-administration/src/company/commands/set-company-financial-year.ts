// biome-ignore-all lint/style/useDestructuring: Explicit company state access keeps financial-year evidence visible.
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

type SetCompanyFinancialYearDependencies =
	CompanyFinancialYearCommandDependencies &
		Pick<
			CorporateAdministrationCommandKernelDependencies,
			"runtime" | "createEventId"
		> &
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
	if (!parsed.ok) {
		return parsed;
	}

	const authorized = await authorizeCorporateAdministrationCommand(
		"setCompanyFinancialYear",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}

	const financialYearEnd = validateFinancialYearEnd({
		month: parsed.data.fiscalYearStartMonth,
		day: parsed.data.fiscalYearStartDay,
		allowFebruary29: true,
	});
	if (!financialYearEnd.ok) {
		return financialYearEnd;
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
		return legalCompanyNotFound();
	}
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
	if (!currency.ok) {
		return currency;
	}
	if (currency.data === null || !currency.data.active) {
		return inactiveReference("reportingCurrencyCode", currency.data === null);
	}

	const source = await dependencies.referenceData.validateSourceDocument({
		organizationId: options.organizationId,
		sourceDocumentId: parsed.data.sourceDocumentId,
	});
	if (!source.ok) {
		return source;
	}
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
	if (!overlap.ok) {
		return overlap;
	}
	const chronology = validateFinancialYearChronology({
		candidate: effectivePeriod,
		existing: overlap.data === null ? [] : [overlap.data],
	});
	if (!chronology.ok) {
		return chronology;
	}

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: setCompanyFinancialYearInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: companyFinancialYearSchema,
		dependencies,
		event: {
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
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Corporate Administration legal company was not found.",
	});
}

function staleCompanyVersion(
	_expectedVersion: number,
	_actualVersion: number,
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Corporate Administration legal company version is stale.",
	});
}

function inactiveReference(_field: string, missing: boolean): Result<never> {
	return missing
		? errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Corporate Administration reference is not active.",
			})
		: errorResult.fail("CONFLICT", {
				publicMessage: "Corporate Administration reference is not active.",
			});
}
