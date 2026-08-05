#!/usr/bin/env node
/**
 * Declared-debt gate for Payroll outbox emissions (bridging B6 / B7
 * `governance:emission-drain`).
 *
 * Every entry in PAYROLL_EMISSION_REGISTRY must either declare a non-null
 * dispatcher, or be covered by the architecture-debt fixture category
 * `undrained-outbox-emission`. Silent undrained emissions and stale debt both
 * fail. Reads source + fixture JSON directly.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const registryPath = join(
	root,
	"packages/erp/payroll/src/kernel/emissions/emission-registry.ts",
);
const debtPath = join(
	root,
	"packages/erp/payroll/__tests__/fixtures/architecture-debt.fixture.json",
);

const registrySource = readFileSync(registryPath, "utf8");
const entryBlocks = [
	...registrySource.matchAll(
		/\{\s*event:\s*([A-Z0-9_]+),\s*emittedBy:\s*[A-Z0-9_]+,\s*dispatcher:\s*(null|"[^"]*"|PAYROLL_PLATFORM_EVENT_DISPATCHER_ID)\s*,?\s*\}/g,
	),
];

if (entryBlocks.length === 0) {
	console.error(
		"governance:emission-drain FAILED: no PAYROLL_EMISSION_REGISTRY entries parsed",
	);
	process.exit(1);
}

const undrained = entryBlocks.filter((match) => match[2] === "null");
const drained = entryBlocks.filter((match) => match[2] !== "null");
const debt = JSON.parse(readFileSync(debtPath, "utf8"));
const undrainedCategory = (debt.categories ?? []).find(
	(category) => category.key === "undrained-outbox-emission",
);
const debtItems = undrainedCategory?.items ?? [];
const violations = [];

if (undrainedCategory === undefined) {
	violations.push(
		"architecture-debt.fixture.json missing category undrained-outbox-emission",
	);
}

if (undrained.length > 0 && debtItems.length === 0) {
	violations.push(
		`${undrained.length} emission(s) declare dispatcher: null with no architecture-debt coverage`,
	);
}

if (undrained.length === 0 && debtItems.length > 0) {
	violations.push(
		`all ${drained.length} emissions declare dispatchers but undrained-outbox-emission still lists ${debtItems.length} debt item(s)`,
	);
}

if (undrained.length > 0) {
	const evidenceMentionsRegistry = debtItems.some((item) =>
		String(item.evidence ?? "").includes("emission-registry.ts"),
	);
	if (!evidenceMentionsRegistry) {
		violations.push(
			"undrained-outbox-emission debt must cite emission-registry.ts while dispatchers remain null",
		);
	}
}

if (violations.length > 0) {
	console.error("governance:emission-drain FAILED");
	for (const violation of violations) {
		console.error(`  ${violation}`);
	}
	process.exit(1);
}

if (undrained.length > 0) {
	console.log(
		`governance:emission-drain OK (tracked debt: ${undrained.length}/${entryBlocks.length} undrained; B6 platform drain still open)`,
	);
} else {
	console.log(
		`governance:emission-drain OK (${drained.length} emissions have registered dispatchers)`,
	);
}
