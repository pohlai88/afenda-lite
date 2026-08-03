import { beforeEach, describe, expect, it, vi } from "vitest";

const memberSession = {
	userId: "user-ca-member",
	orgId: "org-ca-active",
	role: "member" as const,
	email: "member@example.com",
};

const authMocks = vi.hoisted(() => ({
	getSession: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const corporateAdministrationMocks = vi.hoisted(() => ({
	scheduleGovernanceMeeting: vi.fn(),
	recordMeetingParticipant: vi.fn(),
	recordQuorum: vi.fn(),
}));

const compositionMocks = vi.hoisted(() => ({
	createCorporateAdministrationCommandOptions: vi.fn(),
	createCorporateAdministrationGovernanceDependencies: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
	revalidatePath: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	authServer: { session: { get: authMocks.getSession, requireRole: vi.fn() } },
}));

vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-ca-meeting-action-test" } },
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/corporate-administration", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("@afenda/corporate-administration")
	>()),
	scheduleGovernanceMeeting:
		corporateAdministrationMocks.scheduleGovernanceMeeting,
	recordMeetingParticipant:
		corporateAdministrationMocks.recordMeetingParticipant,
	recordQuorum: corporateAdministrationMocks.recordQuorum,
}));

vi.mock("@/lib/erp/corporate-administration-command-options", () => ({
	createCorporateAdministrationCommandOptions:
		compositionMocks.createCorporateAdministrationCommandOptions,
	createCorporateAdministrationGovernanceDependencies:
		compositionMocks.createCorporateAdministrationGovernanceDependencies,
}));

vi.mock("next/cache", () => ({
	revalidatePath: cacheMocks.revalidatePath,
}));

import {
	recordMeetingParticipantAction,
	recordQuorumAction,
	scheduleGovernanceMeetingAction,
} from "../../app/actions/corporate-administration-governance-actions";

const companyId = "11111111-1111-4111-8111-111111111111";
const bodyId = "22222222-2222-4222-8222-222222222222";
const meetingId = "33333333-3333-4333-8333-333333333333";
const membershipId = "44444444-4444-4444-8444-444444444444";

function formData(entries: Readonly<Record<string, string>>): FormData {
	const form = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		form.set(key, value);
	}
	return form;
}

describe("Corporate Administration meeting lifecycle actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.getSession.mockResolvedValue(memberSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		compositionMocks.createCorporateAdministrationCommandOptions.mockImplementation(
			(input) => ({ ...input, authorization: { can: vi.fn() } }),
		);
		compositionMocks.createCorporateAdministrationGovernanceDependencies.mockReturnValue(
			{ meetingStore: "ca-meeting-store" },
		);
	});

	it("schedules a meeting with session-stamped facts", async () => {
		corporateAdministrationMocks.scheduleGovernanceMeeting.mockResolvedValue({
			ok: true,
			data: { id: meetingId, status: "scheduled", version: 1 },
		});

		const result = await scheduleGovernanceMeetingAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: companyId,
				governanceBodyId: bodyId,
				procedureType: "physical",
				title: "Annual general meeting",
				scheduledStartAt: "2026-09-01T10:00",
				noticePeriodDays: "21",
				sourceDocumentId: "doc-notice-1",
				expectedBodyVersion: "1",
				idempotencyKey: "idem-meeting-1",
			}),
		);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).toEqual({
				governanceMeetingId: meetingId,
				status: "scheduled",
				version: 1,
			});
		}
		expect(
			corporateAdministrationMocks.scheduleGovernanceMeeting,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				legalCompanyId: companyId,
				governanceBodyId: bodyId,
				noticePeriodDays: 21,
				expectedBodyVersion: 1,
			}),
			expect.objectContaining({ organizationId: memberSession.orgId }),
			{ meetingStore: "ca-meeting-store" },
		);
	});

	it("records attendance and drops empty optional fields", async () => {
		corporateAdministrationMocks.recordMeetingParticipant.mockResolvedValue({
			ok: true,
			data: { id: membershipId, attendanceStatus: "present", version: 1 },
		});

		const result = await recordMeetingParticipantAction(
			formData({
				organizationSlug: "afenda",
				governanceMeetingId: meetingId,
				governanceMembershipId: membershipId,
				attendanceStatus: "present",
				representedByPartyId: "",
				proxyDocumentId: "",
				recusalReason: "",
				expectedMeetingVersion: "1",
				idempotencyKey: "idem-attend-1",
			}),
		);

		expect(result.ok).toBe(true);
		const payload =
			corporateAdministrationMocks.recordMeetingParticipant.mock.calls[0]?.[0];
		expect(payload).not.toHaveProperty("representedByPartyId");
		expect(payload).not.toHaveProperty("proxyDocumentId");
		expect(payload).toMatchObject({ expectedMeetingVersion: 1 });
	});

	it("records quorum with a coerced boolean and surfaces the package outcome", async () => {
		corporateAdministrationMocks.recordQuorum.mockResolvedValue({
			ok: true,
			data: {
				id: "55555555-5555-4555-8555-555555555555",
				hasQuorum: false,
				version: 1,
			},
		});

		const result = await recordQuorumAction(
			formData({
				organizationSlug: "afenda",
				governanceMeetingId: meetingId,
				ruleCode: "simple-majority",
				requiredPresentCount: "3",
				eligibleVotingOnly: "true",
				noQuorumReason: "Only two members present",
				sourceDocumentId: "doc-quorum-1",
				expectedMeetingVersion: "2",
				idempotencyKey: "idem-quorum-1",
			}),
		);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.hasQuorum).toBe(false);
		}
		expect(corporateAdministrationMocks.recordQuorum).toHaveBeenCalledWith(
			expect.objectContaining({
				eligibleVotingOnly: true,
				requiredPresentCount: 3,
				expectedMeetingVersion: 2,
			}),
			expect.anything(),
			expect.anything(),
		);
	});

	it("rejects forged organization identity before execution", async () => {
		const result = await scheduleGovernanceMeetingAction(
			formData({
				organizationSlug: "afenda",
				organizationId: "org-forged",
				legalCompanyId: companyId,
				governanceBodyId: bodyId,
				procedureType: "physical",
				title: "Forged meeting",
				scheduledStartAt: "2026-09-01T10:00",
				noticePeriodDays: "21",
				sourceDocumentId: "doc-notice-1",
				expectedBodyVersion: "1",
			}),
		);

		expect(result).toEqual(
			expect.objectContaining({ code: "VALIDATION_ERROR", ok: false }),
		);
		expect(
			corporateAdministrationMocks.scheduleGovernanceMeeting,
		).not.toHaveBeenCalled();
	});

	it("denies the action when the member lacks the meeting permission", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Forbidden",
		});

		const result = await recordQuorumAction(
			formData({
				organizationSlug: "afenda",
				governanceMeetingId: meetingId,
				ruleCode: "simple-majority",
				requiredPresentCount: "3",
				eligibleVotingOnly: "true",
				sourceDocumentId: "doc-quorum-1",
				expectedMeetingVersion: "2",
			}),
		);

		expect(result.ok).toBe(false);
		expect(corporateAdministrationMocks.recordQuorum).not.toHaveBeenCalled();
	});
});
