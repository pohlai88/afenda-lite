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
import { toCanonicalInstant } from "../../kernel/dates";
import { parseCorporateAdministrationInput } from "../../parse-input";
import {
	type CorporateAdministrationRuntimePorts,
	commitCorporateAdministrationTransaction,
	rollbackCorporateAdministrationTransaction,
} from "../../ports";
import { validateIdentifierSupersession } from "../rules";
import { retireCompanyIdentifierInputSchema } from "../schemas";
import type { CompanyIdentifierCommandDependencies } from "../store";
import type { CompanyIdentifier, RetireCompanyIdentifierInput } from "../types";

type RetireCompanyIdentifierDependencies =
	CompanyIdentifierCommandDependencies &
		Readonly<{ runtime: CorporateAdministrationRuntimePorts }> &
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

	const authorized = await requireCorporateAdministrationPermission(
		options.authorization,
		{
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			permission:
				CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS.retireCompanyIdentifier,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const identity = createCorporateAdministrationCommandFingerprint({
		schema: retireCompanyIdentifierInputSchema,
		organizationId: options.organizationId,
		commandId: "corporate-administration.legal-company.retire-identifier",
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

	const occurredAt = toCanonicalInstant(dependencies.runtime.clock.now());
	return dependencies.runtime.transaction.run<CompanyIdentifier>(
		async (transaction) => {
			const retired =
				await dependencies.identifierStore.retireCompanyIdentifier({
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
				});
			if (!retired.ok) {
				return rollbackCorporateAdministrationTransaction(retired);
			}
			const audit = await dependencies.runtime.audit.record(
				{
					organizationId: options.organizationId,
					actorUserId: options.actorUserId,
					correlationId: options.correlationId,
					causationId: options.causationId,
					operationType: "UPDATE",
					targetType: "ca_company_identifier",
					targetId: retired.data.id,
					occurredAt,
					outcome: "SUCCESS",
					safeMetadata: { change_type: "company_identifier_retirement" },
				},
				{ transaction },
			);
			if (!audit.ok) {
				return rollbackCorporateAdministrationTransaction(
					asIdentifierFailure(audit),
				);
			}
			return commitCorporateAdministrationTransaction(retired);
		},
	);
}

function asIdentifierFailure(
	result: Result<unknown>,
): Result<CompanyIdentifier> {
	if (result.ok) {
		throw new TypeError("Expected Corporate Administration failure Result");
	}
	return result;
}
