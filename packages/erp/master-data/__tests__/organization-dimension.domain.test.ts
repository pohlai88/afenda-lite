import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
	createOrganizationDimension,
	ORGANIZATION_DIMENSION_KINDS,
	resolveOrganizationDimensionsAsOf,
} from "../src";
import { MASTER_DATA_PERMISSION_CODES } from "../src/permissions";
import { createMemoryOrganizationDimensionStore } from "../src/testing/organization-dimension-store";
import { createGrantingMasterAuthorization } from "./helpers/memory-authorization";

const ORG_A = randomUUID();
const ORG_B = randomUUID();
const ACTOR = randomUUID();
const authorization = createGrantingMasterAuthorization([
	...MASTER_DATA_PERMISSION_CODES,
]);
const keys = {
	legal_entity: "LE-MY",
	business_unit: "BU-OPS",
	location: "LOC-KUL",
	cost_centre: "CC-100",
	project: "PRJ-ERP",
} as const;

async function seedRequired(
	store: ReturnType<typeof createMemoryOrganizationDimensionStore>,
	organizationId = ORG_A,
) {
	for (const kind of ORGANIZATION_DIMENSION_KINDS) {
		const result = await createOrganizationDimension(
			{
				organizationId,
				actorUserId: ACTOR,
				correlationId: `seed-${kind}`,
				kind,
				key: keys[kind],
				name: `${kind} name`,
				effectiveFrom: "2025-01-01",
			},
			{ store, authorization },
		);
		expect(result.ok).toBe(true);
	}
}

describe("organization dimension domain", () => {
	it("resolves exactly five tenant-scoped dimensions as of the assignment date", async () => {
		const store = createMemoryOrganizationDimensionStore();
		await seedRequired(store);

		const result = await resolveOrganizationDimensionsAsOf(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				asOf: "2025-06-01",
				keys,
			},
			{ store, authorization },
		);

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(Object.keys(result.data).sort()).toEqual(
			[...ORGANIZATION_DIMENSION_KINDS].sort(),
		);
		expect(result.data.legal_entity.key).toBe(keys.legal_entity);
	});

	it("rejects overlapping versions for the same tenant, kind, and normalized key", async () => {
		const store = createMemoryOrganizationDimensionStore();
		const first = await createOrganizationDimension(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "overlap-first",
				kind: "location",
				key: "LOC-KUL",
				name: "Kuala Lumpur",
				effectiveFrom: "2025-01-01",
				effectiveTo: "2025-12-31",
			},
			{ store, authorization },
		);
		expect(first.ok).toBe(true);

		const overlap = await createOrganizationDimension(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "overlap-second",
				kind: "location",
				key: "loc-kul",
				name: "Kuala Lumpur v2",
				effectiveFrom: "2025-06-01",
			},
			{ store, authorization },
		);
		expect(overlap.ok).toBe(false);
		if (!overlap.ok) expect(overlap.code).toBe("CONFLICT");
	});

	it("fails closed for effective-date gaps and cross-tenant lookup", async () => {
		const store = createMemoryOrganizationDimensionStore();
		await seedRequired(store);

		for (const organizationId of [ORG_A, ORG_B]) {
			const result = await resolveOrganizationDimensionsAsOf(
				{
					organizationId,
					actorUserId: ACTOR,
					asOf: organizationId === ORG_A ? "2024-12-31" : "2025-06-01",
					keys,
				},
				{ store, authorization },
			);
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.code).toBe("NOT_FOUND");
		}
	});

	it("returns a typed conflict when persisted effective rows are ambiguous", async () => {
		const store = createMemoryOrganizationDimensionStore();
		await seedRequired(store);
		store.seed({
			id: randomUUID(),
			organizationId: ORG_A,
			kind: "legal_entity",
			key: keys.legal_entity,
			name: "Corrupt duplicate",
			effectiveFrom: "2025-01-01",
			effectiveTo: null,
			supersedesId: null,
			version: 1,
			createdBy: ACTOR,
			createdAt: new Date(),
		});

		const result = await resolveOrganizationDimensionsAsOf(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				asOf: "2025-06-01",
				keys,
			},
			{ store, authorization },
		);

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.code).toBe("CONFLICT");
	});
});
