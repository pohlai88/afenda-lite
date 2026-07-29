import { normalizeUnknown } from "@afenda/errors";
import { fail, ok, type Result } from "@afenda/errors/result";

import { requireHumanResourcesPermission } from "../authorization";
import type { HumanResourcesEmployeeId } from "../brands";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
	humanResourcesErrorDetails,
} from "../error-codes";
import type { HumanResourcesPermission } from "../permissions";
import {
	HUMAN_RESOURCES_AUTHORIZATION_POLICIES,
	resolveHumanResourcesAuthorizationPolicy,
} from "./authorization-policy-registry";
import {
	type HumanResourcesAuthorizationPolicy,
	HumanResourcesAuthorizationPolicyResolveError,
} from "./authorization-policy-types";
import type {
	HumanResourcesAuthorizationDecision,
	HumanResourcesAuthorizationDenyCode,
	HumanResourcesAuthorizationRequest,
	HumanResourcesOperationId,
} from "./authorization-types";
import { resolveManifestOperationPermission } from "./manifest-permission";
import type {
	HumanResourcesSensitiveFieldClass,
	HumanResourcesSensitiveResourceType,
} from "./sensitive-field-types";

export {
	HUMAN_RESOURCES_SENSITIVE_RESOURCE_TYPES,
	type HumanResourcesSensitiveFieldClass,
	type HumanResourcesSensitiveResourceType,
} from "./sensitive-field-types";

const AUTHORIZATION_DENIED_MESSAGE =
	"Human Resources authorization denied" as const;

export type HumanResourcesAuthorizeOperationOptions =
	HumanResourcesCommandOptions & {
		policies?: readonly HumanResourcesAuthorizationPolicy[];
	};

export type HumanResourcesAuthorizationDeniedDetails = {
	humanResourcesCode: typeof HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED;
	operationId: HumanResourcesOperationId;
	policyId?: string;
	denyCode: HumanResourcesAuthorizationDenyCode;
	resourceKind?: string;
	resourceId?: string;
};

export const HUMAN_RESOURCES_ACTOR_SCOPES = [
	"subject",
	"manager",
	"matrix_manager",
	"hr_business_partner",
	"recruiter",
	"compensation",
	"benefits",
	"investigator",
	"legal_compliance",
	"executive_planner",
	"integration",
] as const;

export type HumanResourcesActorScope =
	(typeof HUMAN_RESOURCES_ACTOR_SCOPES)[number];

export type HumanResourcesSensitiveResourcePolicy = {
	resourceType: HumanResourcesSensitiveResourceType;
	allowedScopes: readonly HumanResourcesActorScope[];
	fieldClasses: readonly HumanResourcesSensitiveFieldClass[];
	allowSubjectAccess: boolean;
	allowManagerAccess: boolean;
	allowBreakGlass: boolean;
};

export const HUMAN_RESOURCES_SENSITIVE_RESOURCE_POLICIES = {
	personal_identifiers: {
		resourceType: "personal_identifiers",
		allowedScopes: [
			"subject",
			"hr_business_partner",
			"legal_compliance",
			"integration",
		],
		fieldClasses: ["personal_identifiers"],
		allowSubjectAccess: true,
		allowManagerAccess: false,
		allowBreakGlass: true,
	},
	medical_leave: {
		resourceType: "medical_leave",
		allowedScopes: [
			"subject",
			"hr_business_partner",
			"benefits",
			"legal_compliance",
		],
		fieldClasses: ["medical"],
		allowSubjectAccess: true,
		allowManagerAccess: false,
		allowBreakGlass: true,
	},
	compensation: {
		resourceType: "compensation",
		allowedScopes: [
			"subject",
			"compensation",
			"hr_business_partner",
			"executive_planner",
		],
		fieldClasses: ["compensation"],
		allowSubjectAccess: true,
		allowManagerAccess: false,
		allowBreakGlass: true,
	},
	benefits: {
		resourceType: "benefits",
		allowedScopes: ["subject", "benefits", "hr_business_partner"],
		fieldClasses: ["compensation", "medical"],
		allowSubjectAccess: true,
		allowManagerAccess: false,
		allowBreakGlass: true,
	},
	employee_relations: {
		resourceType: "employee_relations",
		allowedScopes: ["investigator", "legal_compliance"],
		fieldClasses: ["employee_relations_evidence"],
		allowSubjectAccess: false,
		allowManagerAccess: false,
		allowBreakGlass: true,
	},
	background_check: {
		resourceType: "background_check",
		allowedScopes: ["recruiter", "legal_compliance"],
		fieldClasses: ["background_check", "personal_identifiers"],
		allowSubjectAccess: false,
		allowManagerAccess: false,
		allowBreakGlass: true,
	},
	performance: {
		resourceType: "performance",
		allowedScopes: [
			"subject",
			"manager",
			"matrix_manager",
			"hr_business_partner",
		],
		fieldClasses: ["employee_relations_evidence"],
		allowSubjectAccess: true,
		allowManagerAccess: true,
		allowBreakGlass: false,
	},
	succession: {
		resourceType: "succession",
		allowedScopes: ["hr_business_partner", "executive_planner"],
		fieldClasses: ["succession"],
		allowSubjectAccess: false,
		allowManagerAccess: false,
		allowBreakGlass: true,
	},
} as const satisfies Record<
	HumanResourcesSensitiveResourceType,
	HumanResourcesSensitiveResourcePolicy
>;

export const HUMAN_RESOURCES_SEPARATION_OF_DUTIES = [
	["case_investigate", "case_approve_action"],
	["compensation_recommend", "compensation_finalize"],
	["recruitment_recommend", "recruitment_offer_approve"],
] as const;

export type HumanResourcesSensitiveDuty =
	(typeof HUMAN_RESOURCES_SEPARATION_OF_DUTIES)[number][number];

export type HumanResourcesDelegatedAuthority = {
	scope: HumanResourcesActorScope;
	validFrom: string;
	validUntil: string | null;
	delegatedByUserId: string;
};

export type HumanResourcesBreakGlassAuditPort = {
	record(input: {
		organizationId: string;
		actorUserId: string;
		resourceType: HumanResourcesSensitiveResourceType;
		resourceId: string;
		reason: string;
		correlationId: string;
		occurredAt: string;
	}): Promise<Result<{ id: string }>>;
};

export type HumanResourcesContextualAuthorizationInput = {
	organizationId: string;
	resourceOrganizationId: string;
	actorUserId: string;
	actorEmployeeId?: HumanResourcesEmployeeId;
	actorEmploymentStatus: "active" | "terminated";
	directScopes: readonly HumanResourcesActorScope[];
	delegatedAuthorities?: readonly HumanResourcesDelegatedAuthority[];
	actorDuties?: readonly HumanResourcesSensitiveDuty[];
	requestedDuty?: HumanResourcesSensitiveDuty;
	resourceType: HumanResourcesSensitiveResourceType;
	resourceId: string;
	subjectEmployeeId?: HumanResourcesEmployeeId;
	ownerActorUserId?: string;
	action:
		| "read"
		| "create"
		| "update"
		| "approve"
		| "export"
		| "rectify"
		| "anonymize"
		| "hold";
	asOf: string;
	breakGlass?: {
		reason: string;
		correlationId: string;
		audit: HumanResourcesBreakGlassAuditPort;
	};
};

export type HumanResourcesContextualAuthorizationDecision = {
	allowedScope: HumanResourcesActorScope | "break_glass";
	fieldClasses: readonly HumanResourcesSensitiveFieldClass[];
	breakGlassAuditId?: string;
};

function activeDelegatedScopes(
	delegations: readonly HumanResourcesDelegatedAuthority[],
	asOf: string,
): HumanResourcesActorScope[] {
	return delegations
		.filter(
			(delegation) =>
				delegation.validFrom <= asOf &&
				(delegation.validUntil === null || delegation.validUntil >= asOf),
		)
		.map((delegation) => delegation.scope);
}

function violatesSeparationOfDuties(
	duties: readonly HumanResourcesSensitiveDuty[],
	requestedDuty: HumanResourcesSensitiveDuty | undefined,
): boolean {
	if (!requestedDuty) return false;
	return HUMAN_RESOURCES_SEPARATION_OF_DUTIES.some(
		([left, right]) =>
			(requestedDuty === left && duties.includes(right)) ||
			(requestedDuty === right && duties.includes(left)),
	);
}

export async function authorizeHumanResourcesSensitiveResource(
	input: HumanResourcesContextualAuthorizationInput,
): Promise<Result<HumanResourcesContextualAuthorizationDecision>> {
	if (input.organizationId !== input.resourceOrganizationId) {
		return fail("FORBIDDEN", "Cross-tenant human resources access denied", {
			...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
			resourceType: input.resourceType,
		});
	}
	if (input.actorEmploymentStatus === "terminated") {
		return fail(
			"UNAUTHORIZED",
			"Terminated actors cannot access human resources data",
			{
				...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_UNAUTHORIZED),
				resourceType: input.resourceType,
			},
		);
	}
	if (
		input.action === "approve" &&
		(input.ownerActorUserId === input.actorUserId ||
			(input.actorEmployeeId !== undefined &&
				input.actorEmployeeId === input.subjectEmployeeId))
	) {
		return fail("FORBIDDEN", "Self-approval is not permitted", {
			...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
			resourceType: input.resourceType,
		});
	}
	if (
		violatesSeparationOfDuties(input.actorDuties ?? [], input.requestedDuty)
	) {
		return fail("FORBIDDEN", "Separation of duties policy denied access", {
			...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
			resourceType: input.resourceType,
		});
	}

	const policy =
		HUMAN_RESOURCES_SENSITIVE_RESOURCE_POLICIES[input.resourceType];
	const scopes = new Set<HumanResourcesActorScope>([
		...input.directScopes,
		...activeDelegatedScopes(input.delegatedAuthorities ?? [], input.asOf),
	]);
	const isSubject =
		input.actorEmployeeId !== undefined &&
		input.actorEmployeeId === input.subjectEmployeeId;
	const allowedScope = policy.allowedScopes.find(
		(scope) =>
			scopes.has(scope) &&
			(scope !== "subject" || (policy.allowSubjectAccess && isSubject)) &&
			(scope !== "manager" && scope !== "matrix_manager"
				? true
				: policy.allowManagerAccess),
	);
	if (allowedScope) {
		return ok({ allowedScope, fieldClasses: policy.fieldClasses });
	}

	if (input.breakGlass && policy.allowBreakGlass) {
		const reason = input.breakGlass.reason.trim();
		if (reason.length < 12) {
			return fail("VALIDATION_ERROR", "Break-glass reason must be specific", {
				resourceType: input.resourceType,
			});
		}
		const audit = await input.breakGlass.audit.record({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			resourceType: input.resourceType,
			resourceId: input.resourceId,
			reason,
			correlationId: input.breakGlass.correlationId,
			occurredAt: input.asOf,
		});
		if (!audit.ok) return audit;
		return ok({
			allowedScope: "break_glass",
			fieldClasses: policy.fieldClasses,
			breakGlassAuditId: audit.data.id,
		});
	}

	return fail("FORBIDDEN", "No applicable contextual human resources scope", {
		...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
		resourceType: input.resourceType,
	});
}

function resolveDenyCodeFromError(
	error: unknown,
): HumanResourcesAuthorizationDenyCode {
	if (error instanceof HumanResourcesAuthorizationPolicyResolveError) {
		return error.code;
	}
	normalizeUnknown(error, AUTHORIZATION_DENIED_MESSAGE);
	return "policy_not_registered";
}

export function authorizationAllowed(
	decision: Extract<HumanResourcesAuthorizationDecision, { allowed: true }>,
): Result<HumanResourcesAuthorizationDecision> {
	return ok(decision);
}

export function authorizationDenied(input: {
	operationId: HumanResourcesOperationId;
	policyId?: string;
	code: HumanResourcesAuthorizationDenyCode;
	resourceKind?: string;
	resourceId?: string;
}): Result<HumanResourcesAuthorizationDecision> {
	const details: HumanResourcesAuthorizationDeniedDetails = {
		humanResourcesCode: HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED,
		operationId: input.operationId,
		denyCode: input.code,
		...(input.policyId === undefined ? {} : { policyId: input.policyId }),
		...(input.resourceKind === undefined
			? {}
			: { resourceKind: input.resourceKind }),
		...(input.resourceId === undefined ? {} : { resourceId: input.resourceId }),
	};
	return fail("FORBIDDEN", AUTHORIZATION_DENIED_MESSAGE, details);
}

/**
 * Unified HR authorization entry: tenant → manifest permission → policy → scope/projection.
 */
export async function authorizeHumanResourcesOperation(
	request: HumanResourcesAuthorizationRequest,
	options: HumanResourcesAuthorizeOperationOptions,
): Promise<Result<HumanResourcesAuthorizationDecision>> {
	const policies = options.policies ?? HUMAN_RESOURCES_AUTHORIZATION_POLICIES;
	const { actor, resource } = request;

	if (
		resource !== undefined &&
		actor.organizationId !== resource.organizationId
	) {
		return authorizationDenied({
			operationId: request.operationId,
			policyId: "hr.tenant-boundary",
			code: "cross_tenant",
			resourceKind: resource.kind,
			resourceId: resource.resourceId,
		});
	}

	const manifestPermission = resolveManifestOperationPermission(
		request.operationId,
		request.operationKind,
	);
	if (
		manifestPermission !== undefined &&
		manifestPermission !== request.requiredPermission
	) {
		return authorizationDenied({
			operationId: request.operationId,
			policyId: "hr.manifest-permission",
			code: "permission_denied",
			resourceKind: resource?.kind,
			resourceId: resource?.resourceId,
		});
	}

	const permissionResult = await requireHumanResourcesPermission(
		options.authorization,
		{
			organizationId: actor.organizationId,
			actorUserId: actor.actorUserId,
			permission: request.requiredPermission,
		},
	);
	if (!permissionResult.ok) {
		return permissionResult;
	}

	let policy: HumanResourcesAuthorizationPolicy;
	try {
		policy = resolveHumanResourcesAuthorizationPolicy(
			request.operationId,
			policies,
		);
	} catch (error) {
		return authorizationDenied({
			operationId: request.operationId,
			code: resolveDenyCodeFromError(error),
			resourceKind: resource?.kind,
			resourceId: resource?.resourceId,
		});
	}

	if (policy.resourceRequired && resource === undefined) {
		return authorizationDenied({
			operationId: request.operationId,
			policyId: policy.id,
			code: "resource_context_required",
		});
	}

	const decision = await policy.evaluate(request, options);
	if (!decision.allowed) {
		return authorizationDenied({
			operationId: request.operationId,
			policyId: decision.policyId ?? policy.id,
			code: decision.code,
			resourceKind: resource?.kind,
			resourceId: resource?.resourceId,
		});
	}

	return authorizationAllowed(decision);
}

/**
 * Secondary manifest permission probe — domain code must use this (or the full
 * facade) instead of importing low-level helpers from authorization.ts.
 */
export async function requireHumanResourcesManifestPermission(
	options: HumanResourcesAuthorizeOperationOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: HumanResourcesPermission;
	},
): Promise<Result<void>> {
	return requireHumanResourcesPermission(options.authorization, input);
}

/** Supplemental manifest permission probe (backdate, sensitive read, etc.). */
export async function assertHumanResourcesSupplementalAuthorization(
	request: HumanResourcesAuthorizationRequest,
	options: HumanResourcesAuthorizeOperationOptions,
): Promise<Result<void>> {
	return requireHumanResourcesManifestPermission(options, {
		organizationId: request.actor.organizationId,
		actorUserId: request.actor.actorUserId,
		permission: request.requiredPermission,
	});
}
