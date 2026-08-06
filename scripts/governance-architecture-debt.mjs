#!/usr/bin/env node
/**
 * Architecture-debt fixtures for HR and Payroll must keep targetInvariant zero
 * and never treat baseline items as an allowlist (bridging B7
 * `governance:architecture-debt`). Does not regenerate debt — only enforces
 * the committed fixture policy shape CI already relies on via package tests.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const fixtures = [
	"packages/erp/human-resources/__tests__/fixtures/architecture-debt.fixture.json",
	"packages/erp/payroll/__tests__/fixtures/architecture-debt.fixture.json",
];

const violations = [];

for (const relative of fixtures) {
	const debt = JSON.parse(readFileSync(join(root, relative), "utf8"));
	if (debt.schemaVersion !== 1) {
		violations.push(`${relative}: expected schemaVersion 1`);
	}
	if (
		debt.policy?.targetInvariant !==
		"zero architecture debt in every category"
	) {
		violations.push(
			`${relative}: policy.targetInvariant must remain zero architecture debt`,
		);
	}
	if (
		debt.policy?.baselineDisposition !==
		"measured debt, never an allowlist"
	) {
		violations.push(
			`${relative}: policy.baselineDisposition must reject allowlist semantics`,
		);
	}
	for (const category of debt.categories ?? []) {
		if (category.target !== 0) {
			violations.push(
				`${relative}: category ${category.key} target is ${category.target}, expected 0`,
			);
		}
	}
}

if (violations.length > 0) {
	console.error("governance:architecture-debt FAILED");
	for (const violation of violations) {
		console.error(`  ${violation}`);
	}
	process.exit(1);
}

console.log(
	`governance:architecture-debt OK (${fixtures.length} fixtures; target zero; no allowlist)`,
);
