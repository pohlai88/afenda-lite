import { errorResult, type Result } from "@afenda/errors";

import type { MasterFailureDetails } from "../../contracts/reasons";
import type { LifecycleTransitionContext } from "./types";

export const LIFECYCLE_FAILURE_CODES = [
	"MASTER_DATA_INVALID_STATE",
	"MASTER_DATA_TRANSITION_NOT_ALLOWED",
	"MASTER_DATA_ACTIVATION_REQUIREMENT_MISSING",
	"MASTER_DATA_DEPENDENCY_EXISTS",
	"MASTER_DATA_BLOCK_REASON_REQUIRED",
	"MASTER_DATA_RESTORE_NOT_ALLOWED",
	"MASTER_DATA_ALREADY_MERGED",
	"MASTER_DATA_MERGE_CYCLE",
	"MASTER_DATA_VERSION_CONFLICT",
	"MASTER_DATA_NOT_FOUND",
	"MASTER_DATA_EXPLICIT_STATE_REQUIRED",
	"MASTER_DATA_LIFECYCLE_FIELD_MUTATION_FORBIDDEN",
	"MASTER_DATA_EFFECTIVE_DATE_INCOHERENT",
] as const;
export type LifecycleFailureCode = (typeof LIFECYCLE_FAILURE_CODES)[number];

export type LifecycleErrorDetails = MasterFailureDetails &
	Readonly<{
		lifecycleCode: LifecycleFailureCode;
		entityType?: string | undefined;
		entityId?: string | undefined;
		currentState?: string | undefined;
		attemptedOperation?: string | undefined;
		allowedStates?: readonly string[] | undefined;
		expectedVersion?: number | undefined;
		actualVersion?: number | undefined;
		dependencyCodes?: readonly string[] | undefined;
		fields?: readonly string[] | undefined;
		effectiveFrom?: Date | null | undefined;
		effectiveTo?: Date | null | undefined;
		asOf?: Date | undefined;
	}>;

export function lifecycleTransitionNotAllowed(
	_context: LifecycleTransitionContext &
		Readonly<{
			currentState: string;
			attemptedOperation: string;
			allowedStates: readonly string[];
		}>,
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
	});
}

export function lifecycleVersionConflict(
	_context: LifecycleTransitionContext &
		Required<Pick<LifecycleTransitionContext, "entityId">> &
		Readonly<{ expectedVersion: number; actualVersion: number }>,
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Master data version conflict",
	});
}

export function lifecycleInvalidExpectedVersion(
	_context: LifecycleTransitionContext &
		Required<Pick<LifecycleTransitionContext, "entityId" | "expectedVersion">>,
): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "expectedVersion must be a positive safe integer",
	});
}

export function lifecycleReasonRequired(
	_context: LifecycleTransitionContext &
		Readonly<{ attemptedOperation: string }>,
): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "Lifecycle reason is required",
	});
}

export function lifecycleAlreadyMerged(
	_context: LifecycleTransitionContext,
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
	});
}

export function lifecycleMergeCycle(
	_context: LifecycleTransitionContext,
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
	});
}

export function lifecycleExplicitStateRequired(
	_context: LifecycleTransitionContext &
		Readonly<{ attemptedOperation?: string }>,
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
	});
}

export function lifecycleControlledFieldMutationForbidden(
	_context: LifecycleTransitionContext &
		Readonly<{ fields: readonly string[] }>,
): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "Lifecycle fields require named lifecycle commands",
	});
}

export function lifecycleEffectiveDateIncoherent(
	_context: LifecycleTransitionContext &
		Readonly<{
			currentState: string;
			effectiveFrom: Date | null;
			effectiveTo: Date | null;
			asOf: Date;
		}>,
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Effective-dated lifecycle is incoherent",
	});
}
