import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createWarehouse } from "../src/capabilities/core-organization-masters/warehouse";
import {
	createWarehouseExternalId,
	findWarehouseByExternalId,
} from "../src/capabilities/extensions/warehouse-external-ids";
import { resolveAsync } from "../src/resolve-async";
import type { WarehouseExternalId } from "../src/types";
import { createMasterDataTestHarness } from "./helpers/harness";

describe("warehouse external IDs", () => {
	it("rejects invalid create identities before authorization or parent I/O", async () => {
		const { store, ports } = createMasterDataTestHarness();
		let authorizationCalls = 0;

		const result = await createWarehouseExternalId(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				correlationId: "corr-1",
				warehouseId: randomUUID(),
				sourceSystem: "legacy erp",
				externalIdType: "location",
				externalValue: "WH-1",
				caseSensitivity: "insensitive",
			},
			{
				store,
				ports,
				authorization: {
					can() {
						return resolveAsync(() => {
							authorizationCalls += 1;
							return true;
						});
					},
				},
			},
		);

		expect(result.ok).toBe(false);

		expect(authorizationCalls).toBe(0);
	});

	it("rejects invalid lookup identities before authorization", async () => {
		const { store } = createMasterDataTestHarness();
		let authorizationCalls = 0;

		const result = await findWarehouseByExternalId(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				sourceSystem: "legacy erp",
				externalIdType: "location",
				externalValue: "WH-1",
				caseSensitivity: "insensitive",
			},
			{
				store,
				authorization: {
					can() {
						return resolveAsync(() => {
							authorizationCalls += 1;
							return true;
						});
					},
				},
			},
		);

		expect(result.ok).toBe(false);

		expect(authorizationCalls).toBe(0);
	});

	it("returns an integrity conflict when an identity resolves to multiple warehouses", async () => {
		const { store, options } = createMasterDataTestHarness();
		const warehouse = await createWarehouse(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				correlationId: "corr-1",
				code: "WH-EXT-1",
				name: "External ID warehouse",
				locationType: "warehouse",
			},
			options,
		);
		expect(warehouse.ok).toBe(true);
		if (!warehouse.ok) {
			return;
		}

		const externalId = await createWarehouseExternalId(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				correlationId: "corr-2",
				warehouseId: warehouse.data.id,
				sourceSystem: "legacy-erp",
				externalIdType: "location",
				externalValue: "WH-001",
				caseSensitivity: "insensitive",
			},
			options,
		);
		expect(externalId.ok).toBe(true);
		if (!externalId.ok) {
			return;
		}

		const warehouseExternalIds = Reflect.get(store, "warehouseExternalIds");
		expect(warehouseExternalIds).toBeInstanceOf(Map);
		if (!(warehouseExternalIds instanceof Map)) {
			return;
		}
		warehouseExternalIds.set(randomUUID(), {
			...(externalId.data satisfies WarehouseExternalId),
			id: randomUUID(),
		});

		const found = await findWarehouseByExternalId(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				sourceSystem: "legacy-erp",
				externalIdType: "location",
				externalValue: "WH-001",
				caseSensitivity: "insensitive",
			},
			options,
		);

		expect(found.ok).toBe(false);
	});
});
