import type { HumanResourcesCommandOptions } from "../../command-options";
import type { HumanResourcesPermission } from "../../permissions";
import type { HumanResourcesSubjectPolicy } from "../../sensitive-operation-policies";
import {
	actorHoldsAnyPermission,
	allowAuthorization,
	denyAuthorization,
	evaluateSubjectScope,
	projectQueryFields,
	requirePrivilegedAccess,
} from "../authorization-policy-helpers";
import type { HumanResourcesAuthorizationPolicy } from "../authorization-policy-types";
import type { HumanResourcesAuthorizationRequest } from "../authorization-types";
import type { HumanResourcesSensitiveFieldClass } from "../sensitive-field-types";

export function createScopedPolicy(input: {
	id: string;
	mode: HumanResourcesAuthorizationPolicy["mode"];
	operationPrefixes: readonly string[];
	resourceRequired: boolean;
	subjectPolicy: HumanResourcesSubjectPolicy | "manifest_only";
	fieldClasses?: readonly HumanResourcesSensitiveFieldClass[];
	/**
	 * Privileged administrator permissions. For privileged_only, required.
	 * For subject-scoped modes, grants access when subject/manager scope fails.
	 */
	privilegedPermissions?: readonly HumanResourcesPermission[];
}): HumanResourcesAuthorizationPolicy {
	const fieldClasses = input.fieldClasses ?? [];
	return {
		id: input.id,
		mode: input.mode,
		operationPrefixes: input.operationPrefixes,
		resourceRequired: input.resourceRequired,
		async evaluate(
			request: HumanResourcesAuthorizationRequest,
			options: HumanResourcesCommandOptions,
		) {
			if (input.subjectPolicy === "manifest_only") {
				return allowAuthorization(input.id);
			}
			if (input.subjectPolicy === "privileged_only") {
				if (
					input.privilegedPermissions !== undefined &&
					input.privilegedPermissions.length > 0
				) {
					const privilegedDenial = await requirePrivilegedAccess({
						request,
						policyId: input.id,
						privilegedPermissions: input.privilegedPermissions,
						options,
					});
					if (privilegedDenial !== null) {
						return privilegedDenial;
					}
				}
				return projectQueryFields({
					request,
					policyId: input.id,
					fieldClasses,
				});
			}
			const resource = request.resource;
			if (resource === undefined) {
				return denyAuthorization(
					"resource_context_required",
					`Resource context is required for policy ${input.id}`,
					input.id,
				);
			}
			const inSubjectScope = evaluateSubjectScope({
				subjectPolicy: input.subjectPolicy,
				actor: request.actor,
				resource,
			});
			const privilegedBypass =
				input.privilegedPermissions !== undefined &&
				input.privilegedPermissions.length > 0 &&
				(await actorHoldsAnyPermission(
					request,
					options,
					input.privilegedPermissions,
				));
			if (!inSubjectScope && !privilegedBypass) {
				return denyAuthorization(
					"subject_scope_denied",
					`Actor is outside the allowed subject scope for ${input.id}`,
					input.id,
				);
			}
			return projectQueryFields({
				request,
				policyId: input.id,
				fieldClasses,
			});
		},
	};
}
