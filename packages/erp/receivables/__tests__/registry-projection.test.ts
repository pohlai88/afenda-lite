import { describe, expect, it } from "vitest";

import { receivablesModuleManifest } from "../src/composition/module.manifest";
import {
	RECEIVABLES_COMMAND_DEFINITIONS,
	RECEIVABLES_QUERY_DEFINITIONS,
} from "../src/kernel/operations/registry";

/**
 * Reviewed projection fixture — the drift lock.
 * Any registry change must be reflected here deliberately.
 */
const EXPECTED_COMMANDS = {
	"receivables.invoice.create": "receivables.invoice.create",
	"receivables.invoice.line.add": "receivables.invoice.update",
	"receivables.invoice.post": "receivables.invoice.post",
	"receivables.credit_note.issue": "receivables.credit_note.issue",
	"receivables.receipt.apply": "receivables.receipt.apply",
	"receivables.receipt_application.reverse":
		"receivables.receipt_application.reverse",
	"receivables.invoice.cancel": "receivables.invoice.cancel",
	"receivables.invoice.close": "receivables.invoice.close",
} as const;

const EXPECTED_QUERIES = {
	"receivables.invoice.get": "receivables.invoice.read",
	"receivables.invoice.list": "receivables.invoice.read",
	"receivables.balance.get": "receivables.balance.read",
	"receivables.aging.get": "receivables.aging.read",
} as const;

describe("receivables registry projection", () => {
	it("projects the reviewed command authorization map into the manifest", () => {
		expect({ ...receivablesModuleManifest.authorization.commands }).toEqual(
			EXPECTED_COMMANDS,
		);
		expect([...receivablesModuleManifest.owns.commands].sort()).toEqual(
			Object.keys(EXPECTED_COMMANDS).sort(),
		);
	});

	it("projects the reviewed query authorization map into the manifest", () => {
		expect({ ...receivablesModuleManifest.authorization.queries }).toEqual(
			EXPECTED_QUERIES,
		);
		expect([...receivablesModuleManifest.owns.queries].sort()).toEqual(
			Object.keys(EXPECTED_QUERIES).sort(),
		);
	});

	it("declares only catalogued permissions in the registry", () => {
		const catalog = new Set<string>(
			receivablesModuleManifest.permissions.codes,
		);
		for (const definition of [
			...RECEIVABLES_COMMAND_DEFINITIONS,
			...RECEIVABLES_QUERY_DEFINITIONS,
		]) {
			expect(catalog.has(definition.permission)).toBe(true);
		}
	});

	it("gives every operation exactly one feature owner and unique identity", () => {
		const seen = new Set<string>();
		for (const definition of [
			...RECEIVABLES_COMMAND_DEFINITIONS,
			...RECEIVABLES_QUERY_DEFINITIONS,
		]) {
			expect(seen.has(definition.id)).toBe(false);
			seen.add(definition.id);
			expect(definition.owner.length).toBeGreaterThan(0);
		}
		expect(seen.size).toBe(
			receivablesModuleManifest.owns.commands.length +
				receivablesModuleManifest.owns.queries.length,
		);
	});
});
