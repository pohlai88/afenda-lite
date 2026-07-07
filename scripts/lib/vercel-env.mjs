import { spawnSync } from "node:child_process";

/**
 * Set a Vercel env var without shell interpolation (safe for DATABASE_URL query strings on Windows).
 */
export function setVercelEnvKey(key, target, value) {
  const result = spawnSync(
    "vercel",
    ["env", "add", key, target, "--force"],
    {
      input: value,
      encoding: "utf8",
      stdio: ["pipe", "inherit", "inherit"],
      shell: process.platform === "win32",
    },
  );

  if (result.status !== 0) {
    throw new Error(`vercel env add ${key} ${target} failed`);
  }
}

export function removeVercelEnvKey(key, target) {
  const result = spawnSync("vercel", ["env", "rm", key, target, "--yes"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return result.status === 0;
}

export function listVercelEnvKeys(target) {
  const result = spawnSync("vercel", ["env", "ls", target], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status !== 0 && !output.includes("Environment Variables")) {
    throw new Error(`vercel env ls ${target} failed`);
  }

  const keys = new Set();
  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    const match = trimmed.match(/^([A-Z0-9_]+)\s+/);
    if (match?.[1] && match[1] !== "name") {
      keys.add(match[1]);
    }
  }
  return keys;
}
