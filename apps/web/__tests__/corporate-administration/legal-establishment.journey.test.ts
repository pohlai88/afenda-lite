import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const session = {
	userId: "user-ca-establishment-journey",
	orgId: "org-ca-establishment-journey",
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

vi.mock("@afenda/auth", () => ({ getSession: auth.getSession }));
vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-ca-establishment-journey",
}));
vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permission.forbidUnlessPermission,
}));
vi.mock("@afenda/corporate-administration", () => commands);
vi.mock("@/lib/erp/corporate-administration-command-options", () => ({
	createCorporateAdministrationCommandOptions: composition.createOptions,
	createCorporateAdministrationCompanyDependencies:
		composition.createDependencies,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
	activateLegalEstablishmentAction,
	registerLegalEstablishmentAction,
} from "../../app/actions/legal-establishment-actions";
import {
	type LegalEstablishmentView,
	LegalEstablishmentWorkspace,
} from "../../features/corporate-administration/legal-establishment-workspace";

const legalCompanyId = "00000000-0000-4000-8000-000000000151";
const legalEstablishmentId = "00000000-0000-4000-8000-000000000152";

describe("Corporate Administration CA-1.4 establishment journey", () => {
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

	it("registers under the authenticated tenant and renders the persisted reload", async () => {
		const persisted: LegalEstablishmentView[] = [];
		commands.registerLegalEstablishment.mockImplementation(async (input) => {
			persisted.push({
				id: legalEstablishmentId,
				type: input.establishmentType,
				jurisdictionCode: input.jurisdictionCode,
				registrationIdentifier: input.registrationIdentifier,
				displayName: input.displayName,
				status: "registered",
				registeredFrom: input.registeredFrom,
				version: 1,
			});
			return { ok: true, data: { id: legalEstablishmentId, version: 1 } };
		});

		const result = await registerLegalEstablishmentAction(
			toFormData({
				legalCompanyId,
				establishmentType: "branch",
				jurisdictionCode: "my",
				registrationIdentifier: "BR-2026-014",
				displayName: "Kuala Lumpur Branch",
				registeredFrom: "2026-08-01",
				sourceDocumentId: "doc-ca-1-4-journey",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-ca-1-4-journey",
			}),
		);

		expect(result.ok).toBe(true);
		expect(composition.createOptions).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: session.orgId,
				actorUserId: session.userId,
			}),
		);
		const reload = renderToStaticMarkup(
			createElement(LegalEstablishmentWorkspace, {
				canWrite: true,
				company: { legalCompanyId, version: 2 },
				establishments: persisted,
				registeredAddresses: [],
				premises: [],
				partyAddresses: [],
			}),
		);
		expect(reload).toContain("Kuala Lumpur Branch");
		expect(reload).toContain("BR-2026-014");
		expect(reload).toContain("registered");
	});

	it("returns stale feedback and denies unauthorized mutation before persistence", async () => {
		commands.activateLegalEstablishment.mockResolvedValue({
			ok: false,
			code: "CONFLICT",
			message: "The establishment version is stale.",
			details: { reason: "CORPORATE_ADMINISTRATION_STALE_VERSION" },
		});
		const stale = await activateLegalEstablishmentAction(
			toFormData({
				legalEstablishmentId,
				effectiveFrom: "2026-08-02",
				reason: "Registration confirmed",
				sourceDocumentId: "doc-ca-1-4-active",
				expectedVersion: "1",
			}),
		);
		expect(stale).toEqual(
			expect.objectContaining({ ok: false, code: "CONFLICT" }),
		);

		permission.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Not allowed.",
		});
		const denied = await registerLegalEstablishmentAction(
			toFormData({
				legalCompanyId,
				establishmentType: "branch",
				jurisdictionCode: "MY",
				registrationIdentifier: "BR-DENIED",
				displayName: "Denied Branch",
				registeredFrom: "2026-08-01",
				sourceDocumentId: "doc-ca-1-4-denied",
				expectedCompanyVersion: "1",
			}),
		);
		expect(denied).toEqual(
			expect.objectContaining({ ok: false, code: "FORBIDDEN" }),
		);
		expect(commands.registerLegalEstablishment).not.toHaveBeenCalled();
	});
});

function toFormData(values: Readonly<Record<string, string>>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(values)) formData.set(key, value);
	return formData;
}
