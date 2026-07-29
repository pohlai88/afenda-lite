import { fail, type Result } from "@afenda/errors/result";

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
	context: LifecycleTransitionContext &
		Readonly<{
			currentState: string;
			attemptedOperation: string;
			allowedStates: readonly string[];
		}>,
): Result<never> {
	return fail(
		"CONFLICT",
		`Invalid lifecycle transition for ${context.entityType}`,
		{
			reason: "MASTER_INVALID_STATE",
			lifecycleCode: "MASTER_DATA_TRANSITION_NOT_ALLOWED",
			entityType: context.entityType,
			entityId: context.entityId,
			currentState: context.currentState,
			attemptedOperation: context.attemptedOperation,
			allowedStates: context.allowedStates,
		} satisfies LifecycleErrorDetails,
	);
}

export function lifecycleVersionConflict(
	context: LifecycleTransitionContext &
		Required<Pick<LifecycleTransitionContext, "entityId">> &
		Readonly<{ expectedVersion: number; actualVersion: number }>,
): Result<never> {
	return fail("CONFLICT", "Master data version conflict", {
		reason: "MASTER_VERSION_CONFLICT",
		lifecycleCode: "MASTER_DATA_VERSION_CONFLICT",
		entityType: context.entityType,
		entityId: context.entityId,
		expectedVersion: context.expectedVersion,
		actualVersion: context.actualVersion,
	} satisfies LifecycleErrorDetails);
}

export function lifecycleInvalidExpectedVersion(
	context: LifecycleTransitionContext &
		Required<Pick<LifecycleTransitionContext, "entityId" | "expectedVersion">>,
): Result<never> {
	return fail(
		"BAD_REQUEST",
		"expectedVersion must be a positive safe integer",
		{
			reason: "MASTER_VALIDATION_FAILED",
			lifecycleCode: "MASTER_DATA_VERSION_CONFLICT",
			entityType: context.entityType,
			entityId: context.entityId,
			expectedVersion: context.expectedVersion,
		} satisfies LifecycleErrorDetails,
	);
}

export function lifecycleReasonRequired(
	context: LifecycleTransitionContext &
		Readonly<{ attemptedOperation: string }>,
): Result<never> {
	return fail("BAD_REQUEST", "Lifecycle reason is required", {
		reason: "MASTER_VALIDATION_FAILED",
		lifecycleCode: "MASTER_DATA_BLOCK_REASON_REQUIRED",
		entityType: context.entityType,
		entityId: context.entityId,
		attemptedOperation: context.attemptedOperation,
	} satisfies LifecycleErrorDetails);
}

export function lifecycleAlreadyMerged(
	context: LifecycleTransitionContext,
): Result<never> {
	return fail("CONFLICT", `${context.entityType} is already merged`, {
		reason: "MASTER_INVALID_STATE",
		lifecycleCode: "MASTER_DATA_ALREADY_MERGED",
		entityType: context.entityType,
		entityId: context.entityId,
	} satisfies LifecycleErrorDetails);
}

export function lifecycleMergeCycle(
	context: LifecycleTransitionContext,
): Result<never> {
	return fail("CONFLICT", `${context.entityType} merge chain cycle detected`, {
		reason: "MASTER_INVALID_STATE",
		lifecycleCode: "MASTER_DATA_MERGE_CYCLE",
		entityType: context.entityType,
		entityId: context.entityId,
	} satisfies LifecycleErrorDetails);
}

export function lifecycleExplicitStateRequired(
	context: LifecycleTransitionContext &
		Readonly<{ attemptedOperation?: string }>,
): Result<never> {
	return fail("CONFLICT", `${context.entityType} lifecycle state is missing`, {
		reason: "MASTER_INVALID_STATE",
		lifecycleCode: "MASTER_DATA_EXPLICIT_STATE_REQUIRED",
		entityType: context.entityType,
		entityId: context.entityId,
		attemptedOperation: context.attemptedOperation,
	} satisfies LifecycleErrorDetails);
}

export function lifecycleControlledFieldMutationForbidden(
	context: LifecycleTransitionContext & Readonly<{ fields: readonly string[] }>,
): Result<never> {
	return fail(
		"BAD_REQUEST",
		"Lifecycle fields require named lifecycle commands",
		{
			reason: "MASTER_VALIDATION_FAILED",
			lifecycleCode: "MASTER_DATA_LIFECYCLE_FIELD_MUTATION_FORBIDDEN",
			entityType: context.entityType,
			entityId: context.entityId,
			fields: context.fields,
		} satisfies LifecycleErrorDetails,
	);
}

export function lifecycleEffectiveDateIncoherent(
	context: LifecycleTransitionContext &
		Readonly<{
			currentState: string;
			effectiveFrom: Date | null;
			effectiveTo: Date | null;
			asOf: Date;
		}>,
): Result<never> {
	return fail("CONFLICT", "Effective-dated lifecycle is incoherent", {
		reason: "MASTER_INVALID_STATE",
		lifecycleCode: "MASTER_DATA_EFFECTIVE_DATE_INCOHERENT",
		entityType: context.entityType,
		entityId: context.entityId,
		currentState: context.currentState,
		effectiveFrom: context.effectiveFrom,
		effectiveTo: context.effectiveTo,
		asOf: context.asOf,
	} satisfies LifecycleErrorDetails);
}
