import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const sourceRoot = path.join(packageRoot, "src");
const apply = process.argv.includes("--apply");
const TYPESCRIPT_EXTENSION = /\.ts$/;
const TEXT_FILE_EXTENSION = /\.(?:ts|md|json|mjs)$/;
const ROOT_FILE_PATH = /^src\/([^/]+)$/;
const SHARED_FILE_PATH = /^src\/shared\/(.+)$/;
const TOP_DIRECTORY_PATH = /^src\/([^/]+)\/(.+)$/;

const slash = (value) => value.replaceAll("\\", "/");
const packageRelative = (absolute) =>
	slash(path.relative(packageRoot, absolute));

function walk(directory) {
	if (!fs.existsSync(directory)) {
		return [];
	}
	return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const absolute = path.join(directory, entry.name);
		return entry.isDirectory() ? walk(absolute) : [absolute];
	});
}

const rootMoves = new Map([
	["authorization.ts", "kernel/execution/authorization.ts"],
	["brands.ts", "kernel/identity/brands.ts"],
	["command-options.ts", "kernel/execution/command-options.ts"],
	["module-ids.ts", "kernel/operations/module-ids.ts"],
	["module.manifest.ts", "composition/module.manifest.ts"],
	["mutation-tables.ts", "kernel/emissions/mutation-tables.ts"],
	["operation-registry.ts", "kernel/operations/registry.ts"],
	["parse-input.ts", "kernel/validation/parse-input.ts"],
	["payroll.drizzle.ts", "composition/adapters/drizzle.ts"],
	["payroll.memory.ts", "testing/memory-store.ts"],
	["payroll.store.ts", "composition/store/contract.ts"],
	["permissions.ts", "kernel/execution/permissions.ts"],
	["ports.ts", "kernel/execution/ports.ts"],
	["production-ports.ts", "composition/production/ports.ts"],
	["public-capabilities.ts", "facade/capabilities.ts"],
	["public-contracts.ts", "facade/contracts.ts"],
	["public-execution-context.ts", "facade/context.ts"],
	["resolve-store.ts", "composition/store/resolve-store.ts"],
	["types.ts", "kernel/contracts/projected-types.ts"],
]);

const sharedMoves = new Map([
	["authorized-operation.ts", "kernel/execution/authorized-operation.ts"],
	["common.schema.ts", "kernel/validation/common.schema.ts"],
	["compose-store-slices.ts", "composition/store/compose-slices.ts"],
	["concurrency.ts", "kernel/execution/concurrency.ts"],
	["create-fingerprint.ts", "kernel/identity/create-fingerprint.ts"],
	["effective-date.ts", "kernel/temporal/effective-date.ts"],
	[
		"employee-eligibility.ts",
		"features/workforce-ingress/employee-eligibility.ts",
	],
	["execute-operation.ts", "kernel/execution/execute-operation.ts"],
	["finalized-rule-usage.ts", "features/payroll-setup/finalized-rule-usage.ts"],
	["memory-store-state.ts", "testing/memory-store-state.ts"],
	["money-policy.ts", "kernel/money/money-policy.ts"],
	["money.ts", "kernel/money/money.ts"],
	["persistence-errors.ts", "kernel/execution/persistence-errors.ts"],
	["record-audit.ts", "kernel/execution/record-audit.ts"],
	["rounding-policy.ts", "kernel/money/rounding-policy.ts"],
	["rule-finalized-lock.ts", "features/payroll-setup/rule-finalized-lock.ts"],
	["setup-rule-guards.ts", "features/payroll-setup/setup-rule-guards.ts"],
	["setup-rule-policy.ts", "features/payroll-setup/setup-rule-policy.ts"],
	["source-idempotency.ts", "kernel/identity/source-idempotency.ts"],
]);

const calculationFiles = new Set([
	"calculation-identities.ts",
	"calculation-normalize.ts",
	"calculation-pipeline.ts",
	"calculation-snapshot.ts",
	"calculation.ts",
	"calculation.types.ts",
	"finalization-evidence.ts",
	"production-run-calculator.ts",
]);

function destination(relative) {
	const rootMatch = relative.match(ROOT_FILE_PATH);
	if (rootMatch && rootMoves.has(rootMatch[1])) {
		return `src/${rootMoves.get(rootMatch[1])}`;
	}

	const sharedMatch = relative.match(SHARED_FILE_PATH);
	if (sharedMatch) {
		const target = sharedMoves.get(sharedMatch[1]);
		if (!target) {
			throw new Error(`No semantic owner for ${relative}`);
		}
		return `src/${target}`;
	}

	const topMatch = relative.match(TOP_DIRECTORY_PATH);
	if (!topMatch) {
		return relative;
	}
	const [, directory, tail] = topMatch;

	if (directory === "assignments") {
		return `src/features/employee-assignments/${tail}`;
	}
	if (directory === "reconciliation") {
		return `src/features/reconciliation/${tail}`;
	}
	if (directory === "setup") {
		return `src/features/payroll-setup/${tail}`;
	}
	if (directory === "statutory") {
		return `src/features/statutory-rules/${tail}`;
	}
	if (directory === "outputs") {
		return tail.startsWith("payslip")
			? `src/features/payslips/${tail}`
			: `src/features/calculation/${tail}`;
	}
	if (directory === "inputs") {
		return tail === "normalize-workforce-handoff.ts" ||
			tail === "parse-approved-payroll-handoff.ts"
			? `src/features/workforce-ingress/${tail}`
			: `src/features/variable-inputs/${tail}`;
	}
	if (directory === "runs") {
		return calculationFiles.has(tail)
			? `src/features/calculation/${tail}`
			: `src/features/payroll-runs/${tail}`;
	}
	return relative;
}

const files = walk(sourceRoot);
const moves = new Map();
for (const absolute of files) {
	const oldRelative = packageRelative(absolute);
	const newRelative = destination(oldRelative);
	if (newRelative !== oldRelative) {
		moves.set(oldRelative, newRelative);
	}
}

const destinations = new Map();
for (const [oldRelative, newRelative] of moves) {
	const existing = destinations.get(newRelative);
	if (existing) {
		throw new Error(
			`Destination collision: ${existing} and ${oldRelative} -> ${newRelative}`,
		);
	}
	destinations.set(newRelative, oldRelative);
}

const allowedRoots = new Set([
	"composition",
	"facade",
	"features",
	"index.ts",
	"kernel",
	"testing",
]);

function validateLayout() {
	const residue = fs
		.readdirSync(sourceRoot)
		.filter((entry) => !allowedRoots.has(entry));
	if (residue.length > 0) {
		throw new Error(
			`Non-feature-first Payroll roots remain: ${residue.join(", ")}`,
		);
	}
}

if (!apply) {
	validateLayout();
	console.log("Payroll feature-first layout is valid.");
	process.exit(0);
}

for (const targetRelative of moves.values()) {
	const target = path.join(packageRoot, targetRelative);
	if (fs.existsSync(target)) {
		throw new Error(`Refusing to overwrite ${targetRelative}`);
	}
	fs.mkdirSync(path.dirname(target), { recursive: true });
}

const textFiles = walk(packageRoot).filter(
	(file) =>
		TEXT_FILE_EXTENSION.test(file) && !slash(file).includes("/node_modules/"),
);
const originalText = new Map(
	textFiles.map((file) => [
		packageRelative(file),
		fs.readFileSync(file, "utf8"),
	]),
);
const knownFiles = new Set(textFiles.map(packageRelative));

function resolveLocal(importer, specifier) {
	const base = slash(
		path.posix.normalize(
			path.posix.join(path.posix.dirname(importer), specifier),
		),
	);
	for (const candidate of [base, `${base}.ts`, `${base}/index.ts`]) {
		if (knownFiles.has(candidate)) {
			return candidate;
		}
	}
}

function moduleSpecifier(importer, target) {
	let relative = path.posix
		.relative(path.posix.dirname(importer), target)
		.replace(TYPESCRIPT_EXTENSION, "");
	if (!relative.startsWith(".")) {
		relative = `./${relative}`;
	}
	return relative;
}

for (const [oldRelative, newRelative] of moves) {
	fs.renameSync(
		path.join(packageRoot, oldRelative),
		path.join(packageRoot, newRelative),
	);
}

for (const [oldRelative, content] of originalText) {
	const newRelative = moves.get(oldRelative) ?? oldRelative;
	let rewritten = content.replace(
		/(["'])(\.\.?\/[^"']+)\1/g,
		(whole, quote, specifier) => {
			const oldTarget = resolveLocal(oldRelative, specifier);
			if (!oldTarget) {
				return whole;
			}
			const newTarget = moves.get(oldTarget) ?? oldTarget;
			return `${quote}${moduleSpecifier(newRelative, newTarget)}${quote}`;
		},
	);
	for (const [oldPath, newPath] of moves) {
		rewritten = rewritten.replaceAll(oldPath, newPath);
	}
	const absolute = path.join(packageRoot, newRelative);
	if (rewritten !== content) {
		fs.writeFileSync(absolute, rewritten);
	}
}

for (const directory of fs.readdirSync(sourceRoot)) {
	const absolute = path.join(sourceRoot, directory);
	if (fs.statSync(absolute).isDirectory() && walk(absolute).length === 0) {
		fs.rmSync(absolute, { recursive: true });
	}
}

validateLayout();
console.log(`Moved ${moves.size} files into the Payroll feature-first layout.`);
