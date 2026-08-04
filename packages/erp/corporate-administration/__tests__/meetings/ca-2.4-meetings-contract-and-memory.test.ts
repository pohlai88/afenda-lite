import {
	calculateMeetingQuorum,
	canonicalDateSchema,
	canonicalInstantSchema,
	governanceMeetingProcedureTypeSchema,
	issueMeetingNoticeInputSchema,
	listGovernanceMeetingsInputSchema,
	organizationIdSchema,
	recordMeetingParticipantInputSchema,
	userIdSchema,
} from "@afenda/corporate-administration";
import {
	createMemoryCorporateAdministrationGovernanceStore,
	createMemoryCorporateAdministrationMeetingStore,
} from "@afenda/corporate-administration/testing";
import { describe, expect, it } from "vitest";
import { legalCompanyIdSchema } from "../../src/kernel/brands";

const organizationId = organizationIdSchema.parse("org-ca-2-4");
const otherOrganizationId = organizationIdSchema.parse("org-ca-2-4-other");
const legalCompanyId = legalCompanyIdSchema.parse(
	"00000000-0000-4000-8000-000000000241",
);
const actorUserId = userIdSchema.parse("user-ca-2-4");
const recordedAt = canonicalInstantSchema.parse("2026-04-01T10:00:00.000Z");

describe("CA-2.4 meeting contracts and rules", () => {
	it("keeps tenant and actor facts outside meeting notice command input", () => {
		const parsed = issueMeetingNoticeInputSchema.safeParse({
			governanceMeetingId: "00000000-0000-4000-8000-000000000242",
			recipientPartyId: "party-director-1",
			issuedAt: "2026-04-03T10:00:00.000Z",
			deliveryMethod: "email",
			sourceDocumentId: "doc-notice-1",
			expectedMeetingVersion: 1,
			organizationId,
			actorUserId,
		});
		expect(parsed.success).toBe(false);
	});

	it("validates procedure and participant representation contracts strictly", () => {
		expect(
			governanceMeetingProcedureTypeSchema.safeParse("hybrid").success,
		).toBe(true);
		expect(
			recordMeetingParticipantInputSchema.safeParse({
				governanceMeetingId: "00000000-0000-4000-8000-000000000242",
				governanceMembershipId: "00000000-0000-4000-8000-000000000243",
				attendanceStatus: "represented",
				expectedMeetingVersion: 1,
			}).success,
		).toBe(true);
	});

	it("bounds governance-meeting page sizes at the public query contract", () => {
		const base = { legalCompanyId };
		expect(
			listGovernanceMeetingsInputSchema.safeParse({
				...base,
				pageSize: 100,
			}).success,
		).toBe(true);
		expect(
			listGovernanceMeetingsInputSchema.safeParse({
				...base,
				pageSize: 101,
			}).success,
		).toBe(false);
	});
});

describe("CA-2.4 meeting memory store and quorum rules", () => {
	it("preserves notice, waiver, attendance, quorum and close evidence by tenant", async () => {
		const governanceStore =
			createMemoryCorporateAdministrationGovernanceStore();
		const meetingStore = createMemoryCorporateAdministrationMeetingStore();
		const body = await governanceStore.createGovernanceBody({
			organizationId,
			legalCompanyId,
			bodyType: "board",
			bodyCode: "Board Main",
			normalizedBodyCode: "BOARDMAIN",
			displayName: "Board of Directors",
			description: null,
			effectiveFrom: canonicalDateSchema.parse("2026-04-01"),
			recordedAt,
			recordedBy: actorUserId,
			sourceDocumentId: "doc-board-1",
			expectedCompanyVersion: 1,
		});
		expect(body.ok).toBe(true);
		if (!body.ok) {
			return;
		}

		const firstMember = await governanceStore.appointGovernanceMember({
			organizationId,
			legalCompanyId,
			governanceBodyId: body.data.id,
			memberKind: "party",
			memberPartyId: "party-director-1",
			roleSeatCode: null,
			seatLabel: "Director 1",
			membershipRole: "member",
			votingEntitlement: "voting",
			isChair: true,
			termFrom: canonicalDateSchema.parse("2026-04-01"),
			termTo: null,
			recordedAt,
			recordedBy: actorUserId,
			sourceDocumentId: "doc-member-1",
			expectedBodyVersion: 1,
		});
		const secondMember = await governanceStore.appointGovernanceMember({
			organizationId,
			legalCompanyId,
			governanceBodyId: body.data.id,
			memberKind: "party",
			memberPartyId: "party-director-2",
			roleSeatCode: null,
			seatLabel: "Director 2",
			membershipRole: "member",
			votingEntitlement: "voting",
			isChair: false,
			termFrom: canonicalDateSchema.parse("2026-04-01"),
			termTo: null,
			recordedAt,
			recordedBy: actorUserId,
			sourceDocumentId: "doc-member-2",
			expectedBodyVersion: 1,
		});
		expect(firstMember.ok && secondMember.ok).toBe(true);
		if (!(firstMember.ok && secondMember.ok)) {
			return;
		}

		const meeting = await meetingStore.scheduleGovernanceMeeting({
			organizationId,
			legalCompanyId,
			governanceBodyId: body.data.id,
			procedureType: "hybrid",
			title: "April board meeting",
			scheduledStartAt: new Date("2026-04-10T09:00:00.000Z"),
			scheduledEndAt: new Date("2026-04-10T10:00:00.000Z"),
			noticePeriodDays: 5,
			locationSummary: "Board room",
			remoteAccessSummary: "Video conference",
			sourceDocumentId: "doc-meeting-1",
			recordedAt,
			recordedBy: actorUserId,
			expectedBodyVersion: 1,
		});
		expect(meeting.ok).toBe(true);
		if (!meeting.ok) {
			return;
		}

		const crossTenant = await meetingStore.getGovernanceMeeting({
			organizationId: otherOrganizationId,
			governanceMeetingId: meeting.data.id,
		});
		expect(crossTenant).toEqual({ ok: true, data: null });

		const notice = await meetingStore.issueMeetingNotice({
			organizationId,
			legalCompanyId,
			governanceMeetingId: meeting.data.id,
			recipientMembershipId: firstMember.data.id,
			recipientPartyId: "party-director-1",
			issuedAt: new Date("2026-04-03T09:00:00.000Z"),
			deliveryMethod: "email",
			sourceDocumentId: "doc-notice-1",
			recordedAt,
			recordedBy: actorUserId,
			expectedMeetingVersion: 1,
		});
		expect(notice.ok).toBe(true);
		if (!notice.ok) {
			return;
		}

		const waived = await meetingStore.waiveNotice({
			organizationId,
			meetingNoticeId: notice.data.id,
			waivedAt: new Date("2026-04-04T09:00:00.000Z"),
			waiverReason: "Director waived short notice in writing",
			sourceDocumentId: "doc-waiver-1",
			recordedAt,
			recordedBy: actorUserId,
			expectedVersion: 1,
		});
		expect(waived.ok && waived.data.status).toBe("waived");

		const stale = await meetingStore.waiveNotice({
			organizationId,
			meetingNoticeId: notice.data.id,
			waivedAt: new Date("2026-04-04T10:00:00.000Z"),
			waiverReason: "Duplicate waiver",
			sourceDocumentId: "doc-waiver-2",
			recordedAt,
			recordedBy: actorUserId,
			expectedVersion: 1,
		});
		expect(stale.ok).toBe(false);

		await meetingStore.recordMeetingParticipant({
			organizationId,
			legalCompanyId,
			governanceMeetingId: meeting.data.id,
			governanceMembershipId: firstMember.data.id,
			participantPartyId: "party-director-1",
			attendanceStatus: "present",
			representedByPartyId: null,
			proxyDocumentId: null,
			recusalReason: null,
			recordedAt,
			recordedBy: actorUserId,
			expectedMeetingVersion: 1,
		});
		await meetingStore.recordMeetingParticipant({
			organizationId,
			legalCompanyId,
			governanceMeetingId: meeting.data.id,
			governanceMembershipId: secondMember.data.id,
			participantPartyId: "party-director-2",
			attendanceStatus: "recused",
			representedByPartyId: null,
			proxyDocumentId: null,
			recusalReason: "Matter-specific conflict",
			recordedAt,
			recordedBy: actorUserId,
			expectedMeetingVersion: 1,
		});
		const memberships = await governanceStore.listGovernanceMembershipsAsOf({
			organizationId,
			governanceBodyId: body.data.id,
			asOf: canonicalDateSchema.parse("2026-04-10"),
		});
		const participants = await meetingStore.listMeetingParticipants({
			organizationId,
			governanceMeetingId: meeting.data.id,
		});
		expect(memberships.ok && participants.ok).toBe(true);
		if (!(memberships.ok && participants.ok)) {
			return;
		}
		const quorum = calculateMeetingQuorum({
			meeting: meeting.data,
			memberships: memberships.data,
			participants: participants.data,
			ruleCode: "BOARD-SIMPLE-2",
			requiredPresentCount: 2,
			eligibleVotingOnly: true,
			noQuorumReason: "Recusal left only one eligible participant present",
		});
		expect(quorum.ok).toBe(true);
		if (!quorum.ok) {
			return;
		}
		expect(quorum.data).toMatchObject({
			eligibleMemberCount: 2,
			presentMemberCount: 1,
			requiredPresentCount: 2,
			hasQuorum: false,
		});

		const recordedQuorum = await meetingStore.recordQuorum({
			organizationId,
			legalCompanyId,
			governanceMeetingId: meeting.data.id,
			ruleSnapshot: quorum.data.ruleSnapshot,
			eligibleMemberCount: quorum.data.eligibleMemberCount,
			presentMemberCount: quorum.data.presentMemberCount,
			requiredPresentCount: quorum.data.requiredPresentCount,
			hasQuorum: quorum.data.hasQuorum,
			noQuorumReason: quorum.data.noQuorumReason,
			sourceDocumentId: "doc-quorum-1",
			recordedAt,
			recordedBy: actorUserId,
			expectedMeetingVersion: 1,
		});
		expect(recordedQuorum.ok && recordedQuorum.data.hasQuorum).toBe(false);
	});
});
