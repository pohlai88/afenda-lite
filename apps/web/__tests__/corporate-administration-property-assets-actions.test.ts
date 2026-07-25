import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-ca4",
	orgId: "org-ca4",
	role: "operator" as const,
	email: "ca4@example.com",
};
const authMocks = vi.hoisted(() => ({ requireRole: vi.fn() }));
const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));
const cacheMocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
const caMocks = vi.hoisted(() => ({
	registerProperty: vi.fn(),
	registerInsurancePolicy: vi.fn(),
	releaseCharge: vi.fn(),
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
		registerProperty: caMocks.registerProperty,
		registerInsurancePolicy: caMocks.registerInsurancePolicy,
		releaseCharge: caMocks.releaseCharge,
	};
});

import {
	registerInsurancePolicyAction,
	registerPropertyAction,
	releaseChargeAction,
} from "../app/actions/corporate-administration-property-assets";

const companyId = "10000000-0000-4000-8000-000000000001";
const recordId = "20000000-0000-4000-8000-000000000001";
const partyId = "30000000-0000-4000-8000-000000000001";

describe("corporate-administration property-assets Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
	});

	it("stamps trusted context and durable request identity", async () => {
		caMocks.registerProperty.mockResolvedValue({
			ok: true,
			data: { id: recordId, version: 1 },
		});
		const formData = new FormData();
		formData.set("requestId", "property-request-1");
		formData.set("legalCompanyId", companyId);
		formData.set("code", "PROP-01");
		formData.set("propertyType", "freehold");
		formData.set("titleReference", "TITLE-01");
		formData.set("propertyDescription", "Registered office land");
		formData.set("ownershipPercentage", "100");
		formData.set("acquisitionDate", "2026-01-01");

		const result = await registerPropertyAction(null, formData);

		expect(result).toEqual({
			ok: true,
			data: { entity: { id: recordId, version: 1 } },
		});
		expect(caMocks.registerProperty).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				idempotencyKey: "registerPropertyAction:property-request-1",
				legalCompanyId: companyId,
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"corporate-administration.property-assets.manage",
		);
		expect(cacheMocks.revalidatePath).toHaveBeenCalledTimes(2);
	});

	it("constructs the discriminated covered subject", async () => {
		caMocks.registerInsurancePolicy.mockResolvedValue({
			ok: true,
			data: { id: recordId, version: 1 },
		});
		const formData = new FormData();
		formData.set("requestId", "insurance-request-1");
		formData.set("legalCompanyId", companyId);
		formData.set("policyNumber", "POL-01");
		formData.set("insurerPartyId", partyId);
		formData.set("subjectKind", "property");
		formData.set("subjectId", recordId);
		formData.set("effectiveFrom", "2026-01-01");
		formData.set("documentReference", "document:policy");

		await registerInsurancePolicyAction(null, formData);

		expect(caMocks.registerInsurancePolicy).toHaveBeenCalledWith(
			expect.objectContaining({
				coveredSubject: { kind: "property", propertyHoldingId: recordId },
			}),
			expect.anything(),
		);
	});

	it("rejects invalid versions before invoking the package", async () => {
		const formData = new FormData();
		formData.set("requestId", "release-request-1");
		formData.set("legalCompanyId", companyId);
		formData.set("id", recordId);
		formData.set("expectedVersion", "0");
		formData.set("releasedDate", "2026-01-01");
		formData.set("reason", "Debt satisfied");
		formData.set("evidenceReference", "document:release");

		const result = await releaseChargeAction(null, formData);

		expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
		expect(caMocks.releaseCharge).not.toHaveBeenCalled();
	});

	it("does not invoke mutations when permission is denied", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Property and asset management is not permitted.",
		});
		const formData = new FormData();
		formData.set("requestId", "property-request-denied");
		formData.set("legalCompanyId", companyId);
		formData.set("code", "PROP-02");
		formData.set("propertyType", "leasehold");
		formData.set("titleReference", "TITLE-02");
		formData.set("propertyDescription", "Branch office");
		formData.set("ownershipPercentage", "50");
		formData.set("acquisitionDate", "2026-01-01");

		const result = await registerPropertyAction(null, formData);

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "Property and asset management is not permitted.",
		});
		expect(caMocks.registerProperty).not.toHaveBeenCalled();
	});
});
