import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const sourceRoot = path.join(packageRoot, "src");
const apply = process.argv.includes("--apply");
const slash = (value) => value.replaceAll("\\", "/");
const relativeToPackage = (absolute) =>
	slash(path.relative(packageRoot, absolute));
const FEATURE_PATH = /^src\/([^/]+)\/(.+)$/;
const ADAPTER_PATH = /^src\/adapters\/(drizzle|memory)\/([^/]+)\.ts$/;
const ROOT_FILE_PATH = /^src\/([^/]+)$/;
const TEXT_FILE_EXTENSION = /\.(?:ts|md|json)$/;
const TYPESCRIPT_EXTENSION = /\.ts$/;

const features = new Set([
	"company",
	"establishments",
	"governance",
	"meetings",
	"officers",
	"resolutions",
]);

const rootMoves = new Map([
	["authorization.ts", "kernel/authorization/authorization.ts"],
	["command-identity.ts", "kernel/execution/command-identity.ts"],
	["command-options.ts", "kernel/execution/command-options.ts"],
	["domain-events.ts", "kernel/emissions/domain-events.ts"],
	["error-codes.ts", "kernel/execution/error-codes.ts"],
	["event-types.ts", "kernel/emissions/event-types.ts"],
	["idempotency.ts", "kernel/execution/idempotency.ts"],
	["module-ids.ts", "kernel/operations/module-ids.ts"],
	["module.manifest.ts", "composition/module.manifest.ts"],
	["mutation-tables.ts", "kernel/emissions/mutation-tables.ts"],
	["parse-input.ts", "kernel/validation/parse-input.ts"],
	["permissions.ts", "kernel/authorization/permissions.ts"],
	["ports.ts", "kernel/execution/ports.ts"],
]);

const domainAdapters = new Map([
	["company", "company"],
	["establishments", "establishments"],
	["governance", "governance"],
	["meetings", "meetings"],
	["officer-compliance", "officers"],
	["officers", "officers"],
	["resolutions", "resolutions"],
]);

function walk(directory) {
	if (!fs.existsSync(directory)) {
		return [];
	}
	return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const absolute = path.join(directory, entry.name);
		return entry.isDirectory() ? walk(absolute) : [absolute];
	});
}

function destination(relative) {
	const featureMatch = relative.match(FEATURE_PATH);
	if (featureMatch && features.has(featureMatch[1])) {
		return `src/features/${featureMatch[1]}/${featureMatch[2]}`;
	}

	const adapterMatch = relative.match(ADAPTER_PATH);
	if (adapterMatch) {
		const [, kind, name] = adapterMatch;
		if (kind === "drizzle" && name === "dependencies") {
			return "src/kernel/infrastructure/drizzle-dependencies.ts";
		}
		if (kind === "drizzle" && name === "errors") {
			return "src/kernel/infrastructure/translate-infrastructure-error.ts";
		}
		const feature = domainAdapters.get(name);
		if (feature) {
			return `src/features/${feature}/adapters/${name}.${kind}.ts`;
		}
		return `src/composition/adapters/${kind}/${name}.ts`;
	}

	if (relative.startsWith("src/internal/")) {
		return `src/kernel/internal/${relative.slice("src/internal/".length)}`;
	}
	if (relative.startsWith("src/operation-registry/")) {
		return `src/kernel/operations/${relative.slice("src/operation-registry/".length)}`;
	}
	const rootMatch = relative.match(ROOT_FILE_PATH);
	if (rootMatch && rootMoves.has(rootMatch[1])) {
		return `src/${rootMoves.get(rootMatch[1])}`;
	}
	return relative;
}

const sourceFiles = walk(sourceRoot);
const moves = new Map();
for (const absolute of sourceFiles) {
	const oldRelative = relativeToPackage(absolute);
	const newRelative = destination(oldRelative);
	if (oldRelative !== newRelative) {
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
	"company",
	"establishments",
	"governance",
	"internal",
	"meetings",
	"officers",
	"operation-registry",
	"resolutions",
];

if (!apply) {
	const residue = forbiddenRoots.filter((name) =>
		fs.existsSync(path.join(sourceRoot, name)),
	);
	if (residue.length > 0) {
		throw new Error(
			`Layer-first roots remain: ${residue.join(", ")}. Run with --apply.`,
		);
	}
	console.log("Corporate Administration feature-first layout is valid.");
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
		relativeToPackage(file),
		fs.readFileSync(file, "utf8"),
	]),
);
const knownFiles = new Set(textFiles.map(relativeToPackage));

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

console.log(
	`Moved ${moves.size} files into the Corporate Administration feature-first layout.`,
);
