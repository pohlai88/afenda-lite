/**
 * Deterministic README VERIFY gate (afenda-readme-diataxis Layer A).
 * Checks: missing package README, relative link resolve, cited pnpm scripts,
 * anti-claim regex, and package.json dep vs "never imports X" contradictions.
 *
 * Does not score Diátaxis prose and does not rewrite README bodies.
 *
 * Usage:
 *   node scripts/check-readme.mjs
 *   node scripts/check-readme.mjs --scope packages/erp
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const ANTI_CLAIMS = [
	{
		id: "mvp-quality",
		re: /\bMVP\b|\bminimum viable\b|\bgood enough later\b/i,
		hint: "Enterprise production bar only — no MVP framing",
	},
];

/** README phrases that deny a workspace dependency while package.json lists it. */
const NEVER_IMPORT_PATTERNS = [
	{
		dep: "@afenda/inventory",
		res: [
			/imports neither[\s\S]{0,120}inventory/i,
			/never imports[\s\S]{0,80}inventory/i,
			/does not import[\s\S]{0,40}@afenda\/inventory/i,
			/imports neither `@afenda\/purchasing` nor inventory/i,
		],
	},
	{
		dep: "@afenda/purchasing",
		res: [
			/never imports[\s\S]{0,80}@afenda\/purchasing/i,
			/does not import[\s\S]{0,40}@afenda\/purchasing/i,
		],
	},
	{
		dep: "@afenda/sales",
		res: [
			/never imports[\s\S]{0,80}@afenda\/sales/i,
			/does not import[\s\S]{0,40}@afenda\/sales/i,
			/never imports[\s\S]{0,40}Sales/i,
		],
	},
];

const FILTER_SCRIPT_RE =
	/pnpm\s+--filter\s+(@afenda\/[a-z0-9-]+)\s+([a-z0-9:_-]+)/gi;
const MD_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;

function parseArgs(argv) {
	let scope = "packages";
	for (let i = 0; i < argv.length; i += 1) {
		if (argv[i] === "--scope" && argv[i + 1]) {
			scope = argv[i + 1];
			i += 1;
		}
	}
	return { scope };
}

function walkMarkdown(dir, out = []) {
	if (!existsSync(dir)) {
		return out;
	}
	for (const name of readdirSync(dir)) {
		if (name === "node_modules" || name === "dist" || name === ".turbo") {
			continue;
		}
		const full = join(dir, name);
		const st = statSync(full);
		if (st.isDirectory()) {
			walkMarkdown(full, out);
		} else if (name === "README.md") {
			out.push(full);
		}
	}
	return out;
}

function listPackageJsonDirs(scopeAbs) {
	const packages = [];
	function walk(dir) {
		if (!existsSync(dir)) {
			return;
		}
		const pkgPath = join(dir, "package.json");
		if (existsSync(pkgPath) && dir !== root) {
			packages.push(dir);
		}
		for (const name of readdirSync(dir)) {
			if (name === "node_modules" || name === "dist" || name === ".turbo") {
				continue;
			}
			const full = join(dir, name);
			if (statSync(full).isDirectory()) {
				walk(full);
			}
		}
	}
	walk(scopeAbs);
	return packages;
}

function buildWorkspacePackageIndex() {
	const index = new Map();
	for (const dir of [
		...listPackageJsonDirs(join(root, "packages")),
		...listPackageJsonDirs(join(root, "apps")),
	]) {
		const pkg = loadPackageJson(dir);
		if (pkg?.name) {
			index.set(pkg.name, pkg);
		}
	}
	return index;
}

function loadPackageJson(dir) {
	try {
		return JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
	} catch {
		return null;
	}
}

function resolveMarkdownTarget(fromFile, href) {
	const cleaned = href.split("#")[0].split("?")[0].trim();
	if (
		cleaned === "" ||
		cleaned.startsWith("http://") ||
		cleaned.startsWith("https://") ||
		cleaned.startsWith("mailto:") ||
		cleaned.startsWith("tel:")
	) {
		return { skip: true };
	}
	if (cleaned.startsWith("/")) {
		return { abs: join(root, cleaned.slice(1)) };
	}
	return { abs: resolve(dirname(fromFile), cleaned) };
}

function collectMissingReadmeIssues(packageDirs, issues) {
	for (const dir of packageDirs) {
		if (!existsSync(join(dir, "README.md"))) {
			issues.push({
				kind: "missing-readme",
				path: relative(root, dir).split(sep).join("/"),
				message: "package.json present but README.md missing",
			});
		}
	}
}

function collectAntiClaimIssues(body, readmePath, issues) {
	for (const claim of ANTI_CLAIMS) {
		if (claim.re.test(body)) {
			issues.push({
				kind: "anti-claim",
				path: readmePath,
				message: `${claim.id}: ${claim.hint}`,
			});
		}
	}
}

function collectLinkIssues(file, body, readmePath, issues) {
	MD_LINK_RE.lastIndex = 0;
	let linkMatch = MD_LINK_RE.exec(body);
	while (linkMatch) {
		const [, , rawHref] = linkMatch;
		const href = rawHref.trim();
		const target = resolveMarkdownTarget(file, href);
		if ("abs" in target && !existsSync(target.abs)) {
			issues.push({
				kind: "broken-link",
				path: readmePath,
				message: `broken link → ${href}`,
			});
		}
		linkMatch = MD_LINK_RE.exec(body);
	}
}

function collectFilterScriptIssues(
	body,
	readmePath,
	pkg,
	workspacePkgs,
	issues,
) {
	FILTER_SCRIPT_RE.lastIndex = 0;
	let scriptMatch = FILTER_SCRIPT_RE.exec(body);
	while (scriptMatch) {
		const [, filterName, scriptName] = scriptMatch;
		const targetPkg =
			(pkg?.name === filterName ? pkg : null) ??
			workspacePkgs.get(filterName) ??
			null;
		if (!targetPkg) {
			issues.push({
				kind: "unknown-filter",
				path: readmePath,
				message: `pnpm --filter ${filterName} — package not found in workspace`,
			});
		} else if (!targetPkg.scripts?.[scriptName]) {
			issues.push({
				kind: "dead-script",
				path: readmePath,
				message: `pnpm --filter ${filterName} ${scriptName} — script missing in package.json`,
			});
		}
		scriptMatch = FILTER_SCRIPT_RE.exec(body);
	}
}

function collectDependencyClaimIssues(body, readmePath, pkg, issues) {
	if (!pkg) {
		return;
	}
	const deps = {
		...(pkg.dependencies ?? {}),
		...(pkg.devDependencies ?? {}),
		...(pkg.peerDependencies ?? {}),
	};
	for (const rule of NEVER_IMPORT_PATTERNS) {
		if (!(rule.dep in deps)) {
			continue;
		}
		for (const pattern of rule.res) {
			if (pattern.test(body)) {
				issues.push({
					kind: "dep-contradiction",
					path: readmePath,
					message: `README denies importing ${rule.dep} but package.json lists it as a dependency`,
				});
				break;
			}
		}
	}
}

function collectReadmeIssues(file, workspacePkgs, issues) {
	const readmePath = relative(root, file).split(sep).join("/");
	const body = readFileSync(file, "utf8");
	const pkg = loadPackageJson(dirname(file));

	collectAntiClaimIssues(body, readmePath, issues);
	collectLinkIssues(file, body, readmePath, issues);
	collectFilterScriptIssues(body, readmePath, pkg, workspacePkgs, issues);
	collectDependencyClaimIssues(body, readmePath, pkg, issues);
}

function collectIssues(scopeRel) {
	const scopeAbs = resolve(root, scopeRel);
	const issues = [];
	const workspacePkgs = buildWorkspacePackageIndex();

	if (!existsSync(scopeAbs)) {
		issues.push({
			kind: "scope-missing",
			path: scopeRel,
			message: `Scope path does not exist: ${scopeRel}`,
		});
		return { issues, readmeCount: 0, packageCount: 0 };
	}

	const pkgDirs = listPackageJsonDirs(scopeAbs);
	collectMissingReadmeIssues(pkgDirs, issues);

	const readmes = walkMarkdown(scopeAbs);
	for (const file of readmes) {
		collectReadmeIssues(file, workspacePkgs, issues);
	}

	return { issues, readmeCount: readmes.length, packageCount: pkgDirs.length };
}

const { scope } = parseArgs(process.argv.slice(2));
const {
	issues: validationIssues,
	readmeCount,
	packageCount,
} = collectIssues(scope);

console.log(
	`check-readme: scope=${scope} packages=${packageCount} readmes=${readmeCount}`,
);

if (validationIssues.length > 0) {
	console.error(`check-readme: FAIL — ${validationIssues.length} issue(s)`);
	for (const issue of validationIssues) {
		console.error(`  [${issue.kind}] ${issue.path}: ${issue.message}`);
	}
	process.exit(1);
}

console.log("check-readme: ok");
process.exit(0);
