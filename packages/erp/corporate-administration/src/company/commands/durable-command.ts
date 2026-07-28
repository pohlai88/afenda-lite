import { fail, ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";

import { createCorporateAdministrationCommandFingerprint } from "../../command-identity";
import type { CorporateAdministrationCommandOptions } from "../../command-options";
import { createCorporateAdministrationDomainEventEnvelope } from "../../domain-events";
import { corporateAdministrationErrorDetails } from "../../error-codes";
import { eventIdSchema } from "../../kernel/brands";
import { toImmutableCanonicalJson } from "../../kernel/canonical-json";
import { toCanonicalInstant } from "../../kernel/dates";
import {
	type CorporateAdministrationRuntimePorts,
	type CorporateAdministrationTransactionContext,
	commitCorporateAdministrationTransaction,
	rollbackCorporateAdministrationTransaction,
} from "../../ports";
import type { LegalCompanyCommandDependencies } from "../store";
export type DurableLegalCompanyCommandDependencies =
	LegalCompanyCommandDependencies &
		Readonly<{
			runtime: CorporateAdministrationRuntimePorts;
			createEventId: () => string;
		}>;

export type RunDurableCompanyCommandInput<TResult> = Readonly<{
	commandId: string;
	fingerprintSchema: z.ZodType;
	fingerprintInput: unknown;
	outputSchema: z.ZodType<TResult>;
	options: CorporateAdministrationCommandOptions;
	dependencies: DurableLegalCompanyCommandDependencies;
	event: Readonly<{
		type:
			| "corporate_administration.legal_company.profile_updated.v1"
			| "corporate_administration.legal_company.jurisdiction_profile_set.v1"
			| "corporate_administration.legal_company.name_added.v1"
			| "corporate_administration.legal_company.name_superseded.v1"
			| "corporate_administration.legal_company.legal_form_changed.v1"
			| "corporate_administration.legal_company.identifier_registered.v1"
			| "corporate_administration.legal_company.financial_year_set.v1"
			| "corporate_administration.legal_company.activity_registered.v1"
			| "corporate_administration.legal_company.activated.v1"
			| "corporate_administration.legal_company.suspended.v1"
			| "corporate_administration.legal_company.struck_off_marked.v1"
			| "corporate_administration.legal_company.liquidation_entered.v1"
			| "corporate_administration.legal_company.dissolved.v1"
			| "corporate_administration.legal_company.restored.v1"
			| "corporate_administration.legal_company.archived.v1"
			| "corporate_administration.legal_establishment.registered.v1"
			| "corporate_administration.legal_establishment.updated.v1"
			| "corporate_administration.legal_establishment.status_changed.v1"
			| "corporate_administration.registered_address.set.v1"
			| "corporate_administration.premise.registered.v1"
			| "corporate_administration.premise.ended.v1"
			| "corporate_administration.governance_body.created.v1"
			| "corporate_administration.governance_body.amended.v1"
			| "corporate_administration.governance_body.retired.v1"
			| "corporate_administration.governance_membership.appointed.v1"
			| "corporate_administration.governance_membership.changed.v1"
			| "corporate_administration.governance_membership.ended.v1"
			| "corporate_administration.statutory_office.defined.v1"
			| "corporate_administration.officer.appointed.v1"
			| "corporate_administration.officer.appointment_amended.v1"
			| "corporate_administration.officer.qualification_recorded.v1"
			| "corporate_administration.officer.resigned.v1"
			| "corporate_administration.officer.removed.v1"
			| "corporate_administration.officer.declaration_recorded.v1"
			| "corporate_administration.officer.declaration_superseded.v1"
			| "corporate_administration.officer.disqualified.v1"
			| "corporate_administration.officer.disqualification_ended.v1"
			| "corporate_administration.conflict.disclosed.v1"
			| "corporate_administration.conflict.recusal_recorded.v1"
			| "corporate_administration.governance_meeting.scheduled.v1"
			| "corporate_administration.meeting_notice.issued.v1"
			| "corporate_administration.meeting_notice.delivered.v1"
			| "corporate_administration.meeting_notice.waived.v1"
			| "corporate_administration.meeting_participant.recorded.v1"
			| "corporate_administration.governance_meeting.opened.v1"
			| "corporate_administration.governance_meeting.quorum_recorded.v1"
			| "corporate_administration.governance_meeting.adjourned.v1"
			| "corporate_administration.governance_meeting.closed.v1"
			| "corporate_administration.meeting_vote.recorded.v1"
			| "corporate_administration.resolution.adopted.v1"
			| "corporate_administration.resolution.rejected.v1"
			| "corporate_administration.resolution.superseded.v1"
			| "corporate_administration.resolution.minutes_recorded.v1"
			| "corporate_administration.resolution.action_assigned.v1"
			| "corporate_administration.resolution.action_completed.v1";
		operationType: "CREATE" | "UPDATE";
		targetType:
			| "ca_legal_company"
			| "ca_company_jurisdiction_profile"
			| "ca_company_name"
			| "ca_company_legal_form_history"
			| "ca_company_identifier"
			| "ca_company_financial_year"
			| "ca_company_activity"
			| "ca_company_status_history"
			| "ca_legal_establishment"
			| "ca_establishment_status_history"
			| "ca_registered_address"
			| "ca_premise"
			| "ca_governance_body"
			| "ca_governance_membership"
			| "ca_statutory_office"
			| "ca_officer_appointment"
			| "ca_officer_qualification"
			| "ca_officer_declaration"
			| "ca_officer_disqualification"
			| "ca_conflict_disclosure"
			| "ca_governance_meeting"
			| "ca_meeting_notice"
			| "ca_meeting_participant"
			| "ca_meeting_quorum_result"
			| "ca_meeting_vote"
			| "ca_resolution"
			| "ca_resolution_action";
		aggregateType?:
			| "legal_company"
			| "legal_establishment"
			| "registered_address"
			| "premise"
			| "governance_body"
			| "governance_membership"
			| "statutory_office"
			| "officer_appointment"
			| "officer_qualification"
			| "officer_declaration"
			| "officer_disqualification"
			| "conflict_disclosure"
			| "governance_meeting"
			| "meeting_notice"
			| "meeting_participant"
			| "meeting_quorum_result"
			| "meeting_vote"
			| "resolution"
			| "resolution_action";
		aggregateId(result: TResult): string;
		aggregateVersion(result: TResult): number;
		payload(
			result: TResult,
			context: Readonly<{
				organizationId: string;
				occurredAt: string;
				actorUserId: string;
				correlationId: string;
				causationId?: string;
			}>,
		): unknown;
		safeMetadata?: Readonly<Record<string, string | number | boolean | null>>;
	}>;
	work(
		transaction: CorporateAdministrationTransactionContext,
		context: Readonly<{ occurredAt: ReturnType<typeof toCanonicalInstant> }>,
	): Promise<Result<TResult>>;
	serializeResult?(result: TResult): unknown;
}>;

export async function runDurableCompanyCommand<TResult>(
	input: RunDurableCompanyCommandInput<TResult>,
): Promise<Result<TResult>> {
	const identity = createCorporateAdministrationCommandFingerprint({
		schema: input.fingerprintSchema,
		organizationId: input.options.organizationId,
		commandId: input.commandId,
		input: input.fingerprintInput,
	});
	if (!identity.ok) return identity;

	const scope = {
		organizationId: input.options.organizationId,
		commandId: input.commandId,
		idempotencyKey: input.options.idempotencyKey,
	};
	const reservation = await input.dependencies.runtime.idempotency.begin({
		scope,
		fingerprint: identity.data.fingerprint,
	});
	if (!reservation.ok) return reservation;
	if (reservation.data.status === "replay") {
		const replay = input.outputSchema.safeParse(reservation.data.result);
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
	const release = async () =>
		input.dependencies.runtime.idempotency.release({
			scope,
			fingerprint: identity.data.fingerprint,
			reservationToken: acquired.reservationToken,
		});

	const occurredAt = toCanonicalInstant(input.dependencies.runtime.clock.now());
	const eventId = eventIdSchema.parse(input.dependencies.createEventId());
	const mutation = await input.dependencies.runtime.transaction.run<TResult>(
		async (transaction) => {
			const result = await input.work(transaction, { occurredAt });
			if (!result.ok) {
				return rollbackCorporateAdministrationTransaction(result);
			}

			const audit = await input.dependencies.runtime.audit.record(
				{
					organizationId: input.options.organizationId,
					actorUserId: input.options.actorUserId,
					correlationId: input.options.correlationId,
					causationId: input.options.causationId,
					operationType: input.event.operationType,
					targetType: input.event.targetType,
					targetId: input.event.aggregateId(result.data),
					occurredAt,
					outcome: "SUCCESS",
					safeMetadata: input.event.safeMetadata,
				},
				{ transaction },
			);
			if (!audit.ok) {
				return rollbackCorporateAdministrationTransaction(
					asFailure<TResult>(audit),
				);
			}

			const event = createCorporateAdministrationDomainEventEnvelope({
				eventId,
				eventType: input.event.type,
				organizationId: input.options.organizationId,
				aggregateType: input.event.aggregateType ?? "legal_company",
				aggregateId: input.event.aggregateId(result.data),
				aggregateVersion: input.event.aggregateVersion(result.data),
				occurredAt,
				actorUserId: input.options.actorUserId,
				correlationId: input.options.correlationId,
				causationId: input.options.causationId,
				payload: input.event.payload(result.data, {
					organizationId: input.options.organizationId,
					occurredAt,
					actorUserId: input.options.actorUserId,
					correlationId: input.options.correlationId,
					causationId: input.options.causationId,
				}),
			});
			const outbox = await input.dependencies.runtime.outbox.append([event], {
				transaction,
			});
			if (!outbox.ok) {
				return rollbackCorporateAdministrationTransaction(
					asFailure<TResult>(outbox),
				);
			}

			const completed = await input.dependencies.runtime.idempotency.complete({
				scope,
				fingerprint: identity.data.fingerprint,
				reservationToken: acquired.reservationToken,
				result: toImmutableCanonicalJson(
					input.serializeResult === undefined
						? result.data
						: input.serializeResult(result.data),
				),
				transaction,
			});
			if (!completed.ok) {
				return rollbackCorporateAdministrationTransaction(
					asFailure<TResult>(completed),
				);
			}

			return commitCorporateAdministrationTransaction(result);
		},
	);
	if (!mutation.ok) {
		await release();
		return mutation;
	}

	return mutation;
}

function asFailure<TResult>(result: Result<unknown>): Result<TResult> {
	if (result.ok) {
		throw new TypeError("Expected Corporate Administration failure Result");
	}
	return fail(result.code, result.message, result.details);
}
