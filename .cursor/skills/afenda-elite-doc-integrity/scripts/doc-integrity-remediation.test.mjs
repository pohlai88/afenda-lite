import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { auditDocs } from "./doc-integrity-core.mjs";
import {
  applySafeRemediation,
  buildRemediationPlan,
} from "./doc-integrity-remediation.mjs";
import {
  documentText,
  fixture,
  setupControl,
} from "./doc-integrity-test-helpers.mjs";

function setupNavigationFixture(fx) {
  fx.write("docs/api/README.md", "# API navigation\n\nSee [future tests](missing.md).\n");
  setupControl(fx, [
    ["ARCH-999", "Architecture", "Unrelated", "1.0.0", "Living", "Platform", "2026-07-13"],
  ]);
}

test("plan-fix emits a hash-guarded AUTO operation only for navigation README drift", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  setupNavigationFixture(fx);
  const report = await auditDocs({ root: fx.root, scope: "docs/api" });
  const finding = report.findings.find((entry) => entry.category === "REFERENCE-BROKEN");
  assert.equal(finding.fixType, "AUTO");
  const plan = buildRemediationPlan(report, { root: fx.root });
  assert.equal(plan.operations.length, 1);
  assert.equal(plan.operations[0].kind, "unlink-missing-navigation-target");
  assert.match(plan.operations[0].beforeSha256, /^sha256:[0-9a-f]{64}$/);
  assert.match(plan.operations[0].afterSha256, /^sha256:[0-9a-f]{64}$/);
});

test("apply-safe closes the finding and a second plan is idempotent", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  setupNavigationFixture(fx);
  const report = await auditDocs({ root: fx.root, scope: "docs/api" });
  const plan = buildRemediationPlan(report, { root: fx.root });
  const result = await applySafeRemediation(plan, { root: fx.root, scope: "docs/api" });
  assert.equal(result.idempotent, true);
  assert.equal(result.report.exitCode, 0);
  assert.equal(
    readFileSync(path.join(fx.root, "docs/api/README.md"), "utf8"),
    "# API navigation\n\nSee future tests.\n",
  );
  assert.equal(buildRemediationPlan(result.report, { root: fx.root }).operations.length, 0);
});

test("apply-safe refuses stale hashes without overwriting the changed file", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  setupNavigationFixture(fx);
  const report = await auditDocs({ root: fx.root, scope: "docs/api" });
  const plan = buildRemediationPlan(report, { root: fx.root });
  const changed = "# API navigation\n\nUser changed this after planning.\n";
  fx.write("docs/api/README.md", changed);
  await assert.rejects(
    applySafeRemediation(plan, { root: fx.root, scope: "docs/api" }),
    /no longer matches|beforeSha256 precondition/,
  );
  assert.equal(readFileSync(path.join(fx.root, "docs/api/README.md"), "utf8"), changed);
});

test("controlled-document broken links remain SEMI and produce no safe operation", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write(
    "docs/api/API-001-controlled.md",
    documentText({ id: "API-001", title: "Controlled", body: "See [missing](missing.md)." }),
  );
  setupControl(fx, [
    ["API-001", "API", "Controlled", "1.0.0", "Draft", "Backend", "2026-07-13"],
  ]);
  const report = await auditDocs({ root: fx.root, scope: "docs/api" });
  const findings = report.findings.filter((entry) => entry.category === "REFERENCE-BROKEN");
  assert.ok(findings.length > 0);
  assert.ok(findings.every((entry) => entry.fixType === "SEMI"));
  const plan = buildRemediationPlan(report, { root: fx.root });
  assert.equal(plan.operations.length, 0);
  assert.ok(plan.unresolved[0].authorityAspect);
  assert.ok(plan.unresolved[0].authority);
  assert.ok(plan.unresolved[0].evidence.length > 0);
  assert.ok(plan.unresolved[0].proposedResolution);
  assert.ok(plan.unresolved[0].verification);
});

test("plan-fix fails closed when audit coverage is incomplete", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("docs/api/broken.yaml", "value: [unterminated");
  setupControl(fx, [
    ["ARCH-999", "Architecture", "Unrelated", "1.0.0", "Living", "Platform", "2026-07-13"],
  ]);
  const report = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(report.exitCode, 2);
  assert.throws(
    () => buildRemediationPlan(report, { root: fx.root }),
    /cannot plan remediation from incomplete audit coverage/,
  );
});
