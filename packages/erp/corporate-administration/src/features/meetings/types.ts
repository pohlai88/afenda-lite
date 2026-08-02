import type { z } from "zod";

import type {
	adjournMeetingInputSchema,
	closeMeetingInputSchema,
	getGovernanceMeetingInputSchema,
	getMeetingAttendanceInputSchema,
	getMeetingQuorumStatusInputSchema,
	governanceMeetingListPageSchema,
	governanceMeetingProcedureTypeSchema,
	governanceMeetingSchema,
	governanceMeetingStatusSchema,
	issueMeetingNoticeInputSchema,
	listGovernanceMeetingsInputSchema,
	meetingNoticeSchema,
	meetingNoticeStatusSchema,
	meetingParticipantAttendanceStatusSchema,
	meetingParticipantSchema,
	meetingQuorumResultSchema,
	openMeetingInputSchema,
	quorumRuleSnapshotSchema,
	recordMeetingParticipantInputSchema,
	recordNoticeDeliveryInputSchema,
	recordQuorumInputSchema,
	scheduleGovernanceMeetingInputSchema,
	waiveNoticeInputSchema,
} from "./schemas";

export type GovernanceMeeting = z.infer<typeof governanceMeetingSchema>;
export type GovernanceMeetingListPage = z.infer<
	typeof governanceMeetingListPageSchema
>;
export type MeetingNotice = z.infer<typeof meetingNoticeSchema>;
export type MeetingParticipant = z.infer<typeof meetingParticipantSchema>;
export type MeetingQuorumResult = z.infer<typeof meetingQuorumResultSchema>;
export type QuorumRuleSnapshot = z.infer<typeof quorumRuleSnapshotSchema>;

export type GovernanceMeetingProcedureType = z.infer<
	typeof governanceMeetingProcedureTypeSchema
>;
export type GovernanceMeetingStatus = z.infer<
	typeof governanceMeetingStatusSchema
>;
export type MeetingNoticeStatus = z.infer<typeof meetingNoticeStatusSchema>;
export type MeetingParticipantAttendanceStatus = z.infer<
	typeof meetingParticipantAttendanceStatusSchema
>;

export type ScheduleGovernanceMeetingInput = z.infer<
	typeof scheduleGovernanceMeetingInputSchema
>;
export type IssueMeetingNoticeInput = z.infer<
	typeof issueMeetingNoticeInputSchema
>;
export type RecordNoticeDeliveryInput = z.infer<
	typeof recordNoticeDeliveryInputSchema
>;
export type WaiveNoticeInput = z.infer<typeof waiveNoticeInputSchema>;
export type RecordMeetingParticipantInput = z.infer<
	typeof recordMeetingParticipantInputSchema
>;
export type OpenMeetingInput = z.infer<typeof openMeetingInputSchema>;
export type RecordQuorumInput = z.infer<typeof recordQuorumInputSchema>;
export type AdjournMeetingInput = z.infer<typeof adjournMeetingInputSchema>;
export type CloseMeetingInput = z.infer<typeof closeMeetingInputSchema>;
export type GetGovernanceMeetingInput = z.infer<
	typeof getGovernanceMeetingInputSchema
>;
export type ListGovernanceMeetingsInput = z.infer<
	typeof listGovernanceMeetingsInputSchema
>;
export type GetMeetingAttendanceInput = z.infer<
	typeof getMeetingAttendanceInputSchema
>;
export type GetMeetingQuorumStatusInput = z.infer<
	typeof getMeetingQuorumStatusInputSchema
>;
