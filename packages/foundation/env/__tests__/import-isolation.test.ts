/**
 * @afenda/env
 * Contract: ENV-IMPORT-ISOLATION
 * Protected: changes require local pre-edit token and compatibility checks.
 *
 * Executable entrypoint contract:
 *
 *   Runtime entrypoints may initialize configuration.
 *   Evaluator entrypoints must remain pure.
 *
 * Each entrypoint is imported in a **clean child process** with the product
 * environment stripped. In-process unit tests cannot prove this: the module
 * graph is already warm and the ambient environment is already populated, so a
 * side effect at import time would go unnoticed.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const repoRoot = path.resolve(packageRoot, "../../..");

/** Product variables that must not be required by a pure entrypoint. */
const STRIPPED_PRODUCT_ENV = [
	"DATABASE_URL",
	"APP_URL",
	"COOKIE_SECRET",
	"NEON_BRANCH_ID",
	"NEON_ORG_ID",
	"NEON_PROJECT_ID",
	"SKIP_ENV_VALIDATION",
	"npm_lifecycle_event",
] as const;

type ImportOutcome = Readonly<{
	ok: boolean;
	stdout: string;
	stderr: string;
}>;

/**
 * Scratch directory for generated probe modules.
 *
 * It must live inside the workspace or `@afenda/env/*` would not resolve, and
 * under `node_modules` so it stays outside the package protection hash and the
 * committed tree.
 */
const probeDir = path.join(
	repoRoot,
	"node_modules/.cache/afenda-env-import-probe",
);

/**
 * Import `specifier` in a fresh process with the product environment absent and
 * a production deployment context, so a lenient non-production path cannot mask
 * an initialization side effect.
 */
function importInCleanProcess(specifier: string): ImportOutcome {
	const childEnv: NodeJS.ProcessEnv = { ...process.env };
	for (const key of STRIPPED_PRODUCT_ENV) {
		delete childEnv[key];
	}
	// Local-only keys are rejected in production. A developer shell that exports
	// them must not turn a pure-import assertion into a policy failure.
	for (const key of Object.keys(childEnv)) {
		if (key.startsWith("NEON_") || key.startsWith("E2E_")) {
			delete childEnv[key];
		}
	}
	childEnv.NODE_ENV = "production";
	childEnv.VERCEL_ENV = "production";

	// A real `.mts` file rather than `--eval`: tsx evaluates `--eval` as CJS,
	// where top-level await is unavailable and dynamic import may be rewritten.
	const probeFile = path.join(
		probeDir,
		`${specifier.replace(/[^a-z0-9]+/gi, "-")}.mts`,
	);
	mkdirSync(probeDir, { recursive: true });
	writeFileSync(
		probeFile,
		`const m = await import(${JSON.stringify(specifier)});\n` +
			`process.stdout.write("EXPORTS:" + Object.keys(m).length);\n`,
		"utf8",
	);

	try {
		const stdout = execFileSync(
			process.execPath,
			[path.join(repoRoot, "node_modules/tsx/dist/cli.mjs"), probeFile],
			{ cwd: repoRoot, env: childEnv, encoding: "utf8", stdio: "pipe" },
		);
		return { ok: true, stdout, stderr: "" };
	} catch (error) {
		const failure = error as { stdout?: string; stderr?: string };
		return {
			ok: false,
			stdout: failure.stdout ?? "",
			stderr: failure.stderr ?? String(error),
		};
	} finally {
		rmSync(probeFile, { force: true });
	}
}

describe("entrypoint import isolation", () => {
	const pureEntrypoints = [
		"@afenda/env/contract",
		"@afenda/env/performance",
		"@afenda/env/recovery",
	] as const;

	it.each(
		pureEntrypoints,
	)("%s imports without any product environment", (specifier) => {
		const outcome = importInCleanProcess(specifier);
		expect(outcome.stderr).not.toContain("Invalid environment variables");
		expect(outcome.ok).toBe(true);
		expect(outcome.stdout).toMatch(/^EXPORTS:[1-9]/);
	});

	it("root entrypoint owns the runtime initialization side effect", () => {
		// The root is deliberately impure: it validates product configuration at
		// import time and fails closed. This assertion pins that contract so the
		// split above stays meaningful rather than becoming accidental.
		const outcome = importInCleanProcess("@afenda/env");
		expect(outcome.ok).toBe(false);
		expect(outcome.stderr).toContain("Invalid environment variables");
	});

	it("docs entrypoint does not load the product schema", () => {
		const outcome = importInCleanProcess("@afenda/env/docs");
		expect(outcome.stderr).not.toContain("DATABASE_URL");
	});
});

describe("canonical infrastructure identity", () => {
	it("posture branch constants derive from one owner", async () => {
		const [identity, performance, recovery] = await Promise.all([
			import("../src/neon-identity"),
			import("../src/performance"),
			import("../src/recovery"),
		]);

		expect(performance.PERFORMANCE_PROD_BRANCH_ID).toBe(
			identity.APPROVED_NEON_BRANCH_ID,
		);
		expect(recovery.RECOVERY_PROD_BRANCH_ID).toBe(
			identity.APPROVED_NEON_BRANCH_ID,
		);
	});

	it("no module restates the production branch literal", async () => {
		const { readFile, readdir } = await import("node:fs/promises");
		const sourceDir = path.join(packageRoot, "src");
		const entries = (await readdir(sourceDir)).filter(
			(entry) => entry.endsWith(".ts") && entry !== "neon-identity.ts",
		);

		const sources = await Promise.all(
			entries.map(async (entry) => ({
				entry,
				source: await readFile(path.join(sourceDir, entry), "utf8"),
			})),
		);
		const restating = sources
			.filter(({ source }) => source.includes("br-tiny-hill-ao82jp6f"))
			.map(({ entry }) => entry);

		expect(restating).toEqual([]);
	});
});
