import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-ca-operator",
	orgId: "org-ca-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));
const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));
const caMocks = vi.hoisted(() => ({
	createLegalCompany: vi.fn(),
	listLegalCompanies: vi.fn(),
	updateLegalCompany: vi.fn(),
	activateLegalCompany: vi.fn(),
	archiveLegalCompany: vi.fn(),
	addCompanyName: vi.fn(),
	addCompanyIdentifier: vi.fn(),
	dissolveLegalCompany: vi.fn(),
	getLegalCompanyAsOf: vi.fn(),
}));
const cacheMocks = vi.hoisted(() => ({
	revalidatePath: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));
vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));
vi.mock("next/cache", () => ({
	revalidatePath: cacheMocks.revalidatePath,
}));
vi.mock("@afenda/corporate-administration", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/corporate-administration")>();
	return {
		...actual,
		createLegalCompany: caMocks.createLegalCompany,
		listLegalCompanies: caMocks.listLegalCompanies,
		updateLegalCompany: caMocks.updateLegalCompany,
		activateLegalCompany: caMocks.activateLegalCompany,
		archiveLegalCompany: caMocks.archiveLegalCompany,
		addCompanyName: caMocks.addCompanyName,
		addCompanyIdentifier: caMocks.addCompanyIdentifier,
		dissolveLegalCompany: caMocks.dissolveLegalCompany,
		getLegalCompanyAsOf: caMocks.getLegalCompanyAsOf,
	};
});

import { activateLegalCompanyAction } from "../app/actions/activate-legal-company";
import { addCompanyIdentifierAction } from "../app/actions/add-company-identifier";
import { archiveLegalCompanyAction } from "../app/actions/archive-legal-company";
import { addCompanyNameAction } from "../app/actions/add-company-name";
import { createLegalCompanyAction } from "../app/actions/create-legal-company";
import { dissolveLegalCompanyAction } from "../app/actions/dissolve-legal-company";
import { getLegalCompanyAsOfAction } from "../app/actions/get-legal-company-as-of";
import { listLegalCompaniesAction } from "../app/actions/list-legal-companies";
import { updateLegalCompanyAction } from "../app/actions/update-legal-company";

describe("corporate-administration Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
	});

	it("stamps the session tenant and actor on company creation", async () => {
		caMocks.createLegalCompany.mockResolvedValue({
			ok: true,
			data: {
				id: "10000000-0000-4000-8000-000000000001",
				code: "ACME",
				status: "draft",
				version: 1,
			},
		});
		const formData = new FormData();
		formData.set("code", "ACME");
		formData.set(
			"legalEntityDimensionId",
			"20000000-0000-4000-8000-000000000001",
		);

		const result = await createLegalCompanyAction(null, formData);

		expect(result?.ok).toBe(true);
		expect(caMocks.createLegalCompany).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				code: "ACME",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
		expect(caMocks.createLegalCompany.mock.calls[0]?.[0]).not.toHaveProperty(
			"requestFingerprint",
		);
		expect(cacheMocks.revalidatePath).toHaveBeenCalledTimes(2);
	});

	it("rejects invalid update input before package invocation", async () => {
		const formData = new FormData();
		formData.set("legalCompanyId", "not-a-uuid");
		formData.set("expectedVersion", "0");

		const result = await updateLegalCompanyAction(null, formData);

		expect(result?.ok).toBe(false);
		if (result && !result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(caMocks.updateLegalCompany).not.toHaveBeenCalled();
		expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
	});

	it("maps list results under session scope", async () => {
		caMocks.listLegalCompanies.mockResolvedValue({
			ok: true,
			data: {
				items: [{ id: "company-1", code: "ACME" }],
				total: 1,
				nextCursor: "cursor-1",
			},
		});

		const result = await listLegalCompaniesAction({ limit: 10 });

		expect(result).toEqual({
			ok: true,
			data: {
				companies: [{ id: "company-1", code: "ACME" }],
				total: 1,
				nextCursor: "cursor-1",
			},
		});
		expect(caMocks.listLegalCompanies).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				limit: 10,
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("does not invoke the package when permission is denied", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Corporate administration is not permitted.",
		});

		const result = await listLegalCompaniesAction();

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "Corporate administration is not permitted.",
		});
		expect(caMocks.listLegalCompanies).not.toHaveBeenCalled();
	});

	it("stamps activation command with effectiveAt and idempotency key", async () => {
		caMocks.activateLegalCompany.mockResolvedValue({
			ok: true,
			data: { id: "company-1", status: "active", version: 2 },
		});
		const formData = new FormData();
		formData.set("legalCompanyId", "10000000-0000-4000-8000-000000000001");
		formData.set("expectedVersion", "1");
		formData.set("effectiveDate", "2024-01-01");

		const result = await activateLegalCompanyAction(null, formData);

		expect(result?.ok).toBe(true);
		expect(caMocks.activateLegalCompany).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				effectiveAt: "2024-01-01T00:00:00.000Z",
				idempotencyKey: "activate:10000000-0000-4000-8000-000000000001:1",
			}),
			expect.anything(),
		);
		expect(
			caMocks.activateLegalCompany.mock.calls[0]?.[0],
		).not.toHaveProperty("requestFingerprint");
	});

	it("rejects archive when permission is denied", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Corporate administration is not permitted.",
		});
		const formData = new FormData();
		formData.set("legalCompanyId", "10000000-0000-4000-8000-000000000001");
		formData.set("expectedVersion", "3");
		formData.set("effectiveDate", "2024-06-01");

		const result = await archiveLegalCompanyAction(null, formData);

		expect(result?.ok).toBe(false);
		expect(caMocks.archiveLegalCompany).not.toHaveBeenCalled();
	});

	it("adds company name without wire request fingerprint", async () => {
		caMocks.addCompanyName.mockResolvedValue({
			ok: true,
			data: { id: "name-1", displayName: "Acme Ltd" },
		});
		const formData = new FormData();
		formData.set("legalCompanyId", "10000000-0000-4000-8000-000000000001");
		formData.set("nameType", "legal");
		formData.set("displayName", "Acme Ltd");
		formData.set("effectiveFrom", "2024-01-01");

		const result = await addCompanyNameAction(null, formData);

		expect(result?.ok).toBe(true);
		expect(caMocks.addCompanyName).toHaveBeenCalledWith(
			expect.objectContaining({
				displayName: "Acme Ltd",
			}),
			expect.anything(),
		);
		expect(caMocks.addCompanyName.mock.calls[0]?.[0]).not.toHaveProperty(
			"requestFingerprint",
		);
	});

	it("adds company identifier with hardened jurisdiction and authority ids", async () => {
		caMocks.addCompanyIdentifier.mockResolvedValue({
			ok: true,
			data: {
				id: "identifier-1",
				identifierValue: "123456-A",
				jurisdictionCountryId: "30000000-0000-4000-8000-000000000001",
				authorityPartyId: "40000000-0000-4000-8000-000000000001",
			},
		});
		const formData = new FormData();
		formData.set("legalCompanyId", "10000000-0000-4000-8000-000000000001");
		formData.set("identifierType", "company_registration");
		formData.set("identifierValue", "123456-A");
		formData.set(
			"jurisdictionCountryId",
			"30000000-0000-4000-8000-000000000001",
		);
		formData.set("authorityPartyId", "40000000-0000-4000-8000-000000000001");
		formData.set("effectiveFrom", "2024-01-01");

		const result = await addCompanyIdentifierAction(null, formData);

		expect(result?.ok).toBe(true);
		expect(caMocks.addCompanyIdentifier).toHaveBeenCalledWith(
			expect.objectContaining({
				jurisdictionCountryId: "30000000-0000-4000-8000-000000000001",
				authorityPartyId: "40000000-0000-4000-8000-000000000001",
				idempotencyKey:
					"id:10000000-0000-4000-8000-000000000001:company_registration:123456A",
			}),
			expect.anything(),
		);
		expect(
			caMocks.addCompanyIdentifier.mock.calls[0]?.[0],
		).not.toHaveProperty("requestFingerprint");
	});

	it("rejects tax identifier types before calling the package", async () => {
		const formData = new FormData();
		formData.set("legalCompanyId", "10000000-0000-4000-8000-000000000001");
		formData.set("identifierType", "vat_registration");
		formData.set("identifierValue", "VAT-1");
		formData.set("effectiveFrom", "2024-01-01");

		const result = await addCompanyIdentifierAction(null, formData);

		expect(result?.ok).toBe(false);
		expect(caMocks.addCompanyIdentifier).not.toHaveBeenCalled();
	});

	it("returns CaLegalCompanyAsOf from the as-of action", async () => {
		caMocks.getLegalCompanyAsOf.mockResolvedValue({
			ok: true,
			data: {
				company: {
					id: "10000000-0000-4000-8000-000000000001",
					status: "active",
				},
				status: "active",
				effectiveName: null,
				effectiveIdentifiers: [],
				asOf: "2024-06-01",
			},
		});

		const result = await getLegalCompanyAsOfAction({
			legalCompanyId: "10000000-0000-4000-8000-000000000001",
			asOf: "2024-06-01",
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.company.asOf).toBe("2024-06-01");
			expect(result.data.company.status).toBe("active");
			expect(result.data.company.effectiveIdentifiers).toEqual([]);
		}
		expect(caMocks.getLegalCompanyAsOf).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				legalCompanyId: "10000000-0000-4000-8000-000000000001",
				asOf: "2024-06-01T00:00:00.000Z",
			}),
			expect.anything(),
		);
	});

	it("maps dissolve evidence to evidenceDocumentReference", async () => {
		caMocks.dissolveLegalCompany.mockResolvedValue({
			ok: true,
			data: { id: "company-1", status: "dissolved", version: 4 },
		});
		const formData = new FormData();
		formData.set("legalCompanyId", "10000000-0000-4000-8000-000000000001");
		formData.set("expectedVersion", "3");
		formData.set("effectiveDate", "2024-06-01");
		formData.set("reason", "Members resolution");
		formData.set("evidenceDocumentReference", "document:dissolution-2024");

		const result = await dissolveLegalCompanyAction(null, formData);

		expect(result?.ok).toBe(true);
		expect(caMocks.dissolveLegalCompany).toHaveBeenCalledWith(
			expect.objectContaining({
				evidenceDocumentReference: "document:dissolution-2024",
				effectiveAt: "2024-06-01T00:00:00.000Z",
			}),
			expect.anything(),
		);
	});
});
