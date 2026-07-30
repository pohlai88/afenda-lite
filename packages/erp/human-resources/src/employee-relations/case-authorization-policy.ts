import {
	type HumanResourcesEmployeeId,
	parseHumanResourcesEmployeeCaseId,
	parseHumanResourcesEmployeeId,
} from "../brands";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	allowAuthorization,
	denyAuthorization,
	isPrivilegedActor,
} from "../shared/authorization-policy-helpers";
import type { HumanResourcesAuthorizationPolicy } from "../shared/authorization-policy-types";
import type {
	HumanResourcesAuthorizationDecision,
	HumanResourcesAuthorizationRequest,
	HumanResourcesResourceContext,
} from "../shared/authorization-types";
import { evaluateCaseReadAccess } from "./case-access-control";
import type { EmployeeCase } from "./types";

export const EMPLOYEE_RELATIONS_CASE_POLICY_ID =
	"hr.employee-relations.case" as const;

const CASE_CONTEXT_REQUIRED = "Employee-case context is required." as const;
const CASE_SCOPE_DENIED =
	"The actor is not authorized to access this employee case." as const;

function denyCaseContext(
	reason: string = CASE_CONTEXT_REQUIRED,
): HumanResourcesAuthorizationDecision {
	return denyAuthorization(
		"resource_context_required",
		reason,
		EMPLOYEE_RELATIONS_CASE_POLICY_ID,
	);
}

function denyCaseScope(
	reason: string = CASE_SCOPE_DENIED,
): HumanResourcesAuthorizationDecision {
	return denyAuthorization(
		"subject_scope_denied",
		reason,
		EMPLOYEE_RELATIONS_CASE_POLICY_ID,
	);
}

export function employeeCaseToResourceContext(
	employeeCase: EmployeeCase,
): HumanResourcesResourceContext {
	const assignedUserIds = [
		employeeCase.ownerActorUserId,
		...(employeeCase.subjectActorUserId === null
			? []
			: [employeeCase.subjectActorUserId]),
		...employeeCase.participants.map((participant) => participant.actorUserId),
	];

	return {
		organizationId: employeeCase.organizationId,
		kind: "employee_case",
		resourceId: employeeCase.id,
		subjectEmployeeId: employeeCase.employeeId,
		ownerUserId: employeeCase.ownerActorUserId,
		assignedUserIds: [...new Set(assignedUserIds)],
	};
}

async function resolveActorEmployeeId(
	request: HumanResourcesAuthorizationRequest,
	options: HumanResourcesCommandOptions,
): Promise<HumanResourcesEmployeeId | null> {
	if (request.actor.actorEmployeeId !== undefined) {
		const parsed = parseHumanResourcesEmployeeId(request.actor.actorEmployeeId);
		return parsed.ok ? parsed.data : null;
	}

	const { identityResolver } = options;
	if (identityResolver === undefined) {
		return null;
	}

	const identity = await identityResolver.resolveEmployeeForActor({
		organizationId: request.actor.organizationId,
		actorUserId: request.actor.actorUserId,
	});
	if (!identity.ok || identity.data === null) {
		return null;
	}
	return identity.data.employeeId;
}

async function evaluateCaseResourceAccess(
	request: HumanResourcesAuthorizationRequest,
	options: HumanResourcesCommandOptions,
	resource: HumanResourcesResourceContext,
): Promise<HumanResourcesAuthorizationDecision> {
	const { resourceId } = resource;
	if (resourceId === undefined) {
		return denyCaseContext();
	}

	const caseId = parseHumanResourcesEmployeeCaseId(resourceId);
	if (!caseId.ok) {
		return denyCaseContext();
	}

	const { store, authorization, identityResolver } = options;
	if (
		store === undefined ||
		authorization === undefined ||
		identityResolver === undefined
	) {
		return denyCaseContext(
			"Employee-case authorization dependencies are required.",
		);
	}

	const loaded = await store.findEmployeeCaseInOrganization({
		organizationId: request.actor.organizationId,
		caseId: caseId.data,
	});
	if (!loaded.ok) {
		// Fail closed: policy evaluate cannot surface store Result envelopes.
		return denyCaseScope(CASE_SCOPE_DENIED);
	}
	if (loaded.data === null) {
		return denyCaseContext();
	}

	const actorEmployeeId = await resolveActorEmployeeId(request, options);
	if (actorEmployeeId === null) {
		return denyCaseScope();
	}

	const access = await evaluateCaseReadAccess(store, authorization, {
		organizationId: request.actor.organizationId,
		actorUserId: request.actor.actorUserId,
		actorEmployeeId,
		employeeCase: loaded.data,
		accessType: "read",
	});

	if (!access.ok) {
		return denyCaseScope();
	}

	return allowAuthorization(EMPLOYEE_RELATIONS_CASE_POLICY_ID, {
		allowedFields: access.data.projectedFields,
		deniedFields: [],
	});
}

/**
 * Specialized ER case policy — wraps case-access-control under the facade.
 * List/commands may still use a privileged parity shell without resourceId.
 */
export const employeeRelationsCasePolicy: HumanResourcesAuthorizationPolicy = {
	id: EMPLOYEE_RELATIONS_CASE_POLICY_ID,
	mode: "specialized",
	resourceRequired: true,
	operationPrefixes: [
		"human-resources.employee-case.",
		"human-resources.employee-relations.",
	],

	evaluate(request, options) {
		const { resource } = request;

		if (resource?.kind !== "employee_case") {
			return Promise.resolve(denyCaseContext());
		}

		if (resource.resourceId !== undefined) {
			return evaluateCaseResourceAccess(request, options, resource);
		}

		if (isPrivilegedActor(resource)) {
			return Promise.resolve(
				allowAuthorization(EMPLOYEE_RELATIONS_CASE_POLICY_ID),
			);
		}

		return Promise.resolve(denyCaseContext());
	},
};
