import {
	defineCorporateAdministrationCommand as command,
	defineCorporateAdministrationQuery as query,
} from "../../kernel/operations/types";

const owner = "resolutions" as const;
const read = "corporate_administration.resolution.read" as const;
const manage = "corporate_administration.resolution.manage" as const;

export const resolutionOperationDefinitions = [
	command({
		id: "recordMeetingVote",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.resolution.record-meeting-vote",
		eventType: "corporate_administration.meeting_vote.recorded.v1",
	}),
	command({
		id: "adoptResolution",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.resolution.adopted",
		eventType: "corporate_administration.resolution.adopted.v1",
	}),
	command({
		id: "rejectResolution",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.resolution.rejected",
		eventType: "corporate_administration.resolution.rejected.v1",
	}),
	command({
		id: "recordWrittenResolution",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.resolution.record-written",
		eventType: "corporate_administration.resolution.adopted.v1",
	}),
	command({
		id: "supersedeResolution",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.resolution.supersede",
		eventType: "corporate_administration.resolution.superseded.v1",
	}),
	command({
		id: "assignResolutionAction",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.resolution.assign-action",
		eventType: "corporate_administration.resolution.action_assigned.v1",
	}),
	command({
		id: "completeResolutionAction",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.resolution.complete-action",
		eventType: "corporate_administration.resolution.action_completed.v1",
	}),
	command({
		id: "recordMinutesDocument",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.resolution.record-minutes",
		eventType: "corporate_administration.resolution.minutes_recorded.v1",
	}),
	query({ id: "getResolution", owner, permission: read }),
	query({ id: "listResolutionsAsOf", owner, permission: read }),
	query({ id: "getResolutionExecutionStatus", owner, permission: read }),
	query({ id: "listOverdueResolutionActions", owner, permission: read }),
] as const;
