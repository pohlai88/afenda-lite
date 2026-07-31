import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
	activateOrganizationDimension,
	archiveOrganizationDimension,
	createOrganizationDimension,
	createOrganizationDimensionInputSchema,
	deactivateOrganizationDimension,
	getOrganizationDimensionByCode,
	getOrganizationDimensionById,
	getOrganizationDimensionEffective,
	listOrganizationDimensions,
	ORGANIZATION_DIMENSION_KINDS,
	resolveOrganizationDimensionsAsOf,
	updateOrganizationDimension,
} from "../src";
import { createMemoryOrganizationDimensionStore } from "../src/capabilities/core-organization-masters/testing-organization-dimension-store";
import { MASTER_DATA_PERMISSION_CODES } from "../src/permissions";
import { runSequentially } from "../src/resolve-async";
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
	department: "DEP-FIN",
	cost_center: "CC-100",
	cost_centre: "CC-100",
	profit_center: "PC-100",
	channel: "CH-DIRECT",
	region: "RG-APAC",
	brand: "BR-AFENDA",
	project: "PRJ-ERP",
	custom: "CU-1",
} as const;
const assignmentKeys = {
	legal_entity: keys.legal_entity,
	business_unit: keys.business_unit,
	location: keys.location,
	cost_centre: keys.cost_centre,
	project: keys.project,
} as const;

async function seedRequired(
	store: ReturnType<typeof createMemoryOrganizationDimensionStore>,
	organizationId = ORG_A,
) {
	await runSequentially(ORGANIZATION_DIMENSION_KINDS, async (kind) => {
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
		if (!result.ok) {
			throw new Error(
				`Failed to seed required organization dimension: ${kind}`,
			);
		}
	});
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
				keys: assignmentKeys,
			},
			{ store, authorization },
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(Object.keys(result.data).sort()).toEqual(
			Object.keys(assignmentKeys).sort(),
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
				keys: assignmentKeys,
			},
			{ store, authorization },
		);

		expect(result.ok).toBe(true);
		expect(peakInFlight).toBe(Object.keys(assignmentKeys).length);
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
		if (!overlap.ok) {
			expect(overlap.code).toBe("CONFLICT");
		}
	});

	it("fails closed for effective-date gaps and cross-tenant lookup", async () => {
		const store = createMemoryOrganizationDimensionStore();
		await seedRequired(store);

		await runSequentially([ORG_A, ORG_B], async (organizationId) => {
			const result = await resolveOrganizationDimensionsAsOf(
				{
					organizationId,
					actorUserId: ACTOR,
					asOf: organizationId === ORG_A ? "2024-12-31" : "2025-06-01",
					keys: assignmentKeys,
				},
				{ store, authorization },
			);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.code).toBe("NOT_FOUND");
			}
		});
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
				keys: assignmentKeys,
			},
			{ store, authorization },
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("CONFLICT");
		}
	});

	it("gets one effective dimension by id or key for every organization dimension kind", async () => {
		const store = createMemoryOrganizationDimensionStore();

		await runSequentially(ORGANIZATION_DIMENSION_KINDS, async (kind) => {
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
			if (!created.ok) {
				throw new Error(`Failed to create lookup dimension: ${kind}`);
			}

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
			if (!byId.ok) {
				throw new Error(`Failed to load dimension by id: ${kind}`);
			}
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
			if (!byKey.ok) {
				throw new Error(`Failed to load dimension by key: ${kind}`);
			}
			expect(byKey.data?.id).toBe(created.data.id);
		});
	});

	it("updates, transitions, lists, and reads organization dimensions with version CAS", async () => {
		const store = createMemoryOrganizationDimensionStore();
		const created = await createOrganizationDimension(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "dimension-crud-create",
				kind: "department",
				key: "DEP-FIN",
				name: "Finance",
				effectiveFrom: "2025-01-01",
			},
			{ store, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.version).toBe(1);
		expect(created.data.createdBy).toBe(ACTOR);
		expect(created.data.updatedBy).toBe(ACTOR);
		expect(created.data.createdAt).toBeInstanceOf(Date);
		expect(created.data.updatedAt).toBeInstanceOf(Date);

		const updated = await updateOrganizationDimension(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "dimension-crud-update",
				id: created.data.id,
				expectedVersion: created.data.version,
				name: "Finance Operations",
			},
			{ store, authorization },
		);
		expect(updated.ok).toBe(true);
		if (!updated.ok) {
			return;
		}
		expect(updated.data.version).toBe(2);
		expect(updated.data.name).toBe("Finance Operations");
		expect(updated.data.updatedBy).toBe(ACTOR);
		expect(updated.data.updatedAt.getTime()).toBeGreaterThanOrEqual(
			created.data.updatedAt.getTime(),
		);

		const stale = await updateOrganizationDimension(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "dimension-crud-stale",
				id: created.data.id,
				expectedVersion: created.data.version,
				name: "Stale",
			},
			{ store, authorization },
		);
		expect(stale.ok).toBe(false);
		if (!stale.ok) {
			expect(stale.code).toBe("CONFLICT");
		}

		const inactive = await deactivateOrganizationDimension(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "dimension-crud-deactivate",
				id: updated.data.id,
				expectedVersion: updated.data.version,
			},
			{ store, authorization },
		);
		expect(inactive.ok).toBe(true);
		if (!inactive.ok) {
			return;
		}
		expect(inactive.data.status).toBe("inactive");

		const active = await activateOrganizationDimension(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "dimension-crud-activate",
				id: inactive.data.id,
				expectedVersion: inactive.data.version,
			},
			{ store, authorization },
		);
		expect(active.ok).toBe(true);
		if (!active.ok) {
			return;
		}
		expect(active.data.status).toBe("active");

		const byId = await getOrganizationDimensionById(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				id: active.data.id,
			},
			{ store, authorization },
		);
		expect(byId.ok && byId.data?.name).toBe("Finance Operations");

		const byCode = await getOrganizationDimensionByCode(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				kind: "department",
				key: "dep-fin",
			},
			{ store, authorization },
		);
		expect(byCode.ok && byCode.data?.id).toBe(active.data.id);

		const listed = await listOrganizationDimensions(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				kind: "department",
			},
			{ store, authorization },
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) {
			return;
		}
		expect(listed.data.items.map((row) => row.id)).toEqual([active.data.id]);

		const archived = await archiveOrganizationDimension(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "dimension-crud-archive",
				id: active.data.id,
				expectedVersion: active.data.version,
			},
			{ store, authorization },
		);
		expect(archived.ok).toBe(true);
		if (!archived.ok) {
			return;
		}
		expect(archived.data.status).toBe("archived");
	});

	it("prevents cross-org hierarchy links, inactive parents, self-parenting, and ancestor cycles", async () => {
		const store = createMemoryOrganizationDimensionStore();
		const root = await createOrganizationDimension(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "hierarchy-root",
				kind: "business_unit",
				key: "BU-ROOT",
				name: "Root",
				effectiveFrom: "2025-01-01",
			},
			{ store, authorization },
		);
		expect(root.ok).toBe(true);
		if (!root.ok) {
			return;
		}

		const child = await createOrganizationDimension(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "hierarchy-child",
				kind: "department",
				key: "DEP-CHILD",
				name: "Child",
				parentId: root.data.id,
				effectiveFrom: "2025-01-01",
			},
			{ store, authorization },
		);
		expect(child.ok).toBe(true);
		if (!child.ok) {
			return;
		}

		const clearedParent = await updateOrganizationDimension(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "hierarchy-clear-parent",
				id: child.data.id,
				expectedVersion: child.data.version,
				parentId: null,
			},
			{ store, authorization },
		);
		expect(clearedParent.ok).toBe(true);
		if (!clearedParent.ok) {
			return;
		}
		expect(clearedParent.data.parentId).toBeNull();

		const reparented = await updateOrganizationDimension(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "hierarchy-reparent",
				id: clearedParent.data.id,
				expectedVersion: clearedParent.data.version,
				parentId: root.data.id,
			},
			{ store, authorization },
		);
		expect(reparented.ok).toBe(true);
		if (!reparented.ok) {
			return;
		}

		const selfParent = await updateOrganizationDimension(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "hierarchy-self",
				id: reparented.data.id,
				expectedVersion: reparented.data.version,
				parentId: reparented.data.id,
			},
			{ store, authorization },
		);
		expect(selfParent.ok).toBe(false);

		const cycle = await updateOrganizationDimension(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "hierarchy-cycle",
				id: root.data.id,
				expectedVersion: root.data.version,
				parentId: reparented.data.id,
			},
			{ store, authorization },
		);
		expect(cycle.ok).toBe(false);

		const inactiveRoot = await deactivateOrganizationDimension(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "hierarchy-inactive-parent",
				id: root.data.id,
				expectedVersion: root.data.version,
			},
			{ store, authorization },
		);
		expect(inactiveRoot.ok).toBe(true);
		if (!inactiveRoot.ok) {
			return;
		}

		const underInactive = await createOrganizationDimension(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "hierarchy-under-inactive",
				kind: "department",
				key: "DEP-BLOCKED",
				name: "Blocked",
				parentId: inactiveRoot.data.id,
				effectiveFrom: "2025-01-01",
			},
			{ store, authorization },
		);
		expect(underInactive.ok).toBe(false);

		const crossOrg = await createOrganizationDimension(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: "hierarchy-cross-org",
				kind: "department",
				key: "DEP-CROSS",
				name: "Cross",
				parentId: root.data.id,
				effectiveFrom: "2025-01-01",
			},
			{ store, authorization },
		);
		expect(crossOrg.ok).toBe(false);
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
		if (!created.ok) {
			return;
		}

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
		if (!result.ok) {
			return;
		}
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
		if (!created.ok) {
			return;
		}

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
		}
	});
});
