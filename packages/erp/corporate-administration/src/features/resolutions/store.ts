import type { Result } from "@afenda/errors";

import type {
	GovernanceMeetingId,
	LegalCompanyId,
	MeetingVoteId,
	OrganizationId,
	ResolutionActionId,
	ResolutionId,
	UserId,
} from "../../kernel/brands";
import type { CanonicalDate, CanonicalInstant } from "../../kernel/dates";
import type { CorporateAdministrationTransactionContext } from "../../kernel/execution/ports";
import type {
	MeetingVote,
	Resolution,
	ResolutionAction,
	ResolutionApprovalBasis,
	ResolutionStatus,
	VoteOutcome,
	VoteThresholdType,
} from "./types";

type TransactionalWrite = Readonly<{
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type RecordMeetingVoteStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		governanceMeetingId: GovernanceMeetingId;
		motionCode: string;
		eligibleVotes: number;
		votesFor: number;
		votesAgainst: number;
		abstentions: number;
		thresholdType: VoteThresholdType;
		requiredFor: number;
		outcome: VoteOutcome;
		outcomeBasis: string;
		sourceDocumentId: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedMeetingVersion: number;
	}>;

export type RecordResolutionStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		governanceMeetingId: GovernanceMeetingId | null;
		meetingVoteId: MeetingVoteId | null;
		approvalBasis: ResolutionApprovalBasis;
		status: ResolutionStatus;
		resolutionCode: string;
		title: string;
		textDigest: string;
		documentId: string;
		effectiveFrom: CanonicalDate;
		approvedAt: Date | null;
		rejectedAt: Date | null;
		sourceDocumentId: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
	}>;

export type SupersedeResolutionStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		resolutionId: ResolutionId;
		supersededByResolutionId: ResolutionId;
		sourceDocumentId: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedVersion: number;
	}>;

export type RecordMinutesDocumentStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		resolutionId: ResolutionId;
		minutesDocumentId: string;
		sourceDocumentId: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedVersion: number;
	}>;

export type AssignResolutionActionStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		resolutionId: ResolutionId;
		actionTypeCode: string;
		assigneePartyId: string;
		dueOn: CanonicalDate;
		sourceDocumentId: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedResolutionVersion: number;
	}>;

export type CompleteResolutionActionStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		resolutionActionId: ResolutionActionId;
		completedAt: Date;
		evidenceDocumentId: string;
		completionNotes: string | null;
		sourceDocumentId: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedVersion: number;
	}>;

export interface ResolutionStore {
	assignResolutionAction: (
		input: AssignResolutionActionStoreInput,
	) => Promise<Result<ResolutionAction>>;
	completeResolutionAction: (
		input: CompleteResolutionActionStoreInput,
	) => Promise<Result<ResolutionAction>>;
	getMeetingVote: (input: {
		organizationId: OrganizationId;
		meetingVoteId: MeetingVoteId;
	}) => Promise<Result<MeetingVote | null>>;
	getResolution: (input: {
		organizationId: OrganizationId;
		resolutionId: ResolutionId;
	}) => Promise<Result<Resolution | null>>;
	getResolutionAction: (input: {
		organizationId: OrganizationId;
		resolutionActionId: ResolutionActionId;
	}) => Promise<Result<ResolutionAction | null>>;
	listOverdueResolutionActions: (input: {
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		asOf: CanonicalDate;
	}) => Promise<Result<readonly ResolutionAction[]>>;
	listResolutionActions: (input: {
		organizationId: OrganizationId;
		resolutionId: ResolutionId;
	}) => Promise<Result<readonly ResolutionAction[]>>;
	listResolutionsAsOf: (input: {
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		asOf: CanonicalDate;
		status?: ResolutionStatus | undefined;
	}) => Promise<Result<readonly Resolution[]>>;
	recordMeetingVote: (
		input: RecordMeetingVoteStoreInput,
	) => Promise<Result<MeetingVote>>;
	recordMinutesDocument: (
		input: RecordMinutesDocumentStoreInput,
	) => Promise<Result<Resolution>>;
	recordResolution: (
		input: RecordResolutionStoreInput,
	) => Promise<Result<Resolution>>;
	supersedeResolution: (
		input: SupersedeResolutionStoreInput,
	) => Promise<Result<Resolution>>;
}
