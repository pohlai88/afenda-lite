import { describe, expect, it } from "vitest";

import { purchasingModuleManifest } from "../src/composition/module.manifest";
import {
	PURCHASING_COMMAND_DEFINITIONS,
	PURCHASING_QUERY_DEFINITIONS,
} from "../src/kernel/operations/registry";

/**
 * Reviewed projection fixture — the drift lock.
 * Any registry change must be reflected here deliberately.
 */
const EXPECTED_COMMANDS = {
	"purchasing.order.create": "purchasing.order.create",
	"purchasing.order.line.add": "purchasing.order.update",
	"purchasing.order.post": "purchasing.order.post",
	"purchasing.order.cancel": "purchasing.order.cancel",
	"purchasing.order.close": "purchasing.order.close",
} as const;

const EXPECTED_QUERIES = {
	"purchasing.order.get": "purchasing.order.read",
	"purchasing.order.list": "purchasing.order.list",
} as const;

describe("purchasing registry projection", () => {
	it("projects the reviewed command authorization map into the manifest", () => {
		expect({ ...purchasingModuleManifest.authorization.commands }).toEqual(
			EXPECTED_COMMANDS,
		);
		expect([...purchasingModuleManifest.owns.commands].sort()).toEqual(
			Object.keys(EXPECTED_COMMANDS).sort(),
		);
	});

	it("projects the reviewed query authorization map into the manifest", () => {
		expect({ ...purchasingModuleManifest.authorization.queries }).toEqual(
			EXPECTED_QUERIES,
		);
		expect([...purchasingModuleManifest.owns.queries].sort()).toEqual(
			Object.keys(EXPECTED_QUERIES).sort(),
		);
	});

	it("declares only catalogued permissions in the registry", () => {
		const catalog = new Set<string>(purchasingModuleManifest.permissions.codes);
		for (const definition of [
			...PURCHASING_COMMAND_DEFINITIONS,
			...PURCHASING_QUERY_DEFINITIONS,
		]) {
			expect(catalog.has(definition.permission)).toBe(true);
		}
	});

	it("gives every operation exactly one feature owner and unique identity", () => {
		const seen = new Set<string>();
		for (const definition of [
			...PURCHASING_COMMAND_DEFINITIONS,
			...PURCHASING_QUERY_DEFINITIONS,
		]) {
			expect(seen.has(definition.id)).toBe(false);
			seen.add(definition.id);
			expect(definition.owner.length).toBeGreaterThan(0);
		}
		expect(seen.size).toBe(
			purchasingModuleManifest.owns.commands.length +
				purchasingModuleManifest.owns.queries.length,
		);
	});
});
