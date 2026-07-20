/**
 * N4 scheduled Neon DB performance monitor.
 *
 * Read-only: one SELECT 1 latency probe plus aggregate connection pressure.
 * Output is restricted to aggregate metrics; never print URLs, SQL, parameters,
 * credentials, query text, user names, or tenant data.
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getEnvValue, loadLocalEnv } from "./lib/env-files.mjs";

const localEnv = loadLocalEnv();
const databaseUrl =
	localEnv.DATABASE_URL ?? getEnvValue("DATABASE_URL", localEnv);

if (!databaseUrl) {
	console.error("[fail] DATABASE_URL is missing");
	process.exit(1);
}

if (!databaseUrl.includes("-pooler")) {
	console.error("[fail] DATABASE_URL is not pooler-shaped (value redacted)");
	process.exit(1);
}

const performancePostureUrl = pathToFileURL(
	resolve(process.cwd(), "packages/foundation/env/src/neon-performance-posture.ts"),
).href;
const {
	evaluateConnectionPressure,
	evaluateSelect1Latency,
	formatNeonPerformanceIssues,
} = await import(performancePostureUrl);

const serverlessUrl = pathToFileURL(
	resolve(
		process.cwd(),
		"packages/data-plane/db/node_modules/@neondatabase/serverless/index.mjs",
	),
).href;

let failed = 0;
/** API-007 / I5.3 — run identity for N4 monitor (not an app APM vendor). */
const correlationId = crypto.randomUUID();
console.log(
	JSON.stringify({
		ts: new Date().toISOString(),
		service: "neon-performance-monitor",
		level: "info",
		event: "n4.monitor.start",
		correlationId,
	}),
);

function record(label, result) {
	const marker = result.ok ? "[ok]" : "[fail]";
	const detail = result.ok
		? result.detail
		: formatNeonPerformanceIssues(result.issues);
	console.log(`${marker} ${label}`);
	console.log(`     ${detail}`);
	if (!result.ok) {
		failed += 1;
	}
}

try {
	const { neon } = await import(serverlessUrl);
	const sql = neon(databaseUrl);

	const started = performance.now();
	await sql`SELECT 1`;
	const latencyMs = Math.round(performance.now() - started);
	record("SELECT 1 latency", evaluateSelect1Latency(latencyMs));

	const rows = await sql`
		SELECT
			current_setting('max_connections')::int AS max_connections,
			count(*) FILTER (
				WHERE datname = current_database() AND state = 'active'
			)::int AS active_connections,
			count(*) FILTER (
				WHERE datname = current_database() AND state = 'idle'
			)::int AS idle_connections
		FROM pg_stat_activity
	`;
	const snapshot = rows[0];
	record(
		"connection pressure",
		evaluateConnectionPressure({
			maxConnections: snapshot?.max_connections,
			activeConnections: snapshot?.active_connections,
			idleConnections: snapshot?.idle_connections,
		}),
	);
} catch (error) {
	failed += 1;
	console.error(
		`[fail] performance probe failed (${error?.name ?? "Error"}); sensitive details suppressed`,
	);
}

console.log(
	JSON.stringify({
		ts: new Date().toISOString(),
		service: "neon-performance-monitor",
		level: failed === 0 ? "info" : "error",
		event: "n4.monitor.result",
		correlationId,
		code: failed === 0 ? "PASS" : "FAIL",
	}),
);
console.log(`Result: ${failed === 0 ? "PASS" : "FAIL"}`);
process.exit(failed === 0 ? 0 : 1);
