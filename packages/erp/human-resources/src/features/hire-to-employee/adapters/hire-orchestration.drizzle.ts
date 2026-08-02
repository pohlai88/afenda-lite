import { randomUUID } from "node:crypto";

import { audit as afendaAudit } from "@afenda/audit";
import { database as afendaDatabase, and, eq, hrHireAttempt } from "@afenda/db";
import { errorResult } from "@afenda/errors";
import { HUMAN_RESOURCES_HIRE_FROM_ACCEPTED_OFFER_COMPLETED_EVENT } from "@afenda/events/schemas";
import type { HumanResourcesStore } from "../../../composition/store/index";
import { eventPayloadJson } from "../../../kernel/emissions/audit-facts";
import { assertExpectedVersion } from "../../../kernel/execution/concurrency";
import { conflict, notFound } from "../../../kernel/execution/domain-guards";
import {
	isCreateIdempotencyUniqueViolation,
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../../../kernel/execution/persistence-errors";
import { mapHireAttemptRow } from "./hire-orchestration.memory";

export const drizzleHireOrchestrationMethods: Pick<
	HumanResourcesStore,
	| "findHireAttemptByIdempotencyKey"
	| "findOpenHireAttemptByOfferId"
	| "completeHireAttempt"
	| "createHireAttempt"
	| "updateHireAttemptProgress"
> = {
	async completeHireAttempt(input, _ports, meta) {
		const rows = await afendaDatabase.client
			.select()
			.from(hrHireAttempt)
			.where(
				and(
					eq(hrHireAttempt.organizationId, input.organizationId),
					eq(hrHireAttempt.id, input.attemptId),
				),
			)
			.limit(1);
		const [existing] = rows;
		if (existing === undefined) {
			return notFound("Hire attempt not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const auditId = randomUUID();
		const eventId = randomUUID();
		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			module: "human-resources",
			entity: "hr_hire_attempt",
			entityId: input.attemptId,
			action: "UPDATE",
			oldValue: { status: existing.status, version: existing.version },
			newValue: { status: "completed", version: existing.version + 1 },
			eventContext: {
				version: existing.version + 1,
				outcome: "SUCCEEDED",
				source: "human-resources.hire-orchestration-drizzle",
				causationId:
					meta.causationId ?? meta.idempotencyKey ?? existing.idempotencyKey,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_hire_attempt",
			entityId: input.attemptId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});

		try {
			const [completedRows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_hire_attempt
						SET status = 'completed', version = version + 1,
							updated_by = ${input.actorUserId}, updated_at = NOW()
						WHERE organization_id = ${input.organizationId}
							AND id = ${input.attemptId}
							AND version = ${input.expectedVersion}
							AND status = 'in_progress'
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT ${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
						FROM mutated RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, ${input.organizationId},
							${HUMAN_RESOURCES_HIRE_FROM_ACCEPTED_OFFER_COMPLETED_EVENT},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							${payloadJson}::jsonb, 'pending', 0
						FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, audited, outboxed
				`,
			]);
			if (completedRows.length === 0) {
				return conflict("Hire attempt completion optimistic update failed");
			}
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to complete hire attempt");
		}

		const completed = await this.findHireAttemptByIdempotencyKey({
			organizationId: input.organizationId,
			idempotencyKey: existing.idempotencyKey,
		});
		if (!completed.ok) {
			return completed;
		}
		return completed.data === null
			? notFound("Completed hire attempt not found")
			: errorResult.ok(completed.data.attempt);
	},

	async findHireAttemptByIdempotencyKey(input) {
		const rows = await afendaDatabase.client
			.select()
			.from(hrHireAttempt)
			.where(
				and(
					eq(hrHireAttempt.organizationId, input.organizationId),
					eq(hrHireAttempt.idempotencyKey, input.idempotencyKey),
				),
			)
			.limit(1);

		const [row] = rows;
		if (row === undefined) {
			return errorResult.ok(null);
		}

		const mapped = mapHireAttemptRow(row);
		if (!mapped.ok) {
			return mapped;
		}

		return errorResult.ok({
			attempt: mapped.data,
			requestFingerprint: row.requestFingerprint,
		});
	},

	async findOpenHireAttemptByOfferId(input) {
		const rows = await afendaDatabase.client
			.select()
			.from(hrHireAttempt)
			.where(
				and(
					eq(hrHireAttempt.organizationId, input.organizationId),
					eq(hrHireAttempt.offerId, input.offerId),
				),
			)
			.limit(5);

		const open = rows.find(
			(row) => row.status === "in_progress" || row.status === "completed",
		);
		if (open === undefined) {
			return errorResult.ok(null);
		}

		return mapHireAttemptRow(open);
	},

	async createHireAttempt(record, _ports, _meta) {
		const existing = await this.findHireAttemptByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			return conflict("Hire attempt idempotency key already exists");
		}

		const open = await this.findOpenHireAttemptByOfferId({
			organizationId: record.organizationId,
			offerId: record.offerId,
		});
		if (!open.ok) {
			return open;
		}
		if (open.data !== null) {
			return conflict("An open hire attempt already exists for this offer");
		}

		const id = randomUUID();
		const now = new Date();

		try {
			await afendaDatabase.client.insert(hrHireAttempt).values({
				id,
				organizationId: record.organizationId,
				offerId: record.offerId,
				correlationId: record.correlationId,
				idempotencyKey: record.idempotencyKey,
				requestFingerprint: record.requestFingerprint,
				status: "in_progress",
				currentStep: null,
				personId: null,
				employeeId: null,
				employmentId: null,
				workerId: null,
				assignmentId: null,
				onboardingCaseId: null,
				compensationLog: [],
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			});
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findHireAttemptByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.idempotencyKey,
				});
				if (replay.ok && replay.data !== null) {
					return errorResult.ok(replay.data.attempt);
				}
			}
			if (isPostgresUniqueViolation(error)) {
				return conflict("Hire attempt unique constraint violated");
			}
			return mapPersistenceFailure(error, "Failed to create hire attempt");
		}

		const rows = await afendaDatabase.client
			.select()
			.from(hrHireAttempt)
			.where(
				and(
					eq(hrHireAttempt.id, id),
					eq(hrHireAttempt.organizationId, record.organizationId),
				),
			)
			.limit(1);
		const [row] = rows;
		if (row === undefined) {
			return notFound("Hire attempt not found after create");
		}
		return mapHireAttemptRow(row);
	},

	async updateHireAttemptProgress(input, _ports, _meta) {
		const rows = await afendaDatabase.client
			.select()
			.from(hrHireAttempt)
			.where(
				and(
					eq(hrHireAttempt.organizationId, input.organizationId),
					eq(hrHireAttempt.id, input.attemptId),
				),
			)
			.limit(1);

		const [existing] = rows;
		if (existing === undefined) {
			return notFound("Hire attempt not found");
		}

		const versionCheck = assertExpectedVersion(
			existing.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const now = new Date();
		const nextVersion = existing.version + 1;

		try {
			const updatedRows = await afendaDatabase.client
				.update(hrHireAttempt)
				.set({
					currentStep: input.currentStep ?? existing.currentStep,
					personId: input.personId ?? existing.personId,
					employeeId: input.employeeId ?? existing.employeeId,
					employmentId: input.employmentId ?? existing.employmentId,
					workerId: input.workerId ?? existing.workerId,
					assignmentId: input.assignmentId ?? existing.assignmentId,
					onboardingCaseId: input.onboardingCaseId ?? existing.onboardingCaseId,
					compensationLog: input.compensationLog ?? existing.compensationLog,
					status: input.status ?? existing.status,
					version: nextVersion,
					updatedBy: input.actorUserId,
					updatedAt: now,
				})
				.where(
					and(
						eq(hrHireAttempt.organizationId, input.organizationId),
						eq(hrHireAttempt.id, input.attemptId),
						eq(hrHireAttempt.version, input.expectedVersion),
					),
				)
				.returning();

			const [updated] = updatedRows;
			if (updated === undefined) {
				return conflict("Hire attempt optimistic update failed");
			}

			return mapHireAttemptRow(updated);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to update hire attempt progress",
			);
		}
	},
};
