#!/usr/bin/env node
/**
 * HR and Payroll must carry the same package-local doc, fixture, export, and
 * root-script surface (bridging B2 / B7 `governance:erp-symmetry`).
 * Reads the filesystem and root package.json directly — no docs-V2 roadmap.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const packages = [
	{
		id: "human-resources",
		dir: "packages/erp/human-resources",
		name: "@afenda/human-resources",
		unitScript: "test:hr:unit",
		parityScript: "test:hr:parity",
		checkScript: "check:hr",
	},
	{
		id: "payroll",
		dir: "packages/erp/payroll",
		name: "@afenda/payroll",
		unitScript: "test:payroll:unit",
		parityScript: "test:payroll:parity",
		checkScript: "check:payroll",
	},
];

const relativeArtifacts = [
	"README.md",
	"AGENTS.md",
	"PRODUCTION_READINESS.md",
	"docs/development-roadmap.md",
	"docs/baseline-verification.md",
	"__tests__/fixtures/public-contract.fixture.json",
	"__tests__/fixtures/registry-projection.fixture.json",
	"__tests__/fixtures/consumer-inventory.fixture.json",
	"__tests__/fixtures/architecture-debt.fixture.json",
	"src/composition/module.manifest.ts",
	"src/testing/index.ts",
];

const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const rootScripts = rootPkg.scripts ?? {};
const violations = [];

for (const pkg of packages) {
	const packageJsonPath = join(root, pkg.dir, "package.json");
	if (!existsSync(packageJsonPath)) {
		violations.push(`missing package.json: ${pkg.dir}`);
		continue;
	}
	const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
	if (packageJson.name !== pkg.name) {
		violations.push(
			`${pkg.dir}: expected name ${pkg.name}, found ${packageJson.name ?? "(missing)"}`,
		);
	}
	const exports = packageJson.exports ?? {};
	for (const entrypoint of [".", "./testing"]) {
		if (exports[entrypoint] === undefined) {
			violations.push(`${pkg.name}: missing exports["${entrypoint}"]`);
		}
	}
	for (const relative of relativeArtifacts) {
		const absolute = join(root, pkg.dir, relative);
		if (!existsSync(absolute)) {
			violations.push(`${pkg.name}: missing ${relative}`);
		}
	}
	for (const script of [pkg.unitScript, pkg.parityScript, pkg.checkScript]) {
		if (typeof rootScripts[script] !== "string") {
			violations.push(`root package.json: missing script "${script}"`);
		}
	}
}

if (violations.length > 0) {
	console.error("governance:erp-symmetry FAILED");
	for (const violation of violations) {
		console.error(`  ${violation}`);
	}
	process.exit(1);
}

console.log(
	`governance:erp-symmetry OK (${packages.map((pkg) => pkg.id).join(" · ")}; ${relativeArtifacts.length} artifacts each)`,
);
