import { fail, ok, type Result } from "@afenda/errors/result";

import { corporateAdministrationErrorDetails } from "./error-codes";
import type {
	ApprovalDecisionId,
	ApprovalRequestId,
	CommandFingerprint,
	OrganizationId,
	UserId,
} from "./kernel/brands";
import type {
	CorporateAdministrationCommandId,
	CorporateAdministrationQueryId,
} from "./module-ids";
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
	can(input: CorporateAdministrationAuthorizationInput): Promise<boolean>;
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
	verify(input: {
		organizationId: OrganizationId;
		approvalRequestId: ApprovalRequestId;
		approvalDecisionId: ApprovalDecisionId;
		commandFingerprint: CommandFingerprint;
	}): Promise<Result<CorporateAdministrationApprovalDecision | null>>;
}>;

export type CorporateAdministrationApprovalVerificationDependencies = Readonly<{
	approvalDecisions?: CorporateAdministrationApprovalDecisionPort;
}>;

export const CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS = {
	registerLegalCompanyDraft: "corporate_administration.company.manage",
	updateLegalCompanyProfile: "corporate_administration.company.manage",
	addCompanyName: "corporate_administration.company.manage",
	supersedeCompanyName: "corporate_administration.company.manage",
	retireCompanyName: "corporate_administration.company.manage",
	setCompanyJurisdictionProfile: "corporate_administration.company.manage",
	supersedeCompanyJurisdictionProfile:
		"corporate_administration.company.manage",
	setCompanyLegalForm: "corporate_administration.company.manage",
	supersedeCompanyLegalForm: "corporate_administration.company.manage",
	registerCompanyIdentifier: "corporate_administration.company.manage",
	supersedeCompanyIdentifier: "corporate_administration.company.manage",
	retireCompanyIdentifier: "corporate_administration.company.manage",
	setCompanyFinancialYear: "corporate_administration.company.manage",
	registerCompanyActivity: "corporate_administration.company.manage",
	endCompanyActivity: "corporate_administration.company.manage",
	activateLegalCompany: "corporate_administration.company.manage",
	suspendLegalCompany: "corporate_administration.company.manage",
	markCompanyStruckOff: "corporate_administration.company.manage",
	enterLiquidation: "corporate_administration.company.manage",
	dissolveLegalCompany: "corporate_administration.company.manage",
	restoreLegalCompany: "corporate_administration.company.manage",
	archiveLegalCompany: "corporate_administration.company.manage",
	registerLegalEstablishment: "corporate_administration.establishment.manage",
	updateLegalEstablishment: "corporate_administration.establishment.manage",
	activateLegalEstablishment: "corporate_administration.establishment.manage",
	suspendLegalEstablishment: "corporate_administration.establishment.manage",
	closeLegalEstablishment: "corporate_administration.establishment.manage",
	setRegisteredAddress: "corporate_administration.establishment.manage",
	registerPremise: "corporate_administration.establishment.manage",
	endPremise: "corporate_administration.establishment.manage",
} as const satisfies Readonly<
	Record<CorporateAdministrationCommandId, CorporateAdministrationPermission>
>;

export const CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS = {
	getLegalCompany: "corporate_administration.company.read",
	listLegalCompanies: "corporate_administration.company.read",
	listCompanyNames: "corporate_administration.company.read",
	findCompanyNameAsOf: "corporate_administration.company.read",
	findCompanyJurisdictionProfileAsOf: "corporate_administration.company.read",
	findCompanyLegalFormAsOf: "corporate_administration.company.read",
	listCompanyIdentifiers: "corporate_administration.company.read",
	findCompanyIdentifierAsOf: "corporate_administration.company.read",
	findCompanyFinancialYearAsOf: "corporate_administration.company.read",
	listCompanyActivitiesAsOf: "corporate_administration.company.read",
	findCompanyStatusAsOf: "corporate_administration.company.read",
	listCompaniesByStatus: "corporate_administration.company.read",
	getCompanyCompletenessForActivation: "corporate_administration.company.read",
	getLegalCompanyTimeline: "corporate_administration.company.read",
	getLegalEstablishment: "corporate_administration.company.read",
	listLegalEstablishmentsAsOf: "corporate_administration.company.read",
	findRegisteredAddressAsOf: "corporate_administration.company.read",
	listPremisesAsOf: "corporate_administration.company.read",
} as const satisfies Readonly<
	Record<CorporateAdministrationQueryId, CorporateAdministrationPermission>
>;

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

	return ok(undefined);
}

export async function requireCorporateAdministrationApprovalIfConfigured(
	dependencies: CorporateAdministrationApprovalVerificationDependencies,
	input: Readonly<{
		organizationId: OrganizationId;
		actorUserId: UserId;
		approvalRequestId?: ApprovalRequestId;
		approvalDecisionId?: ApprovalDecisionId;
		commandFingerprint: CommandFingerprint;
	}>,
): Promise<Result<void>> {
	if (dependencies.approvalDecisions === undefined) {
		return ok(undefined);
	}
	if (
		input.approvalRequestId === undefined ||
		input.approvalDecisionId === undefined
	) {
		return fail(
			"FORBIDDEN",
			"Corporate Administration approval is required",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_APPROVAL_REQUIRED",
				{ field: "approvalDecisionId" },
			),
		);
	}
	const decision = await dependencies.approvalDecisions.verify({
		organizationId: input.organizationId,
		approvalRequestId: input.approvalRequestId,
		approvalDecisionId: input.approvalDecisionId,
		commandFingerprint: input.commandFingerprint,
	});
	if (!decision.ok) return decision;
	if (
		decision.data === null ||
		decision.data.organizationId !== input.organizationId ||
		decision.data.approvalRequestId !== input.approvalRequestId ||
		decision.data.approvalDecisionId !== input.approvalDecisionId ||
		decision.data.commandFingerprint !== input.commandFingerprint ||
		!decision.data.approved
	) {
		return fail(
			"FORBIDDEN",
			"Corporate Administration approval decision is invalid",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_APPROVAL_INVALID",
				{ field: "approvalDecisionId" },
			),
		);
	}
	if (decision.data.approverUserId === input.actorUserId) {
		return fail(
			"FORBIDDEN",
			"Corporate Administration requester cannot approve their own change",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_SEGREGATION_OF_DUTIES",
				{ field: "approvalDecisionId" },
			),
		);
	}
	return ok(undefined);
}

function forbidden(
	permission: CorporateAdministrationPermission,
): Result<void> {
	return fail(
		"FORBIDDEN",
		"Corporate Administration permission is required",
		corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_FORBIDDEN", {
			permission,
		}),
	);
}
