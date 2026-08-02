import type { Result } from "@afenda/errors";

import type {
	GovernanceBodyId,
	GovernanceMeetingId,
	GovernanceMembershipId,
	LegalCompanyId,
	MeetingNoticeId,
	OrganizationId,
	UserId,
} from "../../kernel/brands";
import type { CanonicalInstant } from "../../kernel/dates";
import type { CorporateAdministrationTransactionContext } from "../../kernel/execution/ports";
import type { OpaqueCursor } from "../../kernel/pagination";
import type {
	GovernanceMeeting,
	GovernanceMeetingListPage,
	GovernanceMeetingProcedureType,
	GovernanceMeetingStatus,
	MeetingNotice,
	MeetingParticipant,
	MeetingParticipantAttendanceStatus,
	MeetingQuorumResult,
	QuorumRuleSnapshot,
} from "./types";

type TransactionalWrite = Readonly<{
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type ScheduleGovernanceMeetingStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		governanceBodyId: GovernanceBodyId;
		procedureType: GovernanceMeetingProcedureType;
		title: string;
		scheduledStartAt: Date;
		scheduledEndAt: Date | null;
		noticePeriodDays: number;
		locationSummary: string | null;
		remoteAccessSummary: string | null;
		sourceDocumentId: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedBodyVersion: number;
	}>;

export type IssueMeetingNoticeStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		governanceMeetingId: GovernanceMeetingId;
		recipientMembershipId: GovernanceMembershipId | null;
		recipientPartyId: string | null;
		issuedAt: Date;
		deliveryMethod: string;
		sourceDocumentId: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedMeetingVersion: number;
	}>;

export type RecordNoticeDeliveryStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		meetingNoticeId: MeetingNoticeId;
		deliveredAt: Date;
		sourceDocumentId: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedVersion: number;
	}>;

export type WaiveNoticeStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		meetingNoticeId: MeetingNoticeId;
		waivedAt: Date;
		waiverReason: string;
		sourceDocumentId: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedVersion: number;
	}>;

export type RecordMeetingParticipantStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		governanceMeetingId: GovernanceMeetingId;
		governanceMembershipId: GovernanceMembershipId;
		participantPartyId: string | null;
		attendanceStatus: MeetingParticipantAttendanceStatus;
		representedByPartyId: string | null;
		proxyDocumentId: string | null;
		recusalReason: string | null;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedMeetingVersion: number;
	}>;

export type ChangeMeetingStatusStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		governanceMeetingId: GovernanceMeetingId;
		status: GovernanceMeetingStatus;
		openedAt?: Date;
		adjournedAt?: Date;
		adjournedTo?: Date;
		closedAt?: Date;
		noQuorumReason?: string | null;
		sourceDocumentId: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedVersion: number;
	}>;

export type RecordQuorumStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		governanceMeetingId: GovernanceMeetingId;
		ruleSnapshot: QuorumRuleSnapshot;
		eligibleMemberCount: number;
		presentMemberCount: number;
		requiredPresentCount: number;
		hasQuorum: boolean;
		noQuorumReason: string | null;
		sourceDocumentId: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedMeetingVersion: number;
	}>;

export type GovernanceMeetingsQuery = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	governanceBodyId?: GovernanceBodyId | undefined;
	status?: GovernanceMeetingStatus | undefined;
	cursor?: OpaqueCursor | undefined;
	pageSize?: number | undefined;
}>;

export interface MeetingStore {
	changeMeetingStatus: (
		input: ChangeMeetingStatusStoreInput,
	) => Promise<Result<GovernanceMeeting>>;
	getGovernanceMeeting: (input: {
		organizationId: OrganizationId;
		governanceMeetingId: GovernanceMeetingId;
	}) => Promise<Result<GovernanceMeeting | null>>;
	getLatestQuorumResult: (input: {
		organizationId: OrganizationId;
		governanceMeetingId: GovernanceMeetingId;
	}) => Promise<Result<MeetingQuorumResult | null>>;
	getMeetingNotice: (input: {
		organizationId: OrganizationId;
		meetingNoticeId: MeetingNoticeId;
	}) => Promise<Result<MeetingNotice | null>>;
	issueMeetingNotice: (
		input: IssueMeetingNoticeStoreInput,
	) => Promise<Result<MeetingNotice>>;
	listGovernanceMeetings: (
		input: GovernanceMeetingsQuery,
	) => Promise<Result<GovernanceMeetingListPage>>;
	listMeetingNotices: (input: {
		organizationId: OrganizationId;
		governanceMeetingId: GovernanceMeetingId;
	}) => Promise<Result<readonly MeetingNotice[]>>;
	listMeetingParticipants: (input: {
		organizationId: OrganizationId;
		governanceMeetingId: GovernanceMeetingId;
	}) => Promise<Result<readonly MeetingParticipant[]>>;
	recordMeetingParticipant: (
		input: RecordMeetingParticipantStoreInput,
	) => Promise<Result<MeetingParticipant>>;
	recordNoticeDelivery: (
		input: RecordNoticeDeliveryStoreInput,
	) => Promise<Result<MeetingNotice>>;
	recordQuorum: (
		input: RecordQuorumStoreInput,
	) => Promise<Result<MeetingQuorumResult>>;
	scheduleGovernanceMeeting: (
		input: ScheduleGovernanceMeetingStoreInput,
	) => Promise<Result<GovernanceMeeting>>;
	waiveNotice: (input: WaiveNoticeStoreInput) => Promise<Result<MeetingNotice>>;
}
