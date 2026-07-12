/**
 * Enforce DOC-001 filename naming: {ID}-{kebab-slug}.md
 * Authority: docs/_control/DOC-001-documentation-control.md
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DOCS = path.join(ROOT, "docs");
const PREFIXES = ["DOC", "ADR", "ARCH", "API", "REST", "OPEN", "RB", "GUIDE", "MOD"];
const ID_RE = /^(DOC|ADR|ARCH|API|REST|OPEN|RB|GUIDE|MOD)-\d{3}$/;
const FILE_RE =
  /^(DOC|ADR|ARCH|API|REST|OPEN|RB|GUIDE|MOD)-\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

const ALLOWED_BASENAMES = new Set(["REGISTER.md", "README.md"]);

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (path.relative(DOCS, p).split(path.sep)[0] === "scratch") continue;
      walk(p, acc);
    } else if (e.name.endsWith(".md")) acc.push(p);
  }
  return acc;
}

function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join("/");
}

const errors = [];
const files = walk(DOCS);

for (const abs of files) {
  const base = path.basename(abs);
  const posix = rel(abs);

  if (ALLOWED_BASENAMES.has(base)) {
    if (base === "REGISTER.md" && posix !== "docs/_control/REGISTER.md") {
      errors.push(`${posix}: REGISTER.md is only allowed at docs/_control/REGISTER.md`);
    }
    if (base === "README.md") {
      // stubs and docs/README.md are allowed
      continue;
    }
    continue;
  }

  if (!FILE_RE.test(base)) {
    errors.push(
      `${posix}: filename must be {ID}-{kebab-slug}.md (got ${base})`,
    );
    continue;
  }

  const text = fs.readFileSync(abs, "utf8");
  const headerId = (text.match(/^\| ID \| ([A-Z]+-\d{3}) \|/m) || [])[1];
  const fileId = base.match(
    /^((?:DOC|ADR|ARCH|API|REST|OPEN|RB|GUIDE|MOD)-\d{3})-/,
  )?.[1];

  if (!headerId) {
    errors.push(`${posix}: missing header ID field`);
    continue;
  }
  if (!ID_RE.test(headerId)) {
    errors.push(`${posix}: invalid header ID ${headerId}`);
  }
  if (fileId !== headerId) {
    errors.push(
      `${posix}: filename ID ${fileId} does not match header ID ${headerId}`,
    );
  }

  const category = (
    text.match(/^\| Category \| ([^|]+) \|/m) || []
  )[1]?.trim();
  const prefix = headerId.split("-")[0];
  const expectedCategory = {
    DOC: "Control",
    ADR: "ADR",
    ARCH: "Architecture",
    API: "API",
    REST: "REST",
    OPEN: "OPEN",
    RB: "Runbook",
    GUIDE: "Guide",
    MOD: "Module",
  }[prefix];
  if (category && expectedCategory && category !== expectedCategory) {
    errors.push(
      `${posix}: category ${category} does not match prefix ${prefix} (expected ${expectedCategory})`,
    );
  }
}

// REGISTER IDs must resolve to a matching {ID}-*.md (except DOC-002/DOC-003 exceptions)
const registerPath = path.join(DOCS, "_control", "REGISTER.md");
if (!fs.existsSync(registerPath)) {
  errors.push("docs/_control/REGISTER.md missing");
} else {
  const register = fs.readFileSync(registerPath, "utf8");
  const rows = [
    ...register.matchAll(
      /^\| ((?:DOC|ADR|ARCH|API|REST|OPEN|RB|GUIDE|MOD)-\d{3}) \|/gm,
    ),
  ].map((m) => m[1]);
  // skip header row duplicate if any — filter unique and skip DOC-002 self
  const ids = [...new Set(rows)].filter((id) => id !== "DOC-002");

  for (const id of ids) {
    if (id === "DOC-003") {
      const readme = path.join(DOCS, "README.md");
      if (!fs.existsSync(readme)) {
        errors.push(`REGISTER ${id}: docs/README.md missing`);
      }
      continue;
    }
    const matches = files.filter((f) =>
      path.basename(f).startsWith(`${id}-`),
    );
    if (matches.length === 0) {
      errors.push(`REGISTER ${id}: no file matching docs/**/${id}-*.md`);
    }
  }
}

if (errors.length) {
  console.error(`check-docs-naming: ${errors.length} error(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `check-docs-naming: ok (${files.length} markdown files, prefixes ${PREFIXES.join("/")})`,
);
