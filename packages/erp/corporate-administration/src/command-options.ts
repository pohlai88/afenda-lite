import type { CorporateAdministrationAuthorizationContext } from "./authorization";
import type {
	ApprovalDecisionId,
	CausationId,
	CorrelationId,
	IdempotencyKey,
	OrganizationId,
	UserId,
} from "./kernel/brands";
import type { CursorPagination } from "./kernel/pagination";
import type { ClockPort } from "./ports";

export type CorporateAdministrationCommandOptions = {
	organizationId: OrganizationId;
	actorUserId: UserId;
	correlationId: CorrelationId;
	causationId?: CausationId;
	idempotencyKey: IdempotencyKey;
	requestInstant: Date;
	authorization: CorporateAdministrationAuthorizationContext;
	approvalDecisionId?: ApprovalDecisionId;
};

export type CorporateAdministrationQueryOptions = {
	organizationId: OrganizationId;
	actorUserId: UserId;
	correlationId: CorrelationId;
	authorization: CorporateAdministrationAuthorizationContext;
};

export type CorporateAdministrationPaginatedQueryOptions =
	CorporateAdministrationQueryOptions & {
		pagination: CursorPagination;
	};

export type CorporateAdministrationClockedQueryOptions =
	CorporateAdministrationQueryOptions & {
		clock: ClockPort;
	};
