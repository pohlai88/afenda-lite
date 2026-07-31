import { randomUUID } from "node:crypto";

import { database as afendaDatabase, and, eq, hrHireAttempt } from "@afenda/db";
import { errorResult } from "@afenda/errors";
import { assertExpectedVersion } from "../../shared/concurrency";
import { conflict, notFound } from "../../shared/domain-guards";
import {
	isCreateIdempotencyUniqueViolation,
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import type { HumanResourcesStore } from "../../store";
import { mapHireAttemptRow } from "../memory/hire-orchestration";

export const drizzleHireOrchestrationMethods: Pick<
	HumanResourcesStore,
	| "findHireAttemptByIdempotencyKey"
	| "findOpenHireAttemptByOfferId"
	| "createHireAttempt"
	| "updateHireAttemptProgress"
> = {
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
