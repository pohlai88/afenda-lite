import { fail, ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";

import {
	type HumanResourcesAuthorizationPort,
	requireHumanResourcesCommandPermission,
	requireHumanResourcesPermission,
	requireHumanResourcesQueryPermission,
} from "../authorization";
import {
	type HumanResourcesCommandOptions,
	requireWorkCalendar,
	resolveCommandDeps,
} from "../command-options";
import {
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
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_BACKDATE,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_SENSITIVE_READ,
} from "../permissions";
import type { MutationPorts } from "../ports";
import type { HumanResourcesStore } from "../store";
import type { WorkCalendarPort } from "../time/work-calendar";
import type { LeavePolicy, LeaveRequest } from "../types";

type ActorScoped = {
	organizationId: string;
	actorUserId: string;
};

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
			authorization: HumanResourcesAuthorizationPort | undefined,
			data: z.infer<TSchema>,
		) => Promise<Result<void>>;
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

	const { store, ports, authorization, identityResolver } =
		resolveCommandDeps(options);
	const workCalendar = requireWorkCalendar(options);
	if (!workCalendar.ok) {
		return workCalendar;
	}
	if (config.authorize !== undefined) {
		const authorized = await config.authorize(authorization, parsed.data);
		if (!authorized.ok) {
			return authorized;
		}
	} else {
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
	}

	return config.execute(parsed.data, {
		store,
		ports,
		workCalendar: workCalendar.data,
		authorization,
		identityResolver,
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
	const workCalendar = requireWorkCalendar(options);
	if (!workCalendar.ok) {
		return workCalendar;
	}
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: config.query,
	});
	if (!authorized.ok) {
		return authorized;
	}

	return config.execute(parsed.data, {
		store,
		workCalendar: workCalendar.data,
		authorization,
		identityResolver,
	});
}

export async function requireLeaveRequestBackdatePermission(
	authorization: HumanResourcesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
	},
): Promise<Result<void>> {
	return requireHumanResourcesPermission(authorization, {
		...input,
		permission: HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_BACKDATE,
	});
}

export async function requireLeaveCancelApprovedPermission(
	authorization: HumanResourcesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
	},
): Promise<Result<void>> {
	if (!authorization) {
		return fail(
			"UNAUTHORIZED",
			"Human Resources authorization port is required",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_UNAUTHORIZED),
		);
	}
	const canApproveTeam = await authorization.can({
		...input,
		permission: HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM,
	});
	if (canApproveTeam) {
		return ok(undefined);
	}
	return requireHumanResourcesPermission(authorization, {
		...input,
		permission: HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_BACKDATE,
	});
}

export async function requireLeaveRequestSensitiveRead(
	authorization: HumanResourcesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
	},
): Promise<Result<void>> {
	return requireHumanResourcesPermission(authorization, {
		...input,
		permission: HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_SENSITIVE_READ,
	});
}

export async function assertLeaveRequestSensitiveReadAllowed(
	authorization: HumanResourcesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
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
	return requireLeaveRequestSensitiveRead(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
	});
}
