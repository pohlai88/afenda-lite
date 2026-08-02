import { errorResult, type Result } from "@afenda/errors";
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
import {
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_CONFIDENTIAL_READ,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_GOAL_OWN_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
} from "../permissions";
import type { MutationPorts } from "../ports";
import type { HumanResourcesAuthorizationPort } from "../shared/authorization-types";
import { requireHumanResourcesManifestPermission } from "../shared/contextual-authorization";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "../shared/domain-runner";
import type { HumanResourcesAuthorizedActorInput } from "../shared/run-authorized-operation";
import {
	requireAdminResourceAccess,
	requireManagerResourceAccess,
	requireOwnResourceAccess,
} from "../shared/subject-aware-authorization";
import type {
	HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS,
	HUMAN_RESOURCES_PERFORMANCE_QUERY_IDS,
} from "./operation-registry";
import {
	type HumanResourcesPerformanceAuthorizationStore,
	type HumanResourcesPerformanceStoreMethod,
	type HumanResourcesPerformanceStoreProjection,
	projectPerformanceAuthorizationStore,
	projectPerformanceStore,
} from "./store";

type ActorScoped = HumanResourcesAuthorizedActorInput;

interface AuthorizationDeps {
	authorization: HumanResourcesAuthorizationPort | undefined;
	identityResolver: HumanResourcesIdentityResolverPort | undefined;
	store: HumanResourcesPerformanceAuthorizationStore;
}

type PerformanceCommandId =
	(typeof HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS)[number];
type PerformanceQueryId =
	(typeof HUMAN_RESOURCES_PERFORMANCE_QUERY_IDS)[number];

const CUSTOM_AUTHORIZE_PROVEN: HumanResourcesAuthorizationPort = {
	async can() {
		return await true;
	},
};

/** Shared authorize → parse → execute path for performance mutations. */
export async function runPerformanceCapabilityCommand<
	const TMethods extends readonly HumanResourcesPerformanceStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		command: PerformanceCommandId;
		authorize?: (
			options: HumanResourcesCommandOptions,
			data: z.infer<TSchema>,
			deps: AuthorizationDeps,
		) => Promise<Result<void>>;
		execute: (
			data: z.infer<TSchema>,
			deps: {
				ports: MutationPorts;
				store: HumanResourcesPerformanceStoreProjection<TMethods>;
			},
		) => Promise<Result<TOut>>;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedCommand(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		command: config.command,
		parityResourceKind: "performance_review",
		resolveOptions: async (opts, data) => {
			if (config.authorize === undefined) {
				return errorResult.ok(opts);
			}
			const { store, authorization, identityResolver } =
				resolveCommandDeps(opts);
			const authorized = await config.authorize(opts, data, {
				store: projectPerformanceAuthorizationStore(store),
				authorization,
				identityResolver,
			});
			if (!authorized.ok) {
				return authorized;
			}
			return errorResult.ok({
				...opts,
				authorization: CUSTOM_AUTHORIZE_PROVEN,
			});
		},
		resolveDeps: (opts) => {
			const { store, ports } = resolveCommandDeps(opts);
			return errorResult.ok({
				store: projectPerformanceStore(store, config.storeMethods),
				ports,
			});
		},
		execute: config.execute,
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
		return errorResult.fail("UNAUTHORIZED", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
			),
		});
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
		return errorResult.ok(undefined);
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
	deps: { store: HumanResourcesPerformanceAuthorizationStore },
	input: {
		organizationId: string;
		actorUserId: string;
		targetEmployeeId: HumanResourcesEmployeeId;
	},
): Promise<Result<void>> {
	const { authorization, identityResolver } = resolveCommandDeps(options);
	if (!identityResolver) {
		return errorResult.fail("UNAUTHORIZED", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
			),
		});
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
		return errorResult.ok(undefined);
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
	deps: { store: HumanResourcesPerformanceAuthorizationStore },
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
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
		});
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

export async function runPerformanceCapabilityQuery<
	const TMethods extends readonly HumanResourcesPerformanceStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		query: PerformanceQueryId;
		execute: (
			data: z.infer<TSchema>,
			deps: { store: HumanResourcesPerformanceStoreProjection<TMethods> },
		) => Promise<Result<TOut>>;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedQuery(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		query: config.query,
		parityResourceKind: "performance_review",
		resolveDeps: (opts) => {
			const { store } = resolveCommandDeps(opts);
			return errorResult.ok({
				store: projectPerformanceStore(store, config.storeMethods),
			});
		},
		execute: config.execute,
	});
}

/** Query path for employee-scoped or org-wide performance reads. */
export async function runPerformanceEmployeeScopedCapabilityQuery<
	const TMethods extends readonly HumanResourcesPerformanceStoreMethod[],
	TSchema extends z.ZodType<ActorScoped & { employeeId?: string }>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		query: PerformanceQueryId;
		execute: (
			data: z.infer<TSchema>,
			deps: { store: HumanResourcesPerformanceStoreProjection<TMethods> },
		) => Promise<Result<TOut>>;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedQuery(input, options, {
		...config,
		parityResourceKind: "performance_review",
		resolveOptions: async (opts, data) => {
			const { store, authorization, identityResolver } =
				resolveCommandDeps(opts);
			if (!identityResolver) {
				return errorResult.fail("UNAUTHORIZED", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
					),
				});
			}
			const authorized = await requirePerformanceEmployeeReadScope(
				identityResolver,
				projectPerformanceAuthorizationStore(store),
				authorization,
				{
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
					employeeId: data.employeeId,
				},
			);
			if (!authorized.ok) {
				return authorized;
			}
			return errorResult.ok({
				...opts,
				authorization: CUSTOM_AUTHORIZE_PROVEN,
			});
		},
		resolveDeps: (opts) => {
			const { store } = resolveCommandDeps(opts);
			return errorResult.ok({
				store: projectPerformanceStore(store, config.storeMethods),
			});
		},
	});
}

/** Org-wide performance reads, or employee-scoped reads with own.read. */
export async function requirePerformanceEmployeeReadScope(
	identityResolver: HumanResourcesIdentityResolverPort,
	store: HumanResourcesPerformanceAuthorizationStore,
	authorization: HumanResourcesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		employeeId?: string | undefined;
	},
): Promise<Result<void>> {
	if (!authorization) {
		return errorResult.fail("UNAUTHORIZED", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
			),
		});
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
		return errorResult.ok(undefined);
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
			return errorResult.ok(undefined);
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
			return errorResult.ok(undefined);
		}
	}

	return errorResult.fail("FORBIDDEN", {
		internalContext: {
			...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
		},
	});
}

type PerformanceResourceScope = ActorScoped & {
	goalId?: string;
	reviewId?: string;
};

async function resolvePerformanceResourceEmployee(
	store: HumanResourcesPerformanceAuthorizationStore,
	input: PerformanceResourceScope,
): Promise<Result<HumanResourcesEmployeeId | null>> {
	if (input.goalId) {
		const goalId = parseHumanResourcesGoalId(input.goalId);
		if (!goalId.ok) {
			return goalId;
		}
		const goal = await store.getPerformanceGoalById({
			organizationId: input.organizationId,
			goalId: goalId.data,
		});
		if (!goal.ok) {
			return goal;
		}
		return goal.data === null
			? errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				})
			: errorResult.ok(goal.data.employeeId);
	}
	if (input.reviewId) {
		const reviewId = parseHumanResourcesReviewId(input.reviewId);
		if (!reviewId.ok) {
			return reviewId;
		}
		const review = await store.getPerformanceReviewById({
			organizationId: input.organizationId,
			reviewId: reviewId.data,
			includeConfidential: false,
		});
		if (!review.ok) {
			return review;
		}
		return review.data === null
			? errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				})
			: errorResult.ok(review.data.review.employeeId);
	}
	return errorResult.ok(null);
}

/** Query path for resource-specific performance reads (goal, review) with ownership validation. */
export async function runPerformanceResourceScopedCapabilityQuery<
	const TMethods extends readonly HumanResourcesPerformanceStoreMethod[],
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
		query: PerformanceQueryId;
		execute: (
			data: z.infer<TSchema>,
			deps: { store: HumanResourcesPerformanceStoreProjection<TMethods> },
		) => Promise<Result<TOut>>;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedQuery(input, options, {
		...config,
		parityResourceKind: "performance_review",
		resolveOptions: async (opts, data) => {
			const { store, authorization, identityResolver } =
				resolveCommandDeps(opts);
			if (!(identityResolver && authorization)) {
				return errorResult.fail("UNAUTHORIZED", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
					),
				});
			}
			const adminCheck = await requireAdminResourceAccess(
				{ authorization },
				{
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
					permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
				},
			);
			if (!adminCheck.ok) {
				const targetEmployee = await resolvePerformanceResourceEmployee(
					projectPerformanceAuthorizationStore(store),
					data,
				);
				if (!targetEmployee.ok) {
					return targetEmployee;
				}
				if (targetEmployee.data) {
					const ownCheck = await requireOwnResourceAccess(
						identityResolver,
						{ authorization },
						{
							organizationId: data.organizationId,
							actorUserId: data.actorUserId,
							targetEmployeeId: targetEmployee.data,
							permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
						},
					);
					if (!ownCheck.ok) {
						return ownCheck;
					}
				}
			}
			return errorResult.ok({
				...opts,
				authorization: CUSTOM_AUTHORIZE_PROVEN,
			});
		},
		resolveDeps: (opts) => {
			const { store } = resolveCommandDeps(opts);
			return errorResult.ok({
				store: projectPerformanceStore(store, config.storeMethods),
			});
		},
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
		return await errorResult.ok(undefined);
	}
	return await requireHumanResourcesManifestPermission(options, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission: HUMAN_RESOURCES_PERMISSION_PERFORMANCE_CONFIDENTIAL_READ,
	});
}
