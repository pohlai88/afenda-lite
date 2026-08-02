import { describe, expect, it } from "vitest";

import { accountingModuleManifest } from "../src/composition/module.manifest";
import {
	ACCOUNTING_COMMAND_DEFINITIONS,
	ACCOUNTING_QUERY_DEFINITIONS,
} from "../src/kernel/operations/registry";

/**
 * Reviewed projection fixture — the drift lock.
 * Any registry change must be reflected here deliberately.
 */
const EXPECTED_COMMANDS = {
	"accounting.journal.create": "accounting.journal.create",
	"accounting.journal.line.add": "accounting.journal.create",
	"accounting.journal.post": "accounting.journal.post",
	"accounting.journal.reverse": "accounting.journal.reverse",
	"accounting.period.open": "accounting.period.open",
	"accounting.period.soft_close": "accounting.period.soft_close",
	"accounting.period.close": "accounting.period.close",
	"accounting.period.reopen": "accounting.period.reopen",
	"accounting.chart.create": "accounting.account.manage",
	"accounting.ledger_account.create": "accounting.account.manage",
	"accounting.ledger_account.update": "accounting.account.manage",
	"accounting.ledger_account.deactivate": "accounting.account.manage",
	"accounting.account_role.map": "accounting.account.manage",
	"accounting.posting_profile.upsert": "accounting.posting_rule.manage",
	"accounting.source_event.post": "accounting.journal.post",
	"accounting.exception.resolve": "accounting.exception.manage",
} as const;

const EXPECTED_QUERIES = {
	"accounting.journal.get": "accounting.journal.read",
	"accounting.journal.list": "accounting.journal.read",
	"accounting.trial-balance.get": "accounting.trial_balance.read",
	"accounting.ledger_account.list": "accounting.account.read",
	"accounting.ledger_activity.get": "accounting.ledger.read",
	"accounting.source_trace.get": "accounting.journal.read",
	"accounting.exceptions.list": "accounting.exception.read",
} as const;

describe("accounting registry projection", () => {
	it("projects the reviewed command authorization map into the manifest", () => {
		expect({ ...accountingModuleManifest.authorization.commands }).toEqual(
			EXPECTED_COMMANDS,
		);
		expect([...accountingModuleManifest.owns.commands].sort()).toEqual(
			Object.keys(EXPECTED_COMMANDS).sort(),
		);
	});

	it("projects the reviewed query authorization map into the manifest", () => {
		expect({ ...accountingModuleManifest.authorization.queries }).toEqual(
			EXPECTED_QUERIES,
		);
		expect([...accountingModuleManifest.owns.queries].sort()).toEqual(
			Object.keys(EXPECTED_QUERIES).sort(),
		);
	});

	it("declares only catalogued permissions in the registry", () => {
		const catalog = new Set<string>(accountingModuleManifest.permissions.codes);
		for (const definition of [
			...ACCOUNTING_COMMAND_DEFINITIONS,
			...ACCOUNTING_QUERY_DEFINITIONS,
		]) {
			expect(catalog.has(definition.permission)).toBe(true);
		}
	});

	it("gives every operation exactly one feature owner and unique identity", () => {
		const seen = new Set<string>();
		for (const definition of [
			...ACCOUNTING_COMMAND_DEFINITIONS,
			...ACCOUNTING_QUERY_DEFINITIONS,
		]) {
			expect(seen.has(definition.id)).toBe(false);
			seen.add(definition.id);
			expect(definition.owner.length).toBeGreaterThan(0);
		}
		expect(seen.size).toBe(
			accountingModuleManifest.owns.commands.length +
				accountingModuleManifest.owns.queries.length,
		);
	});
});
