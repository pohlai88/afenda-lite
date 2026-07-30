import type { Result } from "@afenda/errors/result";
import { ok } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import { endAssignment, getAssignment } from "../core/assignment";
import { getEmployment } from "../core/employment";
import { terminateEmployment } from "../core/employment-management";
import {
	changeWorkerStatus,
	getWorkerById,
} from "../workforce-foundation/worker";
import type { HireAttempt, HireCompensationLogEntry } from "./types";

interface CompensationContext {
	actorUserId: string;
	attempt: HireAttempt;
	correlationId: string;
	options: HumanResourcesCommandOptions;
	organizationId: string;
	startsOn: string;
}

function compensationEffectiveOn(startsOn: string): string {
	const date = new Date(`${startsOn}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + 1);
	return date.toISOString().slice(0, 10);
}

export async function compensateHireAttemptProgress(
	ctx: CompensationContext,
): Promise<Result<readonly HireCompensationLogEntry[]>> {
	let log = [...ctx.attempt.compensationLog];

	if (ctx.attempt.onboardingCaseId !== null) {
		log = [
			...log,
			{
				step: "compensation",
				action: "onboarding_orphaned",
				entityId: ctx.attempt.onboardingCaseId,
				success: true,
				onboardingOrphaned: true,
			},
		];
	}

	if (ctx.attempt.assignmentId !== null) {
		const assignmentResult = await getAssignment(
			{
				organizationId: ctx.organizationId,
				actorUserId: ctx.actorUserId,
				correlationId: ctx.correlationId,
				assignmentId: ctx.attempt.assignmentId,
			},
			ctx.options,
		);
		if (assignmentResult.ok && assignmentResult.data.endsOn === null) {
			const ended = await endAssignment(
				{
					organizationId: ctx.organizationId,
					actorUserId: ctx.actorUserId,
					correlationId: ctx.correlationId,
					assignmentId: ctx.attempt.assignmentId,
					endsOn: compensationEffectiveOn(ctx.startsOn),
					expectedVersion: assignmentResult.data.version,
				},
				ctx.options,
			);
			log = [
				...log,
				{
					step: "compensation",
					action: "end_assignment",
					entityId: ctx.attempt.assignmentId,
					success: ended.ok,
				},
			];
		}
	}

	if (ctx.attempt.workerId !== null) {
		const workerResult = await getWorkerById(
			{
				organizationId: ctx.organizationId,
				actorUserId: ctx.actorUserId,
				correlationId: ctx.correlationId,
				workerId: ctx.attempt.workerId,
			},
			ctx.options,
		);
		if (workerResult.ok && workerResult.data.status === "active") {
			const inactivated = await changeWorkerStatus(
				{
					organizationId: ctx.organizationId,
					actorUserId: ctx.actorUserId,
					correlationId: ctx.correlationId,
					workerId: ctx.attempt.workerId,
					status: "inactive",
					effectiveOn: compensationEffectiveOn(ctx.startsOn),
					reasonCode: "hire_saga_compensation",
					expectedVersion: workerResult.data.version,
				},
				ctx.options,
			);
			log = [
				...log,
				{
					step: "compensation",
					action: "worker_inactivate",
					entityId: ctx.attempt.workerId,
					success: inactivated.ok,
				},
			];
		}
	}

	if (ctx.attempt.employmentId !== null) {
		const employmentResult = await getEmployment(
			{
				organizationId: ctx.organizationId,
				actorUserId: ctx.actorUserId,
				correlationId: ctx.correlationId,
				employmentId: ctx.attempt.employmentId,
			},
			ctx.options,
		);
		if (
			employmentResult.ok &&
			(employmentResult.data.status === "active" ||
				employmentResult.data.status === "notice")
		) {
			const terminated = await terminateEmployment(
				{
					organizationId: ctx.organizationId,
					actorUserId: ctx.actorUserId,
					correlationId: ctx.correlationId,
					employmentId: ctx.attempt.employmentId,
					effectiveOn: ctx.startsOn,
					expectedVersion: employmentResult.data.version,
				},
				ctx.options,
			);
			log = [
				...log,
				{
					step: "compensation",
					action: "terminate_employment",
					entityId: ctx.attempt.employmentId,
					success: terminated.ok,
				},
			];
		}
	}

	if (ctx.attempt.employeeId !== null) {
		log = [
			...log,
			{
				step: "compensation",
				action: "retain_employee",
				entityId: ctx.attempt.employeeId,
				success: true,
			},
		];
	}

	if (ctx.attempt.personId !== null) {
		log = [
			...log,
			{
				step: "compensation",
				action: "retain_person",
				entityId: ctx.attempt.personId,
				success: true,
			},
		];
	}

	return ok(log);
}
