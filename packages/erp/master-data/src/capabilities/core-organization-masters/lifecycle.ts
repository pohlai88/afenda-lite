import { ok, type Result } from "@afenda/errors/result";
import type { MasterStatus } from "../../types";
import {
	decideLifecycleTransition,
	defineLifecyclePolicy,
	type LifecycleTransitionDocumentation,
} from "../lifecycle-governance";

const aggregateOwnedTransitionDocumentation = {
	requiredParentState: null,
	requiredChildEvidence: ["aggregate_owned_preconditions"],
	effectiveDateBehavior:
		"Aggregate command owns any effective-date validation before this state guard runs.",
	canonicalIdentityBehavior:
		"Aggregate command owns canonical-identity validation before this state guard runs.",
	searchProjectionConsequence:
		"Aggregate command owns search projection recovery after persistence.",
	permitsNewTransactionalUse: false,
} as const satisfies LifecycleTransitionDocumentation;

const aggregateOwnedActivationDocumentation = {
	...aggregateOwnedTransitionDocumentation,
	permitsNewTransactionalUse: true,
} as const satisfies LifecycleTransitionDocumentation;

const coreMasterLifecyclePolicy = defineLifecyclePolicy<MasterStatus>({
	family: "operational_master",
	entityType: "core_master",
	transitions: {
		active: {
			...aggregateOwnedActivationDocumentation,
			operation: "active",
			from: ["draft", "inactive", "blocked"],
			to: "active",
			requiredPermission: "aggregate_owned",
			reasonPolicy: "optional",
			expectedVersionRequired: true,
			eventType: "aggregate_owned",
			reversible: true,
		},
		inactive: {
			...aggregateOwnedTransitionDocumentation,
			operation: "inactive",
			from: ["active", "blocked"],
			to: "inactive",
			requiredPermission: "aggregate_owned",
			reasonPolicy: "optional",
			expectedVersionRequired: true,
			eventType: "aggregate_owned",
			reversible: true,
		},
		blocked: {
			...aggregateOwnedTransitionDocumentation,
			operation: "blocked",
			from: ["active", "inactive"],
			to: "blocked",
			requiredPermission: "aggregate_owned",
			reasonPolicy: "required",
			expectedVersionRequired: true,
			eventType: "aggregate_owned",
			reversible: true,
		},
		retired: {
			...aggregateOwnedTransitionDocumentation,
			operation: "retired",
			from: ["draft", "active", "inactive", "blocked"],
			to: "retired",
			requiredPermission: "aggregate_owned",
			reasonPolicy: "required",
			expectedVersionRequired: true,
			eventType: "aggregate_owned",
			reversible: false,
		},
	},
});

const coreMasterRestorePolicy = defineLifecyclePolicy<MasterStatus>({
	family: "operational_master",
	entityType: "core_master",
	transitions: {
		draft: {
			...aggregateOwnedTransitionDocumentation,
			operation: "draft",
			from: ["retired"],
			to: "draft",
			requiredPermission: "aggregate_owned",
			reasonPolicy: "required",
			expectedVersionRequired: true,
			eventType: "aggregate_owned",
			reversible: false,
		},
		inactive: {
			...aggregateOwnedTransitionDocumentation,
			operation: "inactive",
			from: ["retired"],
			to: "inactive",
			requiredPermission: "aggregate_owned",
			reasonPolicy: "required",
			expectedVersionRequired: true,
			eventType: "aggregate_owned",
			reversible: false,
		},
		blocked: {
			...aggregateOwnedTransitionDocumentation,
			operation: "blocked",
			from: ["retired"],
			to: "blocked",
			requiredPermission: "aggregate_owned",
			reasonPolicy: "required",
			expectedVersionRequired: true,
			eventType: "aggregate_owned",
			reversible: false,
		},
	},
});

export function assertLifecycleTransition(
	from: MasterStatus,
	to: MasterStatus,
): Result<true> {
	const transition = decideLifecycleTransition(
		from,
		to,
		coreMasterLifecyclePolicy,
	);
	if (!transition.ok) {
		return transition;
	}
	return ok(true);
}

/** Restore is deliberately explicit and aggregate-owned. */
export function assertRestoreTransition(
	from: MasterStatus,
	to: "draft" | "inactive" | "blocked",
): Result<true> {
	const transition = decideLifecycleTransition(
		from,
		to,
		coreMasterRestorePolicy,
	);
	if (!transition.ok) {
		return transition;
	}
	return ok(true);
}

const taxRegistrationLifecyclePolicy = defineLifecyclePolicy<MasterStatus>({
	family: "effective_dated",
	entityType: "tax_registration",
	transitions: {
		active: {
			...aggregateOwnedActivationDocumentation,
			operation: "active",
			from: ["draft", "inactive", "blocked"],
			to: "active",
			requiredPermission: "aggregate_owned",
			reasonPolicy: "optional",
			expectedVersionRequired: true,
			eventType: "aggregate_owned",
			reversible: true,
		},
		blocked: {
			...aggregateOwnedTransitionDocumentation,
			operation: "blocked",
			from: ["active"],
			to: "blocked",
			requiredPermission: "aggregate_owned",
			reasonPolicy: "required",
			expectedVersionRequired: true,
			eventType: "aggregate_owned",
			reversible: false,
		},
		retired: {
			...aggregateOwnedTransitionDocumentation,
			operation: "retired",
			from: ["draft", "active", "inactive", "blocked"],
			to: "retired",
			requiredPermission: "aggregate_owned",
			reasonPolicy: "required",
			expectedVersionRequired: true,
			eventType: "aggregate_owned",
			reversible: false,
		},
	},
});

export function assertTaxRegistrationLifecycleTransition(
	from: MasterStatus,
	to: MasterStatus,
): Result<true> {
	const transition = decideLifecycleTransition(
		from,
		to,
		taxRegistrationLifecyclePolicy,
	);
	if (!transition.ok) {
		return transition;
	}
	return ok(true);
}
