import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "..");

export const UI_GOVERNANCE_SUITES = Object.freeze([
	"compose-redflags",
	"compose-suitability",
	"compose-gate-ids",
	"ui-boundary",
]);

export const UI_SYSTEM_GATE_PHASES = Object.freeze([
	{
		id: "gate-contract",
		label: "Gate ownership contract",
		command: "pnpm",
		args: [
			"exec",
			"vitest",
			"run",
			"--config",
			"testing/vitest.unit.config.ts",
			"--project",
			"repo-tooling",
			"scripts/__tests__/check-ui-system.test.mjs",
		],
	},
	{
		id: "ui-system-lint",
		label: "@afenda/ui-system lint",
		command: "pnpm",
		args: ["--filter", "@afenda/ui-system", "lint"],
	},
	{
		id: "ui-system-typecheck",
		label: "@afenda/ui-system typecheck",
		command: "pnpm",
		args: ["--filter", "@afenda/ui-system", "typecheck"],
	},
	{
		id: "ui-system-metadata",
		label: "@afenda/ui-system metadata",
		command: "pnpm",
		args: ["--filter", "@afenda/ui-system", "metadata:check"],
	},
	{
		id: "ui-system-tests",
		label: "@afenda/ui-system tests",
		command: "pnpm",
		args: ["--filter", "@afenda/ui-system", "test"],
	},
	{
		id: "web-ui-governance",
		label: "@afenda/web UI governance (F*, C*, gate IDs, boundary)",
		command: "pnpm",
		args: [
			"--filter",
			"@afenda/web",
			"exec",
			"vitest",
			"run",
			"--config",
			"../../testing/vitest.unit.config.ts",
			"--project",
			"web",
			...UI_GOVERNANCE_SUITES,
			"--reporter=verbose",
		],
	},
	{
		id: "web-tailwind-emit",
		label: "@afenda/web Tailwind emission",
		command: "pnpm",
		args: [
			"--filter",
			"@afenda/web",
			"exec",
			"vitest",
			"run",
			"--config",
			"../../testing/vitest.unit.config.ts",
			"--project",
			"web",
			"tailwind-emit",
			"--reporter=verbose",
		],
	},
	{
		id: "web-typecheck",
		label: "@afenda/web typecheck",
		command: "pnpm",
		args: ["--filter", "@afenda/web", "typecheck"],
	},
]);

export function runUiSystemGate({
	phases = UI_SYSTEM_GATE_PHASES,
	spawn = spawnSync,
	output = console,
} = {}) {
	for (const [index, phase] of phases.entries()) {
		output.log(
			`\n[check:ui-system] ${index + 1}/${phases.length} ${phase.label}`,
		);

		const result = spawn(phase.command, phase.args, {
			cwd: repositoryRoot,
			stdio: "inherit",
			env: process.env,
			shell: phase.command === "pnpm" && process.platform === "win32",
		});

		if (result.error) {
			throw new Error(
				`[check:ui-system] ${phase.id} could not start: ${result.error.message}`,
			);
		}
		if (result.status !== 0) {
			throw new Error(
				`[check:ui-system] ${phase.id} failed with exit code ${result.status ?? "unknown"}${result.signal ? ` (${result.signal})` : ""}`,
			);
		}
	}

	output.log(`\n[check:ui-system] OK (${phases.length} canonical phases)`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedPath === scriptPath) {
	try {
		runUiSystemGate();
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}
