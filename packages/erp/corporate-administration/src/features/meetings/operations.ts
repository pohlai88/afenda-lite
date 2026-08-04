import {
	defineCorporateAdministrationCommand as command,
	defineCorporateAdministrationQuery as query,
} from "../../kernel/operations/types";

const owner = "meetings" as const;
const read = "corporate_administration.meeting.read" as const;
const manage = "corporate_administration.meeting.manage" as const;

export const meetingOperationDefinitions = [
	command({
		id: "scheduleGovernanceMeeting",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.meeting.schedule",
		eventType: "corporate_administration.governance_meeting.scheduled.v1",
	}),
	command({
		id: "issueMeetingNotice",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.meeting.issue-notice",
		eventType: "corporate_administration.meeting_notice.issued.v1",
	}),
	command({
		id: "recordNoticeDelivery",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.meeting.record-notice-delivery",
		eventType: "corporate_administration.meeting_notice.delivered.v1",
	}),
	command({
		id: "waiveNotice",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.meeting.waive-notice",
		eventType: "corporate_administration.meeting_notice.waived.v1",
	}),
	command({
		id: "recordMeetingParticipant",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.meeting.record-participant",
		eventType: "corporate_administration.meeting_participant.recorded.v1",
	}),
	command({
		id: "openMeeting",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.meeting.open",
		eventType: "corporate_administration.governance_meeting.opened.v1",
	}),
	command({
		id: "recordQuorum",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.meeting.record-quorum",
		eventType: "corporate_administration.governance_meeting.quorum_recorded.v1",
	}),
	command({
		id: "adjournMeeting",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.meeting.adjourn",
		eventType: "corporate_administration.governance_meeting.adjourned.v1",
	}),
	command({
		id: "closeMeeting",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.meeting.close",
		eventType: "corporate_administration.governance_meeting.closed.v1",
	}),
	query({ id: "getGovernanceMeeting", owner, permission: read }),
	query({ id: "listGovernanceMeetings", owner, permission: read }),
	query({ id: "getMeetingAttendance", owner, permission: read }),
	query({ id: "getMeetingQuorumStatus", owner, permission: read }),
] as const;
