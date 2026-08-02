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
import { validateIdentifierSupersession } from "../rules";
import {
	companyIdentifierSchema,
	retireCompanyIdentifierInputSchema,
} from "../schemas";
import type { CompanyIdentifierCommandDependencies } from "../store";
import type { CompanyIdentifier, RetireCompanyIdentifierInput } from "../types";

type RetireCompanyIdentifierDependencies =
	CompanyIdentifierCommandDependencies &
		Pick<
			CorporateAdministrationCommandKernelDependencies,
			"runtime" | "createEventId"
		> &
		CorporateAdministrationApprovalVerificationDependencies;

type RetireCompanyIdentifierOptions = CorporateAdministrationCommandOptions &
	Partial<
		Pick<
			CorporateAdministrationApprovalCommandOptions,
			"approvalDecisionId" | "approvalRequestId"
		>
	>;

export async function retireCompanyIdentifier(
	input: RetireCompanyIdentifierInput,
	options: RetireCompanyIdentifierOptions,
	dependencies: RetireCompanyIdentifierDependencies,
): Promise<Result<CompanyIdentifier>> {
	const parsed = parseCorporateAdministrationInput(
		retireCompanyIdentifierInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const authorized = await authorizeCorporateAdministrationCommand(
		"retireCompanyIdentifier",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}

	const existing = await dependencies.identifierStore.getCompanyIdentifier({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		companyIdentifierId: parsed.data.companyIdentifierId,
	});
	if (!existing.ok) {
		return existing;
	}
	const activeIdentifier = validateIdentifierSupersession({
		identifier: existing.data,
		expectedVersion: parsed.data.expectedIdentifierVersion,
	});
	if (!activeIdentifier.ok) {
		return activeIdentifier;
	}
	const retiredAtDate = parsed.data.retiredAt.slice(0, 10);
	if (retiredAtDate < activeIdentifier.data.effectiveFrom) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"Corporate Administration identifier retirement date cannot be before the identifier effective start.",
		});
	}

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: retireCompanyIdentifierInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: companyIdentifierSchema,
		dependencies,
		event: {
			operationType: "UPDATE",
			targetType: "ca_company_identifier",
			aggregateId: (result) => result.legalCompanyId,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				companyIdentifierId: result.id,
				identifierType: result.identifierType,
				jurisdictionCode: result.jurisdictionCode,
				retiredAt: result.retiredAt?.toISOString() ?? parsed.data.retiredAt,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
			}),
			safeMetadata: {
				change_type: "company_identifier_retirement",
				identifier_type: activeIdentifier.data.identifierType,
				jurisdiction_code: activeIdentifier.data.jurisdictionCode,
			},
		},
		serializeResult: serializeIdentifierForReplay,
		work: (transaction) =>
			dependencies.identifierStore.retireCompanyIdentifier({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				companyIdentifierId: parsed.data.companyIdentifierId,
				retiredAt: parsed.data.retiredAt,
				retirementReason: parsed.data.retirementReason,
				expectedIdentifierVersion: parsed.data.expectedIdentifierVersion,
				recordedByUserId: options.actorUserId,
				correlationId: options.correlationId,
				causationId: options.causationId,
				transaction,
			}),
	});
}

function serializeIdentifierForReplay(result: CompanyIdentifier): unknown {
	return {
		...result,
		recordedAt: result.recordedAt.toISOString(),
		supersededAt: result.supersededAt?.toISOString() ?? null,
		retiredAt: result.retiredAt?.toISOString() ?? null,
	};
}
