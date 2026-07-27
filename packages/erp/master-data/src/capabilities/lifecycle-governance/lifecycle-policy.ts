import { ok, type Result } from "@afenda/errors/result";

import {
	lifecycleControlledFieldMutationForbidden,
	lifecycleExplicitStateRequired,
	lifecycleReasonRequired,
	lifecycleTransitionNotAllowed,
} from "./lifecycle-errors";
import type {
	AuthoritativeLifecycleState,
	LifecycleDecision,
	LifecyclePolicy,
	LifecyclePolicyInput,
	LifecycleReason,
	LifecycleTransitionContext,
} from "./types";
import { LIFECYCLE_CONTROLLED_FIELDS, LIFECYCLE_STATE_SOURCE } from "./types";

export function defineLifecyclePolicy<State extends string>(
	policy: LifecyclePolicyInput<State>,
): LifecyclePolicy<State> {
	const transitions = Object.fromEntries(
		Object.entries(policy.transitions).map(([key, definition]) => [
			key,
			{ ...definition, auditAction: definition.auditAction ?? "UPDATE" },
		]),
	) as Record<string, LifecyclePolicy<State>["transitions"][string]>;
	return { ...policy, transitions };
}

export function resolveAuthoritativeLifecycleState<
	Record,
	State extends string,
>(
	record: Record,
	selectState: (record: Record) => State | null | undefined,
	context: LifecycleTransitionContext,
): Result<AuthoritativeLifecycleState<State>> {
	const state = selectState(record);
	if (state === null || state === undefined) {
		return lifecycleExplicitStateRequired(context);
	}
	return ok({ state, source: LIFECYCLE_STATE_SOURCE });
}

export function decideLifecycleTransition<State extends string>(
	current: State,
	operation: string,
	policy: LifecyclePolicy<State>,
	context: Omit<LifecycleTransitionContext, "entityType"> = {},
): Result<LifecycleDecision<State>> {
	const definition = policy.transitions[operation];
	if (definition === undefined || !definition.from.includes(current)) {
		return lifecycleTransitionNotAllowed({
			...context,
			entityType: policy.entityType,
			currentState: current,
			attemptedOperation: operation,
			allowedStates: definition?.from ?? [],
		});
	}
	return ok({
		from: current,
		to: definition.to,
		operation: definition.operation,
		definition,
	});
}

export function decideAuthoritativeLifecycleTransition<State extends string>(
	current: AuthoritativeLifecycleState<State>,
	operation: string,
	policy: LifecyclePolicy<State>,
	context: Omit<LifecycleTransitionContext, "entityType"> = {},
): Result<LifecycleDecision<State>> {
	return decideLifecycleTransition(current.state, operation, policy, context);
}

export function assertLifecycleReason(
	definition: Pick<LifecycleDecision<string>, "definition" | "operation">,
	reason: LifecycleReason | undefined,
	context: LifecycleTransitionContext,
): Result<true> {
	if (
		definition.definition.reasonPolicy === "required" &&
		reason === undefined
	) {
		return lifecycleReasonRequired({
			...context,
			attemptedOperation: definition.operation,
		});
	}
	return ok(true);
}

export function assertNoLifecycleControlledFieldMutation(
	input: unknown,
	context: LifecycleTransitionContext,
): Result<true> {
	if (input === null || typeof input !== "object" || Array.isArray(input)) {
		return ok(true);
	}
	const fields = LIFECYCLE_CONTROLLED_FIELDS.filter((field) =>
		Object.hasOwn(input, field),
	);
	if (fields.length > 0) {
		return lifecycleControlledFieldMutationForbidden({ ...context, fields });
	}
	return ok(true);
}
