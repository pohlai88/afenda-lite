/**
 * N15 — Production deploy health (HTTP probes + optional Actions Deploy status).
 *
 * Usage: pnpm check:production:post-deploy
 * Alias: pnpm verify:production
 *
 * Does not mutate Neon, Vercel, or workflows. Never logs secrets.
 */

import { execFileSync } from "node:child_process";
import { getEnvValue, loadLocalEnv } from "./lib/env-files.mjs";

const env = loadLocalEnv();
const appUrlRaw = env.APP_URL || getEnvValue("APP_URL", env);

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

function normalizeBase(url) {
	return String(url ?? "")
		.trim()
		.replace(/\/+$/, "");
}

/**
 * @param {string} path
 * @returns {Promise<{ ok: boolean; status: number; body: unknown; error?: string }>}
 */
async function fetchJson(path) {
	const base = normalizeBase(appUrlRaw);
	const url = `${base}${path}`;
	try {
		const res = await fetch(url, {
			method: "GET",
			headers: { Accept: "application/json" },
			redirect: "follow",
		});
		const text = await res.text();
		let body;
		try {
			body = JSON.parse(text);
		} catch {
			body = { raw: text.slice(0, 120) };
		}
		return { ok: res.ok, status: res.status, body };
	} catch (error) {
		return {
			ok: false,
			status: 0,
			body: null,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

console.log("=== Production deploy health (N15) ===\n");

const base = normalizeBase(appUrlRaw);
record(
	check(
		"APP_URL present",
		Boolean(base?.startsWith("http")),
		base ? "APP_URL origin configured" : "APP_URL missing — set in .env.local",
	),
);

if (!base?.startsWith("http")) {
	console.log(`\nResult: ${passed} passed, ${failed} failed`);
	process.exit(1);
}

const liveness = await fetchJson("/api/health/liveness");
const liveData = liveness.body?.data ?? liveness.body;
record(
	check(
		"GET /api/health/liveness",
		liveness.ok && liveData?.status === "alive",
		liveness.error
			? `request failed (${liveness.error})`
			: `HTTP ${liveness.status} status=${liveData?.status ?? "unknown"}`,
	),
);

const readiness = await fetchJson("/api/health/readiness");
const readyData = readiness.body?.data ?? readiness.body;
const readyStatus = readyData?.status;
record(
	check(
		"GET /api/health/readiness",
		readiness.ok && (readyStatus === "ready" || readyStatus === "degraded"),
		readiness.error
			? `request failed (${readiness.error})`
			: `HTTP ${readiness.status} status=${readyStatus ?? "unknown"} auth=${readyData?.auth ?? "n/a"} storage=${readyData?.storage ?? "n/a"}`,
	),
);
if (readyStatus === "degraded") {
	console.log(
		"[note] readiness=degraded — investigate DB/auth config; deploy may still be serving",
	);
}

try {
	const out = execFileSync(
		"gh",
		[
			"run",
			"list",
			"--workflow=deploy.yml",
			"--branch",
			"main",
			"--limit",
			"10",
			"--json",
			"databaseId,conclusion,status,displayTitle,createdAt,headBranch,url",
		],
		{
			encoding: "utf8",
			shell: true,
			maxBuffer: 2 * 1024 * 1024,
		},
	);
	const runs = JSON.parse(out);
	const list = Array.isArray(runs) ? runs : [];
	const latest = list[0] ?? null;
	const lastSuccess = list.find(
		(run) => run.conclusion === "success" && run.status === "completed",
	);
	const latestOk =
		latest?.conclusion === "success" && latest?.status === "completed";

	if (lastSuccess) {
		record(
			check(
				"GitHub Actions Deploy (recent success)",
				true,
				`success ${lastSuccess.createdAt} ${lastSuccess.url ?? ""}`.trim(),
			),
		);
		if (!latestOk && latest) {
			console.log(
				`[note] latest Deploy is ${latest.conclusion}/${latest.status} (${latest.url}) — investigate CI; production may still serve last success`,
			);
		}
	} else {
		record(
			check(
				"GitHub Actions Deploy (recent success)",
				false,
				latest
					? `no success in last ${list.length} main runs — latest=${latest.conclusion}/${latest.status} ${latest.url ?? ""}`.trim()
					: "no deploy.yml runs found on main",
			),
		);
	}
} catch (error) {
	const message = (error.stderr?.toString?.() ?? error.message).trim();
	record(
		check(
			"GitHub Actions Deploy (recent success)",
			false,
			`gh unavailable or failed — operator must confirm Actions Deploy manually (${message.slice(0, 160)})`,
		),
	);
	console.log(
		"[note] Manual: GitHub Actions → Deploy workflow · Vercel project READY for production.",
	);
}

console.log(
	"\n[note] Trusted domains: pnpm audit:neon-auth-production · Full Neon posture: pnpm validate:neon-env",
);
console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
