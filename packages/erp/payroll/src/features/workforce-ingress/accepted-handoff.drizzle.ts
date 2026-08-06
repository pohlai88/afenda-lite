import { randomUUID } from "node:crypto";

import {
	database as afendaDatabase,
	and,
	eq,
	isNull,
	payrollAcceptedHandoff,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";

import { mapPersistenceFailure } from "../../kernel/execution/persistence-errors";
import type {
	AcceptedPayrollHandoff,
	AcceptHandoffRecord,
	PayrollWorkforceIngressStore,
} from "./accepted-handoff.store";
import {
	extractHandoffSourceRevision,
	isStrictlyNewerHandoffRevision,
} from "./handoff-revision";

function failFromPersistence(error: unknown, fallbackMessage: string) {
	return mapPersistenceFailure(error, fallbackMessage);
}

type AcceptedHandoffRow = typeof payrollAcceptedHandoff.$inferSelect;

function mapHandoffStatus(
	status: AcceptedHandoffRow["status"],
): AcceptedPayrollHandoff["status"] {
	if (status === "superseded") {
		return "superseded";
	}
	if (status === "deferred_to_next_period") {
		return "deferred_to_next_period";
	}
	return "accepted";
}

function mapAcceptedHandoff(row: AcceptedHandoffRow): AcceptedPayrollHandoff {
	return {
		id: row.id,
		organizationId: row.organizationId,
		employeeId: row.employeeId,
		employmentId: row.employmentId,
		contractVersion: row.contractVersion,
		effectiveDate: row.effectiveDate,
		periodStart: row.periodStart,
		periodEnd: row.periodEnd,
		payload: row.payload,
		payloadHash: row.payloadHash,
		status: mapHandoffStatus(row.status),
		supersededByHandoffId: row.supersededByHandoffId,
		acceptedAt: row.createdAt,
		acceptedBy: row.createdBy,
		version: row.version,
	};
}

function periodCondition(column: "period_start" | "period_end") {
	return column === "period_start"
		? payrollAcceptedHandoff.periodStart
		: payrollAcceptedHandoff.periodEnd;
}

function activeIdentityWhere(input: {
	organizationId: string;
	employeeId: string;
	effectiveDate: string;
	periodStart: string | null;
	periodEnd: string | null;
}) {
	return and(
		eq(payrollAcceptedHandoff.organizationId, input.organizationId),
		eq(payrollAcceptedHandoff.employeeId, input.employeeId),
		eq(payrollAcceptedHandoff.effectiveDate, input.effectiveDate),
		input.periodStart === null
			? isNull(periodCondition("period_start"))
			: eq(payrollAcceptedHandoff.periodStart, input.periodStart),
		input.periodEnd === null
			? isNull(periodCondition("period_end"))
			: eq(payrollAcceptedHandoff.periodEnd, input.periodEnd),
		eq(payrollAcceptedHandoff.status, "accepted"),
	);
}

export const drizzleWorkforceIngressMethods: PayrollWorkforceIngressStore = {
	async acceptWorkforceHandoff(
		record: AcceptHandoffRecord,
	): Promise<Result<AcceptedPayrollHandoff>> {
		const id = randomUUID();
		try {
			const [replay] = await afendaDatabase.client
				.select()
				.from(payrollAcceptedHandoff)
				.where(
					and(
						eq(payrollAcceptedHandoff.organizationId, record.organizationId),
						eq(
							payrollAcceptedHandoff.createIdempotencyKey,
							record.idempotencyKey,
						),
					),
				)
				.limit(1);
			if (replay !== undefined) {
				if (replay.payloadHash !== record.payloadHash) {
					return errorResult.fail("CONFLICT", {
						publicMessage:
							"Idempotency key replay with a changed payload is rejected",
					});
				}
				return errorResult.ok(mapAcceptedHandoff(replay));
			}

			const acceptanceStatus = record.acceptanceStatus ?? "accepted";
			const [active] = await afendaDatabase.client
				.select()
				.from(payrollAcceptedHandoff)
				.where(activeIdentityWhere(record))
				.limit(1);
			if (acceptanceStatus === "accepted" && active !== undefined) {
				if (active.payloadHash === record.payloadHash) {
					return errorResult.ok(mapAcceptedHandoff(active));
				}
				const incomingRevision = extractHandoffSourceRevision(record.payload);
				const activeRevision = extractHandoffSourceRevision(active.payload);
				if (!isStrictlyNewerHandoffRevision(incomingRevision, activeRevision)) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Stale workforce handoff revision is rejected",
					});
				}
			}

			const payloadJson = JSON.stringify(record.payload);
			const identityLockKey = [
				record.organizationId,
				record.employeeId,
				record.effectiveDate,
				record.periodStart ?? "",
				record.periodEnd ?? "",
			].join(":");
			// Serialize supersession per active identity: Neon HTTP transactions
			// are one-shot, so advisory xact lock + ordered UPDATE then INSERT
			// keeps the partial unique index honest under concurrent ingest.
			const [, , rows] = await afendaDatabase.transaction((sql) => [
				sql`SELECT pg_advisory_xact_lock(hashtextextended(${`payroll-handoff:${identityLockKey}`}, 0))`,
				acceptanceStatus === "accepted"
					? sql`
					UPDATE payroll_accepted_handoff
					SET status = 'superseded', superseded_by_handoff_id = ${id},
						version = version + 1, updated_by = ${record.actorUserId},
						updated_at = now()
					WHERE organization_id = ${record.organizationId}
						AND employee_id = ${record.employeeId}
						AND effective_date = ${record.effectiveDate}::date
						AND period_start IS NOT DISTINCT FROM ${record.periodStart}::date
						AND period_end IS NOT DISTINCT FROM ${record.periodEnd}::date
						AND status = 'accepted'
				`
					: sql`SELECT 1 WHERE false`,
				sql`
					INSERT INTO payroll_accepted_handoff (
						id, organization_id, employee_id, employment_id, contract_version,
						effective_date, period_start, period_end, payload, payload_hash,
						status, create_idempotency_key, create_request_fingerprint,
						version, created_by, updated_by
					) VALUES (
						${id}, ${record.organizationId}, ${record.employeeId},
						${record.employmentId}, ${record.contractVersion},
						${record.effectiveDate}::date, ${record.periodStart}::date,
						${record.periodEnd}::date, ${payloadJson}::jsonb,
						${record.payloadHash}, ${acceptanceStatus}, ${record.idempotencyKey},
						${record.payloadHash}, 1, ${record.actorUserId}, ${record.actorUserId}
					)
					RETURNING id
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Workforce handoff acceptance conflict",
				});
			}
			const [sealed] = await afendaDatabase.client
				.select()
				.from(payrollAcceptedHandoff)
				.where(
					and(
						eq(payrollAcceptedHandoff.organizationId, record.organizationId),
						eq(payrollAcceptedHandoff.id, id),
					),
				)
				.limit(1);
			return sealed === undefined
				? errorResult.fail("INTERNAL_ERROR")
				: errorResult.ok(mapAcceptedHandoff(sealed));
		} catch (error) {
			return failFromPersistence(error, "Failed to accept workforce handoff");
		}
	},

	async getAcceptedWorkforceHandoff(
		input,
	): Promise<Result<AcceptedPayrollHandoff | null>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(payrollAcceptedHandoff)
				.where(activeIdentityWhere(input))
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapAcceptedHandoff(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load accepted handoff");
		}
	},
};
