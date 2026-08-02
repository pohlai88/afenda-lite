import { beforeEach, describe, expect, it, vi } from "vitest";

const memberSession = {
	userId: "user-ca-governance",
	orgId: "org-ca-governance",
	role: "member" as const,
	email: "member@example.com",
};

const authMocks = vi.hoisted(() => ({ getSession: vi.fn() }));
const permissionMocks = vi.hoisted(() => ({ forbidUnlessPermission: vi.fn() }));
const packageMocks = vi.hoisted(() => ({
	recordMeetingVote: vi.fn(),
	adoptResolution: vi.fn(),
}));
const compositionMocks = vi.hoisted(() => ({
	createOptions: vi.fn(),
	createDependencies: vi.fn(),
}));
const cacheMocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock("@afenda/auth", () => ({
	authServer: { session: { get: authMocks.getSession, requireRole: vi.fn() } },
}));
vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-ca-governance-test" } },
}));
vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));
vi.mock("@afenda/corporate-administration", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("@afenda/corporate-administration")
	>()),
	recordMeetingVote: packageMocks.recordMeetingVote,
	adoptResolution: packageMocks.adoptResolution,
}));
vi.mock("@/lib/erp/corporate-administration-command-options", () => ({
	createCorporateAdministrationCommandOptions: compositionMocks.createOptions,
	createCorporateAdministrationGovernanceDependencies:
		compositionMocks.createDependencies,
}));
vi.mock("next/cache", () => ({ revalidatePath: cacheMocks.revalidatePath }));

import {
	adoptResolutionAction,
	recordMeetingVoteAction,
} from "../../app/actions/corporate-administration-governance-actions";

const meetingId = "11111111-1111-4111-8111-111111111111";
const meetingVoteId = "22222222-2222-4222-8222-222222222222";
const resolutionId = "33333333-3333-4333-8333-333333333333";

describe("Corporate Administration governance decision Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.getSession.mockResolvedValue(memberSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		compositionMocks.createOptions.mockImplementation((input) => ({
			...input,
			authorization: { can: vi.fn() },
		}));
		compositionMocks.createDependencies.mockReturnValue({
			meetingStore: "meeting-store",
			resolutionStore: "resolution-store",
		});
	});

	it("stamps tenant context and delegates vote semantics to the package", async () => {
		packageMocks.recordMeetingVote.mockResolvedValue({
			ok: true,
			data: { id: meetingVoteId, outcome: "adopted", version: 1 },
		});

		const result = await recordMeetingVoteAction(
			formData({
				organizationSlug: "afenda",
				governanceMeetingId: meetingId,
				motionCode: "MOTION-001",
				eligibleVotes: "5",
				votesFor: "4",
				votesAgainst: "1",
				abstentions: "0",
				thresholdType: "simple_majority",
				outcomeBasis: "Four of five eligible votes supported the motion",
				sourceDocumentId: "doc-vote-001",
				expectedMeetingVersion: "3",
				idempotencyKey: "idem-vote-001",
			}),
		);

		expect(result).toEqual({
			ok: true,
			data: { meetingVoteId, outcome: "adopted", version: 1 },
		});
		expect(compositionMocks.createOptions).toHaveBeenCalledWith({
			organizationId: memberSession.orgId,
			actorUserId: memberSession.userId,
			correlationId: "corr-ca-governance-test",
			idempotencyKey: "idem-vote-001",
		});
		expect(packageMocks.recordMeetingVote).toHaveBeenCalledWith(
			expect.objectContaining({
				governanceMeetingId: meetingId,
				eligibleVotes: 5,
				votesFor: 4,
				expectedMeetingVersion: 3,
			}),
			expect.objectContaining({ organizationId: memberSession.orgId }),
			expect.objectContaining({ resolutionStore: "resolution-store" }),
		);
		expect(cacheMocks.revalidatePath).toHaveBeenCalledWith(
			"/client/corporate-administration",
		);
	});

	it("rejects forged tenant fields before invoking a resolution command", async () => {
		const result = await adoptResolutionAction(
			formData({
				organizationSlug: "afenda",
				organizationId: "forged-tenant",
				meetingVoteId,
				resolutionCode: "RES-001",
				title: "Approve the annual plan",
				textDigest: "a".repeat(64),
				documentId: "doc-resolution-001",
				effectiveFrom: "2026-08-01",
				approvedAt: "2026-08-01T10:00",
				sourceDocumentId: "doc-resolution-001",
				expectedVoteVersion: "1",
			}),
		);

		expect(result).toEqual(
			expect.objectContaining({ ok: false, code: "VALIDATION_ERROR" }),
		);
		expect(packageMocks.adoptResolution).not.toHaveBeenCalled();
	});

	it("maps an adopted resolution without exposing its text", async () => {
		packageMocks.adoptResolution.mockResolvedValue({
			ok: true,
			data: {
				id: resolutionId,
				status: "adopted",
				version: 1,
				textDigest: "a".repeat(64),
			},
		});

		const result = await adoptResolutionAction(
			formData({
				organizationSlug: "afenda",
				meetingVoteId,
				resolutionCode: "RES-001",
				title: "Approve the annual plan",
				textDigest: "a".repeat(64),
				documentId: "doc-resolution-001",
				effectiveFrom: "2026-08-01",
				approvedAt: "2026-08-01T10:00",
				sourceDocumentId: "doc-resolution-001",
				expectedVoteVersion: "1",
			}),
		);

		expect(result).toEqual({
			ok: true,
			data: { resolutionId, status: "adopted", version: 1 },
		});
		expect(JSON.stringify(result)).not.toContain("a".repeat(64));
	});
});

function formData(entries: Readonly<Record<string, string>>): FormData {
	const data = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		data.set(key, value);
	}
	return data;
}
