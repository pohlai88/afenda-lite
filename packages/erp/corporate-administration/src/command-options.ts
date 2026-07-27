import type { CorporateAdministrationAuthorizationContext } from "./authorization";
import type {
	ApprovalDecisionId,
	ApprovalRequestId,
	CausationId,
	CorrelationId,
	IdempotencyKey,
	OrganizationId,
	UserId,
} from "./kernel/brands";
import type { CursorPagination } from "./kernel/pagination";

/**
 * Per-request caller facts (composed-service model).
 *
 * Runtime infrastructure — clock, transaction, idempotency — is captured once
 * in `CorporateAdministrationRuntimePorts` and must not appear here. Callers
 * pass request identity and authorization only; they never hand infrastructure
 * objects to individual operations.
 *
 * `authorization` is required on every production execution path. The lower-level
 * `requireCorporateAdministrationPermission` guard may still accept `undefined`
 * as a defensive utility and must fail closed — that escape hatch is not a
 * license to omit authorization from this context.
 */
export type CorporateAdministrationExecutionContext = Readonly<{
	organizationId: OrganizationId;
	actorUserId: UserId;
	correlationId: CorrelationId;
	authorization: CorporateAdministrationAuthorizationContext;
}>;

export type CorporateAdministrationCommandOptions =
	CorporateAdministrationExecutionContext &
		Readonly<{
			causationId?: CausationId;
			idempotencyKey: IdempotencyKey;
		}>;

export type CorporateAdministrationApprovalCommandOptions =
	CorporateAdministrationCommandOptions &
		Readonly<{
			approvalRequestId: ApprovalRequestId;
			approvalDecisionId: ApprovalDecisionId;
		}>;

export type CorporateAdministrationQueryOptions =
	CorporateAdministrationExecutionContext;

export type CorporateAdministrationPaginatedQueryOptions =
	CorporateAdministrationQueryOptions &
		Readonly<{ pagination: CursorPagination }>;
