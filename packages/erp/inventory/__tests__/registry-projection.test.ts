import { describe, expect, it } from "vitest";

import { inventoryModuleManifest } from "../src/composition/module.manifest";
import { INVENTORY_OPERATION_DEFINITIONS } from "../src/kernel/operations/registry";

const ALL_DEFINITIONS = Object.values(INVENTORY_OPERATION_DEFINITIONS);

/**
 * Reviewed projection fixture — the drift lock.
 * Any registry change must be reflected here deliberately.
 */
const EXPECTED_COMMANDS = {
	"inventory.movement.create": "inventory.movement.create",
	"inventory.movement.line.add": "inventory.movement.create",
	"inventory.movement.post": "inventory.movement.post",
	"inventory.movement.cancel": "inventory.movement.cancel",
	"inventory.movement.reverse": "inventory.movement.post",
	"inventory.stock.reserve": "inventory.reservation.create",
	"inventory.reservation.release": "inventory.reservation.release",
	"inventory.reservation.expire": "inventory.reservation.release",
	"inventory.reservation.cancel": "inventory.reservation.release",
} as const;

const EXPECTED_QUERIES = {
	"inventory.movement.get": "inventory.movement.read",
	"inventory.movement.list": "inventory.movement.read",
	"inventory.reservation.list": "inventory.movement.read",
	"inventory.stock.availability": "inventory.availability.read",
} as const;

describe("inventory registry projection", () => {
	it("projects the reviewed command authorization map into the manifest", () => {
		expect({ ...inventoryModuleManifest.authorization.commands }).toEqual(
			EXPECTED_COMMANDS,
		);
		expect([...inventoryModuleManifest.owns.commands].sort()).toEqual(
			Object.keys(EXPECTED_COMMANDS).sort(),
		);
	});

	it("projects the reviewed query authorization map into the manifest", () => {
		expect({ ...inventoryModuleManifest.authorization.queries }).toEqual(
			EXPECTED_QUERIES,
		);
		expect([...inventoryModuleManifest.owns.queries].sort()).toEqual(
			Object.keys(EXPECTED_QUERIES).sort(),
		);
	});

	it("declares only catalogued permissions in the registry", () => {
		const catalog = new Set<string>(inventoryModuleManifest.permissions.codes);
		for (const definition of ALL_DEFINITIONS) {
			expect(catalog.has(definition.permission)).toBe(true);
		}
	});

	it("gives every operation unique identity across the registry", () => {
		const seen = new Set<string>();
		for (const definition of ALL_DEFINITIONS) {
			expect(seen.has(definition.id)).toBe(false);
			seen.add(definition.id);
		}
		expect(seen.size).toBe(
			inventoryModuleManifest.owns.commands.length +
				inventoryModuleManifest.owns.queries.length,
		);
	});
});
