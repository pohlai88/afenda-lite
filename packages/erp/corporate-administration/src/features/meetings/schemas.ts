import { z } from "zod";

function isNullish(value: unknown): value is null | undefined {
	return value === null || value === undefined;
}

import {
	governanceBodyIdSchema,
	governanceMeetingIdSchema,
	governanceMembershipIdSchema,
	legalCompanyIdSchema,
	meetingNoticeIdSchema,
	meetingParticipantIdSchema,
	meetingQuorumResultIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "../../kernel/brands";
import { canonicalDateSchema } from "../../kernel/dates";
import { opaqueCursorSchema } from "../../kernel/pagination";

const sourceDocumentIdSchema = z.string().trim().min(1).max(128);
const referenceSchema = z.string().trim().min(1).max(128);
const descriptionSchema = z.string().trim().min(1).max(512);
const nonNegativeIntegerSchema = z.number().int().min(0);
const positiveIntegerSchema = z.number().int().positive();

export const governanceMeetingProcedureTypeSchema = z.enum([
	"physical",
	"virtual",
	"hybrid",
	"written_resolution",
]);
export const governanceMeetingStatusSchema = z.enum([
	"scheduled",
	"open",
	"adjourned",
	"closed",
	"cancelled",
]);
export const meetingNoticeStatusSchema = z.enum([
	"issued",
	"delivered",
	"waived",
]);
export const meetingParticipantAttendanceStatusSchema = z.enum([
	"present",
	"absent",
	"represented",
	"recused",
]);

export const quorumRuleSnapshotSchema = z
	.object({
		ruleCode: referenceSchema,
		asOfDate: canonicalDateSchema,
		eligibleMemberCount: nonNegativeIntegerSchema,
		requiredPresentCount: positiveIntegerSchema,
		eligibleVotingOnly: z.boolean(),
	})
	.strict()
	.readonly();

export const governanceMeetingSchema = z
	.object({
		id: governanceMeetingIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		governanceBodyId: governanceBodyIdSchema,
		procedureType: governanceMeetingProcedureTypeSchema,
		status: governanceMeetingStatusSchema,
		title: descriptionSchema,
		scheduledStartAt: z.coerce.date(),
		scheduledEndAt: z.coerce.date().nullable(),
		noticePeriodDays: nonNegativeIntegerSchema,
		locationSummary: descriptionSchema.nullable(),
		remoteAccessSummary: descriptionSchema.nullable(),
		sourceDocumentId: sourceDocumentIdSchema,
		openedAt: z.coerce.date().nullable(),
		adjournedAt: z.coerce.date().nullable(),
		adjournedTo: z.coerce.date().nullable(),
		closedAt: z.coerce.date().nullable(),
		noQuorumReason: descriptionSchema.nullable(),
		recordedAt: z.coerce.date(),
		recordedBy: userIdSchema,
		version: positiveIntegerSchema,
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
	})
	.strict()
	.refine(
		(value) =>
			isNullish(value.scheduledEndAt) ||
			value.scheduledStartAt < value.scheduledEndAt,
		{
			path: ["scheduledEndAt"],
			message: "scheduledEndAt must follow scheduledStartAt",
		},
	)
	.refine(
		(value) =>
			value.procedureType !== "physical" || value.locationSummary !== null,
		{
			path: ["locationSummary"],
			message: "physical meetings require a location summary",
		},
	)
	.refine(
		(value) =>
			(value.procedureType !== "virtual" && value.procedureType !== "hybrid") ||
			value.remoteAccessSummary !== null,
		{
			path: ["remoteAccessSummary"],
			message: "virtual and hybrid meetings require remote access summary",
		},
	)
	.readonly();

export const governanceMeetingListPageSchema = z
	.object({
		items: z.array(governanceMeetingSchema).readonly(),
		nextCursor: opaqueCursorSchema.nullable(),
	})
	.readonly();

export const meetingNoticeSchema = z
	.object({
		id: meetingNoticeIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		governanceMeetingId: governanceMeetingIdSchema,
		recipientMembershipId: governanceMembershipIdSchema.nullable(),
		recipientPartyId: referenceSchema.nullable(),
		status: meetingNoticeStatusSchema,
		issuedAt: z.coerce.date(),
		deliveredAt: z.coerce.date().nullable(),
		waivedAt: z.coerce.date().nullable(),
		deliveryMethod: referenceSchema,
		waiverReason: descriptionSchema.nullable(),
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
			!(
				isNullish(value.recipientMembershipId) &&
				isNullish(value.recipientPartyId)
			),
		{
			path: ["recipientPartyId"],
			message: "recipient membership or party is required",
		},
	)
	.refine(
		(value) =>
			value.status !== "delivered" ||
			(value.deliveredAt !== null && value.waivedAt === null),
		{
			path: ["deliveredAt"],
			message: "delivered notices require deliveredAt only",
		},
	)
	.refine(
		(value) =>
			value.status !== "waived" ||
			(value.waivedAt !== null && value.waiverReason !== null),
		{
			path: ["waivedAt"],
			message: "waived notices require waiver evidence",
		},
	)
	.readonly();

export const meetingParticipantSchema = z
	.object({
		id: meetingParticipantIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		governanceMeetingId: governanceMeetingIdSchema,
		governanceMembershipId: governanceMembershipIdSchema,
		participantPartyId: referenceSchema.nullable(),
		attendanceStatus: meetingParticipantAttendanceStatusSchema,
		representedByPartyId: referenceSchema.nullable(),
		proxyDocumentId: sourceDocumentIdSchema.nullable(),
		recusalReason: descriptionSchema.nullable(),
		recordedAt: z.coerce.date(),
		recordedBy: userIdSchema,
		version: positiveIntegerSchema,
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
	})
	.strict()
	.refine(
		(value) =>
			value.attendanceStatus !== "represented" ||
			(value.representedByPartyId !== null && value.proxyDocumentId !== null),
		{
			path: ["representedByPartyId"],
			message: "represented attendance requires proxy evidence",
		},
	)
	.refine(
		(value) =>
			value.attendanceStatus !== "recused" || value.recusalReason !== null,
		{
			path: ["recusalReason"],
			message: "recused attendance requires a reason",
		},
	)
	.readonly();

export const meetingQuorumResultSchema = z
	.object({
		id: meetingQuorumResultIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		governanceMeetingId: governanceMeetingIdSchema,
		ruleSnapshot: quorumRuleSnapshotSchema,
		eligibleMemberCount: nonNegativeIntegerSchema,
		presentMemberCount: nonNegativeIntegerSchema,
		requiredPresentCount: positiveIntegerSchema,
		hasQuorum: z.boolean(),
		noQuorumReason: descriptionSchema.nullable(),
		sourceDocumentId: sourceDocumentIdSchema,
		recordedAt: z.coerce.date(),
		recordedBy: userIdSchema,
		version: positiveIntegerSchema,
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
	})
	.strict()
	.refine((value) => value.hasQuorum || value.noQuorumReason !== null, {
		path: ["noQuorumReason"],
		message: "no-quorum result requires a reason",
	})
	.refine(
		(value) =>
			value.hasQuorum ===
			value.presentMemberCount >= value.requiredPresentCount,
		{
			path: ["hasQuorum"],
			message: "hasQuorum must match present and required counts",
		},
	)
	.readonly();

export const scheduleGovernanceMeetingInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		governanceBodyId: governanceBodyIdSchema,
		procedureType: governanceMeetingProcedureTypeSchema,
		title: descriptionSchema,
		scheduledStartAt: z.coerce.date(),
		scheduledEndAt: z.coerce.date().nullable().optional(),
		noticePeriodDays: nonNegativeIntegerSchema,
		locationSummary: descriptionSchema.nullable().optional(),
		remoteAccessSummary: descriptionSchema.nullable().optional(),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedBodyVersion: positiveIntegerSchema,
	})
	.strict()
	.refine(
		(value) =>
			isNullish(value.scheduledEndAt) ||
			value.scheduledStartAt < value.scheduledEndAt,
		{
			path: ["scheduledEndAt"],
			message: "scheduledEndAt must follow scheduledStartAt",
		},
	)
	.readonly();

export const issueMeetingNoticeInputSchema = z
	.object({
		governanceMeetingId: governanceMeetingIdSchema,
		recipientMembershipId: governanceMembershipIdSchema.nullable().optional(),
		recipientPartyId: referenceSchema.nullable().optional(),
		issuedAt: z.coerce.date(),
		deliveryMethod: referenceSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedMeetingVersion: positiveIntegerSchema,
	})
	.strict()
	.refine(
		(value) =>
			!(
				isNullish(value.recipientMembershipId) &&
				isNullish(value.recipientPartyId)
			),
		{
			path: ["recipientPartyId"],
			message: "recipient membership or party is required",
		},
	)
	.readonly();

export const recordNoticeDeliveryInputSchema = z
	.object({
		meetingNoticeId: meetingNoticeIdSchema,
		deliveredAt: z.coerce.date(),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: positiveIntegerSchema,
	})
	.strict()
	.readonly();

export const waiveNoticeInputSchema = z
	.object({
		meetingNoticeId: meetingNoticeIdSchema,
		waivedAt: z.coerce.date(),
		waiverReason: descriptionSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: positiveIntegerSchema,
	})
	.strict()
	.readonly();

export const recordMeetingParticipantInputSchema = z
	.object({
		governanceMeetingId: governanceMeetingIdSchema,
		governanceMembershipId: governanceMembershipIdSchema,
		participantPartyId: referenceSchema.nullable().optional(),
		attendanceStatus: meetingParticipantAttendanceStatusSchema,
		representedByPartyId: referenceSchema.nullable().optional(),
		proxyDocumentId: sourceDocumentIdSchema.nullable().optional(),
		recusalReason: descriptionSchema.nullable().optional(),
		expectedMeetingVersion: positiveIntegerSchema,
	})
	.strict()
	.readonly();

export const openMeetingInputSchema = z
	.object({
		governanceMeetingId: governanceMeetingIdSchema,
		openedAt: z.coerce.date(),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: positiveIntegerSchema,
	})
	.strict()
	.readonly();

export const recordQuorumInputSchema = z
	.object({
		governanceMeetingId: governanceMeetingIdSchema,
		ruleCode: referenceSchema,
		requiredPresentCount: positiveIntegerSchema,
		eligibleVotingOnly: z.boolean(),
		noQuorumReason: descriptionSchema.nullable().optional(),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedMeetingVersion: positiveIntegerSchema,
	})
	.strict()
	.readonly();

export const adjournMeetingInputSchema = z
	.object({
		governanceMeetingId: governanceMeetingIdSchema,
		adjournedAt: z.coerce.date(),
		adjournedTo: z.coerce.date(),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: positiveIntegerSchema,
	})
	.strict()
	.refine((value) => value.adjournedAt < value.adjournedTo, {
		path: ["adjournedTo"],
		message: "adjournedTo must follow adjournedAt",
	})
	.readonly();

export const closeMeetingInputSchema = z
	.object({
		governanceMeetingId: governanceMeetingIdSchema,
		closedAt: z.coerce.date(),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: positiveIntegerSchema,
	})
	.strict()
	.readonly();

export const getGovernanceMeetingInputSchema = z
	.object({ governanceMeetingId: governanceMeetingIdSchema })
	.strict()
	.readonly();

export const listGovernanceMeetingsInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		governanceBodyId: governanceBodyIdSchema.optional(),
		status: governanceMeetingStatusSchema.optional(),
		cursor: opaqueCursorSchema.optional(),
		pageSize: z.number().int().min(1).max(100).optional(),
	})
	.strict()
	.readonly();

export const getMeetingAttendanceInputSchema = z
	.object({ governanceMeetingId: governanceMeetingIdSchema })
	.strict()
	.readonly();

export const getMeetingQuorumStatusInputSchema = z
	.object({ governanceMeetingId: governanceMeetingIdSchema })
	.strict()
	.readonly();
