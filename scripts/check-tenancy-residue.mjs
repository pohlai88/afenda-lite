/**
 * Fail CI if soft tenancy residue or legacy FFT entry promote reappears.
 * Exit 1 on any match under modules/ or app/.
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PATTERN =
  "IS NULL OR .*organization_id|organization_id IS NULL OR|promoteLegacyFftEntry";

try {
  const out = execSync(
    `rg -n -e "${PATTERN}" modules app --glob '!**/node_modules/**'`,
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (out.trim()) {
    console.error("Tenancy residue check FAILED — soft scope / promoteLegacy found:");
    console.error(out);
    process.exit(1);
  }
} catch (error) {
  const err = error;
  if (
    err &&
    typeof err === "object" &&
    "status" in err &&
    err.status === 1 &&
    "stdout" in err &&
    String(err.stdout ?? "").trim() === ""
  ) {
    // rg exit 1 = no matches
    console.log("Tenancy residue check PASSED");
    process.exit(0);
  }
  if (
    err &&
    typeof err === "object" &&
    "stdout" in err &&
    String(err.stdout ?? "").trim()
  ) {
    console.error("Tenancy residue check FAILED:");
    console.error(String(err.stdout));
    process.exit(1);
  }
  throw error;
}

console.log("Tenancy residue check PASSED");
