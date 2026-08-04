import { z } from "zod";

import {
	governanceMeetingIdSchema,
	legalCompanyIdSchema,
	meetingVoteIdSchema,
	organizationIdSchema,
	resolutionActionIdSchema,
	resolutionIdSchema,
	userIdSchema,
} from "../../kernel/brands";
import {
	canonicalDateSchema,
	canonicalInstantSchema,
} from "../../kernel/dates";

const sourceDocumentIdSchema = z.string().trim().min(1).max(128);
const referenceSchema = z.string().trim().min(1).max(128);
const codeSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(/^[A-Z0-9][A-Z0-9._-]*$/);
const textSchema = z.string().trim().min(1).max(512);
const digestSchema = z
	.string()
	.trim()
	.regex(/^[0-9a-f]{64}$/);
const nonNegativeIntegerSchema = z.number().int().min(0);
const positiveIntegerSchema = z.number().int().positive();

export const voteThresholdTypeSchema = z.enum([
	"simple_majority",
	"supermajority",
	"unanimous",
	"custom",
]);
export const voteOutcomeSchema = z.enum(["adopted", "rejected"]);
export const resolutionStatusSchema = z.enum([
	"adopted",
	"rejected",
	"superseded",
]);
export const resolutionApprovalBasisSchema = z.enum([
	"meeting_vote",
	"written_resolution",
]);
export const resolutionActionStatusSchema = z.enum([
	"assigned",
	"completed",
	"cancelled",
]);

export const meetingVoteSchema = z
	.object({
		id: meetingVoteIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		governanceMeetingId: governanceMeetingIdSchema,
		motionCode: codeSchema,
		eligibleVotes: positiveIntegerSchema,
		votesFor: nonNegativeIntegerSchema,
		votesAgainst: nonNegativeIntegerSchema,
		abstentions: nonNegativeIntegerSchema,
		thresholdType: voteThresholdTypeSchema,
		requiredFor: positiveIntegerSchema,
		outcome: voteOutcomeSchema,
		outcomeBasis: textSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		recordedAt: z.coerce.date(),
		recordedBy: userIdSchema,
		version: positiveIntegerSchema,
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
	})
	.strict()
	.refine(
		(value) =>
			value.votesFor + value.votesAgainst + value.abstentions <=
			value.eligibleVotes,
		{ path: ["votesFor"], message: "votes cast cannot exceed eligible votes" },
	)
	.refine((value) => value.requiredFor <= value.eligibleVotes, {
		path: ["requiredFor"],
		message: "required votes cannot exceed eligible votes",
	})
	.readonly();

export const resolutionSchema = z
	.object({
		id: resolutionIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		governanceMeetingId: governanceMeetingIdSchema.nullable(),
		meetingVoteId: meetingVoteIdSchema.nullable(),
		approvalBasis: resolutionApprovalBasisSchema,
		status: resolutionStatusSchema,
		resolutionCode: codeSchema,
		title: textSchema,
		textDigest: digestSchema,
		documentId: referenceSchema,
		effectiveFrom: canonicalDateSchema,
		approvedAt: z.coerce.date().nullable(),
		rejectedAt: z.coerce.date().nullable(),
		supersededAt: z.coerce.date().nullable(),
		supersededByResolutionId: resolutionIdSchema.nullable(),
		minutesDocumentId: referenceSchema.nullable(),
		sourceDocumentId: sourceDocumentIdSchema,
		recordedAt: z.coerce.date(),
		recordedBy: userIdSchema,
		version: positiveIntegerSchema,
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
	})
	.strict()
	.refine(
		(value) =>
			value.status !== "adopted" ||
			(value.approvedAt !== null && value.rejectedAt === null),
		{
			path: ["approvedAt"],
			message: "adopted resolutions require approval time",
		},
	)
	.refine(
		(value) =>
			value.status !== "rejected" ||
			(value.rejectedAt !== null && value.approvedAt === null),
		{
			path: ["rejectedAt"],
			message: "rejected resolutions require rejection time",
		},
	)
	.readonly();

export const resolutionActionSchema = z
	.object({
		id: resolutionActionIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		resolutionId: resolutionIdSchema,
		actionTypeCode: codeSchema,
		assigneePartyId: referenceSchema,
		status: resolutionActionStatusSchema,
		dueOn: canonicalDateSchema,
		completedAt: z.coerce.date().nullable(),
		evidenceDocumentId: sourceDocumentIdSchema.nullable(),
		completionNotes: textSchema.nullable(),
		sourceDocumentId: sourceDocumentIdSchema,
		recordedAt: z.coerce.date(),
		recordedBy: userIdSchema,
		version: positiveIntegerSchema,
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
	})
	.strict()
	.refine(
		(value) =>
			value.status !== "completed" ||
			(value.completedAt !== null && value.evidenceDocumentId !== null),
		{
			path: ["evidenceDocumentId"],
			message: "completed actions require completion evidence",
		},
	)
	.readonly();

export const recordMeetingVoteInputSchema = z
	.object({
		governanceMeetingId: governanceMeetingIdSchema,
		motionCode: codeSchema,
		eligibleVotes: positiveIntegerSchema,
		votesFor: nonNegativeIntegerSchema,
		votesAgainst: nonNegativeIntegerSchema,
		abstentions: nonNegativeIntegerSchema,
		thresholdType: voteThresholdTypeSchema,
		requiredFor: positiveIntegerSchema.optional(),
		outcomeBasis: textSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedMeetingVersion: positiveIntegerSchema,
	})
	.strict()
	.readonly();

export const adoptResolutionInputSchema = z
	.object({
		meetingVoteId: meetingVoteIdSchema,
		resolutionCode: codeSchema,
		title: textSchema,
		textDigest: digestSchema,
		documentId: referenceSchema,
		effectiveFrom: canonicalDateSchema,
		approvedAt: z.coerce.date(),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVoteVersion: positiveIntegerSchema,
	})
	.strict()
	.readonly();

export const rejectResolutionInputSchema = z
	.object({
		meetingVoteId: meetingVoteIdSchema,
		resolutionCode: codeSchema,
		title: textSchema,
		textDigest: digestSchema,
		documentId: referenceSchema,
		effectiveFrom: canonicalDateSchema,
		rejectedAt: z.coerce.date(),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVoteVersion: positiveIntegerSchema,
	})
	.strict()
	.readonly();

export const recordWrittenResolutionInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		resolutionCode: codeSchema,
		title: textSchema,
		textDigest: digestSchema,
		documentId: referenceSchema,
		effectiveFrom: canonicalDateSchema,
		approvedAt: canonicalInstantSchema,
		eligibleVotes: positiveIntegerSchema,
		votesFor: positiveIntegerSchema,
		thresholdType: voteThresholdTypeSchema,
		requiredFor: positiveIntegerSchema.optional(),
		sourceDocumentId: sourceDocumentIdSchema,
	})
	.strict()
	.readonly();

export const supersedeResolutionInputSchema = z
	.object({
		resolutionId: resolutionIdSchema,
		supersededByResolutionId: resolutionIdSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: positiveIntegerSchema,
	})
	.strict()
	.refine((value) => value.resolutionId !== value.supersededByResolutionId, {
		path: ["supersededByResolutionId"],
		message: "resolution cannot supersede itself",
	})
	.readonly();

export const assignResolutionActionInputSchema = z
	.object({
		resolutionId: resolutionIdSchema,
		actionTypeCode: codeSchema,
		assigneePartyId: referenceSchema,
		dueOn: canonicalDateSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedResolutionVersion: positiveIntegerSchema,
	})
	.strict()
	.readonly();

export const completeResolutionActionInputSchema = z
	.object({
		resolutionActionId: resolutionActionIdSchema,
		completedAt: z.coerce.date(),
		evidenceDocumentId: sourceDocumentIdSchema,
		completionNotes: textSchema.nullable().optional(),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: positiveIntegerSchema,
	})
	.strict()
	.readonly();

export const recordMinutesDocumentInputSchema = z
	.object({
		resolutionId: resolutionIdSchema,
		minutesDocumentId: referenceSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: positiveIntegerSchema,
	})
	.strict()
	.readonly();

export const getResolutionInputSchema = z
	.object({ resolutionId: resolutionIdSchema })
	.strict()
	.readonly();

export const listResolutionsAsOfInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		asOf: canonicalDateSchema,
		status: resolutionStatusSchema.optional(),
	})
	.strict()
	.readonly();

export const getResolutionExecutionStatusInputSchema = z
	.object({ resolutionId: resolutionIdSchema })
	.strict()
	.readonly();

export const listOverdueResolutionActionsInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		asOf: canonicalDateSchema,
	})
	.strict()
	.readonly();
