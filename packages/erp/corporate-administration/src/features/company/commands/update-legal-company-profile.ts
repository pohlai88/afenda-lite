import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";
import type { CorporateAdministrationCommandOptions } from "../../../kernel/execution/command-options";
import {
	authorizeCorporateAdministrationCommand,
	type CorporateAdministrationCommandKernelDependencies,
	executeCorporateAdministrationCommand,
} from "../../../kernel/internal/durable-command";
import { parseCorporateAdministrationInput } from "../../../kernel/validation/parse-input";
import {
	legalCompanySchema,
	updateLegalCompanyProfileInputSchema,
} from "../schemas";
import type { LegalCompanyCommandDependencies } from "../store";
import type { LegalCompany } from "../types";

export type UpdateLegalCompanyProfileInput = z.input<
	typeof updateLegalCompanyProfileInputSchema
>;

export async function updateLegalCompanyProfile(
	input: UpdateLegalCompanyProfileInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: CorporateAdministrationCommandKernelDependencies &
		LegalCompanyCommandDependencies,
): Promise<Result<LegalCompany>> {
	const parsed = parseCorporateAdministrationInput(
		updateLegalCompanyProfileInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const authorized = await authorizeCorporateAdministrationCommand(
		"updateLegalCompanyProfile",
		options,
	);
	if (!authorized.ok) {
		return authorized;
	}

	const current = await dependencies.store.lockLegalCompany({
		organizationId: options.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		expectedVersion: parsed.data.expectedVersion,
	});
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Corporate Administration legal company was not found.",
		});
	}
	if (current.data.version !== parsed.data.expectedVersion) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Corporate Administration legal company version is stale.",
		});
	}

	return executeCorporateAdministrationCommand({
		authorization: authorized.data,
		fingerprintSchema: updateLegalCompanyProfileInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: legalCompanySchema,
		dependencies,
		event: {
			operationType: "UPDATE",
			targetType: "ca_legal_company",
			aggregateId: (result) => result.legalCompanyId,
			aggregateVersion: (result) => result.version,
			payload: (result, context) => ({
				organizationId: context.organizationId,
				legalCompanyId: result.legalCompanyId,
				profileVersion: result.version,
				occurredAt: context.occurredAt,
				actorUserId: context.actorUserId,
				correlationId: context.correlationId,
				...(context.causationId === undefined
					? {}
					: { causationId: context.causationId }),
				changedPaths: ["profile"],
			}),
			safeMetadata: { change_type: "profile" },
		},
		work: (transaction) =>
			dependencies.store.updateLegalCompanyProfile({
				organizationId: options.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				expectedVersion: parsed.data.expectedVersion,
				profile: parsed.data.profile,
				actorUserId: options.actorUserId,
				correlationId: options.correlationId,
				causationId: options.causationId,
				transaction,
			}),
	});
}
