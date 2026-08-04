import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Scaffold-residue gate (GOV-REG-3).
 *
 * A package generator writes placeholder prose that a human is expected to
 * replace before the package carries real capability. When a generator is run
 * against a package that already exists, that prose reappears — and it is the
 * one artifact that distinguishes "overwrote live work" from "legitimately
 * narrowed the surface". Both look like a large deletion in review.
 *
 * This happened once, and cost the repository ~57k lines: 19b00b30 replaced a
 * populated @afenda/corporate-administration with a generated scaffold, deleted
 * its PRD/roadmap/slices, left the consuming app untouched, and reverted the
 * README to "Generated ERP package scaffold. Fill semantic owners before
 * activation." apps/web stopped compiling for nine days and nothing reported it.
 *
 * The rule is deliberately narrow:
 *
 *   A workspace package that any other workspace file imports must not carry
 *   generator placeholder text.
 *
 * NOT "no package may carry placeholder text". A freshly generated package with
 * no consumers is exactly what a scaffold is for, and failing that would make
 * the generator unusable. Consumption is the signal that a human already
 * depended on this package meaning something.
 *
 * This does not duplicate typecheck. Typecheck proves consumers still resolve;
 * it says nothing about *why* they stopped, and it is slow enough to live in a
 * different CI lane — the lane that did not run when this incident landed.
 */

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "..");

/**
 * Generator placeholder markers, as data.
 *
 * Each entry is text a generator emits and a human is expected to delete. Add a
 * marker here when a new generator template introduces one; do not encode
 * generator-specific logic in the walk.
 */
const PLACEHOLDER_MARKERS = [
	"Generated ERP package scaffold",
	// Keep the shortest distinguishing form: a longer variant of the same
	// sentence would double-report the identical defect.
	"Fill semantic owners",
	"TODO: describe this package",
	"<PACKAGE_NAME>",
	"<CAPABILITY>",
];

/** Files a generator stubs and a human is expected to author. */
const INSPECTED_FILES = ["README.md", "PRD.md"];

const SKIPPED = new Set([
	".git",
	".next",
	".turbo",
	"coverage",
	"dist",
	"node_modules",
]);

const SOURCE_EXTENSIONS = new Set([".cts", ".mts", ".ts", ".tsx"]);

function posix(value) {
	return value.replaceAll("\\", "/");
}

function walk(directory, visit) {
	if (!existsSync(directory)) {
		return;
	}
	for (const name of readdirSync(directory)) {
		if (SKIPPED.has(name)) {
			continue;
		}
		const file = join(directory, name);
		const stats = statSync(file);
		if (stats.isDirectory()) {
			walk(file, visit);
		} else if (stats.isFile()) {
			visit(file);
		}
	}
}

/** Workspace package manifests, as `{ name, directory }`. */
function workspacePackages(root) {
	const found = [];
	for (const band of ["packages", "apps"]) {
		const bandDirectory = join(root, band);
		if (!existsSync(bandDirectory)) {
			continue;
		}
		// packages/<band>/<leaf> is two levels; apps/<leaf> is one.
		const depth = band === "packages" ? 2 : 1;
		for (const directory of directoriesAtDepth(bandDirectory, depth)) {
			const manifestPath = join(directory, "package.json");
			if (!existsSync(manifestPath)) {
				continue;
			}
			const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
			if (typeof manifest.name === "string") {
				found.push({ name: manifest.name, directory });
			}
		}
	}
	return found;
}

function directoriesAtDepth(baseDirectory, depth) {
	if (depth === 0) {
		return [baseDirectory];
	}
	const found = [];
	for (const name of readdirSync(baseDirectory)) {
		if (SKIPPED.has(name)) {
			continue;
		}
		const child = join(baseDirectory, name);
		if (statSync(child).isDirectory()) {
			found.push(...directoriesAtDepth(child, depth - 1));
		}
	}
	return found;
}

/**
 * Package names imported by any workspace source file outside their own package.
 *
 * A package that imports itself does not count: self-reference is not evidence
 * that anyone depends on the package meaning something.
 */
function consumedPackageNames(root, packages) {
	const consumed = new Set();
	const byDirectory = packages.map((packageEntry) => ({
		...packageEntry,
		relativeDirectory: `${posix(relative(root, packageEntry.directory))}/`,
	}));

	for (const band of ["apps", "packages"]) {
		walk(join(root, band), (file) => {
			if (!SOURCE_EXTENSIONS.has(extensionOf(file))) {
				return;
			}
			const relativeFile = posix(relative(root, file));
			const source = readFileSync(file, "utf8");
			for (const candidate of byDirectory) {
				if (relativeFile.startsWith(candidate.relativeDirectory)) {
					continue; // own source
				}
				if (
					source.includes(`"${candidate.name}"`) ||
					source.includes(`'${candidate.name}'`)
				) {
					consumed.add(candidate.name);
				}
			}
		});
	}
	return consumed;
}

function extensionOf(file) {
	const index = file.lastIndexOf(".");
	return index === -1 ? "" : file.slice(index);
}

/**
 * @param {string} root repository root
 * @returns {string[]} sorted violations, empty when clean
 */
export function checkPackageScaffoldResidue(root) {
	const violations = [];
	const packages = workspacePackages(root);
	const consumed = consumedPackageNames(root, packages);

	for (const packageEntry of packages) {
		if (!consumed.has(packageEntry.name)) {
			continue; // unconsumed scaffold is exactly what a generator is for
		}
		for (const fileName of INSPECTED_FILES) {
			const filePath = join(packageEntry.directory, fileName);
			if (!existsSync(filePath)) {
				continue;
			}
			const contents = readFileSync(filePath, "utf8");
			for (const marker of PLACEHOLDER_MARKERS) {
				if (contents.includes(marker)) {
					violations.push(
						`${posix(relative(root, filePath))}: consumed package carries generator placeholder "${marker}"`,
					);
				}
			}
		}
	}

	return violations.toSorted();
}

function main() {
	const violations = checkPackageScaffoldResidue(REPOSITORY_ROOT);
	if (violations.length > 0) {
		console.error("check-package-scaffold-residue: FAIL");
		for (const violation of violations) {
			console.error(`  - ${violation}`);
		}
		console.error(
			"\nA consumed package was overwritten by a generator, or a scaffold was published before its owners were authored.",
		);
		process.exitCode = 1;
		return;
	}
	console.log("check-package-scaffold-residue: ok");
}

const entry = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entry && import.meta.url === pathToFileURL(entry).href) {
	main();
}
