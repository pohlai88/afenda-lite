/**
 * Validate Neon env for afenda-lite against `.env.local` (ARCH-027 / N1).
 *
 * Usage: pnpm validate:neon-env
 *
 * Product contract SSOT: packages/env/src/neon-contract.ts
 * This script adds Neon Cloud API checks on top of the product contract.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getEnvValue, loadLocalEnv } from "./lib/env-files.mjs";
import {
	evaluateTrustedDomains,
	extractTrustedOrigins,
} from "./lib/neon-auth-trusted-domains.mjs";

const env = loadLocalEnv();
// Prefer `.env.local` over shell exports — stale NEON_BRANCH_ID must not win.
const apiKey = env.NEON_API_KEY || getEnvValue("NEON_API_KEY", env);
const orgId = env.NEON_ORG_ID || getEnvValue("NEON_ORG_ID", env);
const projectId = env.NEON_PROJECT_ID || getEnvValue("NEON_PROJECT_ID", env);
const branchId = env.NEON_BRANCH_ID || getEnvValue("NEON_BRANCH_ID", env);

const neonContractUrl = pathToFileURL(
	resolve(process.cwd(), "packages/env/src/neon-contract.ts"),
).href;
const {
	APPROVED_NEON_BRANCH_ID,
	APPROVED_NEON_ORG_ID,
	APPROVED_NEON_PROJECT_ID,
	evaluateNeonProductEnv,
	formatNeonContractIssues,
} = await import(neonContractUrl);

const neonRecoveryUrl = pathToFileURL(
	resolve(process.cwd(), "packages/env/src/neon-recovery-posture.ts"),
).href;
const {
	evaluateHistoryRetention,
	evaluateProtectedProductionBranch,
	evaluateScheduledSnapshotInventory,
	formatNeonRecoveryIssues,
} = await import(neonRecoveryUrl);

const neonPerformanceUrl = pathToFileURL(
	resolve(process.cwd(), "packages/env/src/neon-performance-posture.ts"),
).href;
const {
	evaluateComputeAutoscaling,
	evaluateEndpointPoolerHost,
	evaluateSelect1Latency,
	formatNeonPerformanceIssues,
	selectBranchReadWriteEndpoint,
} = await import(neonPerformanceUrl);

async function neonApiGet(path) {
	const res = await fetch(`https://console.neon.tech/api/v2${path}`, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
			Accept: "application/json",
		},
	});
	const text = await res.text();
	let body;
	try {
		body = JSON.parse(text);
	} catch {
		body = { raw: text.slice(0, 200) };
	}
	return { status: res.status, body };
}

const neonFile = JSON.parse(readFileSync(".neon", "utf8"));

function run(args) {
	return execFileSync("npx", ["neon@latest", ...args, "-o", "json"], {
		env: { ...process.env, NEON_API_KEY: apiKey },
		encoding: "utf8",
		shell: true,
		maxBuffer: 10 * 1024 * 1024,
	});
}

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

console.log("=== Neon env validation ===\n");

const playgroundRaw =
	env.PLAYGROUND_ENABLED || getEnvValue("PLAYGROUND_ENABLED", env);
const productResult = evaluateNeonProductEnv(
	{
		DATABASE_URL: env.DATABASE_URL || getEnvValue("DATABASE_URL", env),
		NEON_AUTH_BASE_URL:
			env.NEON_AUTH_BASE_URL || getEnvValue("NEON_AUTH_BASE_URL", env),
		NEON_AUTH_COOKIE_SECRET:
			env.NEON_AUTH_COOKIE_SECRET ||
			getEnvValue("NEON_AUTH_COOKIE_SECRET", env),
		APP_URL: env.APP_URL || getEnvValue("APP_URL", env),
		NEON_ORG_ID: orgId,
		NEON_PROJECT_ID: projectId,
		NEON_BRANCH_ID: branchId,
		SHARED_ADMIN_PASSWORD:
			env.SHARED_ADMIN_PASSWORD || getEnvValue("SHARED_ADMIN_PASSWORD", env),
		PREVIEW_CLIENT_PASSWORD:
			env.PREVIEW_CLIENT_PASSWORD ||
			getEnvValue("PREVIEW_CLIENT_PASSWORD", env),
		CLIENT_DEFAULT_PASSWORD:
			env.CLIENT_DEFAULT_PASSWORD ||
			getEnvValue("CLIENT_DEFAULT_PASSWORD", env),
		E2E_OPERATOR_PASSWORD:
			env.E2E_OPERATOR_PASSWORD || getEnvValue("E2E_OPERATOR_PASSWORD", env),
		E2E_CLIENT_PASSWORD:
			env.E2E_CLIENT_PASSWORD || getEnvValue("E2E_CLIENT_PASSWORD", env),
		PLAYGROUND_ENABLED:
			playgroundRaw === undefined ? undefined : playgroundRaw === "true",
	},
	{
		nodeEnv: process.env.NODE_ENV,
		vercelEnv: process.env.VERCEL_ENV,
	},
);

record(
	check(
		"N1 product Neon contract",
		productResult.ok,
		productResult.ok
			? "DATABASE_URL pooler · Neon Auth URL/secret · APP_URL · cloud ids · local-only gates"
			: formatNeonContractIssues(productResult.issues),
	),
);

record(
	check(
		".env.local Neon Cloud ids",
		orgId === APPROVED_NEON_ORG_ID &&
			projectId === APPROVED_NEON_PROJECT_ID &&
			Boolean(branchId),
		`org=${orgId}, project=${projectId}, branch=${branchId}` +
			(branchId === APPROVED_NEON_BRANCH_ID
				? " (production — single branch policy)"
				: ` (expected production branch ${APPROVED_NEON_BRANCH_ID})`),
	),
);

record(
	check(
		".neon linkage",
		neonFile.orgId === orgId &&
			neonFile.projectId === projectId &&
			neonFile.branchId === branchId,
		`.neon matches .env.local`,
	),
);

record(
	check(
		"NEON_API_KEY present",
		Boolean(apiKey?.startsWith("napi_")),
		apiKey ? "NEON_API_KEY: present" : "NEON_API_KEY: missing",
	),
);

try {
	const branch = JSON.parse(
		run(["branches", "get", branchId, "--project-id", projectId]),
	);
	record(
		check(
			"branch API access",
			branch.id === branchId && branch.project_id === projectId,
			`${branch.name} (${branch.id}) on ${branch.project_id}`,
		),
	);
} catch (error) {
	record(
		check(
			"branch API access",
			false,
			(error.stderr?.toString?.() ?? error.message).trim(),
		),
	);
}

try {
	const auth = JSON.parse(
		run([
			"neon-auth",
			"status",
			"--project-id",
			projectId,
			"--branch",
			branchId,
		]),
	);
	record(
		check(
			"neon-auth access",
			auth.branch_id === branchId,
			auth.base_url ?? "status ok",
		),
	);
} catch (error) {
	record(
		check(
			"neon-auth access",
			false,
			(error.stderr?.toString?.() ?? error.message).trim(),
		),
	);
}

try {
	run(["projects", "list", "--org-id", orgId]);
	record(
		check(
			"org-wide project list",
			true,
			"API key has org scope — can list all projects.",
		),
	);
} catch (error) {
	const message = (error.stderr?.toString?.() ?? error.message).trim();
	const projectScoped = message.includes("subject_project_id");
	record(
		check(
			"org-wide project list",
			projectScoped,
			projectScoped
				? `Project-scoped key (limited to ${projectId}) — expected; branch/auth APIs still work.`
				: message,
		),
	);
}

// N3 recovery posture — read-only Neon API (no restore / reset / snapshot delete).
if (!apiKey?.startsWith("napi_")) {
	record(
		check(
			"N3 recovery posture API",
			false,
			"NEON_API_KEY missing — cannot read retention/snapshots; Console verify required (no fake PASS)",
		),
	);
} else {
	try {
		const projectRes = await neonApiGet(`/projects/${projectId}`);
		if (projectRes.status !== 200) {
			record(
				check(
					"N3 PITR history retention",
					false,
					`GET /projects failed HTTP ${projectRes.status}`,
				),
			);
		} else {
			const project = projectRes.body.project ?? projectRes.body;
			const retention = evaluateHistoryRetention(project);
			record(
				check(
					"N3 PITR history retention",
					retention.ok,
					retention.ok
						? retention.detail
						: formatNeonRecoveryIssues(retention.issues),
				),
			);
		}

		const branchRes = await neonApiGet(
			`/projects/${projectId}/branches/${branchId}`,
		);
		if (branchRes.status !== 200) {
			record(
				check(
					"N3 protected production branch",
					false,
					`GET /branches failed HTTP ${branchRes.status}`,
				),
			);
		} else {
			const branch = branchRes.body.branch ?? branchRes.body;
			const protectedBranch = evaluateProtectedProductionBranch(branch);
			record(
				check(
					"N3 protected production branch",
					protectedBranch.ok,
					protectedBranch.ok
						? protectedBranch.detail
						: formatNeonRecoveryIssues(protectedBranch.issues),
				),
			);
		}

		const snapsRes = await neonApiGet(`/projects/${projectId}/snapshots`);
		if (snapsRes.status !== 200) {
			record(
				check(
					"N3 scheduled snapshot inventory",
					false,
					`GET /snapshots failed HTTP ${snapsRes.status} — Console verify required (no fake PASS)`,
				),
			);
		} else {
			const snapshots = (snapsRes.body.snapshots ?? []).map((snap) => ({
				id: snap.id,
				name: snap.name,
				created_at: snap.created_at,
				expires_at: snap.expires_at,
				source_branch_id: snap.source_branch_id ?? snap.branch_id,
				branch_id: snap.branch_id,
			}));
			const inventory = evaluateScheduledSnapshotInventory(snapshots);
			record(
				check(
					"N3 scheduled snapshot inventory",
					inventory.ok,
					inventory.ok
						? inventory.detail
						: formatNeonRecoveryIssues(inventory.issues),
				),
			);
			console.log(
				"[note] N3 snapshot schedule API (/snapshot_schedules) is not relied on — inventory inference only; Console UI confirm remains operator duty for schedule toggle.",
			);
		}
	} catch (error) {
		record(
			check(
				"N3 recovery posture API",
				false,
				(error.message ?? String(error)).trim(),
			),
		);
	}
}

// N4 performance posture — read-only Neon API + timed SELECT 1 (no CU/schema change).
if (!apiKey?.startsWith("napi_")) {
	record(
		check(
			"N4 compute autoscaling / suspend",
			false,
			"NEON_API_KEY missing — cannot read endpoint CU/suspend; Console verify required (no fake PASS)",
		),
	);
} else {
	try {
		const endpointsRes = await neonApiGet(`/projects/${projectId}/endpoints`);
		if (endpointsRes.status !== 200) {
			record(
				check(
					"N4 compute autoscaling / suspend",
					false,
					`GET /endpoints failed HTTP ${endpointsRes.status}`,
				),
			);
		} else {
			const endpoints = (endpointsRes.body.endpoints ?? []).map((ep) => ({
				id: ep.id,
				branch_id: ep.branch_id,
				type: ep.type,
				autoscaling_limit_min_cu: ep.autoscaling_limit_min_cu,
				autoscaling_limit_max_cu: ep.autoscaling_limit_max_cu,
				suspend_timeout_seconds: ep.suspend_timeout_seconds,
				host: ep.host ?? null,
				hosts: ep.hosts
					? {
							read_write_pooled_host: ep.hosts.read_write_pooled_host ?? null,
						}
					: null,
			}));
			const endpoint = selectBranchReadWriteEndpoint(endpoints, branchId);
			if (!endpoint) {
				record(
					check(
						"N4 compute autoscaling / suspend",
						false,
						`no read_write endpoint for branch ${branchId}`,
					),
				);
			} else {
				const compute = evaluateComputeAutoscaling(endpoint, {
					expectedBranchId: branchId,
				});
				record(
					check(
						"N4 compute autoscaling / suspend",
						compute.ok,
						compute.ok
							? compute.detail
							: formatNeonPerformanceIssues(compute.issues),
					),
				);
				const pooledHost = evaluateEndpointPoolerHost(endpoint);
				record(
					check(
						"N4 endpoint pooled host",
						pooledHost.ok,
						pooledHost.ok
							? pooledHost.detail
							: formatNeonPerformanceIssues(pooledHost.issues),
					),
				);
			}
		}
	} catch (error) {
		record(
			check(
				"N4 compute autoscaling / suspend",
				false,
				(error.message ?? String(error)).trim(),
			),
		);
	}
}

const databaseUrl = env.DATABASE_URL || getEnvValue("DATABASE_URL", env);
if (!databaseUrl) {
	record(
		check(
			"N4 SELECT 1 latency baseline",
			false,
			"DATABASE_URL missing — cannot probe latency",
		),
	);
} else {
	try {
		const serverlessUrl = pathToFileURL(
			resolve(
				process.cwd(),
				"packages/db/node_modules/@neondatabase/serverless/index.mjs",
			),
		).href;
		const { neon } = await import(serverlessUrl);
		const sql = neon(databaseUrl);
		const started = performance.now();
		await sql`SELECT 1`;
		const latencyMs = Math.round(performance.now() - started);
		const latency = evaluateSelect1Latency(latencyMs);
		record(
			check(
				"N4 SELECT 1 latency baseline",
				latency.ok,
				latency.ok
					? latency.detail
					: formatNeonPerformanceIssues(latency.issues),
			),
		);
	} catch (error) {
		record(
			check(
				"N4 SELECT 1 latency baseline",
				false,
				`probe failed (${error.name ?? "Error"}) — no URL/SQL logged`,
			),
		);
	}
}

console.log(
	"[note] N4 does not raise CU/suspend/connection limits; scheduled latency/connection alerts use pnpm monitor:neon-performance.",
);

// N15 trusted domains — Neon Auth redirect allowlist (ops; no secret values).
const appUrl = env.APP_URL || getEnvValue("APP_URL", env);
try {
	const domainListRaw = run([
		"neon-auth",
		"domain",
		"list",
		"--project-id",
		projectId,
		"--branch",
		branchId,
	]);
	const domainListJson = JSON.parse(domainListRaw);
	const trustedOrigins = extractTrustedOrigins(domainListJson);
	const domains = evaluateTrustedDomains({
		appUrl: appUrl ?? "",
		trustedOrigins,
	});
	record(
		check(
			"N15 Neon Auth trusted domains",
			domains.ok,
			domains.ok ? domains.detail : domains.detail,
		),
	);
} catch (error) {
	record(
		check(
			"N15 Neon Auth trusted domains",
			false,
			(error.stderr?.toString?.() ?? error.message).trim() ||
				"neon-auth domain list failed — Console verify required (no fake PASS)",
		),
	);
}

console.log(
	"[note] N15: when APP_URL or preview hosts change, run neon neon-auth domain add <origin> then re-validate.",
);

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
