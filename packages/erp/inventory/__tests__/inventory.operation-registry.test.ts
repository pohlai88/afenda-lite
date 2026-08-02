import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { inventoryModuleManifest } from "../src/composition/module.manifest";
import {
	INVENTORY_COMMAND_AUTHORIZATION,
	INVENTORY_COMMAND_IDS,
	INVENTORY_EMITTED_EVENT_IDS,
	INVENTORY_OPERATION_DEFINITIONS,
	INVENTORY_QUERY_AUTHORIZATION,
	INVENTORY_QUERY_IDS,
} from "../src/operation-registry";
import { INVENTORY_PERMISSION_CODES } from "../src/permissions";

const definitions = Object.values(INVENTORY_OPERATION_DEFINITIONS);

describe("Inventory operation registry", () => {
	it("preserves the accepted command, query, authorization and event contract", () => {
		expect(INVENTORY_COMMAND_IDS).toEqual([
			"inventory.movement.create",
			"inventory.movement.line.add",
			"inventory.movement.post",
			"inventory.movement.cancel",
			"inventory.movement.reverse",
			"inventory.stock.reserve",
			"inventory.reservation.release",
			"inventory.reservation.expire",
			"inventory.reservation.cancel",
		]);
		expect(INVENTORY_QUERY_IDS).toEqual([
			"inventory.movement.get",
			"inventory.movement.list",
			"inventory.reservation.list",
			"inventory.stock.availability",
		]);
		expect(INVENTORY_COMMAND_AUTHORIZATION).toEqual({
			"inventory.movement.create": "inventory.movement.create",
			"inventory.movement.line.add": "inventory.movement.create",
			"inventory.movement.post": "inventory.movement.post",
			"inventory.movement.cancel": "inventory.movement.cancel",
			"inventory.movement.reverse": "inventory.movement.post",
			"inventory.stock.reserve": "inventory.reservation.create",
			"inventory.reservation.release": "inventory.reservation.release",
			"inventory.reservation.expire": "inventory.reservation.release",
			"inventory.reservation.cancel": "inventory.reservation.release",
		});
		expect(INVENTORY_QUERY_AUTHORIZATION).toEqual({
			"inventory.movement.get": "inventory.movement.read",
			"inventory.movement.list": "inventory.movement.read",
			"inventory.reservation.list": "inventory.movement.read",
			"inventory.stock.availability": "inventory.availability.read",
		});
		expect(INVENTORY_EMITTED_EVENT_IDS).toEqual([
			"inventory.movement.created.v1",
			"inventory.movement.posted.v1",
			"inventory.movement.cancelled.v1",
			"inventory.stock.reserved.v1",
			"inventory.reservation.released.v1",
			"inventory.reservation.expired.v1",
			"inventory.reservation.cancelled.v1",
		]);
	});

	it("owns unique operations and derives complete manifest projections", () => {
		const operationIds = definitions.map((definition) => definition.id);
		expect(new Set(operationIds).size).toBe(operationIds.length);
		expect(inventoryModuleManifest.owns.commands).toEqual(
			INVENTORY_COMMAND_IDS,
		);
		expect(inventoryModuleManifest.owns.queries).toEqual(INVENTORY_QUERY_IDS);
		expect(inventoryModuleManifest.authorization.commands).toEqual(
			INVENTORY_COMMAND_AUTHORIZATION,
		);
		expect(inventoryModuleManifest.authorization.queries).toEqual(
			INVENTORY_QUERY_AUTHORIZATION,
		);
		expect(inventoryModuleManifest.events.emits).toEqual(
			INVENTORY_EMITTED_EVENT_IDS,
		);
	});

	it("declares closed authorization and execution dispositions", () => {
		const permissionCodes = new Set<string>(INVENTORY_PERMISSION_CODES);
		for (const definition of definitions) {
			expect(definition.owner).toBe("inventory");
			expect(permissionCodes.has(definition.permission)).toBe(true);
			for (const permission of definition.additionalPermissions) {
				expect(permissionCodes.has(permission)).toBe(true);
			}

			if (definition.kind === "query") {
				expect(definition.transaction).toBe("none");
				expect(definition.idempotency).toBe("none");
				expect(definition.emits).toEqual([]);
			} else {
				expect(definition.transaction).not.toBe("none");
				expect(definition.idempotency).toBe("required");
			}
		}
		expect(INVENTORY_OPERATION_DEFINITIONS.reverseMovement.transaction).toBe(
			"resumable",
		);
	});

	it("prevents runtime stores from reintroducing raw event wire values", async () => {
		const runtimeSources = await Promise.all(
			["memory-store.ts", "drizzle-store.ts", "store.ts"].map((file) =>
				readFile(new URL(`../src/${file}`, import.meta.url), "utf8"),
			),
		);
		for (const source of runtimeSources) {
			expect(source).not.toMatch(
				/inventory\.(?:movement|stock|reservation)\.[a-z.]+\.v1/,
			);
		}
	});
});
