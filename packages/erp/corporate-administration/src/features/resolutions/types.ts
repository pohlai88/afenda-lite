import type { z } from "zod";

import type {
	adoptResolutionInputSchema,
	assignResolutionActionInputSchema,
	completeResolutionActionInputSchema,
	getResolutionExecutionStatusInputSchema,
	getResolutionInputSchema,
	listOverdueResolutionActionsInputSchema,
	listResolutionsAsOfInputSchema,
	meetingVoteSchema,
	recordMeetingVoteInputSchema,
	recordMinutesDocumentInputSchema,
	recordWrittenResolutionInputSchema,
	rejectResolutionInputSchema,
	resolutionActionSchema,
	resolutionActionStatusSchema,
	resolutionApprovalBasisSchema,
	resolutionSchema,
	resolutionStatusSchema,
	supersedeResolutionInputSchema,
	voteOutcomeSchema,
	voteThresholdTypeSchema,
} from "./schemas";

export type MeetingVote = z.infer<typeof meetingVoteSchema>;
export type Resolution = z.infer<typeof resolutionSchema>;
export type ResolutionAction = z.infer<typeof resolutionActionSchema>;
export type VoteThresholdType = z.infer<typeof voteThresholdTypeSchema>;
export type VoteOutcome = z.infer<typeof voteOutcomeSchema>;
export type ResolutionStatus = z.infer<typeof resolutionStatusSchema>;
export type ResolutionApprovalBasis = z.infer<
	typeof resolutionApprovalBasisSchema
>;
export type ResolutionActionStatus = z.infer<
	typeof resolutionActionStatusSchema
>;
export type RecordMeetingVoteInput = z.infer<
	typeof recordMeetingVoteInputSchema
>;
export type AdoptResolutionInput = z.infer<typeof adoptResolutionInputSchema>;
export type RejectResolutionInput = z.infer<typeof rejectResolutionInputSchema>;
export type RecordWrittenResolutionInput = z.infer<
	typeof recordWrittenResolutionInputSchema
>;
export type SupersedeResolutionInput = z.infer<
	typeof supersedeResolutionInputSchema
>;
export type AssignResolutionActionInput = z.infer<
	typeof assignResolutionActionInputSchema
>;
export type CompleteResolutionActionInput = z.infer<
	typeof completeResolutionActionInputSchema
>;
export type RecordMinutesDocumentInput = z.infer<
	typeof recordMinutesDocumentInputSchema
>;
export type GetResolutionInput = z.infer<typeof getResolutionInputSchema>;
export type ListResolutionsAsOfInput = z.infer<
	typeof listResolutionsAsOfInputSchema
>;
export type GetResolutionExecutionStatusInput = z.infer<
	typeof getResolutionExecutionStatusInputSchema
>;
export type ListOverdueResolutionActionsInput = z.infer<
	typeof listOverdueResolutionActionsInputSchema
>;
export type ResolutionExecutionStatus = Readonly<{
	resolutionId: string;
	status: ResolutionStatus;
	totalActions: number;
	completedActions: number;
	overdueActions: number;
	complete: boolean;
}>;
