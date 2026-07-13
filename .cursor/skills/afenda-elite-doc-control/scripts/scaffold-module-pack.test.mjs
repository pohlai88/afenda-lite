import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { applyModulePackPlan, createModulePackPlan, formatPlan } from "./scaffold-module-pack.mjs";

const root = path.resolve(import.meta.dirname, "../../../..");

function options(overrides = {}) {
  return {
    root,
    prefix: "INV",
    slug: "inventory",
    title: "Inventory",
    owner: "Platform",
    profiles: "Enterprise Core,ERP",
    date: "2026-07-14",
    ...overrides,
  };
}

test("dry-run is deterministic and declares eleven files", () => {
  const first = createModulePackPlan(options());
  const second = createModulePackPlan(options());
  assert.equal(first.files.length, 11);
  assert.equal(formatPlan(first), formatPlan(second));
  assert.equal(first.dimensions.length, 16);
});

test("rejects path traversal and malformed prefixes", () => {
  assert.throws(() => createModulePackPlan(options({ slug: "../escape" })), /kebab-case/);
  assert.throws(() => createModulePackPlan(options({ prefix: "inv" })), /uppercase/);
});

test("apply writes only the planned target and refuses overwrite", () => {
  const temporary = mkdtempSync(path.join(tmpdir(), "afenda-module-pack-"));
  try {
    const plan = createModulePackPlan(options({ root, slug: `fixture-${path.basename(temporary).toLowerCase()}` }));
    plan.scratchRoot = path.join(temporary, "docs", "scratch", "module-packs");
    plan.target = path.join(plan.scratchRoot, plan.slug);
    const target = applyModulePackPlan(plan);
    assert.equal(existsSync(path.join(target, "README.md")), true);
    assert.match(readFileSync(path.join(target, "INV-MOD-010-module-docs-index.md"), "utf8"), /Quality profiles:\*\* Enterprise Core, ERP/);
    assert.throws(() => applyModulePackPlan(plan), /Refusing to overwrite/);
    assert.throws(() => applyModulePackPlan({ ...plan, target: path.join(temporary, "escape") }), /must remain under/);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

