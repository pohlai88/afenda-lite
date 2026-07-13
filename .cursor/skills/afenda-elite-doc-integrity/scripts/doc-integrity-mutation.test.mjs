/**
 * Mutation-style regression fixtures: for every finding category not
 * already exercised by doc-integrity-audit.test.mjs, build a clean
 * baseline (auditDocs reports no findings in that category), then flip
 * exactly one controlled fact and prove the expected finding — and only
 * that finding — appears.
 *
 * Categories already proven this way in doc-integrity-audit.test.mjs
 * are not duplicated here: HEADER-DRIFT (h1-id), REFERENCE-BROKEN (missing
 * file), REGISTER-DRIFT (Title), STRUCTURE-DRIFT, SSOT-CONFLICT,
 * LIFECYCLE-ERROR, SSOT-AMBIGUOUS.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { auditDocs } from "./doc-integrity-core.mjs";
import {
  authorityYaml,
  documentText,
  fixture,
  setupControl,
} from "./doc-integrity-test-helpers.mjs";

function categories(report) {
  return new Set(report.findings.map((entry) => entry.category));
}

function findingsOf(report, category) {
  return report.findings.filter((entry) => entry.category === category);
}

test("mutation: bad filename pattern triggers HEADER-DRIFT (filename-id)", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("docs/api/API-001-clean.md", documentText({ id: "API-001", title: "Clean" }));
  setupControl(fx, [["API-001", "API", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]]);
  const clean = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(categories(clean).has("HEADER-DRIFT"), false);

  fx.remove("docs/api/API-001-clean.md");
  fx.write("docs/api/API-001_clean.md", documentText({ id: "API-001", title: "Clean" }));
  const mutated = await auditDocs({ root: fx.root, scope: "docs/api" });
  const findings = findingsOf(mutated, "HEADER-DRIFT");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].authorityAspect, "filename-id");
  assert.match(findings[0].evidence.join("\n"), /Filename does not match/);
});

test("mutation: filename ID vs header ID mismatch triggers HEADER-DRIFT (filename-id)", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("docs/api/API-001-clean.md", documentText({ id: "API-001", title: "Clean" }));
  setupControl(fx, [["API-001", "API", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]]);
  const clean = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(categories(clean).has("HEADER-DRIFT"), false);

  fx.remove("docs/api/API-001-clean.md");
  fx.write("docs/api/API-002-clean.md", documentText({ id: "API-001", title: "Clean" }));
  const mutated = await auditDocs({ root: fx.root, scope: "docs/api" });
  const findings = findingsOf(mutated, "HEADER-DRIFT");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].authorityAspect, "filename-id");
  assert.match(findings[0].evidence.join("\n"), /Filename ID API-002 differs from header ID API-001/);
});

test("mutation: two files claiming the same ID trigger a Critical HEADER-DRIFT (duplicate-id)", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("docs/api/API-001-first.md", documentText({ id: "API-001", title: "Clean" }));
  setupControl(fx, [["API-001", "API", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]]);
  const clean = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(categories(clean).has("HEADER-DRIFT"), false);

  fx.write("docs/api/API-001-second.md", documentText({ id: "API-001", title: "Clean" }));
  const mutated = await auditDocs({ root: fx.root, scope: "docs/api" });
  const findings = findingsOf(mutated, "HEADER-DRIFT").filter((f) => f.authorityAspect === "duplicate-id");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "Critical");
  assert.match(findings[0].evidence.join("\n"), /API-001 is claimed by 2 files/);
});

test("mutation: wrong Category for an ID's prefix triggers CATEGORY-ERROR without HOME-ERROR", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("docs/api/API-001-clean.md", documentText({ id: "API-001", title: "Clean" }));
  setupControl(fx, [["API-001", "API", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]]);
  const clean = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(categories(clean).has("CATEGORY-ERROR"), false);

  // REST's home list also includes docs/api/, so this isolates the category
  // mismatch from any home-folder mismatch.
  fx.write("docs/api/API-001-clean.md", documentText({ id: "API-001", title: "Clean", category: "REST" }));
  setupControl(fx, [["API-001", "REST", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]]);
  const mutated = await auditDocs({ root: fx.root, scope: "docs/api" });
  const findings = findingsOf(mutated, "CATEGORY-ERROR");
  assert.equal(findings.length, 1);
  assert.equal(categories(mutated).has("HOME-ERROR"), false);
  assert.match(findings[0].evidence.join("\n"), /API-001 expects API; header has REST/);
});

test("mutation: category home mismatch triggers HOME-ERROR without CATEGORY-ERROR", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("docs/api/API-001-clean.md", documentText({ id: "API-001", title: "Clean" }));
  setupControl(fx, [["API-001", "API", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]]);
  const clean = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(categories(clean).has("HOME-ERROR"), false);

  // RB-001/Runbook correctly matches its own prefix (no CATEGORY-ERROR), but
  // Runbook's home is docs/runbooks/, not docs/api/ — isolating HOME-ERROR.
  fx.remove("docs/api/API-001-clean.md");
  fx.write("docs/api/RB-001-clean.md", documentText({ id: "RB-001", title: "Clean", category: "Runbook" }));
  setupControl(fx, [["RB-001", "Runbook", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]]);
  const mutated = await auditDocs({ root: fx.root, scope: "docs/api" });
  const findings = findingsOf(mutated, "HOME-ERROR");
  assert.equal(findings.length, 1);
  assert.equal(categories(mutated).has("CATEGORY-ERROR"), false);
  assert.match(findings[0].evidence.join("\n"), /Runbook document is outside its governed home/);
});

test("mutation: missing Change Log table triggers VERSION-DRIFT", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("docs/api/API-001-clean.md", documentText({ id: "API-001", title: "Clean" }));
  setupControl(fx, [["API-001", "API", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]]);
  const clean = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(categories(clean).has("VERSION-DRIFT"), false);

  fx.write(
    "docs/api/API-001-clean.md",
    documentText({ id: "API-001", title: "Clean", changeLog: false }),
  );
  const mutated = await auditDocs({ root: fx.root, scope: "docs/api" });
  const findings = findingsOf(mutated, "VERSION-DRIFT");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].authorityAspect, "version-change-log");
  assert.match(findings[0].evidence.join("\n"), /No parseable latest Change Log row was found/);
});

test("mutation: header/Change-Log version mismatch triggers VERSION-DRIFT", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("docs/api/API-001-clean.md", documentText({ id: "API-001", title: "Clean" }));
  setupControl(fx, [["API-001", "API", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]]);
  const clean = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(categories(clean).has("VERSION-DRIFT"), false);

  const drifted = documentText({ id: "API-001", title: "Clean", version: "1.0.0" }).replace(
    "| 1.0.0 | 2026-07-13 | Fixture. |",
    "| 1.1.0 | 2026-07-14 | Fixture. |",
  );
  fx.write("docs/api/API-001-clean.md", drifted);
  const mutated = await auditDocs({ root: fx.root, scope: "docs/api" });
  const findings = findingsOf(mutated, "VERSION-DRIFT");
  assert.equal(findings.length, 1);
  assert.match(findings[0].evidence.join("\n"), /Header 1\.0\.0\/2026-07-13; latest Change Log 1\.1\.0\/2026-07-14/);
});

test("mutation: a file with no DOC-002 row triggers REGISTER-DRIFT (register-membership)", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("docs/api/API-001-clean.md", documentText({ id: "API-001", title: "Clean" }));
  setupControl(fx, [["API-001", "API", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]]);
  const clean = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(categories(clean).has("REGISTER-DRIFT"), false);

  setupControl(fx, [["ARCH-999", "Architecture", "Unrelated", "1.0.0", "Living", "Platform", "2026-07-13"]]);
  const mutated = await auditDocs({ root: fx.root, scope: "docs/api" });
  const findings = findingsOf(mutated, "REGISTER-DRIFT");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].authorityAspect, "register-membership");
  assert.equal(findings[0].severity, "High");
  assert.match(findings[0].evidence.join("\n"), /No DOC-002 row exists for API-001/);
});

test("mutation: a non-Title register field mismatch is High severity REGISTER-DRIFT", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("docs/api/API-001-clean.md", documentText({ id: "API-001", title: "Clean", owner: "Backend" }));
  setupControl(fx, [["API-001", "API", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]]);
  const clean = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(categories(clean).has("REGISTER-DRIFT"), false);

  setupControl(fx, [["API-001", "API", "Clean", "1.0.0", "Draft", "Platform", "2026-07-13"]]);
  const mutated = await auditDocs({ root: fx.root, scope: "docs/api" });
  const findings = findingsOf(mutated, "REGISTER-DRIFT");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].authorityAspect, "register-owner");
  assert.equal(findings[0].severity, "High");
  assert.match(findings[0].evidence.join("\n"), /Owner: document="Backend", register="Platform"/);
});

test("mutation: a broken heading anchor triggers REFERENCE-BROKEN (relative-anchor)", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write(
    "docs/api/API-001-source.md",
    documentText({ id: "API-001", title: "Source", body: "See [target](API-002-target.md#3-contract)." }),
  );
  fx.write("docs/api/API-002-target.md", documentText({ id: "API-002", title: "Target" }));
  setupControl(fx, [
    ["API-001", "API", "Source", "1.0.0", "Draft", "Backend", "2026-07-13"],
    ["API-002", "API", "Target", "1.0.0", "Draft", "Backend", "2026-07-13"],
  ]);
  const clean = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(categories(clean).has("REFERENCE-BROKEN"), false);

  fx.write(
    "docs/api/API-001-source.md",
    documentText({ id: "API-001", title: "Source", body: "See [target](API-002-target.md#missing-section)." }),
  );
  const mutated = await auditDocs({ root: fx.root, scope: "docs/api" });
  const findings = findingsOf(mutated, "REFERENCE-BROKEN");
  // documentText() embeds `body` in both the Purpose and Contract sections of
  // the structured template, so the broken link is detected at both sites.
  assert.equal(findings.length, 2);
  for (const finding of findings) {
    assert.equal(finding.authorityAspect, "relative-anchor");
    assert.match(finding.evidence.join("\n"), /Anchor does not exist/);
  }
});

test("mutation: OPEN-001 claiming a moved recipe it still owns triggers STALE-CLAIM", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const openBody =
    "## Recipes\n\nRecipe content lives here. Note (1.1.4): OpenAPI recipes moved to GUIDE-011.\n\n## Forward — Zod SSOT handoff\n\nFuture direction.";
  const guideBody = "Plan to move recipes out of OPEN-001. Until Living, follow generate notes in [OPEN-001](../OPEN-001-openapi.md).";
  fx.write("docs/api/OPEN-001-openapi.md", documentText({ id: "OPEN-001", title: "OpenAPI", category: "OPEN", status: "Living", body: openBody }));
  fx.write("docs/api/guides/GUIDE-011-recipes.md", documentText({ id: "GUIDE-011", title: "Recipes", category: "Guide", status: "Draft", body: guideBody }));
  setupControl(fx, [
    ["OPEN-001", "OPEN", "OpenAPI", "1.0.0", "Living", "Backend", "2026-07-13"],
    ["GUIDE-011", "Guide", "Recipes", "1.0.0", "Draft", "Backend", "2026-07-13"],
  ], { notes: "API guides live under `docs/api/guides/`." });
  const mutated = await auditDocs({ root: fx.root, scope: "docs/api" });
  const findings = findingsOf(mutated, "STALE-CLAIM");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].authorityAspect, "recipe-ownership");

  const openBodyFixed = "## Recipes\n\nRecipe content lives here.";
  fx.write("docs/api/OPEN-001-openapi.md", documentText({ id: "OPEN-001", title: "OpenAPI", category: "OPEN", status: "Living", body: openBodyFixed }));
  const clean = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(categories(clean).has("STALE-CLAIM"), false);
});

test("mutation: a fully-compliant OpenAPI artifact has zero ARTIFACT-DRIFT findings", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write(
    "docs/api/OPEN-001-openapi.yaml",
    `openapi: 3.0.3
info: { title: Fixture, version: 1.0.0 }
x-afenda-document: { id: OPEN-001, version: 1.0.0, generatedAt: 2026-07-13 }
paths:
  /items:
    get:
      operationId: listItems
      x-afenda-status: live
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema: { type: object, properties: { data: { type: array, items: { type: string } } } }
`,
  );
  fx.write("docs/api/OPEN-001-openapi.md", documentText({ id: "OPEN-001", title: "OpenAPI", category: "OPEN", status: "Living" }));
  setupControl(fx, [["OPEN-001", "OPEN", "OpenAPI", "1.0.0", "Living", "Backend", "2026-07-13"]]);
  const clean = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(categories(clean).has("ARTIFACT-DRIFT"), false);
});

test("mutation: a contract-only operation missing x-afenda-try-it: false triggers ARTIFACT-DRIFT", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write(
    "docs/api/OPEN-001-openapi.yaml",
    `openapi: 3.0.3
info: { title: Fixture, version: 1.0.0 }
x-afenda-document: { id: OPEN-001, version: 1.0.0, generatedAt: 2026-07-13 }
paths:
  /items:
    get:
      operationId: listItems
      x-afenda-status: contract-only
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema: { type: object, properties: { data: { type: array, items: { type: string } } } }
`,
  );
  fx.write("docs/api/OPEN-001-openapi.md", documentText({ id: "OPEN-001", title: "OpenAPI", category: "OPEN", status: "Living" }));
  setupControl(fx, [["OPEN-001", "OPEN", "OpenAPI", "1.0.0", "Living", "Backend", "2026-07-13"]]);
  const mutated = await auditDocs({ root: fx.root, scope: "docs/api" });
  const findings = findingsOf(mutated, "ARTIFACT-DRIFT");
  assert.equal(findings.length, 1);
  assert.match(findings[0].evidence.join("\n"), /contract-only operation must set x-afenda-try-it: false/);
});

test("mutation: invalid Control State triggers LIFECYCLE-ERROR (control-state-value)", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("docs/api/API-001-clean.md", documentText({ id: "API-001", title: "Clean" }));
  setupControl(fx, [["API-001", "API", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]]);
  const clean = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(categories(clean).has("LIFECYCLE-ERROR"), false);

  fx.write(
    "docs/api/API-001-clean.md",
    documentText({ id: "API-001", title: "Clean", controlState: "Pending" }),
  );
  const mutated = await auditDocs({ root: fx.root, scope: "docs/api" });
  const findings = findingsOf(mutated, "LIFECYCLE-ERROR");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].authorityAspect, "control-state-value");
});

test("mutation: Reopened without note triggers STRUCTURE-DRIFT (control-state-note)", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("docs/api/API-001-clean.md", documentText({ id: "API-001", title: "Clean" }));
  setupControl(fx, [["API-001", "API", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]]);
  const clean = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(
    findingsOf(clean, "STRUCTURE-DRIFT").some((f) => f.authorityAspect === "control-state-note"),
    false,
  );

  fx.write(
    "docs/api/API-001-clean.md",
    documentText({
      id: "API-001",
      title: "Clean",
      controlState: "Reopened",
      omitControlStateNote: true,
    }),
  );
  const mutated = await auditDocs({ root: fx.root, scope: "docs/api" });
  const findings = findingsOf(mutated, "STRUCTURE-DRIFT").filter(
    (f) => f.authorityAspect === "control-state-note",
  );
  assert.equal(findings.length, 1);
});

test("mutation: docs/_control missing Control State triggers STRUCTURE-DRIFT (control-state-header)", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const withoutControlState = `# DOC-001 Documentation Control Standard

| Field | Value |
| --- | --- |
| **ID** | DOC-001 |
| **Category** | Control |
| **Version** | 1.0.0 |
| **Status** | Living |
| **Owner** | Platform |
| **Updated** | 2026-07-13 |

# 1. Purpose
None.
# 2. Scope
None.
# 3. Control Requirements
None.
# 4. References
None.
# 5. Change Log

| Version | Date | Summary |
| --- | --- | --- |
| 1.0.0 | 2026-07-13 | Fixture. |

# 6. Notes
None.
`;
  fx.write("docs/_control/DOC-001-documentation-control-standard.md", withoutControlState);
  setupControl(fx, [
    ["DOC-001", "Control", "Documentation Control Standard", "1.0.0", "Living", "Platform", "2026-07-13"],
  ]);
  const mutated = await auditDocs({ root: fx.root, scope: "docs/_control" });
  const findings = findingsOf(mutated, "STRUCTURE-DRIFT").filter(
    (f) => f.authorityAspect === "control-state-header",
  );
  assert.equal(findings.length, 1);
});

const moduleRoles = {
  "001": ["Module Architecture", "module-architecture", "CORE-ARCH"],
  "002": ["Domain and Ownership", "domain-and-ownership", "CORE-PROCESS"],
  "003": ["Tech Stack", "tech-stack", "CORE-PLATFORM"],
  "004": ["Data Model", "data-model", "CORE-DATA"],
  "005": ["Auth, Tenancy and RBAC", "auth-tenancy-rbac", "CORE-SECURITY"],
  "006": ["Surfaces and Routes", "surfaces-and-routes", "CORE-EXPERIENCE"],
  "007": ["API and Adapters", "api-and-adapters", "CORE-INTEGRATION"],
  "008": ["Ops Runtime", "ops-runtime", "CORE-OPERATIONS"],
};

function evidenceTable(rows) {
  const header =
    "| AC-ID | Owner MOD | Profile | Quality Dimension | Applicability | Activation | Evidence | Evidence Reference | Evidence Revision | Evidence Date | Blocker / Rationale |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |";
  const body = rows
    .map((row) => {
      const role = row[1].slice(-3);
      return `| ${row[0]} | ${row[1]} | Enterprise Core | ${moduleRoles[role][2]} | ${row[2]} | ${row[3]} | ${row[4]} | ${row[5]} | ${row[6]} | ${row[7]} | ${row[8]} |`;
    })
    .join("\n");
  return `${header}\n${body}`;
}

function writeModulePack(fx, { evidenceRows, claim = "Not claimable" }) {
  const defaultRows = Object.keys(moduleRoles).map((role) => [
    `FFT-AC-${role}-01`,
    `FFT-MOD-${role}`,
    "Core",
    "Enabled",
    "NOT EVIDENCED",
    "—",
    "—",
    "2026-07-14",
    "Pending evidence",
  ]);
  const rows = [...evidenceRows, ...defaultRows.filter((row) => !evidenceRows.some((candidate) => candidate[0] === row[0]))];
  const registerRows = [];
  for (const [role, [title, slug, dimension]] of Object.entries(moduleRoles)) {
    const id = `FFT-MOD-${role}`;
    fx.write(
      `docs/modules/feed-farm-trade/${id}-${slug}.md`,
      documentText({
        id,
        title,
        category: "Module",
        owner: "Feed Farm Trade",
        body: `### Enterprise requirements\n\n| AC-ID | Profile | Quality Dimension | Applicability | Criterion |\n| --- | --- | --- | --- | --- |\n| FFT-AC-${role}-01 | Enterprise Core | ${dimension} | Core | Fixture criterion for ${dimension}. |`,
      }),
    );
    registerRows.push([id, "Module", title, "1.0.0", "Draft", "Feed Farm Trade", "2026-07-13"]);
  }
  fx.write(
    "docs/modules/feed-farm-trade/FFT-MOD-009-verification.md",
    documentText({
      id: "FFT-MOD-009",
      title: "Verification",
      category: "Module",
      owner: "Feed Farm Trade",
      body: `### Structured evidence table\n\n${evidenceTable(rows)}`,
    }),
  );
  fx.write(
    "docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md",
    documentText({
      id: "FFT-MOD-010",
      title: "Module Docs Index + Roadmap",
      category: "Module",
      owner: "Feed Farm Trade",
      body: `### Module Enterprise Readiness\n\n**Quality profiles:** Enterprise Core\n\n**Module Enterprise Readiness claim:** ${claim}`,
    }),
  );
  registerRows.push(
    ["FFT-MOD-009", "Module", "Verification", "1.0.0", "Draft", "Feed Farm Trade", "2026-07-13"],
    ["FFT-MOD-010", "Module", "Module Docs Index + Roadmap", "1.0.0", "Draft", "Feed Farm Trade", "2026-07-13"],
  );
  setupControl(fx, registerRows);
}

test("mutation: missing structured evidence table triggers MODULE-EVIDENCE-DRIFT", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const row = [
    "FFT-AC-001-01",
    "FFT-MOD-001",
    "Core",
    "Enabled",
    "NOT EVIDENCED",
    "—",
    "—",
    "2026-07-14",
    "Pending evidence",
  ];
  writeModulePack(fx, { evidenceRows: [row] });
  const clean = await auditDocs({ root: fx.root, scope: "docs/modules" });
  assert.equal(categories(clean).has("MODULE-EVIDENCE-DRIFT"), false);

  fx.write(
    "docs/modules/feed-farm-trade/FFT-MOD-009-verification.md",
    documentText({
      id: "FFT-MOD-009",
      title: "Verification",
      category: "Module",
      body: "No evidence table.",
    }),
  );
  const mutated = await auditDocs({ root: fx.root, scope: "docs/modules" });
  const findings = findingsOf(mutated, "MODULE-EVIDENCE-DRIFT");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].authorityAspect, "structured-evidence");
});

test("mutation: invalid PASS row and claimable mismatch trigger evidence and claim drift", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const valid = [
    "FFT-AC-001-01",
    "FFT-MOD-001",
    "Core",
    "Enabled",
    "NOT EVIDENCED",
    "—",
    "—",
    "2026-07-14",
    "Pending evidence",
  ];
  writeModulePack(fx, { evidenceRows: [valid], claim: "Not claimable" });
  const clean = await auditDocs({ root: fx.root, scope: "docs/modules" });
  assert.equal(categories(clean).has("MODULE-EVIDENCE-DRIFT"), false);
  assert.equal(categories(clean).has("MODULE-CLAIM-DRIFT"), false);

  const badPass = [
    "FFT-AC-001-01",
    "FFT-MOD-001",
    "Core",
    "Enabled",
    "PASS",
    " ",
    " ",
    " ",
    " ",
  ];
  writeModulePack(fx, { evidenceRows: [badPass], claim: "Claimable" });
  const mutated = await auditDocs({ root: fx.root, scope: "docs/modules" });
  assert.equal(findingsOf(mutated, "MODULE-EVIDENCE-DRIFT").length, 1);
  assert.equal(findingsOf(mutated, "MODULE-CLAIM-DRIFT").length, 1);
  assert.equal(findingsOf(mutated, "MODULE-CLAIM-DRIFT")[0].severity, "Critical");
});

test("mutation: duplicate AC-ID and owner-role mismatch are rejected", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const base = [
    "FFT-AC-001-01",
    "FFT-MOD-001",
    "Core",
    "Enabled",
    "NOT EVIDENCED",
    "—",
    "—",
    "2026-07-14",
    "Pending evidence",
  ];
  writeModulePack(fx, { evidenceRows: [base] });
  const clean = await auditDocs({ root: fx.root, scope: "docs/modules" });
  assert.equal(categories(clean).has("MODULE-EVIDENCE-DRIFT"), false);

  const dup = [
    [
      "FFT-AC-001-01",
      "FFT-MOD-002",
      "Core",
      "Enabled",
      "NOT EVIDENCED",
      "—",
      "—",
      "2026-07-14",
      "Pending evidence",
    ],
    [
      "FFT-AC-001-01",
      "FFT-MOD-001",
      "Core",
      "Enabled",
      "NOT EVIDENCED",
      "—",
      "—",
      "2026-07-14",
      "Duplicate",
    ],
  ];
  writeModulePack(fx, { evidenceRows: dup });
  const mutated = await auditDocs({ root: fx.root, scope: "docs/modules" });
  const evidence = findingsOf(mutated, "MODULE-EVIDENCE-DRIFT");
  assert.equal(evidence.length, 1);
  assert.match(evidence[0].evidence.join("\n"), /AC-ID and Owner MOD disagree|duplicate evidence row/);
});
