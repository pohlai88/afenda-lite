import type { Result } from "@afenda/errors/result";
import { fail, ok } from "@afenda/errors/result";
import type { z } from "zod";
import type { HumanResourcesEmployeeId } from "../brands";
import {
	parseHumanResourcesGoalId,
	parseHumanResourcesReviewId,
} from "../brands";
import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
	humanResourcesErrorDetails,
} from "../error-codes";
import type { HumanResourcesIdentityResolverPort } from "../identity-resolver";
import type {
	HumanResourcesCommandId,
	HumanResourcesQueryId,
} from "../module-ids";
import { parseHumanResourcesInput } from "../parse-input";
import {
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_CONFIDENTIAL_READ,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_GOAL_OWN_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
} from "../permissions";
import type { MutationPorts } from "../ports";
import type { HumanResourcesStore } from "../store";
import type { HumanResourcesAuthorizationPort } from "./authorization-types";
import { requireHumanResourcesManifestPermission } from "./contextual-authorization";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "./domain-runner";
import type { HumanResourcesAuthorizedActorInput } from "./run-authorized-operation";
import {
	requireAdminResourceAccess,
	requireManagerResourceAccess,
	requireOwnResourceAccess,
} from "./subject-aware-authorization";

type ActorScoped = HumanResourcesAuthorizedActorInput;

type CommandDeps = {
	store: HumanResourcesStore;
	ports: MutationPorts;
	authorization: HumanResourcesAuthorizationPort | undefined;
	identityResolver: HumanResourcesIdentityResolverPort | undefined;
};

type QueryDeps = {
	store: HumanResourcesStore;
	authorization: HumanResourcesAuthorizationPort | undefined;
	identityResolver: HumanResourcesIdentityResolverPort | undefined;
};

const CUSTOM_AUTHORIZE_PROVEN: HumanResourcesAuthorizationPort = {
	async can() {
		return true;
	},
};

/** Shared authorize → parse → execute path for performance mutations. */
export async function runPerformanceCommand<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		command: HumanResourcesCommandId;
		authorize?: (
			options: HumanResourcesCommandOptions,
			data: z.infer<TSchema>,
			deps: CommandDeps,
		) => Promise<Result<void>>;
		execute: (
			data: z.infer<TSchema>,
			deps: CommandDeps,
		) => Promise<Result<TOut>>;
	},
): Promise<Result<TOut>> {
	return runParsedAuthorizedCommand(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		command: config.command,
		parityResourceKind: "performance_review",
		resolveOptions: async (opts, data) => {
			if (config.authorize === undefined) {
				return ok(opts);
			}
			const { store, ports, authorization, identityResolver } =
				resolveCommandDeps(opts);
			const authorized = await config.authorize(opts, data, {
				store,
				ports,
				authorization,
				identityResolver,
			});
			if (!authorized.ok) {
				return authorized;
			}
			return ok({
				...opts,
				authorization: CUSTOM_AUTHORIZE_PROVEN,
			});
		},
		resolveDeps: (opts) => {
			const { store, ports, authorization, identityResolver } =
				resolveCommandDeps(opts);
			return ok({ store, ports, authorization, identityResolver });
		},
		execute: (data, deps) => config.execute(data, deps),
	});
}

export async function requirePerformanceGoalOwnScope(
	options: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		targetEmployeeId: HumanResourcesEmployeeId;
	},
): Promise<Result<void>> {
	const { authorization, identityResolver } = resolveCommandDeps(options);
	if (!identityResolver) {
		return fail(
			"UNAUTHORIZED",
			"Human Resources identity resolver port is required",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_UNAUTHORIZED),
		);
	}

	const adminCheck = await requireAdminResourceAccess(
		{ authorization },
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
		},
	);
	if (adminCheck.ok) {
		return ok(undefined);
	}

	return requireOwnResourceAccess(
		identityResolver,
		{ authorization },
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			targetEmployeeId: input.targetEmployeeId,
			permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_GOAL_OWN_MANAGE,
		},
	);
}

export async function requirePerformanceGoalManagerScope(
	options: HumanResourcesCommandOptions,
	deps: { store: HumanResourcesStore },
	input: {
		organizationId: string;
		actorUserId: string;
		targetEmployeeId: HumanResourcesEmployeeId;
	},
): Promise<Result<void>> {
	const { authorization, identityResolver } = resolveCommandDeps(options);
	if (!identityResolver) {
		return fail(
			"UNAUTHORIZED",
			"Human Resources identity resolver port is required",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_UNAUTHORIZED),
		);
	}

	const adminCheck = await requireAdminResourceAccess(
		{ authorization },
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
		},
	);
	if (adminCheck.ok) {
		return ok(undefined);
	}

	return requireManagerResourceAccess(
		identityResolver,
		deps.store,
		{ authorization },
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			targetEmployeeId: input.targetEmployeeId,
			permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
		},
	);
}

export async function requirePerformanceGoalByIdOwnScope(
	options: HumanResourcesCommandOptions,
	deps: { store: HumanResourcesStore },
	input: {
		organizationId: string;
		actorUserId: string;
		goalId: string;
	},
): Promise<Result<void>> {
	const goalId = parseHumanResourcesGoalId(input.goalId);
	if (!goalId.ok) {
		return goalId;
	}
	const goal = await deps.store.getPerformanceGoalById({
		organizationId: input.organizationId,
		goalId: goalId.data,
	});
	if (!goal.ok) {
		return goal;
	}
	if (goal.data === null) {
		return fail("NOT_FOUND", "Performance goal not found");
	}
	if (goal.data.goalKind === "manager") {
		return requirePerformanceGoalManagerScope(options, deps, {
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			targetEmployeeId: goal.data.employeeId,
		});
	}
	return requirePerformanceGoalOwnScope(options, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		targetEmployeeId: goal.data.employeeId,
	});
}

export async function runPerformanceQuery<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		query: HumanResourcesQueryId;
		execute: (data: z.infer<TSchema>, deps: QueryDeps) => Promise<Result<TOut>>;
	},
): Promise<Result<TOut>> {
	return runParsedAuthorizedQuery(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		query: config.query,
		parityResourceKind: "performance_review",
		resolveDeps: (opts) => {
			const { store, authorization, identityResolver } =
				resolveCommandDeps(opts);
			return ok({ store, authorization, identityResolver });
		},
		execute: config.execute,
	});
}

/** Query path for employee-scoped or org-wide performance reads. */
export async function runPerformanceEmployeeScopedQuery<
	TSchema extends z.ZodType<ActorScoped & { employeeId?: string }>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		execute: (data: z.infer<TSchema>, deps: QueryDeps) => Promise<Result<TOut>>;
	},
): Promise<Result<TOut>> {
	const parsed = parseHumanResourcesInput(
		config.schema,
		input,
		config.invalidMessage,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization, identityResolver } =
		resolveCommandDeps(options);
	if (!identityResolver) {
		return fail(
			"UNAUTHORIZED",
			"Human Resources identity resolver port is required",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_UNAUTHORIZED),
		);
	}

	const authorized = await requirePerformanceEmployeeReadScope(
		identityResolver,
		store,
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			employeeId: parsed.data.employeeId,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return config.execute(parsed.data, {
		store,
		authorization,
		identityResolver,
	});
}

/** Org-wide performance reads, or employee-scoped reads with own.read. */
export async function requirePerformanceEmployeeReadScope(
	identityResolver: HumanResourcesIdentityResolverPort,
	store: HumanResourcesStore,
	authorization: HumanResourcesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		employeeId?: string;
	},
): Promise<Result<void>> {
	if (!authorization) {
		return fail(
			"UNAUTHORIZED",
			"Human Resources authorization port is required",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_UNAUTHORIZED),
		);
	}

	// Check admin permission first
	const adminCheck = await requireAdminResourceAccess(
		{ authorization },
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
		},
	);
	if (adminCheck.ok) {
		return ok(undefined);
	}

	// For employee-scoped access, verify ownership or manager access
	if (input.employeeId !== undefined) {
		const ownCheck = await requireOwnResourceAccess(
			identityResolver,
			{ authorization },
			{
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				targetEmployeeId: input.employeeId as HumanResourcesEmployeeId,
				permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
			},
		);
		if (ownCheck.ok) {
			return ok(undefined);
		}

		// Check manager permission
		const managerCheck = await requireManagerResourceAccess(
			identityResolver,
			store,
			{ authorization },
			{
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				targetEmployeeId: input.employeeId as HumanResourcesEmployeeId,
				permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
			},
		);
		if (managerCheck.ok) {
			return ok(undefined);
		}
	}

	return fail("FORBIDDEN", "Missing required human resources permission", {
		...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
	});
}

/** Query path for resource-specific performance reads (goal, review) with ownership validation. */
export async function runPerformanceResourceScopedQuery<
	TSchema extends z.ZodType<
		ActorScoped & { goalId?: string; reviewId?: string }
	>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		execute: (data: z.infer<TSchema>, deps: QueryDeps) => Promise<Result<TOut>>;
	},
): Promise<Result<TOut>> {
	const parsed = parseHumanResourcesInput(
		config.schema,
		input,
		config.invalidMessage,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization, identityResolver } =
		resolveCommandDeps(options);
	if (!identityResolver) {
		return fail(
			"UNAUTHORIZED",
			"Human Resources identity resolver port is required",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_UNAUTHORIZED),
		);
	}

	if (!authorization) {
		return fail(
			"UNAUTHORIZED",
			"Human Resources authorization port is required",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_UNAUTHORIZED),
		);
	}

	// Check admin permission first
	const adminCheck = await requireAdminResourceAccess(
		{ authorization },
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
		},
	);
	if (adminCheck.ok) {
		return config.execute(parsed.data, {
			store,
			authorization,
			identityResolver,
		});
	}

	// For resource-specific access, get the resource and validate ownership
	let targetEmployeeId: HumanResourcesEmployeeId | null = null;

	if (parsed.data.goalId) {
		const goalIdResult = parseHumanResourcesGoalId(parsed.data.goalId);
		if (!goalIdResult.ok) {
			return goalIdResult;
		}
		const goalResult = await store.getPerformanceGoalById({
			organizationId: parsed.data.organizationId,
			goalId: goalIdResult.data,
		});
		if (!goalResult.ok) {
			return goalResult;
		}
		if (goalResult.data === null) {
			return fail("NOT_FOUND", "Performance goal not found");
		}
		targetEmployeeId = goalResult.data.employeeId;
	} else if (parsed.data.reviewId) {
		const reviewIdResult = parseHumanResourcesReviewId(parsed.data.reviewId);
		if (!reviewIdResult.ok) {
			return reviewIdResult;
		}
		const reviewResult = await store.getPerformanceReviewById({
			organizationId: parsed.data.organizationId,
			reviewId: reviewIdResult.data,
			includeConfidential: false,
		});
		if (!reviewResult.ok) {
			return reviewResult;
		}
		if (reviewResult.data === null) {
			return fail("NOT_FOUND", "Performance review not found");
		}
		targetEmployeeId = reviewResult.data.review.employeeId;
	}

	if (targetEmployeeId) {
		const ownCheck = await requireOwnResourceAccess(
			identityResolver,
			{ authorization },
			{
				organizationId: parsed.data.organizationId,
				actorUserId: parsed.data.actorUserId,
				targetEmployeeId,
				permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
			},
		);
		if (!ownCheck.ok) {
			return ownCheck;
		}
	}

	return config.execute(parsed.data, {
		store,
		authorization,
		identityResolver,
	});
}

/** Gate confidential performance reads when includeConfidential is true. */
export async function requirePerformanceConfidentialRead(
	options: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		includeConfidential: boolean;
	},
): Promise<Result<void>> {
	if (!input.includeConfidential) {
		return ok(undefined);
	}
	return requireHumanResourcesManifestPermission(options, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_CONFIDENTIAL_READ,
	});
}
