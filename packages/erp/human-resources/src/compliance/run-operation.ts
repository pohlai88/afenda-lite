import { errorResult, type Result } from "@afenda/errors";
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
import { getHumanResourcesOperationDefinition } from "../operation-registry/registry";
import { parseHumanResourcesInput } from "../parse-input";
import {
	HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY,
	HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
	HUMAN_RESOURCES_PERMISSION_WORK_ELIGIBILITY_VERIFY,
} from "../permissions";
import type { DocumentReferencePort, MutationPorts } from "../ports";
import type { HumanResourcesResourceContext } from "../shared/authorization-types";
import { requireHumanResourcesManifestPermission } from "../shared/contextual-authorization";
import {
	runParsedAuthorizedCommand,
	runParsedAuthorizedQuery,
} from "../shared/domain-runner";
import type { HumanResourcesAuthorizedActorInput } from "../shared/run-authorized-operation";
import { runSequential, sequentialReturn } from "../shared/run-sequential";
import {
	requireAdminResourceAccess,
	requireOwnResourceAccess,
} from "../shared/subject-aware-authorization";
import type {
	HUMAN_RESOURCES_COMPLIANCE_COMMAND_IDS,
	HUMAN_RESOURCES_COMPLIANCE_QUERY_IDS,
} from "./operation-registry";
import {
	type HumanResourcesComplianceStoreMethod,
	type HumanResourcesComplianceStoreProjection,
	projectComplianceStore,
} from "./store";

type ActorScoped = HumanResourcesAuthorizedActorInput;
type ComplianceCommandId =
	(typeof HUMAN_RESOURCES_COMPLIANCE_COMMAND_IDS)[number];
type ComplianceQueryId = (typeof HUMAN_RESOURCES_COMPLIANCE_QUERY_IDS)[number];

function resolveComplianceCommandResource(
	data: ActorScoped & { employeeId?: string },
	command: ComplianceCommandId,
): HumanResourcesResourceContext | undefined {
	const { resourceKind } = getHumanResourcesOperationDefinition(command);
	if (resourceKind === null) {
		return;
	}
	return {
		organizationId: data.organizationId,
		kind: resourceKind,
		...(data.employeeId === undefined
			? {}
			: { subjectEmployeeId: data.employeeId }),
	};
}

export async function runComplianceCapabilityCommand<
	const TMethods extends readonly HumanResourcesComplianceStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		command: ComplianceCommandId;
		execute: (
			data: z.infer<TSchema>,
			deps: {
				documentReference: DocumentReferencePort;
				ports: MutationPorts;
				store: HumanResourcesComplianceStoreProjection<TMethods>;
			},
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		schema: TSchema;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedCommand(input, options, {
		...config,
		resolveResource: async (data) =>
			resolveComplianceCommandResource(data, config.command),
		resolveDeps: (resolvedOptions) => {
			const { store, ports } = resolveCommandDeps(resolvedOptions);
			const documentReference = requireDocumentReference(resolvedOptions);
			if (!documentReference.ok) {
				return documentReference;
			}
			return errorResult.ok({
				store: projectComplianceStore(store, config.storeMethods),
				ports,
				documentReference: documentReference.data,
			});
		},
	});
}

export async function runComplianceCapabilityQuery<
	const TMethods extends readonly HumanResourcesComplianceStoreMethod[],
	TSchema extends z.ZodType<ActorScoped>,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		execute: (
			data: z.infer<TSchema>,
			deps: { store: HumanResourcesComplianceStoreProjection<TMethods> },
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		query: ComplianceQueryId;
		schema: TSchema;
		storeMethods: TMethods;
	},
): Promise<Result<TOut>> {
	return await runParsedAuthorizedQuery(input, options, {
		...config,
		parityResourceKind: "employee_document",
		resolveDeps: (resolvedOptions) => {
			const { store } = resolveCommandDeps(resolvedOptions);
			return errorResult.ok({
				store: projectComplianceStore(store, config.storeMethods),
			});
		},
	});
}

export async function runComplianceEmployeeScopedCapabilityQuery<
	const TMethods extends readonly HumanResourcesComplianceStoreMethod[],
	TSchema extends z.ZodType,
	TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		execute: (
			data: z.output<TSchema>,
			deps: {
				identityResolver: HumanResourcesIdentityResolverPort;
				store: HumanResourcesComplianceStoreProjection<TMethods>;
			},
		) => Promise<Result<TOut>>;
		invalidMessage: string;
		query: ComplianceQueryId;
		schema: TSchema &
			z.ZodType<ActorScoped & { employeeId?: string | undefined }>;
		storeMethods: TMethods;
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

	const { store, identityResolver } = resolveCommandDeps(options);
	if (!identityResolver) {
		return errorResult.fail("UNAUTHORIZED", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
			),
		});
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
		identityResolver,
		store: projectComplianceStore(store, config.storeMethods),
	});
}

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
		return errorResult.ok(undefined);
	}

	const operatorPermissions = [
		HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY,
		HUMAN_RESOURCES_PERMISSION_WORK_ELIGIBILITY_VERIFY,
	] as const;
	const operatorOutcome = await runSequential(
		operatorPermissions,
		async (permission) => {
			const check = await requireAdminResourceAccess(
				{ authorization },
				{
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					permission,
				},
			);
			if (check.ok) {
				return sequentialReturn(errorResult.ok(undefined));
			}
		},
	);
	if (operatorOutcome.kind === "return") {
		return operatorOutcome.value;
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
		return errorResult.fail("FORBIDDEN", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			),
		});
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
		return errorResult.ok(undefined);
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
			return errorResult.ok(undefined);
		}
	}

	return errorResult.fail("FORBIDDEN", {
		internalContext: humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		),
	});
}

export async function requireIdentityDocumentSensitiveRead(
	options: HumanResourcesCommandOptions,
	input: { organizationId: string; actorUserId: string },
): Promise<Result<void>> {
	return await requireHumanResourcesManifestPermission(options, {
		...input,
		permission: HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
	});
}
