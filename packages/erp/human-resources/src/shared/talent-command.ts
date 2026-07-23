import { fail, ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";

import {
	type HumanResourcesAuthorizationPort,
	requireHumanResourcesCommandPermission,
	requireHumanResourcesPermission,
	requireHumanResourcesQueryPermission,
} from "../authorization";
import type { HumanResourcesEmployeeId } from "../brands";
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
	HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_MANAGE,
	HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_OWN_READ,
	HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN,
	HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
} from "../permissions";
import type { MutationPorts } from "../ports";
import type { HumanResourcesStore } from "../store";
import {
	requireAdminResourceAccess,
	requireOwnResourceAccess,
} from "./subject-aware-authorization";

type ActorScoped = {
	organizationId: string;
	actorUserId: string;
};

type CommandDeps = {
	store: HumanResourcesStore;
	ports: MutationPorts;
};

type QueryDeps = {
	store: HumanResourcesStore;
	authorization: HumanResourcesAuthorizationPort | undefined;
	identityResolver: HumanResourcesIdentityResolverPort | undefined;
};

/**
 * Shared authorize → parse → execute path for talent mutations.
 * Keeps command files thin without inventing a second envelope.
 */
export async function runTalentCommand<
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		command: HumanResourcesCommandId;
		execute: (
			data: z.infer<TSchema>,
			deps: CommandDeps,
		) => Promise<Result<TOut>>;
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

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: config.command,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return config.execute(parsed.data, { store, ports });
}

export async function runTalentQuery<
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
	const parsed = parseHumanResourcesInput(
		config.schema,
		input,
		config.invalidMessage,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization, identityResolver } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: config.query,
	});
	if (!authorized.ok) {
		return authorized;
	}

	return config.execute(parsed.data, { store, authorization, identityResolver });
}

/** Employee-scoped career/talent reads: admin/manage OR own with server-side identity proof. */
export async function runTalentEmployeeScopedQuery<
	TSchema extends z.ZodType<ActorScoped & { employeeId: string }>,
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

	const { store, authorization, identityResolver } = resolveCommandDeps(options);
	if (!identityResolver) {
		return fail(
			"UNAUTHORIZED",
			"Human Resources identity resolver port is required",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_UNAUTHORIZED),
		);
	}

	const adminCheck = await requireAdminResourceAccess(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN,
	});
	if (adminCheck.ok) {
		return config.execute(parsed.data, {
			store,
			authorization,
			identityResolver,
		});
	}

	const manageCheck = await requireAdminResourceAccess(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_MANAGE,
	});
	if (manageCheck.ok) {
		return config.execute(parsed.data, {
			store,
			authorization,
			identityResolver,
		});
	}

	const ownCheck = await requireOwnResourceAccess(
		identityResolver,
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			targetEmployeeId: parsed.data.employeeId as HumanResourcesEmployeeId,
			permission: HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_OWN_READ,
		},
	);
	if (!ownCheck.ok) {
		return fail("FORBIDDEN", "Missing required human resources permission", {
			...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
		});
	}

	return config.execute(parsed.data, {
		store,
		authorization,
		identityResolver,
	});
}

/** Gate the talent profile's sensitive classification fields when includeSensitive is true. */
export async function requireTalentProfileSensitiveRead(
	authorization: HumanResourcesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		includeSensitive: boolean;
	},
): Promise<Result<void>> {
	if (!input.includeSensitive) {
		return ok(undefined);
	}
	return requireHumanResourcesPermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission: HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
	});
}
