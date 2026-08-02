import { errorResult, type Result } from "@afenda/errors";
import type {
	ApprovalDecisionId,
	ApprovalRequestId,
	CommandFingerprint,
	OrganizationId,
	UserId,
} from "./kernel/brands";
import {
	type CorporateAdministrationOperationId,
	getCorporateAdministrationOperationDefinition,
} from "./operation-registry/registry";
import type { CorporateAdministrationPermission } from "./permissions";

export type CorporateAdministrationAuthorizationInput = Readonly<{
	organizationId: OrganizationId;
	actorUserId: UserId;
	permission: CorporateAdministrationPermission;
}>;

/**
 * Composition-injected authorization provider.
 *
 * Production execution context requires this port. There is no allow-all
 * default and no `module_admin` bypass inside this package — the provider
 * alone decides tenant capability.
 */
export type CorporateAdministrationAuthorizationContext = Readonly<{
	can: (input: CorporateAdministrationAuthorizationInput) => Promise<boolean>;
}>;

export type CorporateAdministrationApprovalDecision = Readonly<{
	organizationId: OrganizationId;
	approvalRequestId: ApprovalRequestId;
	approvalDecisionId: ApprovalDecisionId;
	commandFingerprint: CommandFingerprint;
	approved: boolean;
	approverUserId: UserId;
}>;

export type CorporateAdministrationApprovalDecisionPort = Readonly<{
	verify: (input: {
		organizationId: OrganizationId;
		approvalRequestId: ApprovalRequestId;
		approvalDecisionId: ApprovalDecisionId;
		commandFingerprint: CommandFingerprint;
	}) => Promise<Result<CorporateAdministrationApprovalDecision | null>>;
}>;

export type CorporateAdministrationApprovalVerificationDependencies = Readonly<{
	approvalDecisions?: CorporateAdministrationApprovalDecisionPort;
}>;

export {
	CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
} from "./operation-registry/registry";

export function corporateAdministrationPermissionFor(
	operationId: CorporateAdministrationOperationId,
): CorporateAdministrationPermission {
	return getCorporateAdministrationOperationDefinition(operationId).permission;
}

/**
 * Fail-closed permission guard.
 *
 * Production callers must supply authorization through
 * `CorporateAdministrationExecutionContext`. The `| undefined` parameter is a
 * defensive utility only: missing wiring returns `FORBIDDEN` and never grants
 * access. Provider exceptions propagate as infrastructure failures; this
 * function does not catch them or translate them into domain results.
 *
 * Returns `Result<void>`. Denial metadata carries the requested permission
 * code only — never resource existence, submitted values, or provider internals.
 */
export async function requireCorporateAdministrationPermission(
	authorization: CorporateAdministrationAuthorizationContext | undefined,
	input: CorporateAdministrationAuthorizationInput,
): Promise<Result<void>> {
	if (authorization === undefined) {
		return forbidden(input.permission);
	}

	const permitted = await authorization.can(input);

	if (!permitted) {
		return forbidden(input.permission);
	}

	return errorResult.ok(undefined);
}

export async function verifyCorporateAdministrationApproval(
	dependencies: CorporateAdministrationApprovalVerificationDependencies,
	input: Readonly<{
		organizationId: OrganizationId;
		actorUserId: UserId;
		approvalRequestId?: ApprovalRequestId | undefined;
		approvalDecisionId?: ApprovalDecisionId | undefined;
		commandFingerprint: CommandFingerprint;
	}>,
): Promise<Result<void>> {
	if (dependencies.approvalDecisions === undefined) {
		return errorResult.fail("FORBIDDEN");
	}
	if (
		input.approvalRequestId === undefined ||
		input.approvalDecisionId === undefined
	) {
		return errorResult.fail("FORBIDDEN");
	}
	const decision = await dependencies.approvalDecisions.verify({
		organizationId: input.organizationId,
		approvalRequestId: input.approvalRequestId,
		approvalDecisionId: input.approvalDecisionId,
		commandFingerprint: input.commandFingerprint,
	});
	if (!decision.ok) {
		return decision;
	}
	if (
		decision.data === null ||
		decision.data.organizationId !== input.organizationId ||
		decision.data.approvalRequestId !== input.approvalRequestId ||
		decision.data.approvalDecisionId !== input.approvalDecisionId ||
		decision.data.commandFingerprint !== input.commandFingerprint ||
		!decision.data.approved
	) {
		return errorResult.fail("FORBIDDEN");
	}
	if (decision.data.approverUserId === input.actorUserId) {
		return errorResult.fail("FORBIDDEN");
	}
	return errorResult.ok(undefined);
}

function forbidden(
	_permission: CorporateAdministrationPermission,
): Result<void> {
	return errorResult.fail("FORBIDDEN");
}
