import { errorIngress, errorResult, type Result } from "@afenda/errors";

import type { HumanResourcesCommandOptions } from "../execution/command-options";
import { HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED } from "../execution/error-codes";
import {
	authorizationReasonFromFailure,
	classifyHrAuthorizationDenial,
	observeAuthorizedOperationResult,
	recordAuthorizedOperationTelemetry,
} from "../observability/operation-observability";
import { PRIVILEGED_ACTOR_ATTRIBUTE } from "./authorization-policy-helpers";
import type {
	HumanResourcesActorContext,
	HumanResourcesAuthorizationDecision,
	HumanResourcesFieldProjection,
	HumanResourcesOperationId,
	HumanResourcesOperationKind,
	HumanResourcesResourceContext,
	HumanResourcesResourceKind,
} from "./authorization-types";
import {
	authorizeHumanResourcesOperation,
	type HumanResourcesAuthorizationDeniedDetails,
} from "./contextual-authorization";
import { resolveManifestOperationPermission } from "./manifest-permission";
import type { HumanResourcesPermission } from "./permissions";

export { resolveManifestOperationPermission } from "./manifest-permission";

const _AUTHORIZATION_DENIED_MESSAGE =
	"Human Resources authorization denied" as const;

export interface HumanResourcesAuthorizedActorInput {
	actorEmployeeId?: string | undefined;
	actorUserId: string;
	correlationId?: string | undefined;
	organizationId: string;
}

async function enrichActorFromIdentityResolver(
	actor: HumanResourcesActorContext,
	options: HumanResourcesCommandOptions,
): Promise<HumanResourcesActorContext> {
	if (actor.actorEmployeeId !== undefined) {
		return actor;
	}
	const { identityResolver } = options;
	if (identityResolver === undefined) {
		return actor;
	}
	const identity = await identityResolver.resolveEmployeeForActor({
		organizationId: actor.organizationId,
		actorUserId: actor.actorUserId,
	});
	if (!identity.ok || identity.data === null) {
		return actor;
	}
	return {
		...actor,
		actorEmployeeId: identity.data.employeeId,
	};
}

export interface RunHumanResourcesOperationOptions<
	Input,
	Output,
	Projected = Output,
> {
	execute: () => Promise<Result<Output>>;
	input: Input;
	operationId: HumanResourcesOperationId;
	operationKind: HumanResourcesOperationKind;
	options: HumanResourcesCommandOptions;

	project?:
		| ((
				value: Output,
				projection: HumanResourcesFieldProjection | undefined,
		  ) => Projected)
		| undefined;

	requestedFields?: readonly string[] | undefined;
	requiredPermission: HumanResourcesPermission;

	resolveResource?:
		| ((
				input: Input,
				options: HumanResourcesCommandOptions,
		  ) => Promise<HumanResourcesResourceContext | undefined>)
		| undefined;
}

export function authorizationDecisionToFailure(
	decision: Extract<HumanResourcesAuthorizationDecision, { allowed: false }>,
	operationId: HumanResourcesOperationId,
): Result<never> {
	const details: HumanResourcesAuthorizationDeniedDetails = {
		humanResourcesCode: HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED,
		operationId,
		denyCode: decision.code,
		...(decision.policyId === undefined ? {} : { policyId: decision.policyId }),
	};
	return errorResult.fail("FORBIDDEN", { internalContext: details });
}

export function createParityResourceShell(input: {
	organizationId: string;
	kind: HumanResourcesResourceKind;
}): HumanResourcesResourceContext {
	return {
		organizationId: input.organizationId,
		kind: input.kind,
		attributes: { [PRIVILEGED_ACTOR_ATTRIBUTE]: true },
	};
}

export function resolveActorContextFromInput(
	input: HumanResourcesAuthorizedActorInput,
): HumanResourcesActorContext {
	return {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId ?? "",
		...(input.actorEmployeeId === undefined
			? {}
			: { actorEmployeeId: input.actorEmployeeId }),
	};
}

function removeDeniedFields(
	value: unknown,
	deniedFields: ReadonlySet<string>,
): void {
	if (Array.isArray(value)) {
		for (const item of value) {
			removeDeniedFields(item, deniedFields);
		}
		return;
	}
	if (value === null || typeof value !== "object" || value instanceof Date) {
		return;
	}
	for (const field of Object.keys(value)) {
		if (deniedFields.has(field)) {
			Reflect.deleteProperty(value, field);
			continue;
		}
		removeDeniedFields(readProperty(value, field), deniedFields);
	}
}

function readProperty(value: object, key: PropertyKey): unknown {
	try {
		return Reflect.get(value, key);
	} catch {
		// A throwing accessor is omitted from the authorized projection.
	}
}

/** Clone an authorized read model and remove denied fields at every record level. */
export function projectAuthorizedFields<T>(
	value: T,
	projection: HumanResourcesFieldProjection | undefined,
): T {
	if (projection === undefined || projection.deniedFields.length === 0) {
		return value;
	}
	const projected = structuredClone(value);
	removeDeniedFields(projected, new Set(projection.deniedFields));
	return projected;
}

/**
 * Shared authorize → execute → optional project path for all HR domain runners.
 * Contextual authorization is mandatory; resource/projection remain opt-in.
 */
export async function runAuthorizedHumanResourcesOperation<
	Input extends HumanResourcesAuthorizedActorInput,
	Output,
	Projected = Output,
>(
	params: RunHumanResourcesOperationOptions<Input, Output, Projected>,
): Promise<Result<Projected>> {
	const startedAtMs = Date.now();
	try {
		const resource = params.resolveResource
			? await params.resolveResource(params.input, params.options)
			: undefined;

		const actor = await enrichActorFromIdentityResolver(
			resolveActorContextFromInput(params.input),
			params.options,
		);

		const authorizationResult = await authorizeHumanResourcesOperation(
			{
				operationId: params.operationId,
				operationKind: params.operationKind,
				requiredPermission: params.requiredPermission,
				actor,
				resource,
				...(params.requestedFields === undefined
					? {}
					: { requestedFields: params.requestedFields }),
			},
			params.options,
		);

		if (!authorizationResult.ok) {
			return observeAuthorizedOperationResult({
				operationId: params.operationId,
				operationKind: params.operationKind,
				observability: params.options.observability,
				startedAtMs,
				result: authorizationResult,
				authorizationReason:
					authorizationReasonFromFailure(authorizationResult),
			});
		}

		const decision = authorizationResult.data;
		if (!decision.allowed) {
			const failure = authorizationDecisionToFailure(
				decision,
				params.operationId,
			);
			return observeAuthorizedOperationResult({
				operationId: params.operationId,
				operationKind: params.operationKind,
				observability: params.options.observability,
				startedAtMs,
				result: failure,
				authorizationReason: classifyHrAuthorizationDenial(decision.code),
			});
		}

		const result = await params.execute();
		if (!result.ok) {
			return observeAuthorizedOperationResult({
				operationId: params.operationId,
				operationKind: params.operationKind,
				observability: params.options.observability,
				startedAtMs,
				result,
			});
		}
		if (params.project === undefined) {
			return observeAuthorizedOperationResult({
				operationId: params.operationId,
				operationKind: params.operationKind,
				observability: params.options.observability,
				startedAtMs,
				result: errorResult.ok(result.data as Projected & Output),
			});
		}

		return observeAuthorizedOperationResult({
			operationId: params.operationId,
			operationKind: params.operationKind,
			observability: params.options.observability,
			startedAtMs,
			result: errorResult.ok(params.project(result.data, decision.projection)),
		});
	} catch (error) {
		await recordAuthorizedOperationTelemetry({
			operationId: params.operationId,
			operationKind: params.operationKind,
			observability: params.options.observability,
			startedAtMs,
			outcome: "failure",
			failureReason: "unknown",
		});
		throw errorIngress.unknown(error, {
			operation: "human-resources.authorized-operation",
		});
	}
}

/**
 * Domain-runner adapter: resolve manifest permission, optional parity resource shell,
 * then run the shared authorized operation.
 */
export async function runDomainAuthorizedOperation<
	TData extends HumanResourcesAuthorizedActorInput,
	TOut,
	TProjected = TOut,
>(params: {
	operationId: HumanResourcesOperationId;
	operationKind: HumanResourcesOperationKind;
	data: TData;
	options: HumanResourcesCommandOptions;
	/** When set and no resolveResource, supplies privilegedActor parity shell. */
	parityResourceKind?: HumanResourcesResourceKind | undefined;
	resolveResource?:
		| ((
				input: TData,
				options: HumanResourcesCommandOptions,
		  ) => Promise<HumanResourcesResourceContext | undefined>)
		| undefined;
	requestedFields?: readonly string[] | undefined;
	resolveRequestedFields?:
		| ((input: TData) => readonly string[] | undefined)
		| undefined;
	project?:
		| ((
				value: TOut,
				projection: HumanResourcesFieldProjection | undefined,
		  ) => TProjected)
		| undefined;
	execute: () => Promise<Result<TOut>>;
}): Promise<Result<TProjected>> {
	const startedAtMs = Date.now();
	const requiredPermission = resolveManifestOperationPermission(
		params.operationId,
		params.operationKind,
	);
	if (requiredPermission === undefined) {
		const details: HumanResourcesAuthorizationDeniedDetails = {
			humanResourcesCode: HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED,
			operationId: params.operationId,
			denyCode: "permission_denied",
			policyId: "hr.manifest-permission",
		};
		return await observeAuthorizedOperationResult({
			operationId: params.operationId,
			operationKind: params.operationKind,
			observability: params.options.observability,
			startedAtMs,
			result: errorResult.fail("FORBIDDEN", { internalContext: details }),
			authorizationReason: "permission_missing",
		});
	}

	const { parityResourceKind } = params;
	const resolveResource =
		params.resolveResource ??
		(parityResourceKind === undefined
			? undefined
			: async (input: TData) =>
					createParityResourceShell({
						organizationId: input.organizationId,
						kind: parityResourceKind,
					}));

	return await runAuthorizedHumanResourcesOperation({
		operationId: params.operationId,
		operationKind: params.operationKind,
		requiredPermission,
		input: params.data,
		options: params.options,
		requestedFields:
			params.requestedFields ?? params.resolveRequestedFields?.(params.data),
		execute: params.execute,
		...(resolveResource === undefined ? {} : { resolveResource }),
		...(params.project === undefined ? {} : { project: params.project }),
	});
}
