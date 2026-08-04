#!/usr/bin/env node
/**
 * A module manifest with lifecycle "active" may not list a required
 * dependency whose manifest declares lifecycle "scaffolded" (A1,
 * docs/erp/hr-payroll-bridging.md). Reads manifests directly — no
 * docs-V2 roadmap dependency.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const erpRoot = "packages/erp";
const manifests = new Map();
for (const dir of readdirSync(erpRoot)) {
	const file = join(erpRoot, dir, "src", "composition", "module.manifest.ts");
	if (!existsSync(file)) continue;
	const src = readFileSync(file, "utf8");
	const id = src.match(/id:\s*"([^"]+)"/)?.[1];
	const lifecycle = src.match(/lifecycle:\s*"([^"]+)"/)?.[1];
	const requiredBlock = src.match(/required:\s*\[([^\]]*)\]/s)?.[1] ?? "";
	const required = [...requiredBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
	if (id && lifecycle) manifests.set(id, { lifecycle, required, file });
}
const violations = [];
for (const [id, m] of manifests) {
	if (m.lifecycle !== "active") continue;
	for (const dep of m.required) {
		const target = manifests.get(dep);
		if (target && target.lifecycle === "scaffolded") {
			violations.push(`${id} (active) requires ${dep} (scaffolded) — ${m.file}`);
		}
	}
}
if (violations.length > 0) {
	console.error("governance:lifecycle-coupling FAILED");
	for (const v of violations) console.error(`  ${v}`);
	process.exit(1);
}
console.log(`governance:lifecycle-coupling OK (${manifests.size} manifests)`);
