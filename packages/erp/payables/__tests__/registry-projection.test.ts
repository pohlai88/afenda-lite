import { describe, expect, it } from "vitest";

import { payablesModuleManifest } from "../src/composition/module.manifest";
import {
	PAYABLES_COMMAND_DEFINITIONS,
	PAYABLES_QUERY_DEFINITIONS,
} from "../src/kernel/operations/registry";

/**
 * Reviewed projection fixture — the drift lock.
 * Any registry change must be reflected here deliberately.
 */
const EXPECTED_COMMANDS = {
	"payables.invoice.create": "payables.manage",
	"payables.invoice.line.add": "payables.manage",
	"payables.invoice.match": "payables.manage",
	"payables.invoice.post": "payables.manage",
	"payables.invoice.cancel": "payables.manage",
	"payables.credit_note.issue": "payables.manage",
	"payables.credit_note.create": "payables.manage",
	"payables.credit_note.line.add": "payables.manage",
	"payables.credit_note.post": "payables.manage",
	"payables.payment.apply": "payables.manage",
	"payables.credit.apply": "payables.manage",
	"payables.payment_application.reverse": "payables.manage",
} as const;

const EXPECTED_QUERIES = {
	"payables.invoice.get": "payables.read",
	"payables.invoice.list": "payables.read",
	"payables.balance.get": "payables.read",
} as const;

describe("payables registry projection", () => {
	it("projects the reviewed command authorization map into the manifest", () => {
		expect({ ...payablesModuleManifest.authorization.commands }).toEqual(
			EXPECTED_COMMANDS,
		);
		expect([...payablesModuleManifest.owns.commands].sort()).toEqual(
			Object.keys(EXPECTED_COMMANDS).sort(),
		);
	});

	it("projects the reviewed query authorization map into the manifest", () => {
		expect({ ...payablesModuleManifest.authorization.queries }).toEqual(
			EXPECTED_QUERIES,
		);
		expect([...payablesModuleManifest.owns.queries].sort()).toEqual(
			Object.keys(EXPECTED_QUERIES).sort(),
		);
	});

	it("declares only catalogued permissions in the registry", () => {
		const catalog = new Set<string>(payablesModuleManifest.permissions.codes);
		for (const definition of [
			...PAYABLES_COMMAND_DEFINITIONS,
			...PAYABLES_QUERY_DEFINITIONS,
		]) {
			expect(catalog.has(definition.permission)).toBe(true);
		}
	});

	it("gives every operation exactly one feature owner and unique identity", () => {
		const seen = new Set<string>();
		for (const definition of [
			...PAYABLES_COMMAND_DEFINITIONS,
			...PAYABLES_QUERY_DEFINITIONS,
		]) {
			expect(seen.has(definition.id)).toBe(false);
			seen.add(definition.id);
			expect(definition.owner.length).toBeGreaterThan(0);
		}
		expect(seen.size).toBe(
			payablesModuleManifest.owns.commands.length +
				payablesModuleManifest.owns.queries.length,
		);
	});
});
