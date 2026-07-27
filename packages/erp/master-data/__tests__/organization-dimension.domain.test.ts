import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
	createOrganizationDimension,
	createOrganizationDimensionInputSchema,
	getOrganizationDimensionEffective,
	ORGANIZATION_DIMENSION_KINDS,
	resolveOrganizationDimensionsAsOf,
} from "../src";
import { createMemoryOrganizationDimensionStore } from "../src/capabilities/core-organization-masters/testing-organization-dimension-store";
import { MASTER_DATA_PERMISSION_CODES } from "../src/permissions";
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
	it("requires predecessor CAS fields as a pair", () => {
		const base = {
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationId: "supersession-cas",
			kind: "location" as const,
			key: "LOC-KUL",
			name: "Kuala Lumpur",
			effectiveFrom: "2026-01-01",
		};

		expect(
			createOrganizationDimensionInputSchema.safeParse({
				...base,
				supersedesId: randomUUID(),
			}).success,
		).toBe(false);
		expect(
			createOrganizationDimensionInputSchema.safeParse({
				...base,
				supersedesExpectedVersion: 1,
			}).success,
		).toBe(false);
		expect(
			createOrganizationDimensionInputSchema.safeParse({
				...base,
				supersedesId: randomUUID(),
				supersedesExpectedVersion: 1,
			}).success,
		).toBe(true);
	});

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

	it("resolves the five independent dimensions concurrently", async () => {
		const baseStore = createMemoryOrganizationDimensionStore();
		await seedRequired(baseStore);
		let inFlight = 0;
		let peakInFlight = 0;
		const store = {
			...baseStore,
			async findEffective(
				input: Parameters<typeof baseStore.findEffective>[0],
			) {
				inFlight += 1;
				peakInFlight = Math.max(peakInFlight, inFlight);
				await Promise.resolve();
				try {
					return await baseStore.findEffective(input);
				} finally {
					inFlight -= 1;
				}
			},
		};

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
		expect(peakInFlight).toBe(ORGANIZATION_DIMENSION_KINDS.length);
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

	it("gets one effective dimension by id or key for every organization dimension kind", async () => {
		const store = createMemoryOrganizationDimensionStore();

		for (const kind of ORGANIZATION_DIMENSION_KINDS) {
			const created = await createOrganizationDimension(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `lookup-${kind}`,
					kind,
					key: `MD-${kind.toUpperCase()}`,
					name: `${kind} lookup`,
					effectiveFrom: "2025-01-01",
				},
				{ store, authorization },
			);
			expect(created.ok).toBe(true);
			if (!created.ok) return;

			const byId = await getOrganizationDimensionEffective(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					kind,
					id: created.data.id,
					asOf: "2025-06-01",
				},
				{ store, authorization },
			);
			expect(byId.ok).toBe(true);
			if (!byId.ok) return;
			expect(byId.data?.kind).toBe(kind);
			expect(byId.data?.key).toBe(`MD-${kind.toUpperCase()}`);

			const byKey = await getOrganizationDimensionEffective(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					kind,
					key: `md-${kind.toUpperCase()}`,
					asOf: "2025-06-01",
				},
				{ store, authorization },
			);
			expect(byKey.ok).toBe(true);
			if (!byKey.ok) return;
			expect(byKey.data?.id).toBe(created.data.id);
		}
	});

	it("returns null when a dimension kind is not effective as-of", async () => {
		const store = createMemoryOrganizationDimensionStore();
		const created = await createOrganizationDimension(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "future-only",
				kind: "legal_entity",
				key: "LE-FUTURE",
				name: "Future Entity",
				effectiveFrom: "2026-01-01",
			},
			{ store, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const result = await getOrganizationDimensionEffective(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				kind: "legal_entity",
				id: created.data.id,
				asOf: "2025-06-01",
			},
			{ store, authorization },
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toBeNull();
	});

	it("keeps the focused dimension query tenant-safe and rejects ambiguity", async () => {
		const store = createMemoryOrganizationDimensionStore();
		const created = await createOrganizationDimension(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "focused-lookup",
				kind: "legal_entity",
				key: "LE-FOCUSED",
				name: "Focused Entity",
				effectiveFrom: "2025-01-01",
			},
			{ store, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const foreign = await getOrganizationDimensionEffective(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				kind: "legal_entity",
				id: created.data.id,
				asOf: "2025-06-01",
			},
			{ store, authorization },
		);
		expect(foreign).toEqual({ ok: true, data: null });

		store.seed({
			...created.data,
			id: randomUUID(),
			name: "Corrupt focused duplicate",
		});
		const ambiguous = await getOrganizationDimensionEffective(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				kind: "legal_entity",
				key: "LE-FOCUSED",
				asOf: "2025-06-01",
			},
			{ store, authorization },
		);
		expect(ambiguous.ok).toBe(false);
		if (!ambiguous.ok) {
			expect(ambiguous.code).toBe("CONFLICT");
			expect(ambiguous.details).toMatchObject({
				reason: "MASTER_DIMENSION_AMBIGUOUS",
			});
		}
	});
});
