import {
	database as afendaDatabase,
	and,
	eq,
	hrConnectorCursor,
	hrReliabilityDeadLetter,
	hrReliabilityWorkItem,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import {
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../../execution/persistence-errors";
import {
	runSequential,
	sequentialReturn,
} from "../../execution/run-sequential";
import type { ReliabilityStorePort } from "../ports";
import type {
	ConnectorCursor,
	ReliabilityDeadLetterRecord,
	ReliabilityWorkItem,
	ReliabilityWorkStatus,
} from "../types";

type WorkRow = typeof hrReliabilityWorkItem.$inferSelect;
type DeadLetterRow = typeof hrReliabilityDeadLetter.$inferSelect;
type CursorRow = typeof hrConnectorCursor.$inferSelect;

const WORK_STATUSES = new Set<ReliabilityWorkStatus>([
	"pending",
	"processing",
	"awaiting_acknowledgement",
	"succeeded",
	"dead_lettered",
]);

function validDate(value: Date, _field: string): Result<Date> {
	return Number.isNaN(value.getTime())
		? errorResult.fail("INTERNAL_ERROR")
		: errorResult.ok(value);
}

function mapWork(row: WorkRow): Result<ReliabilityWorkItem> {
	if (!WORK_STATUSES.has(row.status as ReliabilityWorkStatus)) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	const createdAt = validDate(row.createdAt, "createdAt");
	if (!createdAt.ok) {
		return createdAt;
	}
	const updatedAt = validDate(row.updatedAt, "updatedAt");
	if (!updatedAt.ok) {
		return updatedAt;
	}
	return errorResult.ok({
		id: row.id,
		organizationId: row.organizationId,
		connector: row.connector as ReliabilityWorkItem["connector"],
		operation: row.operation as ReliabilityWorkItem["operation"],
		targetType: row.targetType as ReliabilityWorkItem["targetType"],
		targetId: row.targetId,
		correlationId: row.correlationId,
		idempotencyKey: row.idempotencyKey,
		requestFingerprint: row.requestFingerprint,
		status: row.status as ReliabilityWorkStatus,
		version: row.version,
		attemptCount: row.attemptCount,
		nextAttemptAt: row.nextAttemptAt,
		lastAttemptAt: row.lastAttemptAt,
		lastErrorCode: row.lastErrorCode,
		lastErrorMessage: row.lastErrorMessage,
		receiptId: row.receiptId,
		acknowledgementDeadlineAt: row.acknowledgementDeadlineAt,
		leaseOwner: row.leaseOwner,
		leaseExpiresAt: row.leaseExpiresAt,
		createdAt: createdAt.data,
		updatedAt: updatedAt.data,
	});
}

function mapDeadLetter(
	row: DeadLetterRow,
): Result<ReliabilityDeadLetterRecord> {
	const failedAt = validDate(row.failedAt, "failedAt");
	if (!failedAt.ok) {
		return failedAt;
	}
	return errorResult.ok({
		id: row.id,
		organizationId: row.organizationId,
		workItemId: row.workItemId,
		connector: row.connector as ReliabilityDeadLetterRecord["connector"],
		operation: row.operation as ReliabilityDeadLetterRecord["operation"],
		targetType: row.targetType as ReliabilityDeadLetterRecord["targetType"],
		targetId: row.targetId,
		correlationId: row.correlationId,
		idempotencyKey: row.idempotencyKey,
		requestFingerprint: row.requestFingerprint,
		attemptCount: row.attemptCount,
		errorCode: row.errorCode,
		errorMessage: row.errorMessage,
		failedAt: failedAt.data,
		replayedByWorkItemId: row.replayedByWorkItemId,
	});
}

function mapCursor(row: CursorRow): Result<ConnectorCursor> {
	const updatedAt = validDate(row.updatedAt, "cursor updatedAt");
	return updatedAt.ok
		? errorResult.ok({
				organizationId: row.organizationId,
				connector: row.connector,
				stream: row.stream,
				cursor: row.cursor,
				version: row.version,
				updatedAt: updatedAt.data,
			})
		: updatedAt;
}

function workValues(item: ReliabilityWorkItem) {
	return {
		id: item.id,
		organizationId: item.organizationId,
		connector: item.connector,
		operation: item.operation,
		targetType: item.targetType,
		targetId: item.targetId,
		correlationId: item.correlationId,
		idempotencyKey: item.idempotencyKey,
		requestFingerprint: item.requestFingerprint,
		status: item.status,
		version: item.version,
		attemptCount: item.attemptCount,
		nextAttemptAt: item.nextAttemptAt,
		lastAttemptAt: item.lastAttemptAt,
		lastErrorCode: item.lastErrorCode,
		lastErrorMessage: item.lastErrorMessage,
		receiptId: item.receiptId,
		acknowledgementDeadlineAt: item.acknowledgementDeadlineAt,
		leaseOwner: item.leaseOwner,
		leaseExpiresAt: item.leaseExpiresAt,
		createdAt: item.createdAt,
		updatedAt: item.updatedAt,
	};
}

async function getWork(input: {
	organizationId: string;
	workItemId: string;
}): Promise<Result<ReliabilityWorkItem | null>> {
	const rows = await afendaDatabase.client
		.select()
		.from(hrReliabilityWorkItem)
		.where(
			and(
				eq(hrReliabilityWorkItem.organizationId, input.organizationId),
				eq(hrReliabilityWorkItem.id, input.workItemId),
			),
		)
		.limit(1);
	return rows[0] ? mapWork(rows[0]) : errorResult.ok(null);
}

export function createDrizzleReliabilityStore(): ReliabilityStorePort {
	return {
		async findByIdempotencyKey(input) {
			try {
				const rows = await afendaDatabase.client
					.select()
					.from(hrReliabilityWorkItem)
					.where(
						and(
							eq(hrReliabilityWorkItem.organizationId, input.organizationId),
							eq(hrReliabilityWorkItem.connector, input.connector),
							eq(hrReliabilityWorkItem.idempotencyKey, input.idempotencyKey),
						),
					)
					.limit(1);
				return rows[0] ? mapWork(rows[0]) : errorResult.ok(null);
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to find reliability work");
			}
		},
		async getWorkItem(input) {
			try {
				return await getWork(input);
			} catch (error) {
				return await mapPersistenceFailure(
					error,
					"Failed to get reliability work",
				);
			}
		},
		async createWorkItem(item) {
			try {
				const rows = await afendaDatabase.client
					.insert(hrReliabilityWorkItem)
					.values(workValues(item))
					.returning();
				return rows[0] ? mapWork(rows[0]) : errorResult.fail("INTERNAL_ERROR");
			} catch (error) {
				return isPostgresUniqueViolation(error)
					? errorResult.fail("CONFLICT", {
							publicMessage: "The request conflicts with current state",
						})
					: mapPersistenceFailure(error, "Failed to create reliability work");
			}
		},
		async claimDueWork(input) {
			try {
				const [claimed] = await afendaDatabase.transaction((sqlTag) => [
					sqlTag`
						WITH ranked AS (
							SELECT id, organization_id,
								row_number() OVER (
									PARTITION BY organization_id
									ORDER BY COALESCE(next_attempt_at, acknowledgement_deadline_at, created_at), id
								) AS organization_rank
							FROM hr_reliability_work_item
							WHERE (status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= ${input.now}))
								OR (status = 'processing' AND lease_expires_at <= ${input.now})
								OR (status = 'awaiting_acknowledgement' AND acknowledgement_deadline_at <= ${input.now})
						), eligible AS (
							SELECT work.id, work.organization_id
							FROM hr_reliability_work_item AS work
							INNER JOIN ranked
								ON ranked.id = work.id AND ranked.organization_id = work.organization_id
							WHERE ranked.organization_rank <= ${input.perOrganizationLimit}
							ORDER BY COALESCE(work.next_attempt_at, work.acknowledgement_deadline_at, work.created_at), work.id
							LIMIT ${input.limit}
							FOR UPDATE OF work SKIP LOCKED
						)
						UPDATE hr_reliability_work_item AS work
						SET status = 'processing', version = work.version + 1,
							lease_owner = ${input.workerId}, lease_expires_at = ${input.leaseExpiresAt},
							receipt_id = CASE WHEN work.status = 'awaiting_acknowledgement' THEN NULL ELSE work.receipt_id END,
							acknowledgement_deadline_at = NULL,
							updated_at = ${input.now}
						FROM eligible
						WHERE work.id = eligible.id AND work.organization_id = eligible.organization_id
						RETURNING work.id, work.organization_id AS "organizationId"
					`,
				]);
				const items: ReliabilityWorkItem[] = [];
				const sequentialOutcome1 = await runSequential(
					claimed,
					async (row: { id: string; organizationId: string }) => {
						const item = await getWork({
							organizationId: row.organizationId,
							workItemId: row.id,
						});
						if (!item.ok) {
							return sequentialReturn(item);
						}
						if (item.data === null) {
							return sequentialReturn(
								errorResult.fail("NOT_FOUND", {
									publicMessage: "The requested resource was not found",
								}),
							);
						}
						items.push(item.data);
					},
				);
				if (sequentialOutcome1.kind === "return") {
					return sequentialOutcome1.value;
				}
				return errorResult.ok(items);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to claim due reliability work",
				);
			}
		},
		async commitAttempt(input) {
			const item = input.workItem;
			if (item.version !== input.expectedVersion + 1) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
				});
			}
			try {
				if (input.deadLetter === null) {
					const rows = await afendaDatabase.client
						.update(hrReliabilityWorkItem)
						.set({
							status: item.status,
							version: item.version,
							attemptCount: item.attemptCount,
							nextAttemptAt: item.nextAttemptAt,
							lastAttemptAt: item.lastAttemptAt,
							lastErrorCode: item.lastErrorCode,
							lastErrorMessage: item.lastErrorMessage,
							receiptId: item.receiptId,
							acknowledgementDeadlineAt: item.acknowledgementDeadlineAt,
							leaseOwner: item.leaseOwner,
							leaseExpiresAt: item.leaseExpiresAt,
							updatedAt: item.updatedAt,
						})
						.where(
							and(
								eq(hrReliabilityWorkItem.organizationId, item.organizationId),
								eq(hrReliabilityWorkItem.id, item.id),
								eq(hrReliabilityWorkItem.version, input.expectedVersion),
							),
						)
						.returning();
					return rows[0]
						? mapWork(rows[0])
						: errorResult.fail("CONFLICT", {
								publicMessage: "The request conflicts with current state",
							});
				}
				const dead = input.deadLetter;
				const [saved] = await afendaDatabase.transaction((sqlTag) => [
					sqlTag`
						WITH updated AS (
							UPDATE hr_reliability_work_item
							SET status = ${item.status}, version = ${item.version},
								attempt_count = ${item.attemptCount}, next_attempt_at = ${item.nextAttemptAt},
								last_attempt_at = ${item.lastAttemptAt}, last_error_code = ${item.lastErrorCode},
							last_error_message = ${item.lastErrorMessage}, receipt_id = ${item.receiptId},
							acknowledgement_deadline_at = ${item.acknowledgementDeadlineAt},
							lease_owner = ${item.leaseOwner}, lease_expires_at = ${item.leaseExpiresAt},
							updated_at = ${item.updatedAt}
							WHERE organization_id = ${item.organizationId} AND id = ${item.id}
								AND version = ${input.expectedVersion}
							RETURNING id, organization_id
						), inserted AS (
							INSERT INTO hr_reliability_dead_letter (
								id, organization_id, work_item_id, connector, operation, target_type,
								target_id, correlation_id,
								idempotency_key, request_fingerprint, attempt_count, error_code,
								error_message, failed_at, replayed_by_work_item_id
							)
							SELECT ${dead.id}, updated.organization_id, updated.id, ${dead.connector},
								${dead.operation}, ${dead.targetType}, ${dead.targetId},
								${dead.correlationId}, ${dead.idempotencyKey},
								${dead.requestFingerprint}, ${dead.attemptCount}, ${dead.errorCode},
								${dead.errorMessage}, ${dead.failedAt}, ${dead.replayedByWorkItemId}
							FROM updated
							RETURNING work_item_id AS id
						)
						SELECT id FROM inserted
					`,
				]);
				if (!saved[0]) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
				}
				return getWork({
					organizationId: item.organizationId,
					workItemId: item.id,
				}).then((result) =>
					result.ok && result.data
						? errorResult.ok(result.data)
						: errorResult.fail("INTERNAL_ERROR"),
				);
			} catch (error) {
				return isPostgresUniqueViolation(error)
					? errorResult.fail("CONFLICT", {
							publicMessage: "The request conflicts with current state",
						})
					: mapPersistenceFailure(
							error,
							"Failed to commit reliability attempt",
						);
			}
		},
		async getDeadLetter(input) {
			try {
				const rows = await afendaDatabase.client
					.select()
					.from(hrReliabilityDeadLetter)
					.where(
						and(
							eq(hrReliabilityDeadLetter.organizationId, input.organizationId),
							eq(hrReliabilityDeadLetter.id, input.deadLetterId),
						),
					)
					.limit(1);
				return rows[0] ? mapDeadLetter(rows[0]) : errorResult.ok(null);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to get reliability dead letter",
				);
			}
		},
		async findDeadLetterByWorkItem(input) {
			try {
				const rows = await afendaDatabase.client
					.select()
					.from(hrReliabilityDeadLetter)
					.where(
						and(
							eq(hrReliabilityDeadLetter.organizationId, input.organizationId),
							eq(hrReliabilityDeadLetter.workItemId, input.workItemId),
						),
					)
					.limit(1);
				return rows[0] ? mapDeadLetter(rows[0]) : errorResult.ok(null);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to find reliability dead letter",
				);
			}
		},
		async createDeadLetterReplay(input) {
			const item = input.workItem;
			try {
				const [created] = await afendaDatabase.transaction((sqlTag) => [
					sqlTag`
						WITH eligible AS (
							SELECT id FROM hr_reliability_dead_letter
							WHERE id = ${input.deadLetterId}
								AND organization_id = ${item.organizationId}
								AND replayed_by_work_item_id IS NULL
							FOR UPDATE
						), inserted AS (
							INSERT INTO hr_reliability_work_item (
								id, organization_id, connector, operation, target_type, target_id,
								correlation_id, idempotency_key,
								request_fingerprint, status, version, attempt_count, next_attempt_at,
								last_attempt_at, last_error_code, last_error_message, receipt_id, created_at, updated_at
							)
							SELECT ${item.id}, ${item.organizationId}, ${item.connector}, ${item.operation},
								${item.targetType}, ${item.targetId}, ${item.correlationId},
								${item.idempotencyKey}, ${item.requestFingerprint},
								${item.status}, ${item.version}, ${item.attemptCount}, ${item.nextAttemptAt},
								${item.lastAttemptAt}, ${item.lastErrorCode}, ${item.lastErrorMessage},
								${item.receiptId}, ${item.createdAt}, ${item.updatedAt}
							FROM eligible RETURNING id
						), linked AS (
							UPDATE hr_reliability_dead_letter
							SET replayed_by_work_item_id = inserted.id
							FROM inserted
							WHERE hr_reliability_dead_letter.id = ${input.deadLetterId}
								AND hr_reliability_dead_letter.organization_id = ${item.organizationId}
							RETURNING inserted.id
						)
						SELECT id FROM linked
					`,
				]);
				if (!created[0]) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
				}
				return getWork({
					organizationId: item.organizationId,
					workItemId: item.id,
				}).then((result) =>
					result.ok && result.data
						? errorResult.ok(result.data)
						: errorResult.fail("INTERNAL_ERROR"),
				);
			} catch (error) {
				return isPostgresUniqueViolation(error)
					? errorResult.fail("CONFLICT", {
							publicMessage: "The request conflicts with current state",
						})
					: mapPersistenceFailure(
							error,
							"Failed to replay reliability dead letter",
						);
			}
		},
		async getCursor(input) {
			try {
				const rows = await afendaDatabase.client
					.select()
					.from(hrConnectorCursor)
					.where(
						and(
							eq(hrConnectorCursor.organizationId, input.organizationId),
							eq(hrConnectorCursor.connector, input.connector),
							eq(hrConnectorCursor.stream, input.stream),
						),
					)
					.limit(1);
				return rows[0] ? mapCursor(rows[0]) : errorResult.ok(null);
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to get connector cursor");
			}
		},
		async commitCursor(input) {
			if (input.cursor.version !== (input.expectedVersion ?? 0) + 1) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
				});
			}
			try {
				const rows =
					input.expectedVersion === null
						? await afendaDatabase.client
								.insert(hrConnectorCursor)
								.values({
									...input.cursor,
									organizationId: input.cursor.organizationId,
								})
								.returning()
						: await afendaDatabase.client
								.update(hrConnectorCursor)
								.set({
									cursor: input.cursor.cursor,
									version: input.cursor.version,
									updatedAt: input.cursor.updatedAt,
								})
								.where(
									and(
										eq(
											hrConnectorCursor.organizationId,
											input.cursor.organizationId,
										),
										eq(hrConnectorCursor.connector, input.cursor.connector),
										eq(hrConnectorCursor.stream, input.cursor.stream),
										eq(hrConnectorCursor.version, input.expectedVersion),
									),
								)
								.returning();
				return rows[0]
					? mapCursor(rows[0])
					: errorResult.fail("CONFLICT", {
							publicMessage: "The request conflicts with current state",
						});
			} catch (error) {
				return isPostgresUniqueViolation(error)
					? errorResult.fail("CONFLICT", {
							publicMessage: "The request conflicts with current state",
						})
					: mapPersistenceFailure(error, "Failed to commit connector cursor");
			}
		},
	};
}
