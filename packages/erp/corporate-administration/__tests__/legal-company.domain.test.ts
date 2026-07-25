import { fail } from "@afenda/errors/result";
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
import { createGrantingCaAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryCaMasterLookup,
	seedLegalEntityDimension,
	seedOrganizationParty,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG_A = "org-a";
const ORG_B = "org-b";
const DIM_A = "10000000-0000-4000-8000-000000000001";
const PARTY_A = "20000000-0000-4000-8000-000000000001";

function harness() {
	const store = createMemoryCorporateAdministrationStore();
	const ports = createMemoryMutationPorts();
	const masters = createMemoryCaMasterLookup({
		dimensions: [seedLegalEntityDimension(DIM_A, "LE-A", "Legal Entity A")],
		parties: [seedOrganizationParty(ORG_A, PARTY_A, "ORG-A")],
	});
	const authorization = createGrantingCaAuthorization([...CA_PERMISSION_CODES]);
	return { store, ports, masters, authorization };
}

describe("@afenda/corporate-administration legal company", () => {
	it("creates draft company with idempotency and tenant isolation", async () => {
		const { store, ports, masters, authorization } = harness();
		const input = {
			organizationId: ORG_A,
			actorUserId: "user-1",
			correlationId: "corr-1",
			idempotencyKey: "create-1",
			requestFingerprint: "fp-1",
			code: "CO-A",
			legalEntityDimensionId: DIM_A,
			legalPartyId: PARTY_A,
		};
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
		const input = {
			organizationId: ORG_A,
			actorUserId: "user-1",
			correlationId: "corr-idempotency",
			idempotencyKey: "create-idempotency",
			requestFingerprint: "fingerprint-a",
			code: "CO-IDEMPOTENT",
			legalEntityDimensionId: DIM_A,
		};
		const created = await createLegalCompany(input, {
			store,
			ports,
			masters,
			authorization,
		});
		expect(created.ok).toBe(true);

		const conflict = await createLegalCompany(
			{ ...input, requestFingerprint: "fingerprint-b" },
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
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-transition",
				idempotencyKey: "create-transition",
				requestFingerprint: "fingerprint-transition",
				code: "CO-TRANSITION",
				legalEntityDimensionId: DIM_A,
			},
			{ store, ports, masters, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const suspended = await suspendLegalCompany(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-suspend-draft",
				idempotencyKey: "suspend-draft",
				requestFingerprint: "fp-suspend-draft",
				legalCompanyId: created.data.id,
				expectedVersion: created.data.version,
				effectiveDate: "2024-01-01",
			},
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
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-2",
				idempotencyKey: "create-2",
				requestFingerprint: "fp-2",
				code: "CO-B",
				legalEntityDimensionId: DIM_A,
				legalPartyId: PARTY_A,
			},
			{ store, ports, masters, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		await addCompanyName(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-3",
				idempotencyKey: "name-1",
				requestFingerprint: "fp-name-1",
				legalCompanyId: created.data.id,
				nameType: "legal",
				displayName: "Acme Holdings Sdn Bhd",
				effectiveFrom: "2024-01-01",
			},
			{ store, ports, authorization },
		);
		await addCompanyIdentifier(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-4",
				idempotencyKey: "id-1",
				requestFingerprint: "fp-id-1",
				legalCompanyId: created.data.id,
				identifierType: "company_registration",
				identifierValue: "123456-A",
				effectiveFrom: "2024-01-01",
			},
			{ store, ports, authorization },
		);

		const activated = await activateLegalCompany(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-5",
				idempotencyKey: "activate-1",
				requestFingerprint: "fp-activate-1",
				legalCompanyId: created.data.id,
				expectedVersion: created.data.version,
				effectiveDate: "2024-01-01",
			},
			{ store, ports, masters, authorization },
		);
		expect(activated.ok).toBe(true);
		if (activated.ok) {
			expect(activated.data.status).toBe("active");
		}

		const listed = await listLegalCompanies(
			{
				organizationId: ORG_A,
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
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-atomic-create",
				idempotencyKey: "atomic-create",
				requestFingerprint: "atomic-fingerprint",
				code: "CO-ATOMIC",
				legalEntityDimensionId: DIM_A,
				legalPartyId: PARTY_A,
			},
			{ store, ports, masters, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		await addCompanyName(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-atomic-name",
				idempotencyKey: "atomic-name",
				requestFingerprint: "fp-atomic-name",
				legalCompanyId: created.data.id,
				nameType: "legal",
				displayName: "Atomic Company",
				effectiveFrom: "2024-01-01",
			},
			{ store, ports, authorization },
		);
		await addCompanyIdentifier(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-atomic-identifier",
				idempotencyKey: "atomic-identifier",
				requestFingerprint: "fp-atomic-identifier",
				legalCompanyId: created.data.id,
				identifierType: "company_registration",
				identifierValue: "ATOMIC-1",
				effectiveFrom: "2024-01-01",
			},
			{ store, ports, authorization },
		);
		const failingPorts = {
			...ports,
			async record() {
				return fail("INTERNAL_ERROR", "Injected outbox failure");
			},
		};

		const activated = await activateLegalCompany(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-atomic-activate",
				idempotencyKey: "atomic-activate",
				requestFingerprint: "fp-atomic-activate",
				legalCompanyId: created.data.id,
				expectedVersion: created.data.version,
				effectiveDate: "2024-01-01",
			},
			{ store, ports: failingPorts, masters, authorization },
		);
		expect(activated.ok).toBe(false);

		const current = await getLegalCompany(
			{
				organizationId: ORG_A,
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
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: created.data.id,
			},
			{ store, authorization },
		);
		expect(history.ok).toBe(true);
		if (history.ok) expect(history.data).toHaveLength(0);
	});

	it("rejects tax identifier types", async () => {
		const { store, authorization } = harness();
		const created = await createLegalCompany(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-6",
				idempotencyKey: "create-3",
				requestFingerprint: "fp-3",
				code: "CO-C",
				legalEntityDimensionId: DIM_A,
			},
			{
				store,
				ports: createMemoryMutationPorts(),
				masters: createMemoryCaMasterLookup({
					dimensions: [
						seedLegalEntityDimension(DIM_A, "LE-A", "Legal Entity A"),
					],
					parties: [],
				}),
				authorization,
			},
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const rejected = await addCompanyIdentifier(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-7",
				idempotencyKey: "id-tax",
				requestFingerprint: "fp-id-tax",
				legalCompanyId: created.data.id,
				identifierType: "tin",
				identifierValue: "TIN-1",
				effectiveFrom: "2024-01-01",
			},
			{ store, authorization },
		);
		expect(rejected.ok).toBe(false);
	});
});
