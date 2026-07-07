import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadComposedEnv } from "./lib/env-files.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

for (const [key, value] of Object.entries(loadComposedEnv())) {
  if (process.env[key] === undefined && value) {
    process.env[key] = value;
  }
}

const runner = join(root, "scripts", "check-playground-bindings-runner.ts");

execFileSync("npx", ["tsx", runner], { cwd: root, stdio: "inherit", shell: true });
