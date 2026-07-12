#!/usr/bin/env node
/**
 * check:doc-registry — hard fail on doc/ vs docs/ split violations.
 * Authority: doc/architecture/afenda-elite-doc-registry.md
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function fail(rule, message) {
  failures.push({ message, rule });
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function listFiles(relDir) {
  const abs = path.join(root, relDir);
  if (!fs.existsSync(abs)) {
    return [];
  }
  const out = [];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(p);
      } else {
        out.push(path.relative(root, p).replace(/\\/g, "/"));
      }
    }
  };
  walk(abs);
  return out;
}

const requiredControllers = [
  "doc/README.md",
  "doc/architecture/afenda-elite-documentation-types.md",
  "doc/architecture/afenda-elite-glossary-register.md",
  "doc/architecture/afenda-elite-skills-architecture.md",
  "doc/architecture/afenda-elite-doc-registry.md",
];

for (const rel of requiredControllers) {
  if (!exists(rel)) {
    fail("R1", `Missing required Elite controller: ${rel}`);
  }
}

const docFiles = listFiles("doc");
for (const rel of docFiles) {
  if (rel === "doc/README.md") {
    continue;
  }
  if (/^doc\/architecture\/afenda-elite-[a-z0-9-]+\.md$/i.test(rel)) {
    continue;
  }
  fail("R2", `Illegal path under doc/ (Elite controllers only): ${rel}`);
}

const forbiddenDocSubtrees = [
  "doc/adr",
  "doc/api",
  "doc/backend",
  "doc/frontend",
  "doc/fft",
  "doc/runbooks",
];
for (const rel of forbiddenDocSubtrees) {
  if (exists(rel)) {
    fail("R3", `Forbidden production subtree under doc/: ${rel}`);
  }
}

const docsFiles = listFiles("docs");
for (const rel of docsFiles) {
  if (/afenda-elite-/i.test(path.basename(rel))) {
    fail("R4", `Elite controller must not live under docs/: ${rel}`);
  }
}

const requiredDocsHomes = [
  "docs/README.md",
  "docs/adr",
  "docs/api",
  "docs/architecture",
  "docs/backend",
  "docs/frontend",
  "docs/runbooks",
  "docs/fft",
];
for (const rel of requiredDocsHomes) {
  if (!exists(rel)) {
    fail("R5", `Missing required docs/ home: ${rel}`);
  }
}

const typesPath = path.join(
  root,
  "doc/architecture/afenda-elite-documentation-types.md"
);
if (fs.existsSync(typesPath)) {
  const body = fs.readFileSync(typesPath, "utf8");
  for (const needle of [
    "**ADR**",
    "**Register**",
    "**Architecture SSOT**",
    "**Runbook / ops**",
    "**API contract**",
  ]) {
    if (!body.includes(needle)) {
      fail("R6", `documentation-types missing type row: ${needle}`);
    }
  }
  if (!body.includes("`docs/")) {
    fail("R6", "documentation-types must point production homes at docs/");
  }
  if (!body.includes("doc/architecture/afenda-elite-")) {
    fail("R6", "documentation-types must keep Elite controllers under doc/");
  }
}

if (!exists(".cursor/rules/doc-registry.mdc")) {
  fail("R7", "Missing alwaysApply Cursor rule: .cursor/rules/doc-registry.mdc");
}

if (failures.length === 0) {
  console.log("check:doc-registry OK");
  console.log(`  doc controllers: ${docFiles.length}`);
  console.log(`  docs files scanned: ${docsFiles.length}`);
  process.exit(0);
}

console.error("check:doc-registry FAILED — agent must STOP and fix:\n");
for (const f of failures) {
  console.error(`  [${f.rule}] ${f.message}`);
}
console.error(
  "\nAuthority: doc/architecture/afenda-elite-doc-registry.md\nRule: .cursor/rules/doc-registry.mdc"
);
process.exit(1);
