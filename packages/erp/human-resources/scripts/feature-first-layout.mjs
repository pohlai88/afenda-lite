import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const sourceRoot = path.join(packageRoot, "src");
const apply = process.argv.includes("--apply");
const ADAPTER_PATH = /^src\/adapters\/(drizzle|memory)\/(.+)$/;
const SCHEMA_PATH = /^src\/schemas\/(.+)$/;
const STORE_PATH = /^src\/store\/(.+)$/;
const AUTHORIZATION_POLICY_PATH = /^src\/shared\/authorization-policies\/(.+)$/;
const SHARED_PATH = /^src\/shared\/(.+)$/;
const ROOT_FILE_PATH = /^src\/([^/]+)$/;
const TOP_DIRECTORY_PATH = /^src\/([^/]+)\/(.+)$/;
const TEXT_FILE_EXTENSION = /\.(?:ts|md|json|tsv)$/;
const TYPESCRIPT_EXTENSION = /\.ts$/;

const featureDirectories = new Map([
	["bulk", "bulk-import"],
	["bulk-export", "bulk-export"],
	["bulk-jobs", "bulk-jobs"],
	["compensation-benefits", "compensation-benefits"],
	["compliance", "compliance"],
	["employee-relations", "employee-relations"],
	["employment-lifecycle", "employment-lifecycle"],
	["handoff", "payroll-handoff"],
	["hire-orchestration", "hire-to-employee"],
	["learning", "learning"],
	["leave", "leave"],
	["lifecycle", "employment-lifecycle"],
	["organization", "organization"],
	["performance", "performance"],
	["privacy", "privacy"],
	["recruitment", "recruitment"],
	["reporting", "reporting"],
	["talent", "talent"],
	["time", "time"],
	["workforce-planning", "workforce-planning"],
]);

const domainByLayerName = new Map([
	["compensation", "compensation-benefits"],
	["compensation-benefits", "compensation-benefits"],
	["compliance", "compliance"],
	["employee-relations", "employee-relations"],
	["hire-orchestration", "hire-to-employee"],
	["learning", "learning"],
	["leave", "leave"],
	["lifecycle", "employment-lifecycle"],
	["organization", "organization"],
	["performance", "performance"],
	["recruitment", "recruitment"],
	["reporting", "reporting"],
	["talent", "talent"],
	["time", "time"],
	["workforce-planning", "workforce-planning"],
]);

const slash = (value) => value.replaceAll("\\", "/");
const sourceRelative = (absolute) =>
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

function adapterFeature(name) {
	if (
		[
			"benefit-methods-drizzle",
			"compensation-review-cycle-drizzle",
			"employee-compensation-lifecycle-drizzle",
		].includes(name)
	) {
		return "compensation-benefits";
	}
	if (
		name.startsWith("compensation-") ||
		name.startsWith("employee-compensation-")
	) {
		return "compensation-benefits";
	}
	if (name.startsWith("leave-")) {
		return "leave";
	}
	if (name.startsWith("time-")) {
		return "time";
	}
	if (name === "assignment-context-query") {
		return "workforce-records/employment";
	}
	if (name === "bulk-checkpoint") {
		return "bulk-import";
	}
	if (name === "bulk-jobs") {
		return "bulk-jobs";
	}
	if (name === "core") {
		return "workforce-records/employment";
	}
	if (name === "identity") {
		return "workforce-records/identity-resolution";
	}
	if (name === "payroll-delivery") {
		return "payroll-handoff/delivery";
	}
	if (name === "reliability") {
		return "../kernel/reliability";
	}
	if (name === "work-calendar-lookup") {
		return "time";
	}
	if (name === "workforce-foundation") {
		return "workforce-records/identity";
	}
	return domainByLayerName.get(name);
}

function schemaFeature(name) {
	if (name === "core") {
		return "workforce-records/employment";
	}
	if (name === "workforce-foundation") {
		return "workforce-records/identity";
	}
	return domainByLayerName.get(name);
}

function storeFeature(name) {
	if (name === "core") {
		return "workforce-records/employment";
	}
	if (name === "identity") {
		return "workforce-records/identity-resolution";
	}
	if (name === "workforce-foundation") {
		return "workforce-records/identity";
	}
	return domainByLayerName.get(name);
}

function mapAdapter(relative) {
	const match = relative.match(ADAPTER_PATH);
	if (!match) {
		return;
	}
	const [, kind, tail] = match;
	const extension = path.posix.extname(tail);
	const name = path.posix.basename(tail, extension);
	if (["AUDIT", "MIGRATION", "VALIDATION"].includes(name)) {
		return `src/composition/adapters/${kind}/${tail}`;
	}
	if (["compose", "coverage", "index", "shared", "store"].includes(name)) {
		return `src/composition/adapters/${kind}/${tail}`;
	}
	const feature = adapterFeature(name);
	if (!feature) {
		throw new Error(`No feature owner for adapter: ${relative}`);
	}
	if (feature.startsWith("../kernel/")) {
		return `src/kernel/${feature.slice(10)}/adapters/${kind}.ts`;
	}
	return `src/features/${feature}/adapters/${name}.${kind}${extension}`;
}

function mapSchema(relative) {
	const match = relative.match(SCHEMA_PATH);
	if (!match) {
		return;
	}
	const [, tail] = match;
	if (["INTEGRATION.md", "README.md", "VALIDATION.md"].includes(tail)) {
		return `src/kernel/validation/${tail}`;
	}
	if (["common.ts", "index.ts", "org-context.ts"].includes(tail)) {
		return `src/kernel/validation/${tail}`;
	}
	if (tail.startsWith("talent/")) {
		return `src/features/talent/schemas/${tail.slice(7)}`;
	}
	const name = path.posix.basename(tail, path.posix.extname(tail));
	const feature = schemaFeature(name);
	if (!feature) {
		throw new Error(`No feature owner for schema: ${relative}`);
	}
	return `src/features/${feature}/schema.ts`;
}

function mapStore(relative) {
	const match = relative.match(STORE_PATH);
	if (!match) {
		return;
	}
	const [, tail] = match;
	if (["README.md", "VALIDATION.tsv", "index.ts"].includes(tail)) {
		return `src/composition/store/${tail}`;
	}
	const name = path.posix.basename(tail, path.posix.extname(tail));
	const feature = storeFeature(name);
	if (!feature) {
		throw new Error(`No feature owner for store: ${relative}`);
	}
	return `src/features/${feature}/store-contract.ts`;
}

const kernelSharedGroups = new Map([
	["audit-facts.ts", "emissions"],
	["event-payload.ts", "emissions"],
	["mutation-meta.ts", "emissions"],
	["authorization-policy-helpers.ts", "authorization"],
	["authorization-policy-ids.ts", "authorization"],
	["authorization-policy-types.ts", "authorization"],
	["authorization-resource-kind.ts", "authorization"],
	["authorization-types.ts", "authorization"],
	["contextual-authorization.ts", "authorization"],
	["manifest-permission.ts", "authorization"],
	["run-authorized-operation.ts", "authorization"],
	["subject-aware-authorization.ts", "authorization"],
	["effective-dates.ts", "temporal"],
	["effective-lineage.ts", "temporal"],
	["effective-range.ts", "temporal"],
	["field-projection.ts", "privacy"],
	["sensitive-field-types.ts", "privacy"],
	["sensitivity-types.ts", "privacy"],
	["fingerprint.ts", "identity"],
	["exact-decimal.ts", "numeric"],
]);

function mapShared(relative) {
	const policy = relative.match(AUTHORIZATION_POLICY_PATH);
	if (policy) {
		const name = path.posix.basename(policy[1], path.posix.extname(policy[1]));
		if (["create-scoped-policy", "index", "manifest-only"].includes(name)) {
			return `src/kernel/authorization/policies/${policy[1]}`;
		}
		const feature =
			name === "employee-profile" || name === "employee-subject"
				? "workforce-records/employment"
				: (domainByLayerName.get(name) ?? name);
		return `src/features/${feature}/authorization/${name}.ts`;
	}
	const match = relative.match(SHARED_PATH);
	if (!match) {
		return;
	}
	const [, tail] = match;
	const group = kernelSharedGroups.get(tail) ?? "execution";
	return `src/kernel/${group}/${tail}`;
}

const rootMoves = new Map([
	["audit-integrity.ts", "kernel/emissions/audit-integrity.ts"],
	["authorization.ts", "kernel/authorization/authorize.ts"],
	["brands.ts", "kernel/identity/brands.ts"],
	["command-options.ts", "kernel/execution/command-options.ts"],
	[
		"effective-truth-adoption.ts",
		"kernel/temporal/effective-truth-adoption.ts",
	],
	[
		"effective-truth-classification.ts",
		"kernel/temporal/effective-truth-classification.ts",
	],
	["error-codes.ts", "kernel/execution/error-codes.ts"],
	[
		"identity-resolver.ts",
		"features/workforce-records/identity-resolution/identity-resolver.ts",
	],
	["internal-api.ts", "composition/internal-api.ts"],
	["module-ids.ts", "kernel/operations/module-ids.ts"],
	["module.manifest.ts", "composition/module.manifest.ts"],
	[
		"mutation-emission-registry.ts",
		"kernel/emissions/mutation-emission-registry.ts",
	],
	["mutation-tables.ts", "kernel/emissions/mutation-tables.ts"],
	["parse-input.ts", "kernel/validation/parse-input.ts"],
	["permissions.ts", "kernel/authorization/permissions.ts"],
	["ports.ts", "kernel/execution/ports.ts"],
	["privacy.ts", "features/privacy/contract.ts"],
	[
		"production-approved-leave-query.ts",
		"composition/production/approved-leave-query.ts",
	],
	[
		"production-assignment-context-query.ts",
		"composition/production/assignment-context-query.ts",
	],
	[
		"production-attendance-source.ts",
		"composition/production/attendance-source.ts",
	],
	["production-ports.ts", "composition/production/ports.ts"],
	["production-work-calendar.ts", "composition/production/work-calendar.ts"],
	["resolve-store.ts", "composition/store/resolve-store.ts"],
	[
		"sensitive-operation-policies.ts",
		"kernel/authorization/sensitive-operation-policies.ts",
	],
	["types.ts", "kernel/contracts.ts"],
]);

function destination(relative) {
	const adapter = mapAdapter(relative);
	if (adapter) {
		return adapter;
	}
	const schema = mapSchema(relative);
	if (schema) {
		return schema;
	}
	const store = mapStore(relative);
	if (store) {
		return store;
	}
	const shared = mapShared(relative);
	if (shared) {
		return shared;
	}
	const root = relative.match(ROOT_FILE_PATH);
	if (root && rootMoves.has(root[1])) {
		return `src/${rootMoves.get(root[1])}`;
	}
	const top = relative.match(TOP_DIRECTORY_PATH);
	if (!top) {
		return relative;
	}
	const [, directory, tail] = top;
	if (directory === "core") {
		return `src/features/workforce-records/employment/${tail}`;
	}
	if (directory === "workforce-foundation") {
		return `src/features/workforce-records/identity/${tail}`;
	}
	const feature = featureDirectories.get(directory);
	if (feature) {
		return `src/features/${feature}/${tail}`;
	}
	if (directory === "emissions") {
		return `src/kernel/emissions/${tail}`;
	}
	if (directory === "observability") {
		return `src/kernel/observability/${tail}`;
	}
	if (directory === "reliability") {
		return `src/kernel/reliability/${tail}`;
	}
	if (directory === "performance-verification") {
		return `src/testing/performance/${tail}`;
	}
	if (directory === "recovery-verification") {
		return `src/testing/recovery/${tail}`;
	}
	if (directory === "integrations") {
		if (tail.startsWith("payroll-delivery/")) {
			return `src/features/payroll-handoff/delivery/${tail.slice(17)}`;
		}
		return `src/composition/integrations/${tail}`;
	}
	return relative;
}

const files = walk(sourceRoot);
const moves = new Map();
for (const absolute of files) {
	const oldRelative = sourceRelative(absolute);
	const newRelative = destination(oldRelative);
	if (newRelative !== oldRelative) {
		moves.set(oldRelative, newRelative);
	}
}

const destinations = new Map();
for (const [oldRelative, newRelative] of moves) {
	if (destinations.has(newRelative)) {
		throw new Error(
			`Destination collision: ${destinations.get(newRelative)} and ${oldRelative} -> ${newRelative}`,
		);
	}
	destinations.set(newRelative, oldRelative);
}

const forbiddenRoots = [
	"adapters",
	"bulk",
	"bulk-export",
	"bulk-jobs",
	"compensation-benefits",
	"compliance",
	"core",
	"emissions",
	"employee-relations",
	"employment-lifecycle",
	"handoff",
	"hire-orchestration",
	"integrations",
	"learning",
	"leave",
	"lifecycle",
	"observability",
	"organization",
	"performance",
	"performance-verification",
	"privacy",
	"recovery-verification",
	"recruitment",
	"reliability",
	"reporting",
	"schemas",
	"shared",
	"store",
	"talent",
	"time",
	"workforce-foundation",
	"workforce-planning",
];

if (!apply) {
	const residue = forbiddenRoots.filter((name) =>
		fs.existsSync(path.join(sourceRoot, name)),
	);
	if (residue.length > 0) {
		throw new Error(
			`Layer-first or unscoped roots remain: ${residue.join(", ")}. Run with --apply.`,
		);
	}
	console.log("Human Resources feature-first layout is valid.");
	process.exit(0);
}

for (const newRelative of moves.values()) {
	const target = path.join(packageRoot, newRelative);
	if (fs.existsSync(target)) {
		throw new Error(`Refusing to overwrite ${newRelative}`);
	}
	fs.mkdirSync(path.dirname(target), { recursive: true });
}

const textFiles = walk(packageRoot).filter(
	(file) =>
		TEXT_FILE_EXTENSION.test(file) && !slash(file).includes("/node_modules/"),
);
const originalText = new Map(
	textFiles.map((file) => [
		sourceRelative(file),
		fs.readFileSync(file, "utf8"),
	]),
);
const knownFiles = new Set(textFiles.map(sourceRelative));

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

for (const directory of forbiddenRoots) {
	const absolute = path.join(sourceRoot, directory);
	if (fs.existsSync(absolute) && walk(absolute).length === 0) {
		fs.rmSync(absolute, { recursive: true });
	}
}

console.log(`Moved ${moves.size} files into the feature-first layout.`);
