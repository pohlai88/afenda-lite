import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";
import {
	CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import type { CorporateAdministrationCommandOptions } from "../../command-options";
import { parseCorporateAdministrationInput } from "../../parse-input";
import {
	legalCompanySchema,
	updateLegalCompanyProfileInputSchema,
} from "../schemas";
import type { LegalCompany } from "../types";
import {
	type DurableLegalCompanyCommandDependencies,
	runDurableCompanyCommand,
} from "./durable-command";

export type UpdateLegalCompanyProfileInput = z.input<
	typeof updateLegalCompanyProfileInputSchema
>;

export async function updateLegalCompanyProfile(
	input: UpdateLegalCompanyProfileInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: DurableLegalCompanyCommandDependencies,
): Promise<Result<LegalCompany>> {
	const parsed = parseCorporateAdministrationInput(
		updateLegalCompanyProfileInputSchema,
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
				CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS.updateLegalCompanyProfile,
		},
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

	return runDurableCompanyCommand({
		commandId: "corporate-administration.legal-company.update-profile",
		fingerprintSchema: updateLegalCompanyProfileInputSchema,
		fingerprintInput: parsed.data,
		outputSchema: legalCompanySchema,
		options,
		dependencies,
		event: {
			type: "corporate_administration.legal_company.profile_updated.v1",
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
