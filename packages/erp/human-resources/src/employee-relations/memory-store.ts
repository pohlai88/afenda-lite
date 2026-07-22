/**
 * In-memory employee-relations domain state and attachment for HumanResourcesStore hosts.
 */

import { randomUUID } from "node:crypto";

import {
	HUMAN_RESOURCES_EMPLOYEE_CASE_ACTION_APPROVED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CASE_APPEAL_RESOLVED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CASE_CLOSED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CASE_FINDING_RECORDED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CASE_INTERIM_MEASURE_ISSUED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CASE_OPENED_EVENT,
	type HumanResourcesEventType,
} from "@afenda/events/schemas";
import { fail, ok, type Result } from "@afenda/errors/result";

import {
	parseHumanResourcesEmployeeCaseActionId,
	parseHumanResourcesEmployeeCaseAppealId,
	parseHumanResourcesEmployeeCaseEventId,
	parseHumanResourcesEmployeeCaseId,
	type HumanResourcesEmployeeCaseActionId,
	type HumanResourcesEmployeeCaseAppealId,
	type HumanResourcesEmployeeCaseEventId,
	type HumanResourcesEmployeeCaseId,
	type HumanResourcesEmployeeId,
	type HumanResourcesEmploymentId,
} from "../brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import type { MemoryHumanResourcesStore } from "../memory-store";
import type { MutationPorts } from "../ports";
import { assertExpectedVersion } from "../shared/concurrency";
import { conflict, invalidState, notFound } from "../shared/domain-guards";
import {
	assertEmployeeCaseMutable,
	assertEmployeeCaseOwnerNotConflicted,
	assertEmployeeCaseStatusAllowsActionRecommend,
	assertEmployeeCaseStatusAllowsAppeal,
	assertEmployeeCaseStatusAllowsFinding,
	assertInterimMeasureDates,
	assertPolicyValidationForAction,
} from "../shared/employee-relations-guards";
import type { EmployeeCaseStatus } from "../shared/employee-relations-status";
import type { HumanResourcesStore } from "../store";
import type {
	IdempotentEmployeeCaseActionOpenRecord,
	IdempotentEmployeeCaseAppealOpenRecord,
	IdempotentEmployeeCaseOpenRecord,
} from "../store";
import type {
	EmployeeCase,
	EmployeeCaseAction,
	EmployeeCaseAppeal,
	EmployeeCaseEvent,
	EmployeeCaseListPage,
	EmployeeCaseOutcome,
	EmployeeCaseTimeline,
} from "./types";

export type EmployeeRelationsMemoryState = {
	cases: Map<HumanResourcesEmployeeCaseId, EmployeeCase>;
	events: Map<HumanResourcesEmployeeCaseEventId, EmployeeCaseEvent>;
	actions: Map<HumanResourcesEmployeeCaseActionId, EmployeeCaseAction>;
	appeals: Map<HumanResourcesEmployeeCaseAppealId, EmployeeCaseAppeal>;
	caseIdempotency: Map<string, IdempotentEmployeeCaseOpenRecord & { case: EmployeeCase }>;
	actionIdempotency: Map<
		string,
		IdempotentEmployeeCaseActionOpenRecord & { action: EmployeeCaseAction }
	>;
	appealIdempotency: Map<
		string,
		IdempotentEmployeeCaseAppealOpenRecord & { appeal: EmployeeCaseAppeal }
	>;
	nextSequenceByCase: Map<string, number>;
};

export type EmployeeRelationsHost = {
	getEmployeeById: HumanResourcesStore["getEmployeeById"];
	getEmploymentById: HumanResourcesStore["getEmploymentById"];
	idempotencyMapKey(organizationId: string, idempotencyKey: string): string;
};

export type EmployeeRelationsMemoryMethods = Pick<
	HumanResourcesStore,
	| "openEmployeeCase"
	| "findEmployeeCaseByIdempotencyKey"
	| "getEmployeeCaseById"
	| "listEmployeeCases"
	| "listCasesAssignedToActor"
	| "listOpenEmployeeRelationsCases"
	| "getEmployeeRelationsHistoryByEmployee"
	| "updateEmployeeCaseClassification"
	| "assignEmployeeCaseOwner"
	| "addEmployeeCaseParticipant"
	| "recordEmployeeCaseEvent"
	| "addEmployeeCaseEvidenceReference"
	| "redactEmployeeCaseEvidenceReference"
	| "issueInterimEmployeeMeasure"
	| "recordEmployeeCaseFinding"
	| "recommendEmployeeCaseAction"
	| "findEmployeeCaseActionByIdempotencyKey"
	| "approveEmployeeCaseAction"
	| "recordEmployeeCaseAppeal"
	| "findEmployeeCaseAppealByIdempotencyKey"
	| "resolveEmployeeCaseAppeal"
	| "closeEmployeeCase"
	| "reopenEmployeeCase"
	| "getEmployeeCaseTimeline"
	| "getEmployeeCaseOutcome"
>;

const ER_STATE = new WeakMap<object, EmployeeRelationsMemoryState>();

function idemKey(organizationId: string, idempotencyKey: string): string {
	return `${organizationId}:${idempotencyKey}`;
}

function caseSequenceKey(organizationId: string, caseId: HumanResourcesEmployeeCaseId): string {
	return `${organizationId}:${caseId}`;
}

function cloneCase(record: EmployeeCase): EmployeeCase {
	return {
		...record,
		participants: record.participants.map((participant) => ({ ...participant })),
		conflictedActorUserIds: [...record.conflictedActorUserIds],
	};
}

function cloneEvent(record: EmployeeCaseEvent): EmployeeCaseEvent {
	return {
		...record,
		payloadJson:
			record.payloadJson === null ? null : { ...record.payloadJson },
	};
}

function cloneAction(record: EmployeeCaseAction): EmployeeCaseAction {
	return { ...record };
}

function cloneAppeal(record: EmployeeCaseAppeal): EmployeeCaseAppeal {
	return { ...record };
}

function hasCaseAccess(caseRecord: EmployeeCase, actorUserId: string): boolean {
	if (caseRecord.ownerActorUserId === actorUserId) {
		return true;
	}
	return caseRecord.participants.some(
		(participant) => participant.actorUserId === actorUserId,
	);
}

function promoteToInvestigatingIfOpen(status: EmployeeCaseStatus): EmployeeCaseStatus {
	return status === "open" ? "investigating" : status;
}

async function recordAudit(
	ports: MutationPorts,
	meta: { correlationId: string },
	input: {
		organizationId: string;
		actorUserId: string;
		entity: string;
		entityId: string;
		action: "CREATE" | "UPDATE";
	},
): Promise<Result<{ id: string }>> {
	return ports.audit.record({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		changes: [],
	});
}

async function recordOutbox(
	ports: MutationPorts,
	meta: { correlationId: string },
	input: {
		organizationId: string;
		actorUserId: string;
		type: HumanResourcesEventType;
		entityType: string;
		entityId: string;
	},
): Promise<Result<{ id: string }>> {
	return ports.outbox.append({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		type: input.type,
		payload: {
			organizationId: input.organizationId,
			entityType: input.entityType,
			entityId: input.entityId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		},
	});
}

function getCaseInOrg(
	state: EmployeeRelationsMemoryState,
	organizationId: string,
	caseId: HumanResourcesEmployeeCaseId,
): Result<EmployeeCase> {
	const caseRecord = state.cases.get(caseId);
	if (!caseRecord || caseRecord.organizationId !== organizationId) {
		return notFound("Case not found", HUMAN_RESOURCES_ERROR_NOT_FOUND);
	}
	return ok(caseRecord);
}

function getCaseWithAccess(
	state: EmployeeRelationsMemoryState,
	input: {
		organizationId: string;
		caseId: HumanResourcesEmployeeCaseId;
		actorUserId: string;
	},
): Result<EmployeeCase> {
	const loaded = getCaseInOrg(state, input.organizationId, input.caseId);
	if (!loaded.ok) {
		return loaded;
	}
	if (!hasCaseAccess(loaded.data, input.actorUserId)) {
		return notFound("Case not found", HUMAN_RESOURCES_ERROR_NOT_FOUND);
	}
	return loaded;
}

function paginateCases(
	cases: EmployeeCase[],
	page: number,
	pageSize: number,
): EmployeeCaseListPage {
	const sorted = [...cases].sort(
		(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
	);
	const offset = (page - 1) * pageSize;
	return {
		cases: sorted.slice(offset, offset + pageSize).map(cloneCase),
		totalCount: sorted.length,
		page,
		pageSize,
	};
}

export function createEmployeeRelationsMemoryState(): EmployeeRelationsMemoryState {
	return {
		cases: new Map(),
		events: new Map(),
		actions: new Map(),
		appeals: new Map(),
		caseIdempotency: new Map(),
		actionIdempotency: new Map(),
		appealIdempotency: new Map(),
		nextSequenceByCase: new Map(),
	};
}

export function resetEmployeeRelationsMemoryState(host: object): void {
	const state = ER_STATE.get(host);
	if (!state) {
		return;
	}
	state.cases.clear();
	state.events.clear();
	state.actions.clear();
	state.appeals.clear();
	state.caseIdempotency.clear();
	state.actionIdempotency.clear();
	state.appealIdempotency.clear();
	state.nextSequenceByCase.clear();
}

function appendCaseEvent(
	state: EmployeeRelationsMemoryState,
	input: {
		organizationId: string;
		caseId: HumanResourcesEmployeeCaseId;
		eventKind: EmployeeCaseEvent["eventKind"];
		documentRef?: string | null;
		payloadJson?: Record<string, unknown> | null;
		redactsEventId?: HumanResourcesEmployeeCaseEventId | null;
		recordedBy: string;
		recordedAt?: Date;
	},
): Result<EmployeeCaseEvent> {
	const idResult = parseHumanResourcesEmployeeCaseEventId(randomUUID());
	if (!idResult.ok) {
		return idResult;
	}
	const sequenceKey = caseSequenceKey(input.organizationId, input.caseId);
	const nextSequence = (state.nextSequenceByCase.get(sequenceKey) ?? 0) + 1;
	state.nextSequenceByCase.set(sequenceKey, nextSequence);
	const now = input.recordedAt ?? new Date();
	const event: EmployeeCaseEvent = {
		id: idResult.data,
		organizationId: input.organizationId,
		caseId: input.caseId,
		eventKind: input.eventKind,
		sequenceNo: nextSequence,
		documentRef: input.documentRef ?? null,
		payloadJson: input.payloadJson ?? null,
		redactsEventId: input.redactsEventId ?? null,
		recordedBy: input.recordedBy,
		recordedAt: now,
		createdAt: now,
	};
	state.events.set(event.id, event);
	return ok(event);
}

export function createEmployeeRelationsMemoryMethods(
	host: EmployeeRelationsHost,
	getState: () => EmployeeRelationsMemoryState,
): EmployeeRelationsMemoryMethods {
	return {
		async findEmployeeCaseByIdempotencyKey(input) {
			const state = getState();
			const key = host.idempotencyMapKey(
				input.organizationId,
				input.idempotencyKey,
			);
			const record = state.caseIdempotency.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({
				caseId: record.caseId,
				createRequestFingerprint: record.createRequestFingerprint,
				case: cloneCase(record.case),
			});
		},

		async openEmployeeCase(record, ports, meta) {
			const state = getState();
			const existing = await this.findEmployeeCaseByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.createIdempotencyKey,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				if (
					existing.data.createRequestFingerprint !== record.createRequestFingerprint
				) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(cloneCase(existing.data.case));
			}

			const employee = await host.getEmployeeById({
				organizationId: record.organizationId,
				employeeId: record.employeeId,
			});
			if (!employee.ok) {
				return employee;
			}
			if (employee.data === null) {
				return notFound("Employee not found");
			}

			const employment = await host.getEmploymentById({
				organizationId: record.organizationId,
				employmentId: record.employmentId,
			});
			if (!employment.ok) {
				return employment;
			}
			if (employment.data === null) {
				return notFound("Employment not found");
			}
			if (employment.data.employeeId !== record.employeeId) {
				return notFound(
					"Employment not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const coi = assertEmployeeCaseOwnerNotConflicted({
				ownerActorUserId: record.ownerActorUserId,
				conflictedActorUserIds: record.conflictedActorUserIds,
				subjectActorUserId: record.subjectActorUserId,
			});
			if (!coi.ok) {
				return coi;
			}

			const idResult = parseHumanResourcesEmployeeCaseId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const caseRecord: EmployeeCase = {
				id: idResult.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				employmentId: record.employmentId,
				caseType: record.caseType,
				status: "open",
				severity: record.severity,
				allegationSummary: record.allegationSummary,
				classificationCode: record.classificationCode,
				ownerActorUserId: record.ownerActorUserId,
				subjectActorUserId: record.subjectActorUserId,
				participants: [],
				conflictedActorUserIds: [...record.conflictedActorUserIds],
				interimAuthority: null,
				interimReason: null,
				interimStartsOn: null,
				interimReviewOn: null,
				interimStatus: null,
				findingCode: null,
				findingSummary: null,
				findingRecordedBy: null,
				findingRecordedAt: null,
				outcomeCode: null,
				closedAt: null,
				closedBy: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.cases.set(caseRecord.id, caseRecord);
			const idempotencyKey = host.idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			state.caseIdempotency.set(idempotencyKey, {
				caseId: caseRecord.id,
				createRequestFingerprint: record.createRequestFingerprint,
				case: cloneCase(caseRecord),
			});

			const event = appendCaseEvent(state, {
				organizationId: record.organizationId,
				caseId: caseRecord.id,
				eventKind: "case_opened",
				recordedBy: record.createdBy,
				recordedAt: now,
			});
			if (!event.ok) {
				state.cases.delete(caseRecord.id);
				state.caseIdempotency.delete(idempotencyKey);
				return event;
			}

			const audit = await recordAudit(ports, meta, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				entity: "hr_employee_case",
				entityId: caseRecord.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.cases.delete(caseRecord.id);
				state.caseIdempotency.delete(idempotencyKey);
				state.events.delete(event.data.id);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				type: HUMAN_RESOURCES_EMPLOYEE_CASE_OPENED_EVENT,
				entityType: "hr_employee_case",
				entityId: caseRecord.id,
			});
			if (!outbox.ok) {
				state.cases.delete(caseRecord.id);
				state.caseIdempotency.delete(idempotencyKey);
				state.events.delete(event.data.id);
				return outbox;
			}

			return ok(cloneCase(caseRecord));
		},

		async getEmployeeCaseById(input) {
			const state = getState();
			const result = getCaseWithAccess(state, input);
			if (!result.ok) {
				return result;
			}
			return ok(cloneCase(result.data));
		},

		async listEmployeeCases(input) {
			const state = getState();
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const filtered = Array.from(state.cases.values()).filter((caseRecord) => {
				if (caseRecord.organizationId !== input.organizationId) {
					return false;
				}
				if (!hasCaseAccess(caseRecord, input.actorUserId)) {
					return false;
				}
				if (input.status !== undefined && caseRecord.status !== input.status) {
					return false;
				}
				return true;
			});
			return ok(paginateCases(filtered, page, pageSize));
		},

		async listCasesAssignedToActor(input) {
			const state = getState();
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const filtered = Array.from(state.cases.values()).filter(
				(caseRecord) =>
					caseRecord.organizationId === input.organizationId &&
					hasCaseAccess(caseRecord, input.actorUserId),
			);
			return ok(paginateCases(filtered, page, pageSize));
		},

		async listOpenEmployeeRelationsCases(input) {
			const state = getState();
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const filtered = Array.from(state.cases.values()).filter(
				(caseRecord) =>
					caseRecord.organizationId === input.organizationId &&
					caseRecord.status !== "closed" &&
					hasCaseAccess(caseRecord, input.actorUserId),
			);
			return ok(paginateCases(filtered, page, pageSize));
		},

		async getEmployeeRelationsHistoryByEmployee(input) {
			const state = getState();
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const filtered = Array.from(state.cases.values()).filter(
				(caseRecord) =>
					caseRecord.organizationId === input.organizationId &&
					caseRecord.employeeId === input.employeeId,
			);
			return ok(paginateCases(filtered, page, pageSize));
		},

		async updateEmployeeCaseClassification(input, ports, meta) {
			const state = getState();
			const loaded = getCaseInOrg(state, input.organizationId, input.caseId);
			if (!loaded.ok) {
				return loaded;
			}
			const mutable = assertEmployeeCaseMutable(loaded.data.status);
			if (!mutable.ok) {
				return mutable;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: EmployeeCase = {
				...loaded.data,
				classificationCode: input.classificationCode,
				status: promoteToInvestigatingIfOpen(loaded.data.status),
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.cases.set(updated.id, updated);

			const event = appendCaseEvent(state, {
				organizationId: input.organizationId,
				caseId: input.caseId,
				eventKind: "classification_updated",
				recordedBy: input.actorUserId,
				recordedAt: now,
			});
			if (!event.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				return event;
			}

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_employee_case",
				entityId: input.caseId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				state.events.delete(event.data.id);
				return audit;
			}

			return ok(cloneCase(updated));
		},

		async assignEmployeeCaseOwner(input, ports, meta) {
			const state = getState();
			const loaded = getCaseInOrg(state, input.organizationId, input.caseId);
			if (!loaded.ok) {
				return loaded;
			}
			const mutable = assertEmployeeCaseMutable(loaded.data.status);
			if (!mutable.ok) {
				return mutable;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const coi = assertEmployeeCaseOwnerNotConflicted({
				ownerActorUserId: input.ownerActorUserId,
				conflictedActorUserIds: loaded.data.conflictedActorUserIds,
				subjectActorUserId: loaded.data.subjectActorUserId,
			});
			if (!coi.ok) {
				return coi;
			}

			const now = new Date();
			const updated: EmployeeCase = {
				...loaded.data,
				ownerActorUserId: input.ownerActorUserId,
				status: promoteToInvestigatingIfOpen(loaded.data.status),
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.cases.set(updated.id, updated);

			const event = appendCaseEvent(state, {
				organizationId: input.organizationId,
				caseId: input.caseId,
				eventKind: "owner_assigned",
				recordedBy: input.actorUserId,
				recordedAt: now,
			});
			if (!event.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				return event;
			}

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_employee_case",
				entityId: input.caseId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				state.events.delete(event.data.id);
				return audit;
			}

			return ok(cloneCase(updated));
		},

		async addEmployeeCaseParticipant(input, ports, meta) {
			const state = getState();
			const loaded = getCaseInOrg(state, input.organizationId, input.caseId);
			if (!loaded.ok) {
				return loaded;
			}
			const mutable = assertEmployeeCaseMutable(loaded.data.status);
			if (!mutable.ok) {
				return mutable;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (
				loaded.data.participants.some(
					(participant) =>
						participant.actorUserId === input.participantActorUserId,
				)
			) {
				return conflict("Participant is already on the case");
			}

			const now = new Date();
			const updated: EmployeeCase = {
				...loaded.data,
				participants: [
					...loaded.data.participants,
					{
						actorUserId: input.participantActorUserId,
						role: input.role,
						addedAt: now.toISOString(),
					},
				],
				status: promoteToInvestigatingIfOpen(loaded.data.status),
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.cases.set(updated.id, updated);

			const event = appendCaseEvent(state, {
				organizationId: input.organizationId,
				caseId: input.caseId,
				eventKind: "participant_added",
				recordedBy: input.actorUserId,
				recordedAt: now,
			});
			if (!event.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				return event;
			}

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_employee_case",
				entityId: input.caseId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				state.events.delete(event.data.id);
				return audit;
			}

			return ok(cloneCase(updated));
		},

		async recordEmployeeCaseEvent(input, ports, meta) {
			const state = getState();
			const loaded = getCaseInOrg(state, input.organizationId, input.caseId);
			if (!loaded.ok) {
				return loaded;
			}
			const mutable = assertEmployeeCaseMutable(loaded.data.status);
			if (!mutable.ok) {
				return mutable;
			}

			const now = new Date();
			let updated = loaded.data;
			if (input.eventKind === "investigation_note") {
				updated = {
					...loaded.data,
					status: promoteToInvestigatingIfOpen(loaded.data.status),
					version: loaded.data.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: now,
				};
				state.cases.set(updated.id, updated);
			}

			const event = appendCaseEvent(state, {
				organizationId: input.organizationId,
				caseId: input.caseId,
				eventKind: input.eventKind,
				payloadJson: input.payloadJson ?? null,
				recordedBy: input.actorUserId,
				recordedAt: now,
			});
			if (!event.ok) {
				if (updated !== loaded.data) {
					state.cases.set(loaded.data.id, loaded.data);
				}
				return event;
			}

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_employee_case_event",
				entityId: event.data.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.events.delete(event.data.id);
				if (updated !== loaded.data) {
					state.cases.set(loaded.data.id, loaded.data);
				}
				return audit;
			}

			return ok(cloneEvent(event.data));
		},

		async addEmployeeCaseEvidenceReference(input, ports, meta) {
			const state = getState();
			const loaded = getCaseInOrg(state, input.organizationId, input.caseId);
			if (!loaded.ok) {
				return loaded;
			}
			const mutable = assertEmployeeCaseMutable(loaded.data.status);
			if (!mutable.ok) {
				return mutable;
			}

			const now = new Date();
			const updated: EmployeeCase = {
				...loaded.data,
				status: promoteToInvestigatingIfOpen(loaded.data.status),
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.cases.set(updated.id, updated);

			const event = appendCaseEvent(state, {
				organizationId: input.organizationId,
				caseId: input.caseId,
				eventKind: "evidence_reference_added",
				documentRef: input.documentRef,
				recordedBy: input.actorUserId,
				recordedAt: now,
			});
			if (!event.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				return event;
			}

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_employee_case_event",
				entityId: event.data.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				state.events.delete(event.data.id);
				return audit;
			}

			return ok(cloneEvent(event.data));
		},

		async redactEmployeeCaseEvidenceReference(input, ports, meta) {
			const state = getState();
			const loaded = getCaseInOrg(state, input.organizationId, input.caseId);
			if (!loaded.ok) {
				return loaded;
			}
			const mutable = assertEmployeeCaseMutable(loaded.data.status);
			if (!mutable.ok) {
				return mutable;
			}

			const targetEvent = state.events.get(input.eventId);
			if (
				!targetEvent ||
				targetEvent.organizationId !== input.organizationId ||
				targetEvent.caseId !== input.caseId
			) {
				return notFound("Case event not found");
			}
			if (targetEvent.eventKind !== "evidence_reference_added") {
				return invalidState("Only evidence references can be redacted");
			}

			const now = new Date();
			const event = appendCaseEvent(state, {
				organizationId: input.organizationId,
				caseId: input.caseId,
				eventKind: "evidence_redacted",
				payloadJson: { reasonCode: input.reasonCode },
				redactsEventId: input.eventId,
				recordedBy: input.actorUserId,
				recordedAt: now,
			});
			if (!event.ok) {
				return event;
			}

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_employee_case_event",
				entityId: event.data.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.events.delete(event.data.id);
				return audit;
			}

			return ok(cloneEvent(event.data));
		},

		async issueInterimEmployeeMeasure(input, ports, meta) {
			const state = getState();
			const loaded = getCaseInOrg(state, input.organizationId, input.caseId);
			if (!loaded.ok) {
				return loaded;
			}
			const mutable = assertEmployeeCaseMutable(loaded.data.status);
			if (!mutable.ok) {
				return mutable;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const dates = assertInterimMeasureDates({
				startsOn: input.interimStartsOn,
				reviewOn: input.interimReviewOn,
			});
			if (!dates.ok) {
				return dates;
			}

			const now = new Date();
			const updated: EmployeeCase = {
				...loaded.data,
				interimAuthority: input.interimAuthority,
				interimReason: input.interimReason,
				interimStartsOn: input.interimStartsOn,
				interimReviewOn: input.interimReviewOn,
				interimStatus: "active",
				status: promoteToInvestigatingIfOpen(loaded.data.status),
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.cases.set(updated.id, updated);

			const event = appendCaseEvent(state, {
				organizationId: input.organizationId,
				caseId: input.caseId,
				eventKind: "interim_measure_issued",
				recordedBy: input.actorUserId,
				recordedAt: now,
			});
			if (!event.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				return event;
			}

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_employee_case",
				entityId: input.caseId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				state.events.delete(event.data.id);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_EMPLOYEE_CASE_INTERIM_MEASURE_ISSUED_EVENT,
				entityType: "hr_employee_case",
				entityId: input.caseId,
			});
			if (!outbox.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				state.events.delete(event.data.id);
				return outbox;
			}

			return ok(cloneCase(updated));
		},

		async recordEmployeeCaseFinding(input, ports, meta) {
			const state = getState();
			const loaded = getCaseInOrg(state, input.organizationId, input.caseId);
			if (!loaded.ok) {
				return loaded;
			}
			const mutable = assertEmployeeCaseMutable(loaded.data.status);
			if (!mutable.ok) {
				return mutable;
			}
			const allowsFinding = assertEmployeeCaseStatusAllowsFinding(
				loaded.data.status,
			);
			if (!allowsFinding.ok) {
				return allowsFinding;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: EmployeeCase = {
				...loaded.data,
				findingCode: input.findingCode,
				findingSummary: input.findingSummary,
				findingRecordedBy: input.actorUserId,
				findingRecordedAt: now,
				status: "finding_recorded",
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.cases.set(updated.id, updated);

			const event = appendCaseEvent(state, {
				organizationId: input.organizationId,
				caseId: input.caseId,
				eventKind: "finding_recorded",
				recordedBy: input.actorUserId,
				recordedAt: now,
			});
			if (!event.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				return event;
			}

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_employee_case",
				entityId: input.caseId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				state.events.delete(event.data.id);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_EMPLOYEE_CASE_FINDING_RECORDED_EVENT,
				entityType: "hr_employee_case",
				entityId: input.caseId,
			});
			if (!outbox.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				state.events.delete(event.data.id);
				return outbox;
			}

			return ok(cloneCase(updated));
		},

		async findEmployeeCaseActionByIdempotencyKey(input) {
			const state = getState();
			const key = host.idempotencyMapKey(
				input.organizationId,
				input.idempotencyKey,
			);
			const record = state.actionIdempotency.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({
				actionId: record.actionId,
				createRequestFingerprint: record.createRequestFingerprint,
				action: cloneAction(record.action),
			});
		},

		async recommendEmployeeCaseAction(record, ports, meta) {
			const state = getState();
			const existing = await this.findEmployeeCaseActionByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.createIdempotencyKey,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				if (
					existing.data.createRequestFingerprint !== record.createRequestFingerprint
				) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(cloneAction(existing.data.action));
			}

			const loaded = getCaseInOrg(state, record.organizationId, record.caseId);
			if (!loaded.ok) {
				return loaded;
			}
			const mutable = assertEmployeeCaseMutable(loaded.data.status);
			if (!mutable.ok) {
				return mutable;
			}
			const allowsRecommend = assertEmployeeCaseStatusAllowsActionRecommend(
				loaded.data.status,
			);
			if (!allowsRecommend.ok) {
				return allowsRecommend;
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				record.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const idResult = parseHumanResourcesEmployeeCaseActionId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const action: EmployeeCaseAction = {
				id: idResult.data,
				organizationId: record.organizationId,
				caseId: record.caseId,
				actionType: record.actionType,
				status: "recommended",
				recommendedBy: record.recommendedBy,
				approvedBy: null,
				policyValidationRecorded: false,
				recommendationNote: record.recommendationNote,
				version: 1,
				createdBy: record.recommendedBy,
				updatedBy: record.recommendedBy,
				createdAt: now,
				updatedAt: now,
			};
			state.actions.set(action.id, action);

			const updatedCase: EmployeeCase = {
				...loaded.data,
				status: "action_pending",
				version: loaded.data.version + 1,
				updatedBy: record.recommendedBy,
				updatedAt: now,
			};
			state.cases.set(updatedCase.id, updatedCase);

			const idempotencyKey = host.idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			state.actionIdempotency.set(idempotencyKey, {
				actionId: action.id,
				createRequestFingerprint: record.createRequestFingerprint,
				action: cloneAction(action),
			});

			const event = appendCaseEvent(state, {
				organizationId: record.organizationId,
				caseId: record.caseId,
				eventKind: "action_recommended",
				recordedBy: record.recommendedBy,
				recordedAt: now,
			});
			if (!event.ok) {
				state.actions.delete(action.id);
				state.cases.set(loaded.data.id, loaded.data);
				state.actionIdempotency.delete(idempotencyKey);
				return event;
			}

			const audit = await recordAudit(ports, meta, {
				organizationId: record.organizationId,
				actorUserId: record.recommendedBy,
				entity: "hr_employee_case_action",
				entityId: action.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.actions.delete(action.id);
				state.cases.set(loaded.data.id, loaded.data);
				state.actionIdempotency.delete(idempotencyKey);
				state.events.delete(event.data.id);
				return audit;
			}

			return ok(cloneAction(action));
		},

		async approveEmployeeCaseAction(input, ports, meta) {
			const state = getState();
			const loaded = getCaseInOrg(state, input.organizationId, input.caseId);
			if (!loaded.ok) {
				return loaded;
			}
			const mutable = assertEmployeeCaseMutable(loaded.data.status);
			if (!mutable.ok) {
				return mutable;
			}
			if (loaded.data.status !== "action_pending") {
				return invalidState("Action cannot be approved in the current case status");
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const action = state.actions.get(input.actionId);
			if (
				!action ||
				action.organizationId !== input.organizationId ||
				action.caseId !== input.caseId
			) {
				return notFound("Case action not found");
			}
			if (action.status !== "recommended") {
				return invalidState("Case action is not awaiting approval");
			}

			const policy = assertPolicyValidationForAction({
				actionType: action.actionType,
				policyValidationRecorded: input.policyValidationRecorded,
			});
			if (!policy.ok) {
				return policy;
			}

			const now = new Date();
			const updatedAction: EmployeeCaseAction = {
				...action,
				status: "approved",
				approvedBy: input.actorUserId,
				policyValidationRecorded: input.policyValidationRecorded,
				version: action.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.actions.set(updatedAction.id, updatedAction);

			const updatedCase: EmployeeCase = {
				...loaded.data,
				status: "action_approved",
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.cases.set(updatedCase.id, updatedCase);

			const event = appendCaseEvent(state, {
				organizationId: input.organizationId,
				caseId: input.caseId,
				eventKind: "action_approved",
				recordedBy: input.actorUserId,
				recordedAt: now,
			});
			if (!event.ok) {
				state.actions.set(action.id, action);
				state.cases.set(loaded.data.id, loaded.data);
				return event;
			}

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_employee_case_action",
				entityId: updatedAction.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.actions.set(action.id, action);
				state.cases.set(loaded.data.id, loaded.data);
				state.events.delete(event.data.id);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_EMPLOYEE_CASE_ACTION_APPROVED_EVENT,
				entityType: "hr_employee_case_action",
				entityId: updatedAction.id,
			});
			if (!outbox.ok) {
				state.actions.set(action.id, action);
				state.cases.set(loaded.data.id, loaded.data);
				state.events.delete(event.data.id);
				return outbox;
			}

			return ok(cloneAction(updatedAction));
		},

		async findEmployeeCaseAppealByIdempotencyKey(input) {
			const state = getState();
			const key = host.idempotencyMapKey(
				input.organizationId,
				input.idempotencyKey,
			);
			const record = state.appealIdempotency.get(key);
			if (!record) {
				return ok(null);
			}
			return ok({
				appealId: record.appealId,
				createRequestFingerprint: record.createRequestFingerprint,
				appeal: cloneAppeal(record.appeal),
			});
		},

		async recordEmployeeCaseAppeal(record, ports, meta) {
			const state = getState();
			const existing = await this.findEmployeeCaseAppealByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.createIdempotencyKey,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				if (
					existing.data.createRequestFingerprint !== record.createRequestFingerprint
				) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(cloneAppeal(existing.data.appeal));
			}

			const loaded = getCaseInOrg(state, record.organizationId, record.caseId);
			if (!loaded.ok) {
				return loaded;
			}
			const mutable = assertEmployeeCaseMutable(loaded.data.status);
			if (!mutable.ok) {
				return mutable;
			}
			const allowsAppeal = assertEmployeeCaseStatusAllowsAppeal(loaded.data.status);
			if (!allowsAppeal.ok) {
				return allowsAppeal;
			}
			if (
				loaded.data.findingCode === null ||
				loaded.data.findingRecordedAt === null
			) {
				return invalidState("Finding must be recorded before an appeal");
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				record.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const idResult = parseHumanResourcesEmployeeCaseAppealId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const appeal: EmployeeCaseAppeal = {
				id: idResult.data,
				organizationId: record.organizationId,
				caseId: record.caseId,
				originalFindingCode: loaded.data.findingCode,
				originalFindingRecordedAt: loaded.data.findingRecordedAt,
				appealGroundsSummary: record.appealGroundsSummary,
				status: "open",
				appealOutcomeCode: null,
				resolvedBy: null,
				resolvedAt: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.appeals.set(appeal.id, appeal);

			const updatedCase: EmployeeCase = {
				...loaded.data,
				status: "under_appeal",
				version: loaded.data.version + 1,
				updatedBy: record.createdBy,
				updatedAt: now,
			};
			state.cases.set(updatedCase.id, updatedCase);

			const idempotencyKey = host.idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			state.appealIdempotency.set(idempotencyKey, {
				appealId: appeal.id,
				createRequestFingerprint: record.createRequestFingerprint,
				appeal: cloneAppeal(appeal),
			});

			const event = appendCaseEvent(state, {
				organizationId: record.organizationId,
				caseId: record.caseId,
				eventKind: "appeal_recorded",
				recordedBy: record.createdBy,
				recordedAt: now,
			});
			if (!event.ok) {
				state.appeals.delete(appeal.id);
				state.cases.set(loaded.data.id, loaded.data);
				state.appealIdempotency.delete(idempotencyKey);
				return event;
			}

			const audit = await recordAudit(ports, meta, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				entity: "hr_employee_case_appeal",
				entityId: appeal.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.appeals.delete(appeal.id);
				state.cases.set(loaded.data.id, loaded.data);
				state.appealIdempotency.delete(idempotencyKey);
				state.events.delete(event.data.id);
				return audit;
			}

			return ok(cloneAppeal(appeal));
		},

		async resolveEmployeeCaseAppeal(input, ports, meta) {
			const state = getState();
			const loaded = getCaseInOrg(state, input.organizationId, input.caseId);
			if (!loaded.ok) {
				return loaded;
			}
			const mutable = assertEmployeeCaseMutable(loaded.data.status);
			if (!mutable.ok) {
				return mutable;
			}
			if (loaded.data.status !== "under_appeal") {
				return invalidState("Case is not under appeal");
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const appeal = state.appeals.get(input.appealId);
			if (
				!appeal ||
				appeal.organizationId !== input.organizationId ||
				appeal.caseId !== input.caseId
			) {
				return notFound("Case appeal not found");
			}
			if (appeal.status !== "open") {
				return invalidState("Appeal is not open");
			}

			const now = new Date();
			const updatedAppeal: EmployeeCaseAppeal = {
				...appeal,
				status: "resolved",
				appealOutcomeCode: input.appealOutcomeCode,
				resolvedBy: input.actorUserId,
				resolvedAt: now,
				version: appeal.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.appeals.set(updatedAppeal.id, updatedAppeal);

			const updatedCase: EmployeeCase = {
				...loaded.data,
				status: "action_approved",
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.cases.set(updatedCase.id, updatedCase);

			const event = appendCaseEvent(state, {
				organizationId: input.organizationId,
				caseId: input.caseId,
				eventKind: "appeal_resolved",
				recordedBy: input.actorUserId,
				recordedAt: now,
			});
			if (!event.ok) {
				state.appeals.set(appeal.id, appeal);
				state.cases.set(loaded.data.id, loaded.data);
				return event;
			}

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_employee_case_appeal",
				entityId: updatedAppeal.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.appeals.set(appeal.id, appeal);
				state.cases.set(loaded.data.id, loaded.data);
				state.events.delete(event.data.id);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_EMPLOYEE_CASE_APPEAL_RESOLVED_EVENT,
				entityType: "hr_employee_case_appeal",
				entityId: updatedAppeal.id,
			});
			if (!outbox.ok) {
				state.appeals.set(appeal.id, appeal);
				state.cases.set(loaded.data.id, loaded.data);
				state.events.delete(event.data.id);
				return outbox;
			}

			return ok(cloneAppeal(updatedAppeal));
		},

		async closeEmployeeCase(input, ports, meta) {
			const state = getState();
			const loaded = getCaseInOrg(state, input.organizationId, input.caseId);
			if (!loaded.ok) {
				return loaded;
			}
			const mutable = assertEmployeeCaseMutable(loaded.data.status);
			if (!mutable.ok) {
				return mutable;
			}
			if (
				loaded.data.status !== "finding_recorded" &&
				loaded.data.status !== "action_approved"
			) {
				return invalidState("Case cannot be closed in the current status");
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: EmployeeCase = {
				...loaded.data,
				status: "closed",
				outcomeCode: input.outcomeCode,
				closedAt: now,
				closedBy: input.actorUserId,
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.cases.set(updated.id, updated);

			const event = appendCaseEvent(state, {
				organizationId: input.organizationId,
				caseId: input.caseId,
				eventKind: "case_closed",
				recordedBy: input.actorUserId,
				recordedAt: now,
			});
			if (!event.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				return event;
			}

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_employee_case",
				entityId: input.caseId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				state.events.delete(event.data.id);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_EMPLOYEE_CASE_CLOSED_EVENT,
				entityType: "hr_employee_case",
				entityId: input.caseId,
			});
			if (!outbox.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				state.events.delete(event.data.id);
				return outbox;
			}

			return ok(cloneCase(updated));
		},

		async reopenEmployeeCase(input, ports, meta) {
			const state = getState();
			const loaded = getCaseInOrg(state, input.organizationId, input.caseId);
			if (!loaded.ok) {
				return loaded;
			}
			if (loaded.data.status !== "closed") {
				return invalidState("Only closed cases can be reopened");
			}
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: EmployeeCase = {
				...loaded.data,
				status: "open",
				outcomeCode: null,
				closedAt: null,
				closedBy: null,
				version: loaded.data.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.cases.set(updated.id, updated);

			const event = appendCaseEvent(state, {
				organizationId: input.organizationId,
				caseId: input.caseId,
				eventKind: "case_reopened",
				payloadJson: { reasonCode: input.reasonCode },
				recordedBy: input.actorUserId,
				recordedAt: now,
			});
			if (!event.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				return event;
			}

			const audit = await recordAudit(ports, meta, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_employee_case",
				entityId: input.caseId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.cases.set(loaded.data.id, loaded.data);
				state.events.delete(event.data.id);
				return audit;
			}

			return ok(cloneCase(updated));
		},

		async getEmployeeCaseTimeline(input) {
			const state = getState();
			const loaded = getCaseWithAccess(state, input);
			if (!loaded.ok) {
				return loaded;
			}
			const events = Array.from(state.events.values())
				.filter(
					(event) =>
						event.organizationId === input.organizationId &&
						event.caseId === input.caseId,
				)
				.sort((a, b) => a.sequenceNo - b.sequenceNo)
				.map(cloneEvent);
			const timeline: EmployeeCaseTimeline = {
				caseId: input.caseId,
				events,
			};
			return ok(timeline);
		},

		async getEmployeeCaseOutcome(input) {
			const state = getState();
			const loaded = getCaseWithAccess(state, input);
			if (!loaded.ok) {
				return loaded;
			}
			const approvedActions = Array.from(state.actions.values())
				.filter(
					(action) =>
						action.organizationId === input.organizationId &&
						action.caseId === input.caseId &&
						action.status === "approved",
				)
				.map(cloneAction);
			const openAppeals = Array.from(state.appeals.values())
				.filter(
					(appeal) =>
						appeal.organizationId === input.organizationId &&
						appeal.caseId === input.caseId &&
						appeal.status === "open",
				)
				.map(cloneAppeal);
			const terminationAction = approvedActions.find(
				(action) => action.actionType === "termination_recommendation",
			);
			const outcome: EmployeeCaseOutcome = {
				caseId: input.caseId,
				status: loaded.data.status,
				outcomeCode: loaded.data.outcomeCode,
				findingCode: loaded.data.findingCode,
				approvedActions,
				openAppeals,
				terminationHandoff:
					terminationAction === undefined
						? null
						: {
								caseId: loaded.data.id,
								actionId: terminationAction.id,
								organizationId: loaded.data.organizationId,
								employeeId: loaded.data.employeeId,
								employmentId: loaded.data.employmentId,
							},
			};
			return ok(outcome);
		},
	};
}

export function attachMemoryEmployeeRelations(
	target: MemoryHumanResourcesStore,
	state?: EmployeeRelationsMemoryState,
): void {
	const resolved =
		state ?? ER_STATE.get(target) ?? createEmployeeRelationsMemoryState();
	ER_STATE.set(target, resolved);
	const host: EmployeeRelationsHost = {
		getEmployeeById: target.getEmployeeById.bind(target),
		getEmploymentById: target.getEmploymentById.bind(target),
		idempotencyMapKey: idemKey,
	};
	Object.assign(target, createEmployeeRelationsMemoryMethods(host, () => resolved));
}
