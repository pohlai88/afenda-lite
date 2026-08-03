#!/usr/bin/env node
/**
 * pnpm check:governance — registry-driven governance dispatcher (GOV-REG-1).
 *
 * CI invokes this once. It reads `scripts/lib/governance-gates.mjs` and runs the
 * registered gates for the requested tier, each in its own child process.
 *
 * Child-process isolation is deliberate: importing every checker into one Node
 * process would share a module cache, share mutable globals, let one gate's
 * environment mutation leak into the next, and let a single `process.exit`
 * terminate the whole run. Isolation costs milliseconds and buys attribution.
 *
 * Usage:
 *   pnpm check:governance                      # all non-local tiers
 *   pnpm check:governance --tier ci-required
 *   pnpm check:governance --gate package-policy
 *   pnpm check:governance --list
 *   pnpm check:governance --verify-registry    # structure + CI parity only
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	GATE_TIERS,
	GOVERNANCE_GATES,
	parseGateCommand,
	validateGateRegistry,
} from "./lib/governance-gates.mjs";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const WORKFLOW_DIR = path.join(repoRoot, ".github/workflows");
const DEFAULT_TIMEOUT_SECONDS = 600;
const WORKFLOW_FILE = /\.ya?ml$/;
/** A workflow `run:` block, up to the next step or sibling key. */
const RUN_STEP = /^\s*run:\s*([\s\S]*?)(?=\n\s*-|\n\s*\w+:|$)/gm;
/** A repository script path inside a package-script command line. */
const SCRIPT_FILE = /scripts\/[A-Za-z0-9._/-]+\.(?:mjs|mts|cjs|js|ts)/;
const WHITESPACE = /\s+/;
/**
 * The composition root. These legitimately reference every gate command — the
 * dispatcher executes them and the registry declares them.
 */
const EXCLUDED_FROM_NESTING_SCAN = new Set([
	"scripts/check-governance.mjs",
	"scripts/lib/governance-gates.mjs",
]);

function argValue(flag) {
	const index = process.argv.indexOf(flag);
	return index === -1 ? undefined : process.argv[index + 1];
}

function readJson(filePath) {
	return JSON.parse(readFileSync(filePath, "utf8"));
}

/** Package script targeted by a gate command, or undefined if unresolvable. */
function resolveGateScript(gate) {
	const parsed = parseGateCommand(gate.command);
	if (!parsed) {
		return;
	}
	if (parsed.scope === "root") {
		const manifest = readJson(path.join(repoRoot, "package.json"));
		return manifest.scripts?.[parsed.script] ? parsed.script : undefined;
	}

	// Workspace package — locate it by declared name.
	const workspaceManifests = [
		"packages/*/*/package.json",
		"apps/*/package.json",
	];
	for (const pattern of workspaceManifests) {
		const [root, mid] = pattern.split("/");
		const baseDir = path.join(repoRoot, root);
		if (!existsSync(baseDir)) {
			continue;
		}
		const candidates = collectManifests(baseDir, mid === "*" ? 2 : 1);
		for (const candidate of candidates) {
			const manifest = readJson(candidate);
			if (manifest.name === parsed.packageName) {
				return manifest.scripts?.[parsed.script] ? parsed.script : undefined;
			}
		}
	}
}

/** package.json paths at exactly `depth` directory levels below `baseDir`. */
function collectManifests(baseDir, depth) {
	if (depth === 0) {
		const manifest = path.join(baseDir, "package.json");
		return existsSync(manifest) ? [manifest] : [];
	}
	const found = [];
	for (const entry of readdirSync(baseDir)) {
		const absolute = path.join(baseDir, entry);
		if (statSync(absolute).isDirectory()) {
			found.push(...collectManifests(absolute, depth - 1));
		}
	}
	return found;
}

/** Every `run:` command in every workflow file. */
function workflowRunCommands() {
	if (!existsSync(WORKFLOW_DIR)) {
		return [];
	}
	const commands = [];
	for (const file of readdirSync(WORKFLOW_DIR)) {
		if (!WORKFLOW_FILE.test(file)) {
			continue;
		}
		const source = readFileSync(path.join(WORKFLOW_DIR, file), "utf8");
		for (const match of source.matchAll(RUN_STEP)) {
			commands.push({ file, run: match[1] });
		}
	}
	return commands;
}

/** Repository script file referenced by a package-script command line. */
function scriptFileFor(commandLine) {
	const match = SCRIPT_FILE.exec(commandLine ?? "");
	return match ? match[0] : undefined;
}

const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT = /(^|[^:])\/\/[^\n]*/g;

function stripComments(source) {
	return source.replace(BLOCK_COMMENT, "").replace(LINE_COMMENT, "$1");
}

/**
 * Sources to scan for nested gate execution.
 *
 * Two populations matter: the scripts backing registered gates, and the scripts
 * CI invokes directly. The duplicate this rule exists to prevent lived in the
 * second — `governance-packages.mjs` is a CI step, not a registered gate, so
 * scanning only gate implementations would have missed it entirely.
 *
 * Comments are stripped: a script that documents another gate by name is not
 * invoking it.
 */
function gateScriptSources() {
	const manifest = readJson(path.join(repoRoot, "package.json"));
	const sources = [];
	const seen = new Set();

	const add = (relativeFile, gateId) => {
		if (!relativeFile || seen.has(relativeFile)) {
			return;
		}
		const absolute = path.join(repoRoot, relativeFile);
		if (!existsSync(absolute)) {
			return;
		}
		seen.add(relativeFile);
		sources.push({
			file: relativeFile,
			source: stripComments(readFileSync(absolute, "utf8")),
			gateId,
		});
	};

	for (const gate of GOVERNANCE_GATES) {
		const script = resolveGateScript(gate);
		add(scriptFileFor(manifest.scripts?.[script]), gate.id);
	}

	// Scripts CI invokes directly. The dispatcher and the registry itself are
	// excluded: they are the composition root and legitimately name every gate.
	for (const { run } of workflowRunCommands()) {
		for (const token of run.split(WHITESPACE)) {
			const scriptCommand = manifest.scripts?.[token];
			const file = scriptFileFor(scriptCommand);
			if (file && !EXCLUDED_FROM_NESTING_SCAN.has(file)) {
				add(file, undefined);
			}
		}
	}

	return sources;
}

/** Wire real filesystem and workflow IO into the pure registry validator. */
function verifyRegistry() {
	return validateGateRegistry(GOVERNANCE_GATES, {
		commandResolves: (gate) => resolveGateScript(gate) !== undefined,
		fixtureExists: (fixturePath) =>
			existsSync(path.join(repoRoot, fixturePath)),
		workflowCommands: workflowRunCommands(),
		scriptSources: gateScriptSources(),
	});
}

function selectGates() {
	const gateId = argValue("--gate");
	if (gateId) {
		const gate = GOVERNANCE_GATES.find((candidate) => candidate.id === gateId);
		if (!gate) {
			throw new Error(`unknown gate: ${gateId}`);
		}
		return [gate];
	}
	const tier = argValue("--tier");
	if (tier) {
		if (!GATE_TIERS.includes(tier)) {
			throw new Error(`unknown tier: ${tier}`);
		}
		return GOVERNANCE_GATES.filter((gate) => gate.tier === tier);
	}
	return GOVERNANCE_GATES.filter((gate) => gate.tier !== "local");
}

function runGate(gate) {
	const started = Date.now();
	const result = spawnSync(gate.command, {
		cwd: repoRoot,
		shell: true,
		stdio: "pipe",
		encoding: "utf8",
		timeout: (gate.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS) * 1000,
	});
	return {
		gate,
		ok: result.status === 0,
		durationMs: Date.now() - started,
		output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
	};
}

function main() {
	if (process.argv.includes("--list")) {
		for (const gate of GOVERNANCE_GATES) {
			console.log(
				`${gate.tier.padEnd(12)} ${gate.id.padEnd(20)} ${gate.owner.padEnd(24)} ${gate.command}`,
			);
		}
		return;
	}

	if (process.argv.includes("--list-scanned")) {
		// Makes nested-execution coverage inspectable. Without this, the scanned
		// population could silently shrink and the rule would still report ok.
		for (const { file, gateId } of gateScriptSources()) {
			console.log(`${gateId ?? "ci-script"}\t${file}`);
		}
		return;
	}

	const registryProblems = verifyRegistry();
	if (registryProblems.length > 0) {
		console.error("check-governance: registry INVALID");
		for (const problem of registryProblems.sort()) {
			console.error(`  - ${problem}`);
		}
		process.exit(1);
	}

	if (process.argv.includes("--verify-registry")) {
		console.log(
			`check-governance: registry valid (${GOVERNANCE_GATES.length} gate(s))`,
		);
		return;
	}

	const gates = selectGates();
	if (gates.length === 0) {
		console.error("check-governance: no gates selected");
		process.exit(1);
	}

	console.log("Repository governance\n");
	const results = gates.map(runGate);

	for (const result of results) {
		console.log(
			`${result.ok ? "PASS" : "FAIL"}  ${result.gate.id.padEnd(20)} ${(result.durationMs / 1000).toFixed(1)}s`,
		);
	}

	const failed = results.filter((result) => !result.ok);
	console.log(
		`\n${results.length - failed.length} passed, ${failed.length} failed`,
	);

	for (const result of failed) {
		console.error(`\n--- ${result.gate.id} ---`);
		console.error(`Owner:   ${result.gate.owner}`);
		console.error(`Command: ${result.gate.command}`);
		console.error(result.output.trimEnd());
	}

	if (failed.length > 0) {
		process.exit(1);
	}
}

try {
	main();
} catch (error) {
	console.error(
		`check-governance FAIL: ${error instanceof Error ? error.message : String(error)}`,
	);
	process.exit(1);
}
