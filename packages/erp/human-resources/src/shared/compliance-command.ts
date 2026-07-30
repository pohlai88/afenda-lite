import { fail, ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";
import type { HumanResourcesEmployeeId } from "../brands";
import {
	type HumanResourcesCommandOptions,
	requireDocumentReference,
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
	HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY,
	HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
	HUMAN_RESOURCES_PERMISSION_WORK_ELIGIBILITY_VERIFY,
} from "../permissions";
import type { DocumentReferencePort, MutationPorts } from "../ports";
import type { HumanResourcesStore } from "../store";
import type {
	HumanResourcesAuthorizationPort,
	HumanResourcesResourceContext,
} from "./authorization-types";
import { requireHumanResourcesManifestPermission } from "./contextual-authorization";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "./domain-runner";
import type { HumanResourcesAuthorizedActorInput } from "./run-authorized-operation";
import { runSequential, sequentialReturn } from "./run-sequential";
import {
	requireAdminResourceAccess,
	requireOwnResourceAccess,
} from "./subject-aware-authorization";

type ActorScoped = HumanResourcesAuthorizedActorInput;

function complianceResourceKind(
	command: HumanResourcesCommandId,
): "employee_document" | "work_eligibility" {
	return command.startsWith("human-resources.work-eligibility.")
		? "work_eligibility"
		: "employee_document";
}

function resolveComplianceCommandResource(
	data: ActorScoped & { employeeId?: string },
	command: HumanResourcesCommandId,
): HumanResourcesResourceContext | undefined {
	if (
		!(
			command.startsWith("human-resources.employee-document.") ||
			command.startsWith("human-resources.work-eligibility.")
		)
	) {
		return;
	}
	return {
		organizationId: data.organizationId,
		kind: complianceResourceKind(command),
		...(data.employeeId === undefined
			? {}
			: { subjectEmployeeId: data.employeeId }),
	};
}

interface CommandDeps {
	documentReference: DocumentReferencePort;
	ports: MutationPorts;
	store: HumanResourcesStore;
}

interface QueryDeps {
	authorization: HumanResourcesAuthorizationPort | undefined;
	identityResolver: HumanResourcesIdentityResolverPort | undefined;
	store: HumanResourcesStore;
}

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
	return await runParsedAuthorizedCommand(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		command: config.command,
		resolveResource: async (data) =>
			resolveComplianceCommandResource(data, config.command),
		resolveDeps: (opts) => {
			const { store, ports } = resolveCommandDeps(opts);
			const documentReference = requireDocumentReference(opts);
			if (!documentReference.ok) {
				return documentReference;
			}
			return ok({
				store,
				ports,
				documentReference: documentReference.data,
			});
		},
		execute: config.execute,
	});
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
	return await runParsedAuthorizedQuery(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		query: config.query,
		parityResourceKind: "employee_document",
		resolveDeps: (opts) => {
			const { store, authorization, identityResolver } =
				resolveCommandDeps(opts);
			return ok({ store, authorization, identityResolver });
		},
		execute: config.execute,
	});
}

/** Query path for employee-scoped or org-wide compliance reads. */
export async function runComplianceEmployeeScopedQuery<
	TSchema extends z.ZodType,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema &
			z.ZodType<ActorScoped & { employeeId?: string | undefined }>;
		invalidMessage: string;
		execute: (
			data: z.output<TSchema>,
			deps: QueryDeps,
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

	const { store, authorization, identityResolver } =
		resolveCommandDeps(options);
	if (!identityResolver) {
		return fail(
			"UNAUTHORIZED",
			"Human Resources identity resolver port is required",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_UNAUTHORIZED),
		);
	}

	const authorized = await requireComplianceEmployeeReadScope(
		identityResolver,
		options,
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

/**
 * Compliance employee reads: compliance operator, authorized HR operator,
 * subject (own.read), or projected manager (managed employee list).
 */
export async function requireComplianceEmployeeReadScope(
	identityResolver: HumanResourcesIdentityResolverPort,
	options: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		employeeId?: string | undefined;
		asOf?: string | undefined;
	},
): Promise<Result<void>> {
	const { authorization } = resolveCommandDeps(options);

	const adminCheck = await requireAdminResourceAccess(
		{ authorization },
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			permission: HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
		},
	);
	if (adminCheck.ok) {
		return ok(undefined);
	}

	const hrOperatorPermissions = [
		HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY,
		HUMAN_RESOURCES_PERMISSION_WORK_ELIGIBILITY_VERIFY,
	] as const;
	const sequentialOutcome1 = await runSequential(
		hrOperatorPermissions,
		async (permission) => {
			const hrCheck = await requireAdminResourceAccess(
				{ authorization },
				{
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					permission,
				},
			);
			if (hrCheck.ok) {
				return sequentialReturn(ok(undefined));
			}
		},
	);
	if (sequentialOutcome1.kind === "return") {
		return sequentialOutcome1.value;
	}

	const identity = await identityResolver.resolveEmployeeForActor({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		...(input.asOf === undefined ? {} : { asOf: input.asOf }),
	});
	if (!identity.ok) {
		return identity;
	}
	if (!identity.data) {
		return fail(
			"FORBIDDEN",
			"Actor is not an employee",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
		);
	}

	const targetEmployeeId =
		(input.employeeId as HumanResourcesEmployeeId | undefined) ??
		identity.data.employeeId;

	const ownCheck = await requireOwnResourceAccess(
		identityResolver,
		{ authorization },
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			targetEmployeeId,
			permission: HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
			asOf: input.asOf,
		},
	);
	if (ownCheck.ok) {
		return ok(undefined);
	}

	if (input.employeeId !== undefined) {
		const managed = await identityResolver.resolveManagerEmployeesForActor({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			...(input.asOf === undefined ? {} : { asOf: input.asOf }),
		});
		if (!managed.ok) {
			return managed;
		}
		if (managed.data.includes(targetEmployeeId)) {
			return ok(undefined);
		}
	}

	return fail("FORBIDDEN", "Missing required human resources permission", {
		...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
	});
}

export async function requireIdentityDocumentSensitiveRead(
	options: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
	},
): Promise<Result<void>> {
	return await requireHumanResourcesManifestPermission(options, {
		...input,
		permission: HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
	});
}
