import { describe, expect, it } from "vitest";

import { salesModuleManifest } from "../src/composition/module.manifest";
import {
	SALES_COMMAND_PERMISSION,
	SALES_QUERY_PERMISSION,
} from "../src/kernel/execution/authorization";
import {
	SALES_COMMAND_IDS,
	SALES_QUERY_IDS,
} from "../src/kernel/operations/module-ids";
import {
	SALES_COMMAND_DEFINITIONS,
	SALES_QUERY_DEFINITIONS,
	SALES_REGISTRY_COMMAND_IDS,
	SALES_REGISTRY_QUERY_IDS,
} from "../src/kernel/operations/registry";

/**
 * Reviewed projection fixture — the drift lock.
 * Any registry change must be reflected here deliberately.
 */
const EXPECTED_COMMANDS = {
	"sales.pricing.price_book.create": "sales.pricing.manage",
	"sales.pricing.price_book.entry.add": "sales.pricing.manage",
	"sales.pricing.price_book.activate": "sales.pricing.manage",
	"sales.quotation.create": "sales.quotation.create",
	"sales.quotation.line.add": "sales.quotation.update",
	"sales.quotation.submit": "sales.quotation.update",
	"sales.quotation.approve": "sales.quotation.approve",
	"sales.quotation.send": "sales.quotation.update",
	"sales.quotation.accept": "sales.quotation.update",
	"sales.quotation.expire": "sales.quotation.update",
	"sales.quotation.reject": "sales.quotation.approve",
	"sales.quotation.cancel": "sales.quotation.update",
	"sales.quotation.convert": "sales.order.create",
	"sales.order.create": "sales.order.create",
	"sales.order.line.add": "sales.order.update",
	"sales.order.submit": "sales.order.update",
	"sales.order.approve": "sales.order.approve",
	"sales.order.post": "sales.order.post",
	"sales.order.release": "sales.order.release",
	"sales.order.hold.place": "sales.order.hold",
	"sales.order.hold.resolve": "sales.order.hold",
	"sales.order.fulfillment.record": "sales.order.update",
	"sales.order.cancel": "sales.order.cancel",
	"sales.order.close": "sales.order.close",
	"sales.return.create": "sales.return.create",
	"sales.return.line.add": "sales.return.create",
	"sales.return.submit": "sales.return.create",
	"sales.return.approve": "sales.return.approve",
	"sales.return.reject": "sales.return.approve",
	"sales.return.cancel": "sales.return.cancel",
	"sales.return.close": "sales.return.approve",
} as const;

const EXPECTED_QUERIES = {
	"sales.pricing.calculate": "sales.pricing.read",
	"sales.pricing.price_book.get": "sales.pricing.read",
	"sales.pricing.price_book.list": "sales.pricing.read",
	"sales.quotation.get": "sales.quotation.read",
	"sales.quotation.list": "sales.quotation.read",
	"sales.order.get": "sales.order.read",
	"sales.order.list": "sales.order.list",
	"sales.order.fulfillable": "sales.order.read",
	"sales.return.get": "sales.return.read",
	"sales.return.list": "sales.return.read",
} as const;

describe("sales registry projection", () => {
	it("reproduces the historical module-id order exactly (register stability)", () => {
		expect([...SALES_REGISTRY_COMMAND_IDS]).toEqual([...SALES_COMMAND_IDS]);
		expect([...SALES_REGISTRY_QUERY_IDS]).toEqual([...SALES_QUERY_IDS]);
	});

	it("projects the reviewed command authorization map into the manifest", () => {
		expect({ ...salesModuleManifest.authorization.commands }).toEqual(
			EXPECTED_COMMANDS,
		);
		expect({ ...SALES_COMMAND_PERMISSION }).toEqual(EXPECTED_COMMANDS);
		expect([...salesModuleManifest.owns.commands].sort()).toEqual(
			Object.keys(EXPECTED_COMMANDS).sort(),
		);
	});

	it("projects the reviewed query authorization map into the manifest", () => {
		expect({ ...salesModuleManifest.authorization.queries }).toEqual(
			EXPECTED_QUERIES,
		);
		expect({ ...SALES_QUERY_PERMISSION }).toEqual(EXPECTED_QUERIES);
		expect([...salesModuleManifest.owns.queries].sort()).toEqual(
			Object.keys(EXPECTED_QUERIES).sort(),
		);
	});

	it("declares only catalogued permissions in the registry", () => {
		const catalog = new Set<string>(salesModuleManifest.permissions.codes);
		for (const definition of [
			...SALES_COMMAND_DEFINITIONS,
			...SALES_QUERY_DEFINITIONS,
		]) {
			expect(catalog.has(definition.permission)).toBe(true);
		}
	});

	it("gives every operation exactly one feature owner and unique identity", () => {
		const seen = new Set<string>();
		for (const definition of [
			...SALES_COMMAND_DEFINITIONS,
			...SALES_QUERY_DEFINITIONS,
		]) {
			expect(seen.has(definition.id)).toBe(false);
			seen.add(definition.id);
			expect(definition.owner.length).toBeGreaterThan(0);
		}
		expect(seen.size).toBe(
			salesModuleManifest.owns.commands.length +
				salesModuleManifest.owns.queries.length,
		);
	});
});
