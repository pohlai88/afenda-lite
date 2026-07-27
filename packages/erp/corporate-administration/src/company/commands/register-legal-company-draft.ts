import { fail, ok, type Result } from "@afenda/errors/result";
import { z } from "zod";

import {
	CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "../../authorization";
import { createCorporateAdministrationCommandFingerprint } from "../../command-identity";
import type { CorporateAdministrationCommandOptions } from "../../command-options";
import { createCorporateAdministrationDomainEventEnvelope } from "../../domain-events";
import { corporateAdministrationErrorDetails } from "../../error-codes";
import { eventIdSchema } from "../../kernel/brands";
import { toImmutableCanonicalJson } from "../../kernel/canonical-json";
import { toCanonicalInstant } from "../../kernel/dates";
import {
	type CorporateAdministrationRuntimePorts,
	commitCorporateAdministrationTransaction,
	rollbackCorporateAdministrationTransaction,
} from "../../ports";
import {
	assertJurisdictionEntityTypeCompatible,
	normalizeLegalCompanyCode,
} from "../rules";
import {
	legalCompanySchema,
	registerLegalCompanyDraftInputSchema,
} from "../schemas";
import type { LegalCompanyCommandDependencies } from "../store";
import type { LegalCompany } from "../types";

export type RegisterLegalCompanyDraftInput = z.input<
	typeof registerLegalCompanyDraftInputSchema
>;

export type RegisterLegalCompanyDraftDependencies =
	LegalCompanyCommandDependencies &
		Readonly<{
			runtime: CorporateAdministrationRuntimePorts;
			createEventId: () => string;
		}>;

const REGISTER_LEGAL_COMPANY_DRAFT_COMMAND_ID =
	"corporate-administration.legal-company.register-draft" as const;

const registerLegalCompanyDraftFingerprintSchema = z
	.object({
		companyCode: z.string().trim().min(1).max(64),
		displayName: z.string().trim().min(1).max(256),
		masterDataPartyId: z.string().trim().min(1).max(128),
		homeJurisdictionCountryCode: z
			.string()
			.trim()
			.regex(/^[A-Z]{2}$/),
		sourceReference: z.string().trim().min(1).max(256),
		normalizedCompanyCode: z.string().min(1).max(64),
	})
	.strict()
	.readonly();

export async function registerLegalCompanyDraft(
	input: RegisterLegalCompanyDraftInput,
	options: CorporateAdministrationCommandOptions,
	dependencies: RegisterLegalCompanyDraftDependencies,
): Promise<Result<LegalCompany>> {
	const parsed = registerLegalCompanyDraftInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration input is invalid",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_VALIDATION_FAILED",
			),
		);
	}

	const authorized = await requireCorporateAdministrationPermission(
		options.authorization,
		{
			organizationId: options.organizationId,
			actorUserId: options.actorUserId,
			permission:
				CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS.registerLegalCompanyDraft,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const normalizedCompanyCode = normalizeLegalCompanyCode(
		parsed.data.companyCode,
	);
	const normalizedInput = {
		...parsed.data,
		normalizedCompanyCode,
	} as const;
	const identity = createCorporateAdministrationCommandFingerprint({
		schema: registerLegalCompanyDraftFingerprintSchema,
		organizationId: options.organizationId,
		commandId: REGISTER_LEGAL_COMPANY_DRAFT_COMMAND_ID,
		input: normalizedInput,
	});
	if (!identity.ok) {
		return identity;
	}

	const idempotencyScope = {
		organizationId: options.organizationId,
		commandId: REGISTER_LEGAL_COMPANY_DRAFT_COMMAND_ID,
		idempotencyKey: options.idempotencyKey,
	};
	const reservation = await dependencies.runtime.idempotency.begin({
		scope: idempotencyScope,
		fingerprint: identity.data.fingerprint,
	});
	if (!reservation.ok) {
		return reservation;
	}
	if (reservation.data.status === "replay") {
		const replay = legalCompanySchema.safeParse(reservation.data.result);
		return replay.success
			? ok(replay.data)
			: fail(
					"SERVICE_UNAVAILABLE",
					"Corporate Administration idempotency replay is unavailable.",
					corporateAdministrationErrorDetails(
						"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
						{ field: "idempotency.result" },
					),
				);
	}
	if (reservation.data.status === "conflict") {
		return fail(
			"CONFLICT",
			"Corporate Administration idempotency key was reused with different input.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_IDEMPOTENCY_CONFLICT",
				{ field: "idempotencyKey" },
			),
		);
	}
	if (reservation.data.status === "in_progress") {
		return fail(
			"CONFLICT",
			"Corporate Administration command is already in progress.",
			corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_CONFLICT", {
				field: "idempotencyKey",
			}),
		);
	}
	const acquired = reservation.data;

	const releaseReservation = async () =>
		dependencies.runtime.idempotency.release({
			scope: idempotencyScope,
			fingerprint: identity.data.fingerprint,
			reservationToken: acquired.reservationToken,
		});

	const party = await dependencies.partyReferences.getOrganizationParty({
		organizationId: options.organizationId,
		partyId: parsed.data.masterDataPartyId,
	});
	if (!party.ok) {
		await releaseReservation();
		return party;
	}
	if (party.data === null || party.data.kind !== "organization") {
		await releaseReservation();
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration legal company requires an organization party.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
				{ field: "masterDataPartyId" },
			),
		);
	}
	if (!party.data.active) {
		await releaseReservation();
		return fail(
			"CONFLICT",
			"Corporate Administration legal company party is inactive.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INACTIVE",
				{ field: "masterDataPartyId" },
			),
		);
	}

	const rules = await dependencies.jurisdictionRules.listEntityTypeRules({
		organizationId: options.organizationId,
		jurisdictionCountryCode: parsed.data.homeJurisdictionCountryCode,
	});
	if (!rules.ok) {
		await releaseReservation();
		return rules;
	}
	const compatible = assertJurisdictionEntityTypeCompatible({
		jurisdictionCountryCode: parsed.data.homeJurisdictionCountryCode,
		entityType: "draft_legal_company",
		rules: rules.data,
	});
	if (!compatible.ok) {
		await releaseReservation();
		return compatible;
	}

	const occurredAt = toCanonicalInstant(dependencies.runtime.clock.now());
	const eventId = eventIdSchema.parse(dependencies.createEventId());

	const mutation = await dependencies.runtime.transaction.run<LegalCompany>(
		async (transaction) => {
			const registered = await dependencies.store.registerLegalCompanyDraft({
				organizationId: options.organizationId,
				companyCode: parsed.data.companyCode,
				normalizedCompanyCode,
				displayName: parsed.data.displayName,
				masterDataPartyId: parsed.data.masterDataPartyId,
				homeJurisdictionCountryCode: parsed.data.homeJurisdictionCountryCode,
				sourceReference: parsed.data.sourceReference,
				createdByUserId: options.actorUserId,
				correlationId: options.correlationId,
				causationId: options.causationId,
				createdAt: occurredAt,
				transaction,
			});
			if (!registered.ok) {
				return rollbackCorporateAdministrationTransaction(registered);
			}

			const audit = await dependencies.runtime.audit.record(
				{
					organizationId: options.organizationId,
					actorUserId: options.actorUserId,
					correlationId: options.correlationId,
					causationId: options.causationId,
					operationType: "CREATE",
					targetType: "ca_legal_company",
					targetId: registered.data.legalCompanyId,
					occurredAt,
					outcome: "SUCCESS",
					safeMetadata: {
						company_state: registered.data.state,
						home_jurisdiction: registered.data.homeJurisdictionCountryCode,
					},
				},
				{
					transaction,
				},
			);
			if (!audit.ok) {
				return rollbackCorporateAdministrationTransaction(
					asLegalCompanyFailure(audit),
				);
			}

			const event = createCorporateAdministrationDomainEventEnvelope({
				eventId,
				eventType: "corporate_administration.legal_company.draft_registered.v1",
				organizationId: options.organizationId,
				aggregateType: "legal_company",
				aggregateId: registered.data.legalCompanyId,
				aggregateVersion: registered.data.version,
				occurredAt,
				actorUserId: options.actorUserId,
				correlationId: options.correlationId,
				causationId: options.causationId,
				payload: {
					organizationId: options.organizationId,
					legalCompanyId: registered.data.legalCompanyId,
					companyCode: registered.data.companyCode,
					profileVersion: registered.data.version,
					state: registered.data.state,
					homeJurisdictionCountryCode:
						registered.data.homeJurisdictionCountryCode,
					occurredAt,
					actorUserId: options.actorUserId,
					correlationId: options.correlationId,
					...(options.causationId === undefined
						? {}
						: { causationId: options.causationId }),
				},
			});
			const outbox = await dependencies.runtime.outbox.append([event], {
				transaction,
			});
			if (!outbox.ok) {
				return rollbackCorporateAdministrationTransaction(
					asLegalCompanyFailure(outbox),
				);
			}

			return commitCorporateAdministrationTransaction(registered);
		},
	);

	if (!mutation.ok) {
		await releaseReservation();
		return mutation;
	}

	const completed = await dependencies.runtime.idempotency.complete({
		scope: idempotencyScope,
		fingerprint: identity.data.fingerprint,
		reservationToken: acquired.reservationToken,
		result: toImmutableCanonicalJson(mutation.data),
	});
	if (!completed.ok) {
		return completed;
	}

	return mutation;
}

function asLegalCompanyFailure(result: Result<unknown>): Result<LegalCompany> {
	if (result.ok) {
		throw new TypeError("Expected Corporate Administration failure Result");
	}
	return fail(result.code, result.message, result.details);
}
