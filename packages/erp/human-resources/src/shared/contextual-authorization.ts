import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesEmployeeId } from "../brands";
import {
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
	humanResourcesErrorDetails,
} from "../error-codes";

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

export const HUMAN_RESOURCES_SENSITIVE_RESOURCE_TYPES = [
	"personal_identifiers",
	"medical_leave",
	"compensation",
	"benefits",
	"employee_relations",
	"background_check",
	"performance",
	"succession",
] as const;

export type HumanResourcesSensitiveResourceType =
	(typeof HUMAN_RESOURCES_SENSITIVE_RESOURCE_TYPES)[number];

export type HumanResourcesSensitiveFieldClass =
	| "personal_identifiers"
	| "medical"
	| "compensation"
	| "employee_relations_evidence"
	| "background_check"
	| "succession";

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
