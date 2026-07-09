import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * Run a repo script with inherited `process.env` (no `--env-file=.env` dependency).
 * Playwright config and CI must populate env before E2E flows call helpers.
 */
export function runNodeScript(scriptPath: string, args: string[] = []): string {
  return execFileSync(process.execPath, [resolve(process.cwd(), scriptPath), ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
  });
}

export function runNodeScriptJson<T>(scriptPath: string, args: string[] = []): T {
  const output = runNodeScript(scriptPath, args);
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Script did not return JSON:\n${output}`);
  }
  return JSON.parse(output.slice(start, end + 1)) as T;
}
