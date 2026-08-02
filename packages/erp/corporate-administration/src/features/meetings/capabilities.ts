import type { MeetingStore } from "./store";

export type MeetingResolutionReferencePort = Pick<
	MeetingStore,
	"getGovernanceMeeting"
>;
