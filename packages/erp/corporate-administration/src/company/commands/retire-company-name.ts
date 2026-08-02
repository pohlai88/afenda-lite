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
import { validateCompanyNameSupersession } from "../rules";
import { companyNameSchema, retireCompanyNameInputSchema } from "../schemas";
import type { CompanyNameCommandDependencies } from "../store";
import type { CompanyName, RetireCompanyNameInput } from "../types";

type RetireCompanyNameDependencies = CompanyNameCommandDependencies &
	Pick<
		CorporateAdministrationCommandKernelDependencies,
		"runtime" | "createEventId"
	> &
	CorporateAdministrationApprovalVerificationDependencies;

type RetireCompanyNameOptions = CorporateAdministrationCommandOptions &
	Partial<
		Pick<
			CorporateAdministrationApprovalCommandOptions,
			"approvalDecisionId" | "approvalRequestId"
		>
	>;

export async function retireCompanyName(
	input: RetireCompanyNameInput,
	options: RetireCompanyNameOptions,
	dependencies: RetireCompanyNameDependencies,
): Promise<Result<CompanyName>> {
	const parsed = parseCorporateAdministrationInput(
		retireCompanyNameInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const authorized = await authorizeCorporateAdministrationCommand(
		"retireCompanyName",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}

	const sourceDocument =
		parsed.data.sourceDocumentId === undefined ||
		parsed.data.sourceDocumentId === null
			? null
			: await dependencies.referenceData.validateSourceDocument({
					organizationId: options.organizationId,
					sourceDocumentId: parsed.data.sourceDocumentId,
				});
	if (sourceDocument !== null) {
		if (!sourceDocument.ok) {
			return sourceDocument;
		}
		if (sourceDocument.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage:
					"Corporate Administration source document was not found.",
			});
		}
		if (!sourceDocument.data.active) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Corporate Administration source document is inactive.",
			});
		}
	}

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
	if (
		eligible.data.nameType !== "trading" &&
		eligible.data.nameType !== "translated"
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Corporate Administration only trading or translated company names can be retired directly.",
		});
	}

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: retireCompanyNameInputSchema,
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
				retiredAt: result.retiredAt?.toISOString() ?? parsed.data.retiredAt,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
			safeMetadata: {
				change_type: "company_name_retirement",
				name_type: eligible.data.nameType,
			},
		},
		serializeResult: serializeCompanyNameForReplay,
		work: (transaction) =>
			dependencies.nameStore.retireCompanyName({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				companyNameId: parsed.data.companyNameId,
				retiredAt: parsed.data.retiredAt,
				retirementReason: parsed.data.retirementReason,
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
