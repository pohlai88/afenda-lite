import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import { createAssignment } from "../core/assignment";
import { createEmployee } from "../core/employee";
import { hireEmployment } from "../core/employment-management";
import { appendRegistryGatedOutbox } from "../emissions/sql-side-effects";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import { startOnboarding } from "../lifecycle/onboarding";
import { HUMAN_RESOURCES_COMMAND_HIRE_FROM_ACCEPTED_OFFER } from "../module-ids";
import type { MutationPorts } from "../ports";
import { getCandidate } from "../recruitment/candidate";
import { getOffer } from "../recruitment/offer";
import { getRequisition } from "../recruitment/requisition";
import {
	type HireFromAcceptedOfferInput,
	hireFromAcceptedOfferInputSchema,
} from "../schemas/hire-orchestration";
import { fingerprintHireFromAcceptedOffer } from "../shared/fingerprint";
import { runHireOrchestrationCommand } from "../shared/hire-orchestration-command";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { HumanResourcesStore } from "../store";
import type { OfferAcceptanceHandoff } from "../types";
import { createPerson } from "../workforce-foundation/person";
import { createWorker } from "../workforce-foundation/worker";
import { listHeadcountReservations } from "../workforce-planning/headcount-reservation";

import { compensateHireAttemptProgress } from "./compensation";
import {
	type HireAttempt,
	type HireFromAcceptedOfferResult,
	type HireSagaStep,
	hireStepIdempotencyKey,
	isHireStepComplete,
} from "./types";

type SagaDeps = {
	store: HumanResourcesStore;
	ports: MutationPorts;
};

type SagaContext = {
	input: HireFromAcceptedOfferInput;
	requestFingerprint: string;
	handoff: OfferAcceptanceHandoff;
	legalName: string;
	positionId: string;
	attempt: HireAttempt;
	deps: SagaDeps;
	options: HumanResourcesCommandOptions;
};

async function persistAttemptProgress(
	ctx: SagaContext,
	update: {
		currentStep: HireSagaStep;
		personId?: HireAttempt["personId"];
		employeeId?: HireAttempt["employeeId"];
		employmentId?: HireAttempt["employmentId"];
		workerId?: HireAttempt["workerId"];
		assignmentId?: HireAttempt["assignmentId"];
		onboardingCaseId?: HireAttempt["onboardingCaseId"];
		status?: HireAttempt["status"];
		compensationLog?: HireAttempt["compensationLog"];
	},
): Promise<Result<HireAttempt>> {
	const meta = buildMutationMeta({
		correlationId: ctx.input.correlationId,
		operationId: HUMAN_RESOURCES_COMMAND_HIRE_FROM_ACCEPTED_OFFER,
	});
	return ctx.deps.store.updateHireAttemptProgress(
		{
			organizationId: ctx.input.organizationId,
			attemptId: ctx.attempt.id,
			expectedVersion: ctx.attempt.version,
			currentStep: update.currentStep,
			personId: update.personId,
			employeeId: update.employeeId,
			employmentId: update.employmentId,
			workerId: update.workerId,
			assignmentId: update.assignmentId,
			onboardingCaseId: update.onboardingCaseId,
			status: update.status,
			compensationLog: update.compensationLog,
			actorUserId: ctx.input.actorUserId,
		},
		ctx.deps.ports,
		meta,
	);
}

async function failSaga(
	ctx: SagaContext,
	cause: Result<never>,
): Promise<Result<never>> {
	const compensation = await compensateHireAttemptProgress({
		organizationId: ctx.input.organizationId,
		actorUserId: ctx.input.actorUserId,
		correlationId: ctx.input.correlationId,
		startsOn: ctx.input.startsOn,
		attempt: ctx.attempt,
		options: ctx.options,
	});
	const compensationLog = compensation.ok
		? compensation.data
		: ctx.attempt.compensationLog;

	await persistAttemptProgress(ctx, {
		currentStep: ctx.attempt.currentStep ?? "reservation_verified",
		status: "failed_compensated",
		compensationLog,
	});

	return cause;
}

async function verifyReservation(
	ctx: SagaContext,
): Promise<Result<HireAttempt>> {
	if (isHireStepComplete(ctx.attempt, "reservation_verified")) {
		return ok(ctx.attempt);
	}

	const listed = await listHeadcountReservations(
		{
			organizationId: ctx.input.organizationId,
			actorUserId: ctx.input.actorUserId,
			correlationId: ctx.input.correlationId,
			requisitionId: ctx.handoff.requisitionId,
		},
		ctx.options,
	);
	if (!listed.ok) {
		return listed;
	}

	const active = listed.data.reservations.filter(
		(reservation) => reservation.status === "active",
	);
	if (active.length > 0) {
		return fail(
			"CONFLICT",
			"Active headcount reservation must be consumed before hire orchestration",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
		);
	}

	const updated = await persistAttemptProgress(ctx, {
		currentStep: "reservation_verified",
	});
	if (!updated.ok) {
		return updated;
	}
	ctx.attempt = updated.data;
	return ok(updated.data);
}

async function runPersonStep(ctx: SagaContext): Promise<Result<HireAttempt>> {
	if (
		isHireStepComplete(ctx.attempt, "person_created") &&
		ctx.attempt.personId
	) {
		return ok(ctx.attempt);
	}

	const created = await createPerson(
		{
			organizationId: ctx.input.organizationId,
			actorUserId: ctx.input.actorUserId,
			correlationId: ctx.input.correlationId,
			idempotencyKey: hireStepIdempotencyKey(
				ctx.input.idempotencyKey,
				"person",
			),
			legalName: ctx.legalName,
			preferredName: ctx.input.preferredName ?? null,
		},
		ctx.options,
	);
	if (!created.ok) {
		return failSaga(ctx, created);
	}

	const updated = await persistAttemptProgress(ctx, {
		currentStep: "person_created",
		personId: created.data.id,
	});
	if (!updated.ok) {
		return failSaga(ctx, updated);
	}
	ctx.attempt = updated.data;
	return ok(updated.data);
}

async function runEmployeeStep(ctx: SagaContext): Promise<Result<HireAttempt>> {
	if (
		isHireStepComplete(ctx.attempt, "employee_created") &&
		ctx.attempt.employeeId
	) {
		return ok(ctx.attempt);
	}

	const created = await createEmployee(
		{
			organizationId: ctx.input.organizationId,
			actorUserId: ctx.input.actorUserId,
			correlationId: ctx.input.correlationId,
			idempotencyKey: hireStepIdempotencyKey(
				ctx.input.idempotencyKey,
				"employee",
			),
			employeeNumber: ctx.input.employeeNumber,
			legalName: ctx.legalName,
		},
		ctx.options,
	);
	if (!created.ok) {
		return failSaga(ctx, created);
	}

	const updated = await persistAttemptProgress(ctx, {
		currentStep: "employee_created",
		employeeId: created.data.id,
	});
	if (!updated.ok) {
		return failSaga(ctx, updated);
	}
	ctx.attempt = updated.data;
	return ok(updated.data);
}

async function runEmploymentStep(
	ctx: SagaContext,
): Promise<Result<HireAttempt>> {
	if (
		isHireStepComplete(ctx.attempt, "employment_created") &&
		ctx.attempt.employmentId
	) {
		return ok(ctx.attempt);
	}

	if (ctx.attempt.employeeId === null) {
		return fail(
			"INTERNAL_ERROR",
			"Employee must exist before employment hire",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}

	const hired = await hireEmployment(
		{
			organizationId: ctx.input.organizationId,
			actorUserId: ctx.input.actorUserId,
			correlationId: ctx.input.correlationId,
			employeeId: ctx.attempt.employeeId,
			startsOn: ctx.input.startsOn,
		},
		ctx.options,
	);
	if (!hired.ok) {
		return failSaga(ctx, hired);
	}

	const updated = await persistAttemptProgress(ctx, {
		currentStep: "employment_created",
		employmentId: hired.data.id,
	});
	if (!updated.ok) {
		return failSaga(ctx, updated);
	}
	ctx.attempt = updated.data;
	return ok(updated.data);
}

async function runWorkerStep(ctx: SagaContext): Promise<Result<HireAttempt>> {
	if (
		isHireStepComplete(ctx.attempt, "worker_created") &&
		ctx.attempt.workerId
	) {
		return ok(ctx.attempt);
	}

	if (ctx.attempt.personId === null || ctx.attempt.employeeId === null) {
		return fail(
			"INTERNAL_ERROR",
			"Person and employee must exist before worker create",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}

	const created = await createWorker(
		{
			organizationId: ctx.input.organizationId,
			actorUserId: ctx.input.actorUserId,
			correlationId: ctx.input.correlationId,
			idempotencyKey: hireStepIdempotencyKey(
				ctx.input.idempotencyKey,
				"worker",
			),
			workerType: "employee",
			personId: ctx.attempt.personId,
			employeeId: ctx.attempt.employeeId,
			effectiveFrom: ctx.input.startsOn,
		},
		ctx.options,
	);
	if (!created.ok) {
		return failSaga(ctx, created);
	}

	const updated = await persistAttemptProgress(ctx, {
		currentStep: "worker_created",
		workerId: created.data.id,
	});
	if (!updated.ok) {
		return failSaga(ctx, updated);
	}
	ctx.attempt = updated.data;
	return ok(updated.data);
}

async function runAssignmentStep(
	ctx: SagaContext,
): Promise<Result<HireAttempt>> {
	if (
		isHireStepComplete(ctx.attempt, "assignment_created") &&
		ctx.attempt.assignmentId
	) {
		return ok(ctx.attempt);
	}

	if (ctx.attempt.employmentId === null) {
		return fail(
			"INTERNAL_ERROR",
			"Employment must exist before assignment create",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}

	const assigned = await createAssignment(
		{
			organizationId: ctx.input.organizationId,
			actorUserId: ctx.input.actorUserId,
			correlationId: ctx.input.correlationId,
			employmentId: ctx.attempt.employmentId,
			positionId: ctx.positionId,
			legalEntityKey: ctx.input.legalEntityKey,
			businessUnitKey: ctx.input.businessUnitKey,
			locationKey: ctx.input.locationKey,
			costCentreKey: ctx.input.costCentreKey,
			projectKey: ctx.input.projectKey,
			startsOn: ctx.input.startsOn,
		},
		ctx.options,
	);
	if (!assigned.ok) {
		return failSaga(ctx, assigned);
	}

	const updated = await persistAttemptProgress(ctx, {
		currentStep: "assignment_created",
		assignmentId: assigned.data.id,
	});
	if (!updated.ok) {
		return failSaga(ctx, updated);
	}
	ctx.attempt = updated.data;
	return ok(updated.data);
}

async function runOnboardingStep(
	ctx: SagaContext,
): Promise<Result<HireAttempt>> {
	if (
		isHireStepComplete(ctx.attempt, "onboarding_started") &&
		ctx.attempt.onboardingCaseId
	) {
		return ok(ctx.attempt);
	}

	if (ctx.attempt.employmentId === null) {
		return fail(
			"INTERNAL_ERROR",
			"Employment must exist before onboarding start",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}

	const onboarded = await startOnboarding(
		{
			organizationId: ctx.input.organizationId,
			actorUserId: ctx.input.actorUserId,
			correlationId: ctx.input.correlationId,
			idempotencyKey: hireStepIdempotencyKey(
				ctx.input.idempotencyKey,
				"onboarding",
			),
			employmentId: ctx.attempt.employmentId,
			sourceOfferId: ctx.handoff.offerId,
			tasks: ctx.input.tasks,
		},
		ctx.options,
	);
	if (!onboarded.ok) {
		return failSaga(ctx, onboarded);
	}

	const updated = await persistAttemptProgress(ctx, {
		currentStep: "onboarding_started",
		onboardingCaseId: onboarded.data.id,
		status: "completed",
	});
	if (!updated.ok) {
		return failSaga(ctx, updated);
	}
	ctx.attempt = updated.data;
	return ok(updated.data);
}

async function executeHireSaga(ctx: SagaContext): Promise<Result<HireAttempt>> {
	const steps = [
		verifyReservation,
		runPersonStep,
		runEmployeeStep,
		runEmploymentStep,
		runWorkerStep,
		runAssignmentStep,
		runOnboardingStep,
	] as const;

	for (const step of steps) {
		const result = await step(ctx);
		if (!result.ok) {
			return result;
		}
		ctx.attempt = result.data;
	}

	return ok(ctx.attempt);
}

function buildHandoff(
	input: HireFromAcceptedOfferInput,
	offer: OfferAcceptanceHandoff["offer"],
	candidateId: OfferAcceptanceHandoff["candidateId"],
	applicationId: OfferAcceptanceHandoff["applicationId"],
	requisitionId: OfferAcceptanceHandoff["requisitionId"],
): OfferAcceptanceHandoff {
	return {
		organizationId: input.organizationId,
		offerId: input.offerId,
		applicationId,
		candidateId,
		requisitionId,
		correlationId: input.correlationId,
		acceptedAt: offer.respondedAt ?? new Date(),
		offer,
	};
}

function toResult(
	ctx: SagaContext,
	attempt: HireAttempt,
): HireFromAcceptedOfferResult {
	if (
		attempt.personId === null ||
		attempt.employeeId === null ||
		attempt.employmentId === null ||
		attempt.workerId === null ||
		attempt.assignmentId === null ||
		attempt.onboardingCaseId === null
	) {
		throw new Error("Completed hire attempt missing produced identifiers");
	}

	return {
		attempt,
		handoff: ctx.handoff,
		personId: attempt.personId,
		employeeId: attempt.employeeId,
		employmentId: attempt.employmentId,
		workerId: attempt.workerId,
		assignmentId: attempt.assignmentId,
		onboardingCaseId: attempt.onboardingCaseId,
	};
}

async function loadAcceptedOfferContext(
	data: HireFromAcceptedOfferInput,
	deps: SagaDeps,
	options: HumanResourcesCommandOptions,
): Promise<
	Result<{
		handoff: OfferAcceptanceHandoff;
		legalName: string;
		positionId: string;
	}>
> {
	const offerResult = await getOffer(
		{
			organizationId: data.organizationId,
			actorUserId: data.actorUserId,
			correlationId: data.correlationId,
			offerId: data.offerId,
		},
		options,
	);
	if (!offerResult.ok) {
		return offerResult;
	}
	if (offerResult.data.status !== "accepted") {
		return fail(
			"BAD_REQUEST",
			"Offer must be accepted before hire orchestration",
			humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			),
		);
	}

	const application = await deps.store.getApplicationById({
		organizationId: data.organizationId,
		applicationId: offerResult.data.applicationId,
	});
	if (!application.ok) {
		return application;
	}
	if (application.data === null) {
		return fail(
			"NOT_FOUND",
			"Application not found for accepted offer",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}

	const candidate = await getCandidate(
		{
			organizationId: data.organizationId,
			actorUserId: data.actorUserId,
			correlationId: data.correlationId,
			candidateId: application.data.candidateId,
		},
		options,
	);
	if (!candidate.ok) {
		return candidate;
	}

	const requisition = await getRequisition(
		{
			organizationId: data.organizationId,
			actorUserId: data.actorUserId,
			correlationId: data.correlationId,
			requisitionId: application.data.requisitionId,
		},
		options,
	);
	if (!requisition.ok) {
		return requisition;
	}

	const positionId = requisition.data.positionId ?? data.positionId ?? null;
	if (positionId === null) {
		return fail(
			"VALIDATION_ERROR",
			"positionId is required when requisition has no position",
		);
	}

	const legalName = data.legalName?.trim() || candidate.data.displayName.trim();

	return ok({
		handoff: buildHandoff(
			data,
			offerResult.data,
			application.data.candidateId,
			application.data.id,
			application.data.requisitionId,
		),
		legalName,
		positionId,
	});
}

export async function hireFromAcceptedOffer(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HireFromAcceptedOfferResult>> {
	return runHireOrchestrationCommand(input, options, {
		schema: hireFromAcceptedOfferInputSchema,
		invalidMessage: "Invalid hire from accepted offer input",
		command: HUMAN_RESOURCES_COMMAND_HIRE_FROM_ACCEPTED_OFFER,
		execute: async (data, deps) => {
			const requestFingerprint = fingerprintHireFromAcceptedOffer({
				offerId: data.offerId,
				employeeNumber: data.employeeNumber,
				startsOn: data.startsOn,
				positionId: data.positionId ?? null,
				legalName: data.legalName ?? "",
				preferredName: data.preferredName ?? null,
				legalEntityKey: data.legalEntityKey,
				businessUnitKey: data.businessUnitKey,
				locationKey: data.locationKey,
				costCentreKey: data.costCentreKey,
				projectKey: data.projectKey,
				tasks: data.tasks,
			});

			const existing = await deps.store.findHireAttemptByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				if (existing.data.requestFingerprint !== requestFingerprint) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				if (existing.data.attempt.status === "completed") {
					const offerLoaded = await loadAcceptedOfferContext(
						data,
						deps,
						options,
					);
					if (!offerLoaded.ok) {
						return offerLoaded;
					}
					return ok(
						toResult(
							{
								input: data,
								requestFingerprint,
								handoff: offerLoaded.data.handoff,
								legalName: offerLoaded.data.legalName,
								positionId: offerLoaded.data.positionId,
								attempt: existing.data.attempt,
								deps,
								options,
							},
							existing.data.attempt,
						),
					);
				}
				if (existing.data.attempt.status === "failed_compensated") {
					return fail(
						"CONFLICT",
						"Hire attempt previously failed and was compensated",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
			}

			const loaded = await loadAcceptedOfferContext(data, deps, options);
			if (!loaded.ok) {
				return loaded;
			}

			let attempt = existing.data?.attempt ?? null;
			if (attempt === null) {
				const meta = buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_HIRE_FROM_ACCEPTED_OFFER,
				});
				const created = await deps.store.createHireAttempt(
					{
						organizationId: data.organizationId,
						offerId: data.offerId,
						correlationId: data.correlationId,
						idempotencyKey: data.idempotencyKey,
						requestFingerprint,
						createdBy: data.actorUserId,
					},
					deps.ports,
					meta,
				);
				if (!created.ok) {
					return created;
				}
				attempt = created.data;
			}

			const ctx: SagaContext = {
				input: data,
				requestFingerprint,
				handoff: loaded.data.handoff,
				legalName: loaded.data.legalName,
				positionId: loaded.data.positionId,
				attempt,
				deps,
				options,
			};

			const finished = await executeHireSaga(ctx);
			if (!finished.ok) {
				return finished;
			}

			const outbox = await appendRegistryGatedOutbox(deps.ports, {
				commandId: HUMAN_RESOURCES_COMMAND_HIRE_FROM_ACCEPTED_OFFER,
				meta: buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_HIRE_FROM_ACCEPTED_OFFER,
				}),
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				aggregateId: finished.data.id,
				eventEntityType: "hr_hire_attempt",
			});
			if (!outbox.ok) {
				return outbox;
			}

			return ok(toResult(ctx, finished.data));
		},
	});
}
