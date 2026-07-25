import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-ca-governance",
	orgId: "org-ca-governance",
	role: "operator" as const,
	email: "governance@example.com",
};

const authMocks = vi.hoisted(() => ({ requireRole: vi.fn() }));
const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));
const cacheMocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
const caMocks = vi.hoisted(() => ({
	appointOfficer: vi.fn(),
	appointGovernanceMembership: vi.fn(),
	endOfficer: vi.fn(),
	registerCompanyPremise: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({ requireRole: authMocks.requireRole }));
vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));
vi.mock("next/cache", () => ({ revalidatePath: cacheMocks.revalidatePath }));
vi.mock("@afenda/corporate-administration", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/corporate-administration")>();
	return {
		...actual,
		appointOfficer: caMocks.appointOfficer,
		appointGovernanceMembership: caMocks.appointGovernanceMembership,
		endOfficer: caMocks.endOfficer,
		registerCompanyPremise: caMocks.registerCompanyPremise,
	};
});

import {
	appointGovernanceMembershipAction,
	appointOfficerAction,
	endOfficerAction,
	registerCompanyPremiseAction,
} from "../app/actions/corporate-administration-governance";

const companyId = "10000000-0000-4000-8000-000000000001";
const recordId = "20000000-0000-4000-8000-000000000001";
const partyId = "30000000-0000-4000-8000-000000000001";

describe("corporate-administration governance Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
	});

	it("stamps tenant, actor, correlation, and durable request identity", async () => {
		caMocks.appointOfficer.mockResolvedValue({
			ok: true,
			data: { id: recordId, version: 1 },
		});
		const formData = new FormData();
		formData.set("requestId", "request-officer-1");
		formData.set("legalCompanyId", companyId);
		formData.set("officerRole", "director");
		formData.set("partyId", partyId);
		formData.set("appointedDate", "2026-07-25");

		const result = await appointOfficerAction(null, formData);

		expect(result).toEqual({
			ok: true,
			data: { entity: { id: recordId, version: 1 } },
		});
		expect(caMocks.appointOfficer).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				idempotencyKey: "appointOfficerAction:request-officer-1",
				legalCompanyId: companyId,
				partyId,
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"corporate-administration.governance.manage",
		);
		expect(cacheMocks.revalidatePath).toHaveBeenCalledTimes(2);
	});

	it("rejects invalid input before invoking the package", async () => {
		const formData = new FormData();
		formData.set("requestId", "request-invalid");
		formData.set("legalCompanyId", "foreign-or-invalid");

		const result = await appointOfficerAction(null, formData);

		expect(result?.ok).toBe(false);
		if (result && !result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(caMocks.appointOfficer).not.toHaveBeenCalled();
		expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
	});

	it("does not invoke governance mutations when permission is denied", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Governance management is not permitted.",
		});
		const formData = new FormData();
		formData.set("requestId", "request-end-1");
		formData.set("legalCompanyId", companyId);
		formData.set("id", recordId);
		formData.set("expectedVersion", "1");
		formData.set("reason", "Appointment ended");
		formData.set("effectiveTo", "2026-07-25");
		formData.set("endKind", "resigned");

		const result = await endOfficerAction(null, formData);

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "Governance management is not permitted.",
		});
		expect(caMocks.endOfficer).not.toHaveBeenCalled();
	});

	it("normalizes a discriminated membership subject", async () => {
		caMocks.appointGovernanceMembership.mockResolvedValue({
			ok: true,
			data: { id: recordId, version: 1 },
		});
		const formData = new FormData();
		formData.set("requestId", "request-membership-1");
		formData.set("legalCompanyId", companyId);
		formData.set("governanceBodyId", recordId);
		formData.set("subjectKind", "party");
		formData.set("subjectId", partyId);
		formData.set("roleTitle", "Chair");
		formData.set("effectiveFrom", "2026-07-25");

		await appointGovernanceMembershipAction(null, formData);

		expect(caMocks.appointGovernanceMembership).toHaveBeenCalledWith(
			expect.objectContaining({
				subject: { kind: "party", partyId },
			}),
			expect.anything(),
		);
	});

	it("constructs a manual premise snapshot source at the boundary", async () => {
		caMocks.registerCompanyPremise.mockResolvedValue({
			ok: true,
			data: { id: recordId, version: 1 },
		});
		const formData = new FormData();
		formData.set("requestId", "request-premise-1");
		formData.set("legalCompanyId", companyId);
		formData.set("premiseType", "registered_office");
		formData.set("addressKind", "manual");
		formData.set("addressLine1", "1 Registry Way");
		formData.set("city", "Kuala Lumpur");
		formData.set("countryCode", "MY");
		formData.set("isPrimary", "true");
		formData.set("effectiveFrom", "2026-07-25");

		await registerCompanyPremiseAction(null, formData);

		expect(caMocks.registerCompanyPremise).toHaveBeenCalledWith(
			expect.objectContaining({
				addressSource: {
					kind: "manual",
					line1: "1 Registry Way",
					line2: undefined,
					city: "Kuala Lumpur",
					region: undefined,
					postalCode: undefined,
					countryCode: "MY",
				},
				isPrimary: true,
			}),
			expect.anything(),
		);
	});
});
