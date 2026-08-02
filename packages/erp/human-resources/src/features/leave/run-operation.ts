import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";
import type { HumanResourcesAuthorizationPort } from "../../kernel/authorization/authorization-types";
import {
	assertHumanResourcesSupplementalAuthorization,
	requireHumanResourcesManifestPermission,
} from "../../kernel/authorization/contextual-authorization";
import {
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_BACKDATE,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_SENSITIVE_READ,
} from "../../kernel/authorization/permissions";
import type { HumanResourcesAuthorizedActorInput } from "../../kernel/authorization/run-authorized-operation";
import type { LeavePolicy, LeaveRequest } from "../../kernel/contracts";
import {
	type HumanResourcesCommandOptions,
	requireWorkCalendar,
	resolveCommandDeps,
} from "../../kernel/execution/command-options";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "../../kernel/execution/domain-runner";
import type { MutationPorts } from "../../kernel/execution/ports";
import type { WorkCalendarPort } from "../time/work-calendar";
import type { HumanResourcesIdentityResolverPort } from "../workforce-records/identity-resolution/identity-resolver";
import type {
	HUMAN_RESOURCES_LEAVE_COMMAND_IDS,
	HUMAN_RESOURCES_LEAVE_QUERY_IDS,
} from "./operation-registry";
import type { HumanResourcesLeaveCapabilityStore } from "./store";

type ActorScoped = HumanResourcesAuthorizedActorInput;
type LeaveCommandId = (typeof HUMAN_RESOURCES_LEAVE_COMMAND_IDS)[number];
type LeaveQueryId = (typeof HUMAN_RESOURCES_LEAVE_QUERY_IDS)[number];
type LeaveOperationId = LeaveCommandId | LeaveQueryId;
type LeaveStoreMethod = keyof HumanResourcesLeaveCapabilityStore;
type LeaveStoreProjection<TMethods extends readonly LeaveStoreMethod[]> = Pick<
	HumanResourcesLeaveCapabilityStore,
	TMethods[number]
>;

interface SharedDeps<TMethods extends readonly LeaveStoreMethod[]> {
	authorization: HumanResourcesAuthorizationPort | undefined;
	identityResolver: HumanResourcesIdentityResolverPort | undefined;
	store: LeaveStoreProjection<TMethods>;
	workCalendar: WorkCalendarPort;
}

function projectLeaveStore<const TMethods extends readonly LeaveStoreMethod[]>(
	store: HumanResourcesLeaveCapabilityStore,
	_methods: TMethods,
): LeaveStoreProjection<TMethods> {
	return store;
}

const CUSTOM_AUTHORIZE_PROVEN: HumanResourcesAuthorizationPort = {
	async can() {
		return await true;
	},
};

export async function runLeaveCapabilityCommand<
	const TMethods extends readonly LeaveStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		authorize?: (
			options: HumanResourcesCommandOptions,
			data: z.infer<TSchema>,
		) => Promise<Result<void>>;
		command: LeaveCommandId;
		execute: (
			data: z.infer<TSchema>,
			deps: SharedDeps<TMethods> & { ports: MutationPorts },
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		schema: TSchema;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedCommand(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		command: config.command,
		parityResourceKind: "leave_request",
		resolveOptions: async (resolvedOptions, data) => {
			if (config.authorize === undefined) {
				return errorResult.ok(resolvedOptions);
			}
			const authorized = await config.authorize(resolvedOptions, data);
			if (!authorized.ok) {
				return authorized;
			}
			return errorResult.ok({
				...resolvedOptions,
				authorization: CUSTOM_AUTHORIZE_PROVEN,
			});
		},
		resolveDeps: (resolvedOptions) => {
			const { store, ports, authorization, identityResolver } =
				resolveCommandDeps(resolvedOptions);
			const workCalendar = requireWorkCalendar(resolvedOptions);
			if (!workCalendar.ok) {
				return workCalendar;
			}
			return errorResult.ok({
				store: projectLeaveStore(store, config.storeMethods),
				ports,
				workCalendar: workCalendar.data,
				authorization,
				identityResolver,
			});
		},
		execute: config.execute,
	});
}

export async function runLeaveCapabilityQuery<
	const TMethods extends readonly LeaveStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		execute: (
			data: z.infer<TSchema>,
			deps: SharedDeps<TMethods>,
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		query: LeaveQueryId;
		schema: TSchema;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedQuery(input, options, {
		...config,
		parityResourceKind: "leave_request",
		resolveDeps: (resolvedOptions) => {
			const { store, authorization, identityResolver } =
				resolveCommandDeps(resolvedOptions);
			const workCalendar = requireWorkCalendar(resolvedOptions);
			if (!workCalendar.ok) {
				return workCalendar;
			}
			return errorResult.ok({
				store: projectLeaveStore(store, config.storeMethods),
				workCalendar: workCalendar.data,
				authorization,
				identityResolver,
			});
		},
	});
}

export async function requireLeaveRequestBackdatePermission(
	options: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId?: string | undefined;
		operationId: LeaveCommandId;
	},
): Promise<Result<void>> {
	return await assertHumanResourcesSupplementalAuthorization(
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
		correlationId?: string | undefined;
		operationId: LeaveCommandId;
	},
): Promise<Result<void>> {
	const approveTeam = await requireHumanResourcesManifestPermission(options, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission: HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM,
	});
	if (approveTeam.ok) {
		return errorResult.ok(undefined);
	}
	return requireLeaveRequestBackdatePermission(options, input);
}

export async function requireLeaveRequestSensitiveRead(
	options: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId?: string | undefined;
		operationId: LeaveOperationId;
		operationKind: "command" | "query";
	},
): Promise<Result<void>> {
	return await assertHumanResourcesSupplementalAuthorization(
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
		correlationId?: string | undefined;
		operationId: LeaveOperationId;
		operationKind: "command" | "query";
		request: LeaveRequest;
		policy: LeavePolicy;
	},
): Promise<Result<void>> {
	if (
		!input.policy.sensitive ||
		input.request.createdBy === input.actorUserId
	) {
		return errorResult.ok(undefined);
	}
	return await requireLeaveRequestSensitiveRead(options, input);
}
