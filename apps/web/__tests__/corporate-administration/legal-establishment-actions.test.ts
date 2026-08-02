import { beforeEach, describe, expect, it, vi } from "vitest";

const session = {
	userId: "user-ca-establishment",
	orgId: "org-ca-establishment",
	role: "member" as const,
	email: "member@example.com",
};
const auth = vi.hoisted(() => ({ getSession: vi.fn() }));
const permission = vi.hoisted(() => ({ forbidUnlessPermission: vi.fn() }));
const commands = vi.hoisted(() => ({
	activateLegalEstablishment: vi.fn(),
	closeLegalEstablishment: vi.fn(),
	endPremise: vi.fn(),
	registerLegalEstablishment: vi.fn(),
	registerPremise: vi.fn(),
	setRegisteredAddress: vi.fn(),
	suspendLegalEstablishment: vi.fn(),
	updateLegalEstablishment: vi.fn(),
}));
const composition = vi.hoisted(() => ({
	createOptions: vi.fn(),
	createDependencies: vi.fn(),
}));
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock("@afenda/auth", () => ({
	authServer: { session: { get: auth.getSession } },
}));
vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-ca-establishment-action" } },
}));
vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permission.forbidUnlessPermission,
}));
vi.mock("@afenda/corporate-administration", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("@afenda/corporate-administration")
	>()),
	...commands,
}));
vi.mock("@/lib/erp/corporate-administration-command-options", () => ({
	createCorporateAdministrationCommandOptions: composition.createOptions,
	createCorporateAdministrationCompanyDependencies:
		composition.createDependencies,
}));
vi.mock("next/cache", () => ({ revalidatePath: cache.revalidatePath }));

import {
	activateLegalEstablishmentAction,
	registerLegalEstablishmentAction,
	setRegisteredAddressAction,
} from "../../app/actions/legal-establishment-actions";

const legalCompanyId = "00000000-0000-4000-8000-000000000141";
const legalEstablishmentId = "00000000-0000-4000-8000-000000000142";

describe("Corporate Administration legal establishment Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		auth.getSession.mockResolvedValue(session);
		permission.forbidUnlessPermission.mockResolvedValue(null);
		composition.createOptions.mockImplementation((input) => ({
			...input,
			authorization: { can: vi.fn() },
		}));
		composition.createDependencies.mockReturnValue({
			establishmentStore: "establishment-store",
		});
	});

	it("rejects browser-controlled tenant and actor fields", async () => {
		const result = await registerLegalEstablishmentAction(
			toFormData({
				organizationId: "org-forged",
				actorUserId: "user-forged",
				legalCompanyId,
				establishmentType: "branch",
				jurisdictionCode: "MY",
				registrationIdentifier: "BR-1",
				displayName: "Kuala Lumpur Branch",
				registeredFrom: "2026-01-01",
				sourceDocumentId: "doc-branch",
				expectedCompanyVersion: "1",
			}),
		);
		expect(result).toEqual(
			expect.objectContaining({ ok: false, code: "VALIDATION_ERROR" }),
		);
		expect(commands.registerLegalEstablishment).not.toHaveBeenCalled();
	});

	it("stamps the authenticated session and preserves idempotency", async () => {
		commands.registerLegalEstablishment.mockResolvedValue({
			ok: true,
			data: { id: legalEstablishmentId, version: 1 },
		});
		const result = await registerLegalEstablishmentAction(
			toFormData({
				legalCompanyId,
				establishmentType: "branch",
				jurisdictionCode: "my",
				registrationIdentifier: "BR-1",
				displayName: "Kuala Lumpur Branch",
				registeredFrom: "2026-01-01",
				sourceDocumentId: "doc-branch",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-ca-establishment-1",
			}),
		);
		expect(result).toEqual({
			ok: true,
			data: { id: legalEstablishmentId, version: 1 },
		});
		expect(composition.createOptions).toHaveBeenCalledWith({
			organizationId: session.orgId,
			actorUserId: session.userId,
			correlationId: "corr-ca-establishment-action",
			idempotencyKey: "idem-ca-establishment-1",
		});
		expect(commands.registerLegalEstablishment).toHaveBeenCalledWith(
			expect.objectContaining({
				jurisdictionCode: "MY",
				expectedCompanyVersion: 1,
			}),
			expect.objectContaining({
				organizationId: session.orgId,
				actorUserId: session.userId,
			}),
			expect.objectContaining({
				establishmentStore: "establishment-store",
			}),
		);
		expect(cache.revalidatePath).toHaveBeenCalledWith(
			"/client/corporate-administration",
		);
	});

	it("maps stale status transitions without revalidation", async () => {
		commands.activateLegalEstablishment.mockResolvedValue({
			ok: false,
			code: "CONFLICT",
			message: "The establishment version is stale.",
			details: { reason: "CORPORATE_ADMINISTRATION_STALE_VERSION" },
		});
		const result = await activateLegalEstablishmentAction(
			toFormData({
				legalEstablishmentId,
				effectiveFrom: "2026-03-01",
				reason: "Registration effective",
				sourceDocumentId: "doc-active",
				expectedVersion: "1",
			}),
		);
		expect(result).toEqual(
			expect.objectContaining({ ok: false, code: "CONFLICT" }),
		);
		expect(cache.revalidatePath).not.toHaveBeenCalled();
	});

	it("rejects forged address scope before calling the package", async () => {
		const result = await setRegisteredAddressAction(
			toFormData({
				legalCompanyId,
				organizationId: "org-forged",
				addressType: "registered_office",
				sourcePartyAddressId: "00000000-0000-4000-8000-000000000143",
				effectiveFrom: "2026-01-01",
				sourceDocumentId: "doc-address",
				expectedCompanyVersion: "1",
			}),
		);
		expect(result.ok).toBe(false);
		expect(commands.setRegisteredAddress).not.toHaveBeenCalled();
	});
});

function toFormData(values: Readonly<Record<string, string>>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(values)) {
		formData.set(key, value);
	}
	return formData;
}
