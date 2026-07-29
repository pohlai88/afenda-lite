import { randomUUID } from "node:crypto";
import { ok, type Result } from "@afenda/errors/result";
import { HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT } from "@afenda/events/schemas";
import type {
	HumanResourcesCompensationGradeId,
	HumanResourcesCompensationReviewId,
	HumanResourcesEmployeeCompensationId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
	HumanResourcesSalaryBandId,
} from "../../brands";
import { parseHumanResourcesEmployeeCompensationId } from "../../brands";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../../error-codes";
import type { MutationPorts } from "../../ports";
import type { PayFrequency } from "../../shared/compensation-status";
import { isEmployeeCompensationActive } from "../../shared/compensation-status";
import { assertExpectedVersion } from "../../shared/concurrency";
import { conflict, invalidState, notFound } from "../../shared/domain-guards";
import { selectUniqueEffectiveRangeRecord } from "../../shared/effective-range";
import {
	dayBeforeIsoDate,
	isEmployeeCompensationAsOfEligible,
	isEmployeeCompensationCancellable,
	isEmployeeCompensationCorrectable,
	isEmployeeCompensationDraft,
	isEmployeeCompensationScheduled,
	resolveEmployeeCompensationApprovalStatus,
} from "../../shared/employee-compensation-lifecycle";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import type { EmployeeCompensation } from "../../types";
import type { CompensationBenefitsMemoryState } from "./compensation-benefits";
import type { CoreMemoryState } from "./core";

function idempotencyMapKey(
	organizationId: string,
	idempotencyKey: string,
): string {
	return `${organizationId}:${idempotencyKey}`;
}

function listForEmployment(
	state: CompensationBenefitsMemoryState,
	organizationId: string,
	employmentId: HumanResourcesEmploymentId,
): EmployeeCompensation[] {
	return Array.from(state.employeeCompensations.values()).filter(
		(compensation) =>
			compensation.organizationId === organizationId &&
			compensation.employmentId === employmentId,
	);
}

function findByStatus(
	state: CompensationBenefitsMemoryState,
	organizationId: string,
	employmentId: HumanResourcesEmploymentId,
	status: EmployeeCompensation["status"],
): EmployeeCompensation | null {
	return (
		listForEmployment(state, organizationId, employmentId).find(
			(compensation) => compensation.status === status,
		) ?? null
	);
}

async function recordCompensationMutation(
	compensation: EmployeeCompensation,
	input: {
		actorUserId: string;
		action: "CREATE" | "UPDATE";
	},
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<void>> {
	const audit = await ports.audit.record({
		organizationId: compensation.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		entity: "hr_employee_compensation",
		entityId: compensation.id,
		action: input.action,
		changes: [],
	});
	if (!audit.ok) return audit;

	const outbox = await ports.outbox.append({
		organizationId: compensation.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		type: HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
		payload: {
			organizationId: compensation.organizationId,
			entityType: "hr_employee_compensation",
			entityId: compensation.id,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		},
	});
	if (!outbox.ok) return outbox;
	return ok(undefined);
}

async function endActivePredecessor(
	state: CompensationBenefitsMemoryState,
	input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
		successorEffectiveFrom: string;
		actorUserId: string;
	},
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<void>> {
	const active = findByStatus(
		state,
		input.organizationId,
		input.employmentId,
		"active",
	);
	if (active === null) {
		return ok(undefined);
	}

	const now = new Date();
	const previous = { ...active };
	const ended: EmployeeCompensation = {
		...active,
		status: "ended",
		effectiveTo: dayBeforeIsoDate(input.successorEffectiveFrom),
		version: active.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	state.employeeCompensations.set(ended.id, ended);

	const sideEffect = await recordCompensationMutation(
		ended,
		{ actorUserId: input.actorUserId, action: "UPDATE" },
		ports,
		meta,
	);
	if (!sideEffect.ok) {
		state.employeeCompensations.set(ended.id, previous);
		return sideEffect;
	}
	return ok(undefined);
}

function resolveEmploymentEmployee(
	core: CoreMemoryState,
	organizationId: string,
	employmentId: HumanResourcesEmploymentId,
	employeeId: HumanResourcesEmployeeId,
): Result<{ employeeId: HumanResourcesEmployeeId }> {
	const employment = core.employments.get(employmentId);
	if (!employment || employment.organizationId !== organizationId) {
		return notFound(
			"Employment not found or cross-org reference",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	if (employment.employeeId !== employeeId) {
		return notFound(
			"Employee does not match employment assignment scope",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	return ok({ employeeId: employment.employeeId });
}

export async function memoryCreateEmployeeCompensation(
	state: CompensationBenefitsMemoryState,
	core: CoreMemoryState,
	record: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		employmentId: HumanResourcesEmploymentId;
		gradeId: HumanResourcesCompensationGradeId | null;
		salaryBandId: HumanResourcesSalaryBandId | null;
		baseAmount: string;
		currencyCode: string;
		payFrequency: PayFrequency;
		effectiveFrom: string;
		effectiveTo: string | null;
		reason: string;
		confidentialNote: string | null;
		supersedesCompensationId: HumanResourcesEmployeeCompensationId | null;
		sourceReviewId: HumanResourcesCompensationReviewId | null;
		createIdempotencyKey: string;
		createRequestFingerprint: string;
		createdBy: string;
	},
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<EmployeeCompensation>> {
	const idempKey = idempotencyMapKey(
		record.organizationId,
		record.createIdempotencyKey,
	);
	const existing = state.compensationIdempotencyByKey.get(idempKey);
	if (existing) {
		return ok({ ...existing });
	}

	const employmentCheck = resolveEmploymentEmployee(
		core,
		record.organizationId,
		record.employmentId,
		record.employeeId,
	);
	if (!employmentCheck.ok) return employmentCheck;

	if (
		findByStatus(state, record.organizationId, record.employmentId, "draft") !==
		null
	) {
		return conflict("An open draft compensation agreement already exists");
	}

	const idResult = parseHumanResourcesEmployeeCompensationId(randomUUID());
	if (!idResult.ok) return idResult;

	const now = new Date();
	const compensation: EmployeeCompensation = {
		id: idResult.data,
		organizationId: record.organizationId,
		employeeId: employmentCheck.data.employeeId,
		employmentId: record.employmentId,
		gradeId: record.gradeId,
		salaryBandId: record.salaryBandId,
		baseAmount: record.baseAmount,
		currencyCode: record.currencyCode,
		payFrequency: record.payFrequency,
		effectiveFrom: record.effectiveFrom,
		effectiveTo: record.effectiveTo,
		reason: record.reason,
		status: "draft",
		confidentialNote: record.confidentialNote,
		supersedesCompensationId: record.supersedesCompensationId,
		approvedAt: null,
		approvedBy: null,
		sourceReviewId: record.sourceReviewId,
		createIdempotencyKey: record.createIdempotencyKey,
		fingerprint: record.createRequestFingerprint,
		version: 1,
		createdBy: record.createdBy,
		updatedBy: record.createdBy,
		createdAt: now,
		updatedAt: now,
	};
	state.employeeCompensations.set(compensation.id, compensation);
	state.compensationIdempotencyByKey.set(idempKey, compensation);

	const rollback: Array<() => void> = [
		() => state.employeeCompensations.delete(compensation.id),
		() => state.compensationIdempotencyByKey.delete(idempKey),
	];

	const sideEffect = await recordCompensationMutation(
		compensation,
		{ actorUserId: record.createdBy, action: "CREATE" },
		ports,
		meta,
	);
	if (!sideEffect.ok) {
		for (const undo of rollback) undo();
		return sideEffect;
	}
	return ok({ ...compensation });
}

export async function memoryAmendEmployeeCompensation(
	state: CompensationBenefitsMemoryState,
	input: {
		organizationId: string;
		compensationId: HumanResourcesEmployeeCompensationId;
		baseAmount?: string | undefined;
		currencyCode?: string | undefined;
		payFrequency?: PayFrequency | undefined;
		effectiveFrom?: string | undefined;
		effectiveTo?: string | null | undefined;
		reason?: string | undefined;
		gradeId?: HumanResourcesCompensationGradeId | null | undefined;
		salaryBandId?: HumanResourcesSalaryBandId | null | undefined;
		confidentialNote?: string | null | undefined;
		expectedVersion: number;
		actorUserId: string;
	},
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<EmployeeCompensation>> {
	const comp = state.employeeCompensations.get(input.compensationId);
	if (!comp || comp.organizationId !== input.organizationId) {
		return notFound(
			"Employee compensation not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const versionCheck = assertExpectedVersion(
		comp.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	if (!isEmployeeCompensationDraft(comp.status)) {
		return invalidState("Only draft compensation agreements can be amended");
	}

	const now = new Date();
	const previous = { ...comp };
	const updated: EmployeeCompensation = {
		...comp,
		baseAmount: input.baseAmount ?? comp.baseAmount,
		currencyCode: input.currencyCode ?? comp.currencyCode,
		payFrequency: input.payFrequency ?? comp.payFrequency,
		effectiveFrom: input.effectiveFrom ?? comp.effectiveFrom,
		effectiveTo:
			input.effectiveTo !== undefined ? input.effectiveTo : comp.effectiveTo,
		reason: input.reason ?? comp.reason,
		gradeId: input.gradeId !== undefined ? input.gradeId : comp.gradeId,
		salaryBandId:
			input.salaryBandId !== undefined ? input.salaryBandId : comp.salaryBandId,
		confidentialNote:
			input.confidentialNote !== undefined
				? input.confidentialNote
				: comp.confidentialNote,
		version: comp.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	state.employeeCompensations.set(updated.id, updated);

	const sideEffect = await recordCompensationMutation(
		updated,
		{ actorUserId: input.actorUserId, action: "UPDATE" },
		ports,
		meta,
	);
	if (!sideEffect.ok) {
		state.employeeCompensations.set(updated.id, previous);
		return sideEffect;
	}
	return ok({ ...updated });
}

export async function memoryApproveEmployeeCompensation(
	state: CompensationBenefitsMemoryState,
	input: {
		organizationId: string;
		compensationId: HumanResourcesEmployeeCompensationId;
		expectedVersion: number;
		actorUserId: string;
	},
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<EmployeeCompensation>> {
	const comp = state.employeeCompensations.get(input.compensationId);
	if (!comp || comp.organizationId !== input.organizationId) {
		return notFound(
			"Employee compensation not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const versionCheck = assertExpectedVersion(
		comp.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	if (!isEmployeeCompensationDraft(comp.status)) {
		return invalidState("Only draft compensation agreements can be approved");
	}

	const nextStatus = resolveEmployeeCompensationApprovalStatus(
		comp.effectiveFrom,
	);
	if (nextStatus === "scheduled") {
		if (
			findByStatus(
				state,
				input.organizationId,
				comp.employmentId,
				"scheduled",
			) !== null
		) {
			return conflict("A scheduled compensation agreement already exists");
		}
	} else if (
		findByStatus(state, input.organizationId, comp.employmentId, "active") !==
		null
	) {
		const ended = await endActivePredecessor(
			state,
			{
				organizationId: input.organizationId,
				employmentId: comp.employmentId,
				successorEffectiveFrom: comp.effectiveFrom,
				actorUserId: input.actorUserId,
			},
			ports,
			meta,
		);
		if (!ended.ok) return ended;
	}

	const now = new Date();
	const previous = { ...comp };
	const updated: EmployeeCompensation = {
		...comp,
		status: nextStatus,
		approvedAt: now,
		approvedBy: input.actorUserId,
		version: comp.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	state.employeeCompensations.set(updated.id, updated);

	const sideEffect = await recordCompensationMutation(
		updated,
		{ actorUserId: input.actorUserId, action: "UPDATE" },
		ports,
		meta,
	);
	if (!sideEffect.ok) {
		state.employeeCompensations.set(updated.id, previous);
		return sideEffect;
	}
	return ok({ ...updated });
}

export async function memoryScheduleEmployeeCompensationChange(
	state: CompensationBenefitsMemoryState,
	core: CoreMemoryState,
	input: {
		organizationId: string;
		compensationId: HumanResourcesEmployeeCompensationId;
		baseAmount: string;
		currencyCode: string;
		payFrequency: PayFrequency;
		effectiveFrom: string;
		reason: string;
		gradeId: HumanResourcesCompensationGradeId | null;
		salaryBandId: HumanResourcesSalaryBandId | null;
		confidentialNote: string | null;
		createIdempotencyKey: string;
		createRequestFingerprint: string;
		actorUserId: string;
	},
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<EmployeeCompensation>> {
	const active = state.employeeCompensations.get(input.compensationId);
	if (!active || active.organizationId !== input.organizationId) {
		return notFound(
			"Employee compensation not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	if (!isEmployeeCompensationActive(active.status)) {
		return invalidState(
			"Scheduled changes require an active compensation agreement",
		);
	}
	if (input.effectiveFrom <= active.effectiveFrom) {
		return invalidState("Scheduled change must have a future effective date");
	}

	const created = await memoryCreateEmployeeCompensation(
		state,
		core,
		{
			organizationId: input.organizationId,
			employeeId: active.employeeId,
			employmentId: active.employmentId,
			gradeId: input.gradeId,
			salaryBandId: input.salaryBandId,
			baseAmount: input.baseAmount,
			currencyCode: input.currencyCode,
			payFrequency: input.payFrequency,
			effectiveFrom: input.effectiveFrom,
			effectiveTo: null,
			reason: input.reason,
			confidentialNote: input.confidentialNote,
			supersedesCompensationId: active.id,
			sourceReviewId: null,
			createIdempotencyKey: input.createIdempotencyKey,
			createRequestFingerprint: input.createRequestFingerprint,
			createdBy: input.actorUserId,
		},
		ports,
		meta,
	);
	if (!created.ok) return created;

	return memoryApproveEmployeeCompensation(
		state,
		{
			organizationId: input.organizationId,
			compensationId: created.data.id,
			expectedVersion: created.data.version,
			actorUserId: input.actorUserId,
		},
		ports,
		meta,
	);
}

export async function memoryActivateEmployeeCompensation(
	state: CompensationBenefitsMemoryState,
	input: {
		organizationId: string;
		compensationId: HumanResourcesEmployeeCompensationId;
		expectedVersion: number;
		actorUserId: string;
	},
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<EmployeeCompensation>> {
	const comp = state.employeeCompensations.get(input.compensationId);
	if (!comp || comp.organizationId !== input.organizationId) {
		return notFound(
			"Employee compensation not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const versionCheck = assertExpectedVersion(
		comp.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	if (!isEmployeeCompensationScheduled(comp.status)) {
		return invalidState(
			"Only scheduled compensation agreements can be activated",
		);
	}
	if (
		resolveEmployeeCompensationApprovalStatus(comp.effectiveFrom) !== "active"
	) {
		return invalidState("Compensation effective date is still in the future");
	}

	const ended = await endActivePredecessor(
		state,
		{
			organizationId: input.organizationId,
			employmentId: comp.employmentId,
			successorEffectiveFrom: comp.effectiveFrom,
			actorUserId: input.actorUserId,
		},
		ports,
		meta,
	);
	if (!ended.ok) return ended;

	const now = new Date();
	const previous = { ...comp };
	const updated: EmployeeCompensation = {
		...comp,
		status: "active",
		version: comp.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	state.employeeCompensations.set(updated.id, updated);

	const sideEffect = await recordCompensationMutation(
		updated,
		{ actorUserId: input.actorUserId, action: "UPDATE" },
		ports,
		meta,
	);
	if (!sideEffect.ok) {
		state.employeeCompensations.set(updated.id, previous);
		return sideEffect;
	}
	return ok({ ...updated });
}

export async function memoryCorrectEmployeeCompensation(
	state: CompensationBenefitsMemoryState,
	_core: CoreMemoryState,
	input: {
		organizationId: string;
		compensationId: HumanResourcesEmployeeCompensationId;
		baseAmount: string;
		currencyCode: string;
		payFrequency: PayFrequency;
		effectiveFrom: string;
		effectiveTo: string | null;
		reason: string;
		evidenceReference: string | null;
		gradeId: HumanResourcesCompensationGradeId | null;
		salaryBandId: HumanResourcesSalaryBandId | null;
		confidentialNote: string | null;
		createIdempotencyKey: string;
		createRequestFingerprint: string;
		actorUserId: string;
	},
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<EmployeeCompensation>> {
	const predecessor = state.employeeCompensations.get(input.compensationId);
	if (!predecessor || predecessor.organizationId !== input.organizationId) {
		return notFound(
			"Employee compensation not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	if (!isEmployeeCompensationCorrectable(predecessor.status)) {
		return invalidState(
			"Compensation cannot be corrected in its current status",
		);
	}

	const reason =
		input.evidenceReference === null
			? input.reason
			: `${input.reason} (${input.evidenceReference})`;

	const now = new Date();
	const previousPredecessor = { ...predecessor };
	const correctionPredecessorEnd = dayBeforeIsoDate(input.effectiveFrom);
	const superseded: EmployeeCompensation = {
		...predecessor,
		status: "superseded",
		effectiveTo:
			predecessor.effectiveTo ??
			(correctionPredecessorEnd < predecessor.effectiveFrom
				? predecessor.effectiveFrom
				: correctionPredecessorEnd),
		version: predecessor.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	state.employeeCompensations.set(superseded.id, superseded);

	const predecessorSideEffect = await recordCompensationMutation(
		superseded,
		{ actorUserId: input.actorUserId, action: "UPDATE" },
		ports,
		meta,
	);
	if (!predecessorSideEffect.ok) {
		state.employeeCompensations.set(superseded.id, previousPredecessor);
		return predecessorSideEffect;
	}

	const idResult = parseHumanResourcesEmployeeCompensationId(randomUUID());
	if (!idResult.ok) return idResult;

	const successor: EmployeeCompensation = {
		id: idResult.data,
		organizationId: predecessor.organizationId,
		employeeId: predecessor.employeeId,
		employmentId: predecessor.employmentId,
		gradeId: input.gradeId,
		salaryBandId: input.salaryBandId,
		baseAmount: input.baseAmount,
		currencyCode: input.currencyCode,
		payFrequency: input.payFrequency,
		effectiveFrom: input.effectiveFrom,
		effectiveTo: input.effectiveTo,
		reason,
		status: resolveEmployeeCompensationApprovalStatus(input.effectiveFrom),
		confidentialNote: input.confidentialNote,
		supersedesCompensationId: predecessor.id,
		approvedAt: now,
		approvedBy: input.actorUserId,
		sourceReviewId: predecessor.sourceReviewId,
		createIdempotencyKey: input.createIdempotencyKey,
		fingerprint: input.createRequestFingerprint,
		version: 1,
		createdBy: input.actorUserId,
		updatedBy: input.actorUserId,
		createdAt: now,
		updatedAt: now,
	};
	state.employeeCompensations.set(successor.id, successor);
	const idempKey = idempotencyMapKey(
		input.organizationId,
		input.createIdempotencyKey,
	);
	state.compensationIdempotencyByKey.set(idempKey, successor);

	if (successor.status === "active") {
		const ended = await endActivePredecessor(
			state,
			{
				organizationId: input.organizationId,
				employmentId: predecessor.employmentId,
				successorEffectiveFrom: successor.effectiveFrom,
				actorUserId: input.actorUserId,
			},
			ports,
			meta,
		);
		if (!ended.ok) {
			state.employeeCompensations.set(superseded.id, previousPredecessor);
			state.employeeCompensations.delete(successor.id);
			state.compensationIdempotencyByKey.delete(idempKey);
			return ended;
		}
	}

	const successorSideEffect = await recordCompensationMutation(
		successor,
		{ actorUserId: input.actorUserId, action: "CREATE" },
		ports,
		meta,
	);
	if (!successorSideEffect.ok) {
		state.employeeCompensations.set(superseded.id, previousPredecessor);
		state.employeeCompensations.delete(successor.id);
		state.compensationIdempotencyByKey.delete(idempKey);
		return successorSideEffect;
	}

	return ok({ ...successor });
}

export async function memoryEndEmployeeCompensation(
	state: CompensationBenefitsMemoryState,
	input: {
		organizationId: string;
		compensationId: HumanResourcesEmployeeCompensationId;
		endsOn: string;
		expectedVersion: number;
		actorUserId: string;
	},
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<EmployeeCompensation>> {
	const comp = state.employeeCompensations.get(input.compensationId);
	if (!comp || comp.organizationId !== input.organizationId) {
		return notFound(
			"Employee compensation not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const versionCheck = assertExpectedVersion(
		comp.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	if (!isEmployeeCompensationCancellable(comp.status)) {
		return invalidState("Compensation cannot be ended in its current status");
	}

	const now = new Date();
	const previous = { ...comp };
	const updated: EmployeeCompensation = {
		...comp,
		status: "ended",
		effectiveTo: input.endsOn,
		version: comp.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	state.employeeCompensations.set(updated.id, updated);

	const sideEffect = await recordCompensationMutation(
		updated,
		{ actorUserId: input.actorUserId, action: "UPDATE" },
		ports,
		meta,
	);
	if (!sideEffect.ok) {
		state.employeeCompensations.set(updated.id, previous);
		return sideEffect;
	}
	return ok({ ...updated });
}

export function memoryFindEmployeeCompensationByEmploymentAsOf(
	state: CompensationBenefitsMemoryState,
	input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
		asOf: string;
	},
): EmployeeCompensation | null {
	const records = listForEmployment(
		state,
		input.organizationId,
		input.employmentId,
	).filter((compensation) =>
		isEmployeeCompensationAsOfEligible(compensation.status),
	);
	return selectUniqueEffectiveRangeRecord({
		records,
		asOf: input.asOf,
	});
}

export function memoryNewEmployeeCompensationFromReview(input: {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	gradeId: HumanResourcesCompensationGradeId | null;
	salaryBandId: HumanResourcesSalaryBandId | null;
	baseAmount: string;
	currencyCode: string;
	effectiveFrom: string;
	reason: string;
	sourceReviewId: HumanResourcesCompensationReviewId;
	createIdempotencyKey: string;
	fingerprint: string;
	actorUserId: string;
}): EmployeeCompensation {
	const now = new Date();
	const idResult = parseHumanResourcesEmployeeCompensationId(randomUUID());
	if (!idResult.ok) {
		throw new Error("Failed to brand employee compensation id");
	}
	return {
		id: idResult.data,
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		employmentId: input.employmentId,
		gradeId: input.gradeId,
		salaryBandId: input.salaryBandId,
		baseAmount: input.baseAmount,
		currencyCode: input.currencyCode,
		payFrequency: "monthly",
		effectiveFrom: input.effectiveFrom,
		effectiveTo: null,
		reason: input.reason,
		status: "active",
		confidentialNote: null,
		supersedesCompensationId: null,
		approvedAt: now,
		approvedBy: input.actorUserId,
		sourceReviewId: input.sourceReviewId,
		createIdempotencyKey: input.createIdempotencyKey,
		fingerprint: input.fingerprint,
		version: 1,
		createdBy: input.actorUserId,
		updatedBy: input.actorUserId,
		createdAt: now,
		updatedAt: now,
	};
}
