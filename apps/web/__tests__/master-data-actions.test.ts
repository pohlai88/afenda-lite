/**
 * Master-data Server Actions — permission deny, org stamp, Result→ActionResult.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-md-operator",
	orgId: "org-md-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const masterDataMocks = vi.hoisted(() => ({
	createParty: vi.fn(),
	listParties: vi.fn(),
	createPartyRole: vi.fn(),
	activateParty: vi.fn(),
	findPartyDuplicateWarnings: vi.fn(),
	createPaymentTerm: vi.fn(),
	listPaymentTerms: vi.fn(),
	activatePaymentTerm: vi.fn(),
	createTaxRegistration: vi.fn(),
	listTaxRegistrations: vi.fn(),
	activateTaxRegistration: vi.fn(),
	getRefCountryByCode: vi.fn(),
	createItemTemplate: vi.fn(),
	listItemTemplates: vi.fn(),
	addItemTemplateAttributeOption: vi.fn(),
	createItemVariant: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/master-data", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/master-data")>();
	return {
		...actual,
		createParty: masterDataMocks.createParty,
		listParties: masterDataMocks.listParties,
		createPartyRole: masterDataMocks.createPartyRole,
		activateParty: masterDataMocks.activateParty,
		findPartyDuplicateWarnings: masterDataMocks.findPartyDuplicateWarnings,
		createPaymentTerm: masterDataMocks.createPaymentTerm,
		listPaymentTerms: masterDataMocks.listPaymentTerms,
		activatePaymentTerm: masterDataMocks.activatePaymentTerm,
		createTaxRegistration: masterDataMocks.createTaxRegistration,
		listTaxRegistrations: masterDataMocks.listTaxRegistrations,
		activateTaxRegistration: masterDataMocks.activateTaxRegistration,
		getRefCountryByCode: masterDataMocks.getRefCountryByCode,
		createItemTemplate: masterDataMocks.createItemTemplate,
		listItemTemplates: masterDataMocks.listItemTemplates,
		addItemTemplateAttributeOption:
			masterDataMocks.addItemTemplateAttributeOption,
		createItemVariant: masterDataMocks.createItemVariant,
	};
});

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

import { activatePartyAction } from "../app/actions/activate-party";
import { activatePaymentTermAction } from "../app/actions/activate-payment-term";
import { activateTaxRegistrationAction } from "../app/actions/activate-tax-registration";
import { addItemTemplateAttributeOptionAction } from "../app/actions/add-item-template-attribute-option";
import { createItemTemplateAction } from "../app/actions/create-item-template";
import { createItemVariantAction } from "../app/actions/create-item-variant";
import { createPartyAction } from "../app/actions/create-party";
import { createPartyRoleAction } from "../app/actions/create-party-role";
import { createPaymentTermAction } from "../app/actions/create-payment-term";
import { createTaxRegistrationAction } from "../app/actions/create-tax-registration";
import { listItemTemplatesAction } from "../app/actions/list-item-templates";
import { listPartiesAction } from "../app/actions/list-parties";
import { listPaymentTermsAction } from "../app/actions/list-payment-terms";
import { listTaxRegistrationsAction } from "../app/actions/list-tax-registrations";

describe("master-data Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		masterDataMocks.findPartyDuplicateWarnings.mockResolvedValue({
			ok: true,
			data: [],
		});
	});

	it("denies create when master_data.manage is missing", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "You do not have permission to manage organization master data.",
		});

		const formData = new FormData();
		formData.set("code", "ACME");
		formData.set("name", "Acme Corp");
		formData.set("partyKind", "organization");

		const result = await createPartyAction(null, formData);

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "You do not have permission to manage organization master data.",
		});
		expect(masterDataMocks.createParty).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"master_data.manage",
		);
	});

	it("stamps session org on create and maps package success", async () => {
		masterDataMocks.createParty.mockResolvedValue({
			ok: true,
			data: {
				id: "11111111-1111-4111-8111-111111111111",
				organizationId: "org-md-active",
				code: "ACME",
				name: "Acme Corp",
				partyKind: "organization",
				status: "draft",
				version: 1,
			},
		});

		const formData = new FormData();
		formData.set("code", "ACME");
		formData.set("name", "Acme Corp");
		formData.set("partyKind", "organization");

		const result = await createPartyAction(null, formData);

		expect(result?.ok).toBe(true);
		expect(masterDataMocks.createParty).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-md-active",
				actorUserId: "user-md-operator",
				code: "ACME",
				name: "Acme Corp",
				partyKind: "organization",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("lists parties under session org with master_data.read", async () => {
		masterDataMocks.listParties.mockResolvedValue({
			ok: true,
			data: [],
		});

		const result = await listPartiesAction({ pageSize: 10 });

		expect(result).toEqual({ ok: true, data: { parties: [] } });
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"master_data.read",
		);
		expect(masterDataMocks.listParties).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-md-active",
				pageSize: 10,
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("maps package failure from createPartyRole", async () => {
		masterDataMocks.createPartyRole.mockResolvedValue({
			ok: false,
			code: "CONFLICT",
			message: "Role already exists",
			details: { reason: "MASTER_DUPLICATE" },
		});

		const formData = new FormData();
		formData.set("partyId", "11111111-1111-4111-8111-111111111111");
		formData.set("roleCode", "customer");

		const result = await createPartyRoleAction(null, formData);

		expect(result).toEqual({
			ok: false,
			code: "CONFLICT",
			message: "Role already exists",
			details: { reason: "MASTER_DUPLICATE" },
		});
	});

	it("activates party with session org stamp", async () => {
		masterDataMocks.activateParty.mockResolvedValue({
			ok: true,
			data: {
				id: "11111111-1111-4111-8111-111111111111",
				organizationId: "org-md-active",
				status: "active",
				version: 2,
			},
		});

		const formData = new FormData();
		formData.set("partyId", "11111111-1111-4111-8111-111111111111");
		formData.set("expectedVersion", "1");
		formData.set("changeRequestId", "44444444-4444-4444-8444-444444444444");

		const result = await activatePartyAction(null, formData);

		expect(result?.ok).toBe(true);
		expect(masterDataMocks.activateParty).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-md-active",
				actorUserId: "user-md-operator",
				id: "11111111-1111-4111-8111-111111111111",
				expectedVersion: 1,
				changeRequestId: "44444444-4444-4444-8444-444444444444",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("denies payment term create when master_data.manage is missing", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "You do not have permission to manage organization master data.",
		});

		const formData = new FormData();
		formData.set("code", "NET30");
		formData.set("name", "Net 30");
		formData.set("netDays", "30");

		const result = await createPaymentTermAction(null, formData);

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "You do not have permission to manage organization master data.",
		});
		expect(masterDataMocks.createPaymentTerm).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"master_data.manage",
		);
	});

	it("stamps session org on payment term create", async () => {
		masterDataMocks.createPaymentTerm.mockResolvedValue({
			ok: true,
			data: {
				id: "22222222-2222-4222-8222-222222222222",
				organizationId: "org-md-active",
				code: "NET30",
				name: "Net 30",
				netDays: 30,
				status: "draft",
				version: 1,
			},
		});

		const formData = new FormData();
		formData.set("code", "NET30");
		formData.set("name", "Net 30");
		formData.set("netDays", "30");

		const result = await createPaymentTermAction(null, formData);

		expect(result?.ok).toBe(true);
		expect(masterDataMocks.createPaymentTerm).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-md-active",
				actorUserId: "user-md-operator",
				code: "NET30",
				name: "Net 30",
				netDays: 30,
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("lists payment terms under session org with master_data.read", async () => {
		masterDataMocks.listPaymentTerms.mockResolvedValue({
			ok: true,
			data: [],
		});

		const result = await listPaymentTermsAction({ pageSize: 10 });

		expect(result).toEqual({ ok: true, data: { paymentTerms: [] } });
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"master_data.read",
		);
		expect(masterDataMocks.listPaymentTerms).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-md-active",
				pageSize: 10,
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("denies payment term activate when master_data.manage is missing", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "You do not have permission to manage organization master data.",
		});

		const formData = new FormData();
		formData.set("paymentTermId", "22222222-2222-4222-8222-222222222222");
		formData.set("expectedVersion", "1");

		const result = await activatePaymentTermAction(null, formData);

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "You do not have permission to manage organization master data.",
		});
		expect(masterDataMocks.activatePaymentTerm).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"master_data.manage",
		);
	});

	it("denies tax registration create when master_data.manage is missing", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "You do not have permission to manage organization master data.",
		});

		const formData = new FormData();
		formData.set("partyId", "11111111-1111-4111-8111-111111111111");
		formData.set("jurisdictionCountryCode", "MY");
		formData.set("registrationType", "vat_gst");
		formData.set("registrationNumber", "VAT-1");

		const result = await createTaxRegistrationAction(null, formData);

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "You do not have permission to manage organization master data.",
		});
		expect(masterDataMocks.createTaxRegistration).not.toHaveBeenCalled();
	});

	it("stamps session org on tax registration create", async () => {
		masterDataMocks.getRefCountryByCode.mockResolvedValue({
			ok: true,
			data: {
				id: "c1000000-0000-4000-8000-000000000001",
				code: "MY",
				alpha3: "MYS",
				name: "Malaysia",
				active: true,
			},
		});
		masterDataMocks.createTaxRegistration.mockResolvedValue({
			ok: true,
			data: {
				id: "33333333-3333-4333-8333-333333333333",
				organizationId: "org-md-active",
				registrationType: "vat_gst",
				registrationNumber: "VAT-1",
				status: "draft",
				version: 1,
			},
		});

		const formData = new FormData();
		formData.set("partyId", "11111111-1111-4111-8111-111111111111");
		formData.set("jurisdictionCountryCode", "MY");
		formData.set("registrationType", "vat_gst");
		formData.set("registrationNumber", "VAT-1");

		const result = await createTaxRegistrationAction(null, formData);

		expect(result?.ok).toBe(true);
		expect(masterDataMocks.createTaxRegistration).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-md-active",
				actorUserId: "user-md-operator",
				partyId: "11111111-1111-4111-8111-111111111111",
				jurisdictionCountryId: "c1000000-0000-4000-8000-000000000001",
				registrationType: "vat_gst",
				registrationNumber: "VAT-1",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("lists tax registrations under session org with master_data.read", async () => {
		masterDataMocks.listTaxRegistrations.mockResolvedValue({
			ok: true,
			data: [],
		});

		const result = await listTaxRegistrationsAction({ pageSize: 10 });

		expect(result).toEqual({ ok: true, data: { taxRegistrations: [] } });
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"master_data.read",
		);
		expect(masterDataMocks.listTaxRegistrations).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-md-active",
				pageSize: 10,
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("denies tax registration activate when master_data.manage is missing", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "You do not have permission to manage organization master data.",
		});

		const formData = new FormData();
		formData.set("taxRegistrationId", "33333333-3333-4333-8333-333333333333");
		formData.set("expectedVersion", "1");

		const result = await activateTaxRegistrationAction(null, formData);

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "You do not have permission to manage organization master data.",
		});
		expect(masterDataMocks.activateTaxRegistration).not.toHaveBeenCalled();
	});

	it("denies item template create when master_data.manage is missing", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "You do not have permission to manage organization master data.",
		});

		const formData = new FormData();
		formData.set("code", "TEE");
		formData.set("name", "T-shirt");

		const result = await createItemTemplateAction(null, formData);

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "You do not have permission to manage organization master data.",
		});
		expect(masterDataMocks.createItemTemplate).not.toHaveBeenCalled();
	});

	it("stamps session org on item template create", async () => {
		masterDataMocks.createItemTemplate.mockResolvedValue({
			ok: true,
			data: {
				id: "33333333-3333-4333-8333-333333333333",
				organizationId: "org-md-active",
				code: "TEE",
				name: "T-shirt",
				status: "draft",
				version: 1,
			},
		});

		const formData = new FormData();
		formData.set("code", "TEE");
		formData.set("name", "T-shirt");

		const result = await createItemTemplateAction(null, formData);

		expect(result?.ok).toBe(true);
		expect(masterDataMocks.createItemTemplate).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-md-active",
				actorUserId: "user-md-operator",
				code: "TEE",
				name: "T-shirt",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("lists item templates under session org with master_data.read", async () => {
		masterDataMocks.listItemTemplates.mockResolvedValue({
			ok: true,
			data: [],
		});

		const result = await listItemTemplatesAction();

		expect(result).toEqual({ ok: true, data: { templates: [] } });
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"master_data.read",
		);
		expect(masterDataMocks.listItemTemplates).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-md-active",
				pageSize: 50,
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("denies attribute option create when master_data.manage is missing", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "You do not have permission to manage organization master data.",
		});

		const formData = new FormData();
		formData.set("attributeId", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
		formData.set("code", "RED");
		formData.set("label", "Red");

		const result = await addItemTemplateAttributeOptionAction(null, formData);

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "You do not have permission to manage organization master data.",
		});
		expect(
			masterDataMocks.addItemTemplateAttributeOption,
		).not.toHaveBeenCalled();
	});

	it("stamps session org on multi-attribute item variant create", async () => {
		masterDataMocks.createItemVariant.mockResolvedValue({
			ok: true,
			data: {
				id: "44444444-4444-4444-8444-444444444444",
				organizationId: "org-md-active",
				itemId: "55555555-5555-4555-8555-555555555555",
				templateId: "66666666-6666-4666-8666-666666666666",
				combinationKey: "color=red",
				version: 1,
				retiredAt: null,
				item: {
					id: "55555555-5555-4555-8555-555555555555",
					code: "TEE-RED",
					name: "Tee Red",
					status: "draft",
					version: 1,
				},
				values: [],
			},
		});

		const attrColor = "77777777-7777-4777-8777-777777777777";
		const attrSize = "88888888-8888-4888-8888-888888888888";
		const formData = new FormData();
		formData.set("templateId", "66666666-6666-4666-8666-666666666666");
		formData.set("code", "TEE-RED-M");
		formData.set("name", "Tee Red M");
		formData.set("itemType", "stock");
		formData.set("baseUomId", "b1000000-0000-4000-8000-000000000001");
		formData.set("itemGroupId", "99999999-9999-4999-8999-999999999999");
		formData.append("attributeIds", attrColor);
		formData.append("attributeIds", attrSize);
		formData.set(
			`optionId_${attrColor}`,
			"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
		);
		formData.set(`valueText_${attrSize}`, "M");

		const result = await createItemVariantAction(null, formData);

		expect(result?.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"master_data.manage",
		);
		expect(masterDataMocks.createItemVariant).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-md-active",
				actorUserId: "user-md-operator",
				code: "TEE-RED-M",
				attributeValues: [
					{
						attributeId: attrColor,
						optionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
					},
					{ attributeId: attrSize, valueText: "M" },
				],
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});
});
