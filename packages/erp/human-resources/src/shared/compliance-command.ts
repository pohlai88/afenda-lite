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
	resolveCommandDeps,
} from "../command-options";
import type {
	HumanResourcesCommandId,
	HumanResourcesQueryId,
} from "../module-ids";
import { parseHumanResourcesInput } from "../parse-input";
import {
	HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
	HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
} from "../permissions";
import type { DocumentReferencePort, MutationPorts } from "../ports";
import type { HumanResourcesStore } from "../store";
import {
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
	humanResourcesErrorDetails,
} from "../error-codes";

type ActorScoped = {
	organizationId: string;
	actorUserId: string;
};

type CommandDeps = {
	store: HumanResourcesStore;
	ports: MutationPorts;
	documentReference: DocumentReferencePort;
};

type QueryDeps = {
	store: HumanResourcesStore;
	authorization: HumanResourcesAuthorizationPort | undefined;
};

export async function runComplianceCommand<
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

	const { store, ports, authorization, documentReference } =
		resolveCommandDeps(options);
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

	return config.execute(parsed.data, { store, ports, documentReference });
}

export async function runComplianceQuery<
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

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: config.query,
	});
	if (!authorized.ok) {
		return authorized;
	}

	return config.execute(parsed.data, { store, authorization });
}

/** Query path for employee-scoped or org-wide compliance reads. */
export async function runComplianceEmployeeScopedQuery<
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

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireComplianceEmployeeReadScope(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		employeeId: parsed.data.employeeId,
	});
	if (!authorized.ok) {
		return authorized;
	}

	return config.execute(parsed.data, { store, authorization });
}

async function hasHumanResourcesPermission(
	authorization: HumanResourcesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission:
			| typeof HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER
			| typeof HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ
			| typeof HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ;
	},
): Promise<boolean> {
	if (!authorization) {
		return false;
	}
	return authorization.can(input);
}

/** Org-wide compliance reads, or employee-scoped reads with own.read. */
export async function requireComplianceEmployeeReadScope(
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

	const canAdminister = await hasHumanResourcesPermission(authorization, {
		...input,
		permission: HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
	});
	if (canAdminister) {
		return ok(undefined);
	}

	if (input.employeeId !== undefined) {
		const canReadOwn = await hasHumanResourcesPermission(authorization, {
			...input,
			permission: HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
		});
		if (canReadOwn) {
			return ok(undefined);
		}
	}

	return fail("FORBIDDEN", "Missing required human resources permission", {
		...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
	});
}

export async function requireIdentityDocumentSensitiveRead(
	authorization: HumanResourcesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
	},
): Promise<Result<void>> {
	return requireHumanResourcesPermission(authorization, {
		...input,
		permission: HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
	});
}
