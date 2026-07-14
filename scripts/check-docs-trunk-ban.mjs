/**
 * Fail if retired docs trunks reappear on disk.
 * Cursor Grep/Glob may still list deleted paths from a stale index — trust this
 * filesystem gate (and `git ls-files`) over index phantoms.
 *
 * Banned (DOC-001 flatten + DOC-002 register-only Superseded/Retired):
 *   docs/architecture/{backend,frontend,system,tech-stack,archive}/
 *   docs/guides/archive/
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

const BANNED = [
  "docs/architecture/backend",
  "docs/architecture/frontend",
  "docs/architecture/system",
  "docs/architecture/tech-stack",
  "docs/architecture/archive",
  "docs/guides/archive",
];

const root = process.cwd();
const present = BANNED.filter((rel) => existsSync(join(root, rel)));

if (present.length > 0) {
  console.error("check-docs-trunk-ban: FAIL — banned trunks present on disk:");
  for (const rel of present) {
    console.error(`  - ${rel}`);
  }
  console.error(
    "Remove them (register-only Retired/Superseded). Do not recreate flat-home ARCH packs as nested trunks.",
  );
  process.exit(1);
}

console.log(
  `check-docs-trunk-ban: ok (0/${BANNED.length} banned trunks on disk)`,
);
console.log(
  "check-docs-trunk-ban: if Cursor Grep/Glob still lists those paths, treat as index ghosts — do not recreate trunks.",
);
process.exit(0);
