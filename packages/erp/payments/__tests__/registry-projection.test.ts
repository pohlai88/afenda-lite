import { describe, expect, it } from "vitest";

import { paymentsModuleManifest } from "../src/composition/module.manifest";
import { PAYMENTS_PERMISSION_CODES } from "../src/kernel/execution/permissions";
import {
	PAYMENTS_COMMAND_DEFINITIONS,
	PAYMENTS_QUERY_DEFINITIONS,
} from "../src/kernel/operations/registry";

/**
 * Reviewed projection fixture — the drift lock.
 * Any registry change must be reflected here deliberately (HR fixture pattern).
 */
const EXPECTED_COMMANDS = {
	"payments.account.create": "payments.account.manage",
	"payments.method.create": "payments.method.manage",
	"payments.method.update": "payments.method.manage",
	"payments.method.deactivate": "payments.method.manage",
	"payments.method.seed_defaults": "payments.method.manage",
	"payments.payment.create": "payments.payment.create",
	"payments.payment.post": "payments.payment.post",
	"payments.payment.reverse": "payments.payment.reverse",
	"payments.transfer.create_and_post": "payments.transfer.post",
	"payments.refund.post": "payments.refund.post",
	"payments.application_instruction.add":
		"payments.application_instruction.manage",
	"payments.application_instruction.mark_applied":
		"payments.application_instruction.manage",
	"payments.application_instruction.mark_rejected":
		"payments.application_instruction.manage",
} as const;

const EXPECTED_QUERIES = {
	"payments.account.list": "payments.account.read",
	"payments.method.list": "payments.method.read",
	"payments.payment.get": "payments.payment.read",
	"payments.payment.list": "payments.payment.read",
	"payments.availability.get": "payments.availability.read",
} as const;

describe("payments registry projection", () => {
	it("projects the reviewed command authorization map into the manifest", () => {
		expect({ ...paymentsModuleManifest.authorization.commands }).toEqual(
			EXPECTED_COMMANDS,
		);
		expect([...paymentsModuleManifest.owns.commands].sort()).toEqual(
			Object.keys(EXPECTED_COMMANDS).sort(),
		);
	});

	it("projects the reviewed query authorization map into the manifest", () => {
		expect({ ...paymentsModuleManifest.authorization.queries }).toEqual(
			EXPECTED_QUERIES,
		);
		expect([...paymentsModuleManifest.owns.queries].sort()).toEqual(
			Object.keys(EXPECTED_QUERIES).sort(),
		);
	});

	it("declares only catalogued permissions in the registry", () => {
		const catalog = new Set<string>(PAYMENTS_PERMISSION_CODES);
		for (const definition of [
			...PAYMENTS_COMMAND_DEFINITIONS,
			...PAYMENTS_QUERY_DEFINITIONS,
		]) {
			expect(catalog.has(definition.permission)).toBe(true);
			for (const additional of definition.additionalPermissions ?? []) {
				expect(catalog.has(additional)).toBe(true);
			}
		}
	});

	it("gives every operation exactly one feature owner and unique identity", () => {
		const seen = new Set<string>();
		for (const definition of [
			...PAYMENTS_COMMAND_DEFINITIONS,
			...PAYMENTS_QUERY_DEFINITIONS,
		]) {
			expect(seen.has(definition.id)).toBe(false);
			seen.add(definition.id);
			expect(definition.owner.length).toBeGreaterThan(0);
		}
		expect(seen.size).toBe(
			paymentsModuleManifest.owns.commands.length +
				paymentsModuleManifest.owns.queries.length,
		);
	});
});
