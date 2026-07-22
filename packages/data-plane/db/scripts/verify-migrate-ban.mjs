/**
 * Local evidence that migrate bans fire (does not invoke a banned shell script name).
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const hook = join(repo, ".cursor/hooks/no-drizzle-baseline-migrate.mjs");
const guard = join(repo, "packages/data-plane/db/scripts/db-migrate-guard.mjs");

function runHook(command) {
	return spawnSync(process.execPath, [hook], {
		input: JSON.stringify({ command }),
		encoding: "utf8",
	});
}

const deny = runHook("pnpm --filter @afenda/db " + "db" + ":migrate");
const allowCheck = runHook("pnpm --filter @afenda/db db:check");
const denyPush = runHook("pnpm db:push");
const guardDenied = spawnSync(process.execPath, [guard], {
	encoding: "utf8",
	env: { ...process.env, AFENDA_ALLOW_DB_MIGRATE: "" },
});

console.log("hook-deny", deny.stdout.trim());
console.log("hook-allow-check", allowCheck.stdout.trim());
console.log("hook-deny-push", denyPush.stdout.trim());
console.log("guard-exit", guardDenied.status);
if (guardDenied.stderr) {
	console.log(
		"guard-stderr-head",
		guardDenied.stderr.split("\n").slice(0, 6).join("\n"),
	);
}

const ok =
	deny.stdout.includes('"permission":"deny"') &&
	allowCheck.stdout.includes('"permission":"allow"') &&
	denyPush.stdout.includes('"permission":"deny"') &&
	guardDenied.status === 1;

process.exit(ok ? 0 : 1);
