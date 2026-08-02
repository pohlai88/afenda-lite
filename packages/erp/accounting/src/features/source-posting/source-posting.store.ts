import type { Result } from "@afenda/errors";

import type {
	NormalBalance,
	PostingException,
	PostingExceptionStatus,
	PostingProfile,
	SourcePostingLink,
	SourcePostingTrace,
} from "../../kernel/contracts/domain";

export interface AccountingSourcePostingStore {
	createPostingException: (record: {
		organizationId: string;
		sourceModule: string;
		sourceAggregateId: string;
		sourceEventId: string;
		sourceEventVersion: number;
		postingRuleCode: string | null;
		reasonCode: string;
		message: string;
		payload: unknown;
		actorUserId: string;
	}) => Promise<Result<PostingException>>;
	createSourcePostingLink: (record: {
		organizationId: string;
		sourceModule: string;
		sourceAggregateId: string;
		sourceEventId: string;
		sourceEventVersion: number;
		postingRuleId: string;
		postingRuleVersion: number;
		journalId: string;
		causationId: string | null;
		actorUserId: string;
	}) => Promise<Result<SourcePostingLink>>;
	findSourcePostingLink: (record: {
		organizationId: string;
		sourceModule: string;
		sourceAggregateId: string;
		sourceEventId: string;
		sourceEventVersion: number;
		postingRuleVersion: number;
	}) => Promise<Result<SourcePostingLink | null>>;
	getActivePostingProfile: (
		organizationId: string,
		code: string,
	) => Promise<Result<PostingProfile | null>>;
	getSourcePostingTrace: (filter: {
		organizationId: string;
		journalId?: string | undefined;
		sourceModule?: string | undefined;
		sourceAggregateId?: string | undefined;
		sourceEventId?: string | undefined;
	}) => Promise<Result<SourcePostingTrace[]>>;
	listPostingExceptions: (filter: {
		organizationId: string;
		status?: PostingExceptionStatus | undefined;
	}) => Promise<Result<PostingException[]>>;
	resolvePostingException: (record: {
		organizationId: string;
		id: string;
		resolutionNote: string;
		expectedVersion: number;
		actorUserId: string;
	}) => Promise<Result<PostingException>>;
	upsertPostingProfile: (record: {
		organizationId: string;
		code: string;
		eventType: string;
		versionNumber: number;
		lines: Array<{ lineNo: number; side: NormalBalance; accountRole: string }>;
		actorUserId: string;
	}) => Promise<Result<PostingProfile>>;
}
