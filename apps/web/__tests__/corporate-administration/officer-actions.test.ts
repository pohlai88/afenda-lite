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
	appointOfficer: vi.fn(),
	recordOfficerQualification: vi.fn(),
	resignOfficer: vi.fn(),
	removeOfficer: vi.fn(),
}));

const compositionMocks = vi.hoisted(() => ({
	createCorporateAdministrationCommandOptions: vi.fn(),
	createCorporateAdministrationOfficerDependencies: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
	revalidatePath: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	authServer: { session: { get: authMocks.getSession, requireRole: vi.fn() } },
}));

vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-ca-officer-action-test" } },
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/corporate-administration", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("@afenda/corporate-administration")
	>()),
	appointOfficer: corporateAdministrationMocks.appointOfficer,
	recordOfficerQualification:
		corporateAdministrationMocks.recordOfficerQualification,
	resignOfficer: corporateAdministrationMocks.resignOfficer,
	removeOfficer: corporateAdministrationMocks.removeOfficer,
}));

vi.mock("@/lib/erp/corporate-administration-command-options", () => ({
	createCorporateAdministrationCommandOptions:
		compositionMocks.createCorporateAdministrationCommandOptions,
	createCorporateAdministrationOfficerDependencies:
		compositionMocks.createCorporateAdministrationOfficerDependencies,
}));

vi.mock("next/cache", () => ({
	revalidatePath: cacheMocks.revalidatePath,
}));

import {
	appointOfficerAction,
	removeOfficerAction,
	resignOfficerAction,
} from "../../app/actions/corporate-administration-officer-actions";

const officeId = "11111111-1111-4111-8111-111111111111";
const partyId = "22222222-2222-4222-8222-222222222222";
const appointmentId = "33333333-3333-4333-8333-333333333333";

function formData(entries: Readonly<Record<string, string>>): FormData {
	const form = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		form.set(key, value);
	}
	return form;
}

function appointForm(overrides: Readonly<Record<string, string>> = {}) {
	return formData({
		organizationSlug: "afenda",
		statutoryOfficeId: officeId,
		officerPartyId: partyId,
		appointmentMethod: "board_resolution",
		appointingAuthorityType: "governance_body",
		consentDocumentId: "doc-consent-1",
		sourceDocumentId: "doc-source-1",
		effectiveFrom: "2026-02-01",
		expectedOfficeVersion: "1",
		idempotencyKey: "idem-appoint-1",
		...overrides,
	});
}

describe("Corporate Administration officer actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.getSession.mockResolvedValue(memberSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		compositionMocks.createCorporateAdministrationCommandOptions.mockImplementation(
			(input) => ({ ...input, authorization: { can: vi.fn() } }),
		);
		compositionMocks.createCorporateAdministrationOfficerDependencies.mockReturnValue(
			{ officerStore: "ca-officer-store" },
		);
	});

	it("stamps session facts and rejects browser organization IDs", async () => {
		const forged = await appointOfficerAction(
			appointForm({ organizationId: "org-forged" }),
		);

		expect(forged).toEqual(
			expect.objectContaining({ code: "VALIDATION_ERROR", ok: false }),
		);
		expect(corporateAdministrationMocks.appointOfficer).not.toHaveBeenCalled();

		corporateAdministrationMocks.appointOfficer.mockResolvedValue({
			ok: true,
			data: { id: appointmentId, status: "active", version: 1 },
		});

		const result = await appointOfficerAction(appointForm());

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).toEqual({
				officerAppointmentId: appointmentId,
				status: "active",
				version: 1,
			});
		}
		expect(
			compositionMocks.createCorporateAdministrationCommandOptions,
		).toHaveBeenCalledWith({
			organizationId: memberSession.orgId,
			actorUserId: memberSession.userId,
			correlationId: "corr-ca-officer-action-test",
			idempotencyKey: "idem-appoint-1",
		});
		expect(corporateAdministrationMocks.appointOfficer).toHaveBeenCalledWith(
			expect.objectContaining({
				statutoryOfficeId: officeId,
				officerPartyId: partyId,
				expectedOfficeVersion: 1,
			}),
			expect.objectContaining({ organizationId: memberSession.orgId }),
			{ officerStore: "ca-officer-store" },
		);
		expect(cacheMocks.revalidatePath).toHaveBeenCalledWith(
			"/client/corporate-administration",
		);
	});

	it("surfaces the package fail-closed result for protected appointments", async () => {
		corporateAdministrationMocks.appointOfficer.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Approval is required for protected appointments",
		});

		const result = await appointOfficerAction(appointForm());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("FORBIDDEN");
		}
		expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
	});

	it("records resignations with coerced versions and preserved reasons", async () => {
		corporateAdministrationMocks.resignOfficer.mockResolvedValue({
			ok: true,
			data: { id: appointmentId, status: "resigned", version: 2 },
		});

		const result = await resignOfficerAction(
			formData({
				organizationSlug: "afenda",
				officerAppointmentId: appointmentId,
				resignedOn: "2026-03-01",
				reason: "Personal reasons",
				sourceDocumentId: "doc-source-2",
				expectedVersion: "1",
				idempotencyKey: "idem-resign-1",
			}),
		);

		expect(result.ok).toBe(true);
		expect(corporateAdministrationMocks.resignOfficer).toHaveBeenCalledWith(
			expect.objectContaining({
				officerAppointmentId: appointmentId,
				resignedOn: "2026-03-01",
				expectedVersion: 1,
			}),
			expect.anything(),
			expect.anything(),
		);
	});

	it("rejects removal submissions with invalid payloads before execution", async () => {
		const result = await removeOfficerAction(
			formData({
				organizationSlug: "afenda",
				officerAppointmentId: appointmentId,
				removedOn: "2026-03-01",
				reason: "",
				sourceDocumentId: "doc-source-3",
				expectedVersion: "1",
			}),
		);

		expect(result).toEqual(
			expect.objectContaining({ code: "VALIDATION_ERROR", ok: false }),
		);
		expect(corporateAdministrationMocks.removeOfficer).not.toHaveBeenCalled();
	});

	it("denies the action when the member lacks the officer permission", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Forbidden",
		});

		const result = await appointOfficerAction(appointForm());

		expect(result.ok).toBe(false);
		expect(corporateAdministrationMocks.appointOfficer).not.toHaveBeenCalled();
	});
});
