import { randomUUID } from "node:crypto";
import { errorResult, type Result } from "@afenda/errors";
import { HUMAN_RESOURCES_HIRE_FROM_ACCEPTED_OFFER_COMPLETED_EVENT } from "@afenda/events/schemas";
import {
	parseHumanResourcesAssignmentId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentId,
	parseHumanResourcesHireAttemptId,
	parseHumanResourcesOfferId,
	parseHumanResourcesOnboardingCaseId,
	parseHumanResourcesPersonId,
	parseHumanResourcesWorkerId,
} from "../../brands";
import { emitHumanResourcesMutationOutcome } from "../../emissions/mutation-outcome";
import { getHumanResourcesMutationEmission } from "../../emissions/resolve-emission";
import type {
	HireAttempt,
	HireCompensationLogEntry,
} from "../../hire-orchestration/types";
import { assertExpectedVersion } from "../../shared/concurrency";
import { conflict } from "../../shared/domain-guards";
import { attachMutationExecutionContext } from "../../shared/mutation-meta";
import { runSequential, sequentialReturn } from "../../shared/run-sequential";
import type {
	HumanResourcesHireOrchestrationStore,
	IdempotentHireAttemptRecord,
} from "../../store/hire-orchestration";

export interface HireOrchestrationMemoryState {
	attemptsById: Map<string, HireAttempt>;
	idempotencyByKey: Map<string, IdempotentHireAttemptRecord>;
}

function idempotencyMapKey(
	organizationId: string,
	idempotencyKey: string,
): string {
	return `${organizationId}:${idempotencyKey}`;
}

function cloneAttempt(attempt: HireAttempt): HireAttempt {
	return {
		...attempt,
		compensationLog: [...attempt.compensationLog],
	};
}

function cloneRecord(
	record: IdempotentHireAttemptRecord,
): IdempotentHireAttemptRecord {
	return {
		attempt: cloneAttempt(record.attempt),
		requestFingerprint: record.requestFingerprint,
	};
}

export function createHireOrchestrationMemoryState(): HireOrchestrationMemoryState {
	return {
		attemptsById: new Map(),
		idempotencyByKey: new Map(),
	};
}

export function resetHireOrchestrationMemoryState(
	state: HireOrchestrationMemoryState,
): void {
	state.attemptsById.clear();
	state.idempotencyByKey.clear();
}

export function createMemoryHireOrchestrationMethods(
	state: HireOrchestrationMemoryState,
): HumanResourcesHireOrchestrationStore {
	return {
		async completeHireAttempt(input, ports, meta) {
			const existing = state.attemptsById.get(input.attemptId);
			if (
				existing === undefined ||
				existing.organizationId !== input.organizationId
			) {
				return conflict("Hire attempt not found");
			}
			const versionCheck = assertExpectedVersion(
				existing.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const definition = getHumanResourcesMutationEmission(meta.operationId);
			const emission = await emitHumanResourcesMutationOutcome(
				{
					commandId: meta.operationId,
					meta: attachMutationExecutionContext(meta, {
						organizationId: input.organizationId,
						actorUserId: input.actorUserId,
					}),
					aggregateType: definition.aggregateType,
					aggregateId: input.attemptId,
					audit: {
						entity: "hr_hire_attempt",
						action: "UPDATE",
						changes: [
							{
								field: "status",
								oldValue: existing.status,
								newValue: "completed",
							},
						],
					},
					event: {
						type: HUMAN_RESOURCES_HIRE_FROM_ACCEPTED_OFFER_COMPLETED_EVENT,
						entityType: "hr_hire_attempt",
						payload: {},
					},
				},
				ports,
			);
			if (!emission.ok) {
				return emission;
			}
			return this.updateHireAttemptProgress(
				{
					...input,
					currentStep: existing.currentStep,
					status: "completed",
				},
				ports,
				meta,
			);
		},

		async findHireAttemptByIdempotencyKey(input) {
			const record = state.idempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok(cloneRecord(record));
		},

		async findOpenHireAttemptByOfferId(input) {
			const sequentialOutcome1 = await runSequential(
				state.attemptsById.values(),
				async (attempt) => {
					if (
						attempt.organizationId === input.organizationId &&
						attempt.offerId === input.offerId &&
						(attempt.status === "in_progress" || attempt.status === "completed")
					) {
						return sequentialReturn(
							await errorResult.ok(cloneAttempt(attempt)),
						);
					}
				},
			);
			if (sequentialOutcome1.kind === "return") {
				return sequentialOutcome1.value;
			}
			return await errorResult.ok(null);
		},

		async createHireAttempt(record, _ports, _meta) {
			const existing = state.idempotencyByKey.get(
				idempotencyMapKey(record.organizationId, record.idempotencyKey),
			);
			if (existing !== undefined) {
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

			const now = new Date();
			const idParsed = parseHumanResourcesHireAttemptId(randomUUID());
			if (!idParsed.ok) {
				return idParsed;
			}

			const attempt: HireAttempt = {
				id: idParsed.data,
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
			};

			state.attemptsById.set(attempt.id, attempt);
			state.idempotencyByKey.set(
				idempotencyMapKey(record.organizationId, record.idempotencyKey),
				{
					attempt: cloneAttempt(attempt),
					requestFingerprint: record.requestFingerprint,
				},
			);

			return errorResult.ok(cloneAttempt(attempt));
		},

		async updateHireAttemptProgress(input, _ports, _meta) {
			const existing = state.attemptsById.get(input.attemptId);
			if (existing === undefined) {
				return await conflict("Hire attempt not found");
			}
			if (existing.organizationId !== input.organizationId) {
				return await conflict("Hire attempt organization mismatch");
			}

			const versionCheck = assertExpectedVersion(
				existing.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return await versionCheck;
			}

			const now = new Date();
			const updated: HireAttempt = {
				...existing,
				currentStep: input.currentStep ?? existing.currentStep,
				personId: input.personId ?? existing.personId,
				employeeId: input.employeeId ?? existing.employeeId,
				employmentId: input.employmentId ?? existing.employmentId,
				workerId: input.workerId ?? existing.workerId,
				assignmentId: input.assignmentId ?? existing.assignmentId,
				onboardingCaseId: input.onboardingCaseId ?? existing.onboardingCaseId,
				compensationLog: input.compensationLog
					? [...input.compensationLog]
					: existing.compensationLog,
				status: input.status ?? existing.status,
				version: existing.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.attemptsById.set(updated.id, updated);
			const idempotent = state.idempotencyByKey.get(
				idempotencyMapKey(updated.organizationId, updated.idempotencyKey),
			);
			if (idempotent !== undefined) {
				state.idempotencyByKey.set(
					idempotencyMapKey(updated.organizationId, updated.idempotencyKey),
					{
						attempt: cloneAttempt(updated),
						requestFingerprint: idempotent.requestFingerprint,
					},
				);
			}

			return await errorResult.ok(cloneAttempt(updated));
		},
	};
}

function parseNullableHireId<T>(
	value: string | null,
	parse: (value: string) => Result<T>,
): Result<T | null> {
	return value === null ? errorResult.ok(null) : parse(value);
}

export function mapHireAttemptRow(row: {
	id: string;
	organizationId: string;
	offerId: string;
	correlationId: string;
	idempotencyKey: string;
	requestFingerprint: string;
	status: string;
	currentStep: string | null;
	personId: string | null;
	employeeId: string | null;
	employmentId: string | null;
	workerId: string | null;
	assignmentId: string | null;
	onboardingCaseId: string | null;
	compensationLog: unknown;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
}): Result<HireAttempt> {
	const id = parseHumanResourcesHireAttemptId(row.id);
	if (!id.ok) {
		return id;
	}
	const offerId = parseHumanResourcesOfferId(row.offerId);
	if (!offerId.ok) {
		return offerId;
	}

	const personId = parseNullableHireId(
		row.personId,
		parseHumanResourcesPersonId,
	);
	if (!personId.ok) {
		return personId;
	}
	const employeeId = parseNullableHireId(
		row.employeeId,
		parseHumanResourcesEmployeeId,
	);
	if (!employeeId.ok) {
		return employeeId;
	}
	const employmentId = parseNullableHireId(
		row.employmentId,
		parseHumanResourcesEmploymentId,
	);
	if (!employmentId.ok) {
		return employmentId;
	}
	const workerId = parseNullableHireId(
		row.workerId,
		parseHumanResourcesWorkerId,
	);
	if (!workerId.ok) {
		return workerId;
	}
	const assignmentId = parseNullableHireId(
		row.assignmentId,
		parseHumanResourcesAssignmentId,
	);
	if (!assignmentId.ok) {
		return assignmentId;
	}
	const onboardingCaseId = parseNullableHireId(
		row.onboardingCaseId,
		parseHumanResourcesOnboardingCaseId,
	);
	if (!onboardingCaseId.ok) {
		return onboardingCaseId;
	}

	const compensationLog = Array.isArray(row.compensationLog)
		? (row.compensationLog as HireCompensationLogEntry[])
		: [];

	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		offerId: offerId.data,
		correlationId: row.correlationId,
		idempotencyKey: row.idempotencyKey,
		requestFingerprint: row.requestFingerprint,
		status: row.status as HireAttempt["status"],
		currentStep: row.currentStep as HireAttempt["currentStep"],
		personId: personId.data,
		employeeId: employeeId.data,
		employmentId: employmentId.data,
		workerId: workerId.data,
		assignmentId: assignmentId.data,
		onboardingCaseId: onboardingCaseId.data,
		compensationLog,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}
