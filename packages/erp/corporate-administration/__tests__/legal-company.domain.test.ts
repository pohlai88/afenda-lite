import { describe, expect, it } from "vitest";

import {
	activateLegalCompany,
	addCompanyIdentifier,
	addCompanyName,
	createLegalCompany,
	getLegalCompany,
	listCompanyStatusHistory,
	listLegalCompanies,
	suspendLegalCompany,
} from "../src/legal-company";
import { createMemoryCorporateAdministrationStore } from "../src/memory-store";
import { CA_PERMISSION_CODES } from "../src/permissions";
import {
	activateLegalCompanyTestInput,
	addCompanyIdentifierTestInput,
	addCompanyNameTestInput,
	CA_TEST_DIM_A,
	CA_TEST_ORG_A,
	CA_TEST_PARTY_A,
	createLegalCompanyTestInput,
	suspendLegalCompanyTestInput,
} from "./helpers/legal-company-test-inputs";
import { createGrantingCaAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryCaMasterLookup,
	seedLegalEntityDimension,
	seedOrganizationParty,
} from "./helpers/memory-masters";
import {
	createMemoryMutationPorts,
	createMemoryUnitOfWork,
} from "./helpers/memory-ports";

const ORG_B = "org-b";

function harness() {
	const store = createMemoryCorporateAdministrationStore();
	const ports = createMemoryMutationPorts();
	const masters = createMemoryCaMasterLookup({
		dimensions: [
			seedLegalEntityDimension(CA_TEST_DIM_A, "LE-A", "Legal Entity A"),
		],
		parties: [seedOrganizationParty(CA_TEST_ORG_A, CA_TEST_PARTY_A, "ORG-A")],
	});
	const authorization = createGrantingCaAuthorization([...CA_PERMISSION_CODES]);
	return { store, ports, masters, authorization };
}

describe("@afenda/corporate-administration legal company", () => {
	it("returns activation readiness gaps when statutory prerequisites are missing", async () => {
		const { store, ports, masters, authorization } = harness();
		const created = await createLegalCompany(
			createLegalCompanyTestInput("create-activation-gap", {
				code: "CO-GAP",
				legalPartyId: CA_TEST_PARTY_A,
			}),
			{ store, ports, masters, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const activated = await activateLegalCompany(
			activateLegalCompanyTestInput(
				"activate-gap",
				created.data,
				"2024-01-01",
				{ correlationId: "corr-activation-gap-activate" },
			),
			{ store, ports, masters, authorization },
		);
		expect(activated.ok).toBe(false);
		if (!activated.ok) {
			expect(activated.code).toBe("CONFLICT");
			expect(activated.details).toMatchObject({
				reason: "corporate-administration.company.activation_incomplete",
				missing: expect.arrayContaining([
					"primary_legal_name",
					"primary_registration_identifier",
				]),
			});
		}
	});

	it("creates draft company with idempotency and tenant isolation", async () => {
		const { store, ports, masters, authorization } = harness();
		const input = createLegalCompanyTestInput("create-1", {
			code: "CO-A",
			legalPartyId: CA_TEST_PARTY_A,
			correlationId: "corr-1",
		});
		const created = await createLegalCompany(input, {
			store,
			ports,
			masters,
			authorization,
		});
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const replay = await createLegalCompany(input, {
			store,
			ports,
			masters,
			authorization,
		});
		expect(replay.ok).toBe(true);
		if (replay.ok) {
			expect(replay.data.id).toBe(created.data.id);
		}

		const foreign = await getLegalCompany(
			{
				organizationId: ORG_B,
				actorUserId: "user-1",
				legalCompanyId: created.data.id,
			},
			{ store, authorization },
		);
		expect(foreign.ok).toBe(false);
		if (!foreign.ok) {
			expect(foreign.code).toBe("NOT_FOUND");
		}
	});

	it("rejects an idempotency replay with a different request fingerprint", async () => {
		const { store, ports, masters, authorization } = harness();
		const input = createLegalCompanyTestInput("create-idempotency", {
			code: "CO-IDEMPOTENT",
			correlationId: "corr-idempotency",
		});
		const created = await createLegalCompany(input, {
			store,
			ports,
			masters,
			authorization,
		});
		expect(created.ok).toBe(true);

		const conflict = await createLegalCompany(
			{ ...input, code: "CO-IDEMPOTENT-B" },
			{ store, ports, masters, authorization },
		);
		expect(conflict.ok).toBe(false);
		if (!conflict.ok) {
			expect(conflict.code).toBe("CONFLICT");
			expect(conflict.details).toMatchObject({
				reason: "corporate-administration.idempotency.conflict",
			});
		}
	});

	it("rejects invalid lifecycle transitions", async () => {
		const { store, ports, masters, authorization } = harness();
		const created = await createLegalCompany(
			createLegalCompanyTestInput("create-transition", {
				code: "CO-TRANSITION",
				correlationId: "corr-transition",
			}),
			{ store, ports, masters, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const suspended = await suspendLegalCompany(
			suspendLegalCompanyTestInput("suspend-draft", created.data, {
				correlationId: "corr-suspend-draft",
				effectiveAt: "2024-01-01T00:00:00.000Z",
			}),
			{ store, ports, masters, authorization },
		);
		expect(suspended.ok).toBe(false);
		if (!suspended.ok) {
			expect(suspended.details).toMatchObject({
				reason: "corporate-administration.company.invalid_transition",
			});
		}
	});

	it("activates when primary legal name and registration identifier exist", async () => {
		const { store, ports, masters, authorization } = harness();
		const created = await createLegalCompany(
			createLegalCompanyTestInput("create-2", {
				code: "CO-B",
				legalPartyId: CA_TEST_PARTY_A,
				correlationId: "corr-2",
			}),
			{ store, ports, masters, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		await addCompanyName(
			addCompanyNameTestInput("name-1", created.data.id, {
				correlationId: "corr-3",
				displayName: "Acme Holdings Sdn Bhd",
			}),
			{ store, ports, authorization },
		);
		await addCompanyIdentifier(
			addCompanyIdentifierTestInput("id-1", created.data.id, {
				correlationId: "corr-4",
				identifierValue: "123456-A",
			}),
			{ store, ports, authorization },
		);

		const activated = await activateLegalCompany(
			activateLegalCompanyTestInput("activate-1", created.data, "2024-01-01", {
				correlationId: "corr-5",
			}),
			{ store, ports, masters, authorization },
		);
		expect(activated.ok).toBe(true);
		if (activated.ok) {
			expect(activated.data.status).toBe("active");
		}

		const listed = await listLegalCompanies(
			{
				organizationId: CA_TEST_ORG_A,
				actorUserId: "user-1",
				status: "active",
			},
			{ store, authorization },
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data.items.some((row) => row.id === created.data.id)).toBe(
				true,
			);
		}
	});

	it("does not mutate company or history when atomic mutation facts fail", async () => {
		const { store, ports, masters, authorization } = harness();
		const created = await createLegalCompany(
			createLegalCompanyTestInput("atomic-create", {
				code: "CO-ATOMIC",
				legalPartyId: CA_TEST_PARTY_A,
				correlationId: "corr-atomic-create",
			}),
			{ store, ports, masters, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		await addCompanyName(
			addCompanyNameTestInput("atomic-name", created.data.id, {
				correlationId: "corr-atomic-name",
				displayName: "Atomic Company",
			}),
			{ store, ports, authorization },
		);
		await addCompanyIdentifier(
			addCompanyIdentifierTestInput("atomic-identifier", created.data.id, {
				correlationId: "corr-atomic-identifier",
				identifierValue: "ATOMIC-1",
			}),
			{ store, ports, authorization },
		);
		const failingUow = createMemoryUnitOfWork(store, { failOutbox: true });

		const activated = await activateLegalCompany(
			activateLegalCompanyTestInput(
				"atomic-activate",
				created.data,
				"2024-01-01",
				{ correlationId: "corr-atomic-activate" },
			),
			{ store, uow: failingUow, masters, authorization },
		);
		expect(activated.ok).toBe(false);

		const current = await getLegalCompany(
			{
				organizationId: CA_TEST_ORG_A,
				actorUserId: "user-1",
				legalCompanyId: created.data.id,
			},
			{ store, authorization },
		);
		expect(current.ok).toBe(true);
		if (current.ok) {
			expect(current.data.status).toBe("draft");
			expect(current.data.version).toBe(1);
		}
		const history = await listCompanyStatusHistory(
			{
				organizationId: CA_TEST_ORG_A,
				actorUserId: "user-1",
				legalCompanyId: created.data.id,
			},
			{ store, authorization },
		);
		expect(history.ok).toBe(true);
		if (history.ok) expect(history.data).toHaveLength(0);
	});

	it("paginates legal companies with cursor, query, and nextCursor", async () => {
		const store = createMemoryCorporateAdministrationStore();
		const ports = createMemoryMutationPorts();
		const pageDimensions = ["alpha", "beta", "gamma"].map((suffix) =>
			seedLegalEntityDimension(
				`10000000-0000-4000-8000-0000000000${suffix === "alpha" ? "0a" : suffix === "beta" ? "0b" : "0c"}`,
				`LE-PAGE-${suffix.toUpperCase()}`,
				`Legal Entity Page ${suffix}`,
			),
		);
		const masters = createMemoryCaMasterLookup({
			dimensions: [
				seedLegalEntityDimension(CA_TEST_DIM_A, "LE-A", "Legal Entity A"),
				...pageDimensions,
			],
			parties: [seedOrganizationParty(CA_TEST_ORG_A, CA_TEST_PARTY_A, "ORG-A")],
		});
		const authorization = createGrantingCaAuthorization([...CA_PERMISSION_CODES]);

		for (const [index, suffix] of ["alpha", "beta", "gamma"].entries()) {
			const created = await createLegalCompany(
				createLegalCompanyTestInput(`paginate-${suffix}`, {
					code: `CO-PAGE-${suffix.toUpperCase()}`,
					legalEntityDimensionId: pageDimensions[index]?.id,
					legalPartyId: CA_TEST_PARTY_A,
					idempotencyKey: `company-paginate-${suffix}`,
				}),
				{ store, ports, masters, authorization },
			);
			expect(created.ok).toBe(true);
		}

		const firstPage = await listLegalCompanies(
			{
				organizationId: CA_TEST_ORG_A,
				actorUserId: "user-1",
				query: "co-page",
				limit: 2,
			},
			{ store, authorization },
		);
		expect(firstPage.ok).toBe(true);
		if (!firstPage.ok) return;
		expect(firstPage.data.items).toHaveLength(2);
		expect(firstPage.data.total).toBe(3);
		expect(firstPage.data.nextCursor).toBeTruthy();

		const secondPage = await listLegalCompanies(
			{
				organizationId: CA_TEST_ORG_A,
				actorUserId: "user-1",
				query: "co-page",
				limit: 2,
				cursor: firstPage.data.nextCursor ?? undefined,
			},
			{ store, authorization },
		);
		expect(secondPage.ok).toBe(true);
		if (secondPage.ok) {
			expect(secondPage.data.items).toHaveLength(1);
			expect(secondPage.data.nextCursor).toBeNull();
		}
	});

	it("rejects tax identifier types", async () => {
		const { store, authorization } = harness();
		const created = await createLegalCompany(
			createLegalCompanyTestInput("create-3", {
				code: "CO-C",
				correlationId: "corr-6",
			}),
			{
				store,
				ports: createMemoryMutationPorts(),
				masters: createMemoryCaMasterLookup({
					dimensions: [
						seedLegalEntityDimension(CA_TEST_DIM_A, "LE-A", "Legal Entity A"),
					],
					parties: [],
				}),
				authorization,
			},
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const rejected = await addCompanyIdentifier(
			addCompanyIdentifierTestInput("id-tax", created.data.id, {
				correlationId: "corr-7",
				identifierType: "tin",
				identifierValue: "TIN-1",
			}),
			{ store, authorization },
		);
		expect(rejected.ok).toBe(false);
	});

	it("rejects expanded tax identifier aliases", async () => {
		const { store, authorization } = harness();
		const created = await createLegalCompany(
			createLegalCompanyTestInput("create-tax-alias", {
				code: "CO-TAX-ALIAS",
				correlationId: "corr-tax-alias",
			}),
			{
				store,
				ports: createMemoryMutationPorts(),
				masters: createMemoryCaMasterLookup({
					dimensions: [
						seedLegalEntityDimension(CA_TEST_DIM_A, "LE-A", "Legal Entity A"),
					],
					parties: [],
				}),
				authorization,
			},
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const rejected = await addCompanyIdentifier(
			addCompanyIdentifierTestInput("id-vat-reg", created.data.id, {
				correlationId: "corr-vat-reg",
				identifierType: "vat_registration",
				identifierValue: "VAT-1",
			}),
			{ store, authorization },
		);
		expect(rejected.ok).toBe(false);
		if (!rejected.ok) {
			expect(rejected.details).toMatchObject({
				reason: "corporate-administration.tax_identifier.foreign_owner",
			});
		}
	});

	it("rejects registration identifier anti-recycle when normalized values collide", async () => {
		const { store, ports, masters, authorization } = harness();
		const created = await createLegalCompany(
			createLegalCompanyTestInput("create-reg-strip", {
				code: "CO-REG-STRIP",
				legalPartyId: CA_TEST_PARTY_A,
				correlationId: "corr-reg-strip",
			}),
			{ store, ports, masters, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const first = await addCompanyIdentifier(
			addCompanyIdentifierTestInput("id-reg-a", created.data.id, {
				correlationId: "corr-reg-a",
				identifierValue: "ABC-123",
				effectiveFrom: "2024-01-01",
			}),
			{ store, ports, authorization },
		);
		expect(first.ok).toBe(true);

		const second = await addCompanyIdentifier(
			addCompanyIdentifierTestInput("id-reg-b", created.data.id, {
				correlationId: "corr-reg-b",
				identifierValue: "ABC123",
				effectiveFrom: "2024-06-01",
			}),
			{ store, ports, authorization },
		);
		expect(second.ok).toBe(false);
	});
});
