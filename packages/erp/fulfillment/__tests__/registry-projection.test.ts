import { describe, expect, it } from "vitest";

import { fulfillmentModuleManifest } from "../src/composition/module.manifest";
import {
	FULFILLMENT_COMMAND_DEFINITIONS,
	FULFILLMENT_QUERY_DEFINITIONS,
} from "../src/kernel/operations/registry";

/**
 * Reviewed projection fixture — the drift lock.
 * Any registry change must be reflected here deliberately.
 */
const EXPECTED_COMMANDS = {
	"fulfillment.delivery.create": "fulfillment.delivery.create",
	"fulfillment.delivery.line.add": "fulfillment.delivery.update",
	"fulfillment.delivery.pick.start": "fulfillment.picking.confirm",
	"fulfillment.delivery.pick.confirm": "fulfillment.picking.confirm",
	"fulfillment.delivery.pack.confirm": "fulfillment.packing.confirm",
	"fulfillment.delivery.post": "fulfillment.delivery.post",
	"fulfillment.delivery.pod.record": "fulfillment.pod.record",
	"fulfillment.delivery.cancel": "fulfillment.delivery.cancel",
	"fulfillment.delivery.close": "fulfillment.delivery.close",
} as const;

const EXPECTED_QUERIES = {
	"fulfillment.delivery.get": "fulfillment.delivery.read",
	"fulfillment.delivery.list": "fulfillment.delivery.read",
} as const;

describe("fulfillment registry projection", () => {
	it("projects the reviewed command authorization map into the manifest", () => {
		expect({ ...fulfillmentModuleManifest.authorization.commands }).toEqual(
			EXPECTED_COMMANDS,
		);
		expect([...fulfillmentModuleManifest.owns.commands].sort()).toEqual(
			Object.keys(EXPECTED_COMMANDS).sort(),
		);
	});

	it("projects the reviewed query authorization map into the manifest", () => {
		expect({ ...fulfillmentModuleManifest.authorization.queries }).toEqual(
			EXPECTED_QUERIES,
		);
		expect([...fulfillmentModuleManifest.owns.queries].sort()).toEqual(
			Object.keys(EXPECTED_QUERIES).sort(),
		);
	});

	it("declares only catalogued permissions in the registry", () => {
		const catalog = new Set<string>(
			fulfillmentModuleManifest.permissions.codes,
		);
		for (const definition of [
			...FULFILLMENT_COMMAND_DEFINITIONS,
			...FULFILLMENT_QUERY_DEFINITIONS,
		]) {
			expect(catalog.has(definition.permission)).toBe(true);
		}
	});

	it("gives every operation exactly one feature owner and unique identity", () => {
		const seen = new Set<string>();
		for (const definition of [
			...FULFILLMENT_COMMAND_DEFINITIONS,
			...FULFILLMENT_QUERY_DEFINITIONS,
		]) {
			expect(seen.has(definition.id)).toBe(false);
			seen.add(definition.id);
			expect(definition.owner.length).toBeGreaterThan(0);
		}
		expect(seen.size).toBe(
			fulfillmentModuleManifest.owns.commands.length +
				fulfillmentModuleManifest.owns.queries.length,
		);
	});
});
