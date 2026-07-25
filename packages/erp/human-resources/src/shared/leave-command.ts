import { ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";
import {
	type HumanResourcesCommandOptions,
	requireWorkCalendar,
	resolveCommandDeps,
} from "../command-options";
import type { HumanResourcesIdentityResolverPort } from "../identity-resolver";
import type {
	HumanResourcesCommandId,
	HumanResourcesQueryId,
} from "../module-ids";
import {
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_BACKDATE,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_SENSITIVE_READ,
} from "../permissions";
import type { MutationPorts } from "../ports";
import type { HumanResourcesStore } from "../store";
import type { WorkCalendarPort } from "../time/work-calendar";
import type { LeavePolicy, LeaveRequest } from "../types";
import type { HumanResourcesAuthorizationPort } from "./authorization-types";
import {
	assertHumanResourcesSupplementalAuthorization,
	requireHumanResourcesManifestPermission,
} from "./contextual-authorization";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "./domain-runner";
import type { HumanResourcesAuthorizedActorInput } from "./run-authorized-operation";

type ActorScoped = HumanResourcesAuthorizedActorInput;

type CommandDeps = {
	store: HumanResourcesStore;
	ports: MutationPorts;
	workCalendar: WorkCalendarPort;
	authorization: HumanResourcesAuthorizationPort | undefined;
	identityResolver: HumanResourcesIdentityResolverPort | undefined;
};

type QueryDeps = {
	store: HumanResourcesStore;
	workCalendar: WorkCalendarPort;
	authorization: HumanResourcesAuthorizationPort | undefined;
	identityResolver: HumanResourcesIdentityResolverPort | undefined;
};

/** Authorization port that grants after a custom leave authorize proof succeeded. */
const CUSTOM_AUTHORIZE_PROVEN: HumanResourcesAuthorizationPort = {
	async can() {
		return true;
	},
};

export async function runLeaveCommand<
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
		parityResourceKind: "leave_request",
		resolveOptions: async (opts, data) => {
			if (config.authorize === undefined) {
				return ok(opts);
			}
			const authorized = await config.authorize(opts, data);
			if (!authorized.ok) {
				return authorized;
			}
			return ok({
				...opts,
				authorization: CUSTOM_AUTHORIZE_PROVEN,
			});
		},
		resolveDeps: () => {
			const { store, ports, authorization, identityResolver } =
				resolveCommandDeps(options);
			const workCalendar = requireWorkCalendar(options);
			if (!workCalendar.ok) {
				return workCalendar;
			}
			return ok({
				store,
				ports,
				workCalendar: workCalendar.data,
				authorization,
				identityResolver,
			});
		},
		execute: config.execute,
	});
}

export async function runLeaveQuery<
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
		parityResourceKind: "leave_request",
		resolveDeps: (opts) => {
			const { store, authorization, identityResolver } =
				resolveCommandDeps(opts);
			const workCalendar = requireWorkCalendar(opts);
			if (!workCalendar.ok) {
				return workCalendar;
			}
			return ok({
				store,
				workCalendar: workCalendar.data,
				authorization,
				identityResolver,
			});
		},
		execute: config.execute,
	});
}

export async function requireLeaveRequestBackdatePermission(
	options: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId?: string;
		operationId: HumanResourcesCommandId;
	},
): Promise<Result<void>> {
	return assertHumanResourcesSupplementalAuthorization(
		{
			operationId: input.operationId,
			operationKind: "command",
			requiredPermission: HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_BACKDATE,
			actor: {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId ?? "",
			},
		},
		options,
	);
}

export async function requireLeaveCancelApprovedPermission(
	options: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId?: string;
		operationId: HumanResourcesCommandId;
	},
): Promise<Result<void>> {
	const approveTeam = await requireHumanResourcesManifestPermission(options, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission: HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM,
	});
	if (approveTeam.ok) {
		return ok(undefined);
	}
	return requireLeaveRequestBackdatePermission(options, input);
}

export async function requireLeaveRequestSensitiveRead(
	options: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId?: string;
		operationId: HumanResourcesQueryId | HumanResourcesCommandId;
		operationKind: "command" | "query";
	},
): Promise<Result<void>> {
	return assertHumanResourcesSupplementalAuthorization(
		{
			operationId: input.operationId,
			operationKind: input.operationKind,
			requiredPermission:
				HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_SENSITIVE_READ,
			actor: {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId ?? "",
			},
		},
		options,
	);
}

export async function assertLeaveRequestSensitiveReadAllowed(
	options: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId?: string;
		operationId: HumanResourcesQueryId | HumanResourcesCommandId;
		operationKind: "command" | "query";
		request: LeaveRequest;
		policy: LeavePolicy;
	},
): Promise<Result<void>> {
	if (!input.policy.sensitive) {
		return ok(undefined);
	}
	if (input.request.createdBy === input.actorUserId) {
		return ok(undefined);
	}
	return requireLeaveRequestSensitiveRead(options, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		operationId: input.operationId,
		operationKind: input.operationKind,
	});
}
