import { describe, expect, it } from "vitest";

import { receivingModuleManifest } from "../src/composition/module.manifest";
import {
	RECEIVING_COMMAND_DEFINITIONS,
	RECEIVING_QUERY_DEFINITIONS,
} from "../src/kernel/operations/registry";

/**
 * Reviewed projection fixture — the drift lock.
 * Any registry change must be reflected here deliberately.
 */
const EXPECTED_COMMANDS = {
	"receiving.receipt.create": "receiving.receipt.create",
	"receiving.receipt.line.add": "receiving.receipt.update",
	"receiving.receipt.post": "receiving.receipt.post",
	"receiving.receipt.cancel": "receiving.receipt.cancel",
	"receiving.receipt.reverse": "receiving.receipt.reverse",
	"receiving.discrepancy.record": "receiving.discrepancy.record",
	"receiving.discrepancy.resolve": "receiving.discrepancy.resolve",
} as const;

const EXPECTED_QUERIES = {
	"receiving.receipt.get": "receiving.receipt.read",
	"receiving.receipt.list": "receiving.receipt.read",
	"receiving.inventory.exceptions": "receiving.receipt.read",
} as const;

describe("receiving registry projection", () => {
	it("projects the reviewed command authorization map into the manifest", () => {
		expect({ ...receivingModuleManifest.authorization.commands }).toEqual(
			EXPECTED_COMMANDS,
		);
		expect([...receivingModuleManifest.owns.commands].sort()).toEqual(
			Object.keys(EXPECTED_COMMANDS).sort(),
		);
	});

	it("projects the reviewed query authorization map into the manifest", () => {
		expect({ ...receivingModuleManifest.authorization.queries }).toEqual(
			EXPECTED_QUERIES,
		);
		expect([...receivingModuleManifest.owns.queries].sort()).toEqual(
			Object.keys(EXPECTED_QUERIES).sort(),
		);
	});

	it("declares only catalogued permissions in the registry", () => {
		const catalog = new Set<string>(receivingModuleManifest.permissions.codes);
		for (const definition of [
			...RECEIVING_COMMAND_DEFINITIONS,
			...RECEIVING_QUERY_DEFINITIONS,
		]) {
			expect(catalog.has(definition.permission)).toBe(true);
		}
	});

	it("gives every operation exactly one feature owner and unique identity", () => {
		const seen = new Set<string>();
		for (const definition of [
			...RECEIVING_COMMAND_DEFINITIONS,
			...RECEIVING_QUERY_DEFINITIONS,
		]) {
			expect(seen.has(definition.id)).toBe(false);
			seen.add(definition.id);
			expect(definition.owner.length).toBeGreaterThan(0);
		}
		expect(seen.size).toBe(
			receivingModuleManifest.owns.commands.length +
				receivingModuleManifest.owns.queries.length,
		);
	});
});
