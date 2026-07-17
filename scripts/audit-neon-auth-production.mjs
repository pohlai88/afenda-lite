/**
 * N15 — Neon Auth production ops audit (trusted domains).
 *
 * Usage: pnpm audit:neon-auth-production
 *
 * Full env / recovery / performance posture remains `pnpm validate:neon-env`.
 * This script focuses on the production Auth redirect allowlist.
 */

import { execFileSync } from "node:child_process";
import { getEnvValue, loadLocalEnv } from "./lib/env-files.mjs";
import {
	evaluateTrustedDomains,
	extractTrustedOrigins,
} from "./lib/neon-auth-trusted-domains.mjs";

const env = loadLocalEnv();
const apiKey = env.NEON_API_KEY || getEnvValue("NEON_API_KEY", env);
const projectId = env.NEON_PROJECT_ID || getEnvValue("NEON_PROJECT_ID", env);
const branchId = env.NEON_BRANCH_ID || getEnvValue("NEON_BRANCH_ID", env);
const appUrl = env.APP_URL || getEnvValue("APP_URL", env);

function check(label, ok, detail) {
	console.log(`${ok ? "[ok]" : "[fail]"} ${label}`);
	console.log(`     ${detail}`);
	return ok;
}

let passed = 0;
let failed = 0;

function record(ok) {
	if (ok) passed += 1;
	else failed += 1;
}

console.log("=== Neon Auth production audit (N15) ===\n");

record(
	check(
		"cloud ids present",
		Boolean(projectId && branchId),
		`project=${projectId ?? "missing"}, branch=${branchId ?? "missing"}`,
	),
);

record(
	check(
		"NEON_API_KEY present",
		Boolean(apiKey?.startsWith("napi_")),
		apiKey ? "NEON_API_KEY: present" : "NEON_API_KEY: missing",
	),
);

if (!(apiKey?.startsWith("napi_") && projectId && branchId)) {
	console.log(
		"\n[note] Cannot list trusted domains without API key + project/branch — no fake PASS.",
	);
	console.log(`\nResult: ${passed} passed, ${failed} failed`);
	process.exit(1);
}

try {
	const raw = execFileSync(
		"npx",
		[
			"neon@latest",
			"neon-auth",
			"domain",
			"list",
			"--project-id",
			projectId,
			"--branch",
			branchId,
			"-o",
			"json",
		],
		{
			env: { ...process.env, NEON_API_KEY: apiKey },
			encoding: "utf8",
			shell: true,
			maxBuffer: 10 * 1024 * 1024,
		},
	);
	const trustedOrigins = extractTrustedOrigins(JSON.parse(raw));
	const domains = evaluateTrustedDomains({
		appUrl: appUrl ?? "",
		trustedOrigins,
	});
	record(
		check("trusted domains (APP_URL + local)", domains.ok, domains.detail),
	);
	console.log(
		`     listed: ${trustedOrigins.length ? trustedOrigins.join(", ") : "(none)"}`,
	);
} catch (error) {
	record(
		check(
			"trusted domains (APP_URL + local)",
			false,
			(error.stderr?.toString?.() ?? error.message).trim(),
		),
	);
}

console.log(
	"\n[note] Env/recovery/perf: pnpm validate:neon-env · Deploy health: pnpm check:production:post-deploy",
);
console.log(
	"[note] Domain add: neon neon-auth domain add <origin> — see docs/runbooks/RB-001-multi-org-ops.md §3.12",
);
console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
