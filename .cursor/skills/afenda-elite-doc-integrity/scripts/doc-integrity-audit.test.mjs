import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import Ajv from "ajv";

import {
  auditDocs,
  githubAnchor,
  parseMarkdown,
  validateOpenApiFile,
} from "./doc-integrity-core.mjs";
import {
  authorityYaml,
  documentText,
  fixture,
  setupControl,
} from "./doc-integrity-test-helpers.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../../../..");

test("Markdown parser supports legacy/modern headers and composite IDs", () => {
  const legacy = parseMarkdown(documentText({ id: "API-001", title: "Legacy", modern: false }), "legacy.md");
  const modern = parseMarkdown(documentText({ id: "FFT-MOD-001", title: "Modern", category: "Module" }), "modern.md");
  assert.equal(legacy.id, "API-001");
  assert.equal(modern.id, "FFT-MOD-001");
  assert.equal(modern.title, "Modern");
  assert.equal(modern.hasSixSections, true);
});

test("GitHub-compatible anchors normalize punctuation and duplicate-ready text", () => {
  assert.equal(githubAnchor("3.5 Success & Error Model"), "35-success-error-model");
  assert.equal(githubAnchor("API Contract (Draft)"), "api-contract-draft");
});

test("clean structured fixture returns exit 0", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("docs/api/API-001-clean.md", documentText({ id: "API-001", title: "Clean" }));
  setupControl(fx, [["API-001", "API", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]]);
  const report = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(report.exitCode, 0);
  assert.equal(report.coverage.complete, true);
  assert.equal(report.findings.length, 0);
  assert.match(
    report.residualRisk,
    /^None for this scope beyond standing exclusions/,
  );
});

test("residualRisk lists unimplemented in-scope comparison sets when findings are zero", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write(
    "docs/architecture/ARCH-023-multi-tenancy.md",
    documentText({
      id: "ARCH-023",
      title: "Multi-Tenancy",
      category: "Architecture",
      status: "Living",
      owner: "Platform",
      body: ["surveys", "client_invitations", "client_profiles", "client_assignments", "fft_event", "fft_sales_member", "fft_role", "fft_role_assignment"].join(" "),
    }),
  );
  fx.write(
    "docs/architecture/ARCH-025-data-layer.md",
    documentText({
      id: "ARCH-025",
      title: "Data Layer",
      category: "Architecture",
      status: "Target",
      owner: "Backend",
      body: "Schema matches shipped migrations.",
    }),
  );
  setupControl(fx, [
    ["ARCH-023", "Architecture", "Multi-Tenancy", "1.0.0", "Living", "Platform", "2026-07-13"],
    ["ARCH-025", "Architecture", "Data Layer", "1.0.0", "Target", "Backend", "2026-07-13"],
  ]);
  fx.write(
    ".cursor/skills/afenda-elite-doc-integrity/authority-map.yaml",
    `version: 2
subjects:
  multi-tenancy:
    aspects:
      shared-schema-and-org-predicates:
        precedence: [ARCH-023, ARCH-025]
  documentation-governance:
    aspects:
      lifecycle-and-folder-policy:
        precedence: [DOC-001]
cross_subject_sets:
  multi-tenancy-consistency:
    subjects: [multi-tenancy, documentation-governance]
    evidence: [ARCH-023, ARCH-025]
  future-unimplemented-set:
    subjects: [multi-tenancy, documentation-governance]
    evidence: [ARCH-023, ARCH-025]
locks: []
`,
  );
  const report = await auditDocs({
    root: fx.root,
    scope: "docs/architecture",
    authorityMap: ".cursor/skills/afenda-elite-doc-integrity/authority-map.yaml",
  });
  assert.equal(report.exitCode, 0);
  assert.match(report.residualRisk, /future-unimplemented-set/);
  assert.doesNotMatch(report.residualRisk, /still require human pairwise review\.$/);
});

test("multi-tenancy invented schema homes are ARCH-MISALIGNMENT", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write(
    "docs/architecture/ARCH-023-multi-tenancy.md",
    documentText({
      id: "ARCH-023",
      title: "Multi-Tenancy",
      category: "Architecture",
      status: "Living",
      owner: "Platform",
      body: ["surveys", "client_invitations", "client_profiles", "client_assignments", "fft_event", "fft_sales_member", "fft_role", "fft_role_assignment"].join(" "),
    }),
  );
  fx.write(
    "docs/architecture/ARCH-025-data-layer.md",
    documentText({
      id: "ARCH-025",
      title: "Data Layer",
      category: "Architecture",
      status: "Target",
      owner: "Backend",
      body: "├── fft.ts           ← fft_orders, fft_items, fft_pickups, fft_access",
    }),
  );
  setupControl(fx, [
    ["ARCH-023", "Architecture", "Multi-Tenancy", "1.0.0", "Living", "Platform", "2026-07-13"],
    ["ARCH-025", "Architecture", "Data Layer", "1.0.0", "Target", "Backend", "2026-07-13"],
  ]);
  const report = await auditDocs({ root: fx.root, scope: "docs/architecture" });
  assert.equal(report.exitCode, 1);
  assert.ok(report.findings.some((entry) => entry.category === "ARCH-MISALIGNMENT"));
});

test("the final emitted report shape validates including exitCode", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("docs/api/API-001-clean.md", documentText({ id: "API-001", title: "Clean" }));
  setupControl(fx, [["API-001", "API", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]]);
  const report = await auditDocs({ root: fx.root, scope: "docs/api" });
  const schema = JSON.parse(readFileSync(path.join(SCRIPT_DIR, "schemas/report.schema.json"), "utf8"));
  const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
  assert.equal(validate(report), true, JSON.stringify(validate.errors));
  assert.equal(report.exitCode, 0);
});

test("naming profile ignores missing Change Log without throwing", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write(
    "docs/api/API-001-clean.md",
    documentText({ id: "API-001", title: "Clean", changeLog: false }),
  );
  setupControl(fx, [["API-001", "API", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]]);
  const report = await auditDocs({ root: fx.root, scope: "docs/api", profile: "naming" });
  assert.equal(report.exitCode, 0);
  assert.equal(report.coverage.complete, true);
});

test("H1 identity drift is reported explicitly", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write(
    "docs/api/API-001-clean.md",
    documentText({ id: "API-001", title: "Clean" }).replace("# API-001 Clean", "# Clean"),
  );
  setupControl(fx, [["API-001", "API", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]]);
  const report = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(report.exitCode, 1);
  assert.ok(report.findings.some((entry) => entry.authorityAspect === "h1-id"));
});

test("malformed and duplicate register rows make coverage incomplete", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("docs/api/API-001-clean.md", documentText({ id: "API-001", title: "Clean" }));
  setupControl(fx, [
    ["API-001", "API", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"],
    ["API-001", "API", "Duplicate", "1.0.0", "Draft", "Backend", "2026-07-13"],
    ["BAD", "API", "Malformed", "1.0.0", "Draft", "Backend", "2026-07-13"],
  ]);
  const report = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(report.exitCode, 2);
  assert.match(report.coverage.failures.join("\n"), /duplicate ID API-001/);
  assert.match(report.coverage.failures.join("\n"), /invalid ID "BAD"/);
});

test("malformed JSON and YAML artifacts return incomplete coverage and exit 2", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("docs/api/API-001-clean.md", documentText({ id: "API-001", title: "Clean" }));
  fx.write("docs/api/broken.json", "{ not-json");
  fx.write("docs/api/broken.yaml", "value: [unterminated");
  setupControl(fx, [["API-001", "API", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]]);
  const report = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(report.exitCode, 2);
  assert.equal(report.coverage.complete, false);
  assert.equal(report.coverage.primaryInspected, 1);
  assert.equal(report.coverage.primaryExpected, 3);
});

test("link, title, and structure fixtures return confirmed/review findings", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write(
    "docs/api/API-001-drift.md",
    documentText({
      id: "API-001",
      title: "Wrong Title",
      status: "Living",
      structured: false,
      body: "See [missing](missing.md).",
    }),
  );
  setupControl(fx, [["API-001", "API", "Canonical Title", "1.0.0", "Living", "Backend", "2026-07-13"]]);
  const report = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(report.exitCode, 1);
  assert.deepEqual(
    new Set(report.findings.map((entry) => entry.category)),
    new Set(["REFERENCE-BROKEN", "REGISTER-DRIFT", "STRUCTURE-DRIFT"]),
  );
  assert.equal(
    report.findings.find((entry) => entry.category === "STRUCTURE-DRIFT").evidenceTier,
    "Review needed",
  );
});

test("invalid authority map makes coverage incomplete and exits 2", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("docs/api/API-001-clean.md", documentText({ id: "API-001", title: "Clean" }));
  setupControl(
    fx,
    [["API-001", "API", "Clean", "1.0.0", "Draft", "Backend", "2026-07-13"]],
    { authority: "version: 1\nsubjects: {}\n" },
  );
  const report = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(report.exitCode, 2);
  assert.equal(report.coverage.complete, false);
});

test("OpenAPI fixture catches identity, status, provenance, and refs", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write(
    "docs/api/OPEN-001-openapi.yaml",
    `openapi: 3.0.3
info:
  title: Fixture
  version: 1.0.0
servers:
  - url: https://example.com
paths:
  /items:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Missing"
components:
  schemas: {}
`,
  );
  fx.write(
    "docs/api/OPEN-001-openapi.md",
    documentText({ id: "OPEN-001", title: "OpenAPI", category: "OPEN", status: "Living" }),
  );
  setupControl(fx, [["OPEN-001", "OPEN", "OpenAPI", "1.0.0", "Living", "Backend", "2026-07-13"]]);
  const report = await auditDocs({ root: fx.root, scope: "docs/api" });
  assert.equal(report.exitCode, 1);
  const artifact = report.findings.find((entry) => entry.category === "ARTIFACT-DRIFT");
  assert.ok(artifact);
  assert.match(artifact.evidence.join("\n"), /operationId/);
  assert.match(artifact.evidence.join("\n"), /x-afenda-status/);
  assert.match(artifact.evidence.join("\n"), /x-afenda-document/);
  assert.match(artifact.evidence.join("\n"), /unresolved internal reference/);
});

test("OpenAPI envelope resolution follows chained refs and allOf", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("openapi.yaml", `openapi: 3.0.3
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
              schema: { $ref: "#/components/schemas/EnvelopeAlias" }
components:
  schemas:
    EnvelopeAlias: { $ref: "#/components/schemas/Envelope" }
    Envelope:
      allOf:
        - type: object
          properties: { data: { type: array, items: { type: string } } }
`);
  const { validateOpenApiFile } = await import("./doc-integrity-core.mjs");
  const result = await validateOpenApiFile(path.join(fx.root, "openapi.yaml"));
  assert.equal(result.complete, true);
  assert.ok(!result.issues.some((issue) => /success schema lacks/.test(issue)));
});

test("unresolved external refs do not cascade into envelope diagnostics", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.write("openapi.yaml", `openapi: 3.0.3
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
              schema: { $ref: "./missing.yaml#/Envelope" }
`);
  const result = await validateOpenApiFile(path.join(fx.root, "openapi.yaml"));
  assert.equal(result.complete, true);
  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0], /^unresolved external reference /);
  assert.doesNotMatch(result.issues[0], /success schema lacks/);
});

test("semantic fixtures compare across subjects and lifecycle", async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const rows = [];
  const add = (relative, options) => {
    fx.write(relative, documentText(options));
    rows.push([
      options.id,
      options.category ?? "API",
      options.title,
      options.version ?? "1.0.0",
      options.status ?? "Draft",
      options.owner ?? "Backend",
      options.updated ?? "2026-07-13",
    ]);
  };
  add("docs/api/API-001-boundaries.md", {
    id: "API-001",
    title: "Boundaries",
    status: "Living",
    body: "| Rule | Detail |\n| --- | --- |\n| Success | Always `{ data: T }` |",
  });
  add("docs/api/API-003-types.md", {
    id: "API-003",
    title: "Types",
    status: "Living",
    body: "```ts\ntype PaginatedResult<T> = { data: T[]; pagination: { page: number } }\n```",
  });
  add("docs/api/REST-001-resources.md", {
    id: "REST-001",
    title: "Resources",
    category: "REST",
    status: "Living",
    body: "```json\n{ \"data\": [], \"pagination\": { \"page\": 1 } }\n```",
  });
  add("docs/api/ARCH-029-interface.md", {
    id: "ARCH-029",
    title: "Interface",
    category: "Architecture",
    status: "Living",
    body: "Evidence bar: [GUIDE-014](guides/GUIDE-014-verification.md).",
  });
  add("docs/api/guides/GUIDE-014-verification.md", {
    id: "GUIDE-014",
    title: "Verification",
    category: "Guide",
    status: "Draft",
    body: "Do not treat this Draft as Living release blocker until promoted.",
  });
  add("docs/api/guides/GUIDE-015-roadmap.md", {
    id: "GUIDE-015",
    title: "Roadmap",
    category: "Guide",
    status: "Living",
  });
  add("docs/api/API-004-legacy.md", {
    id: "API-004",
    title: "Legacy",
    status: "Living",
    structured: false,
  });
  fx.write(
    "docs/_control/DOC-001-documentation-control-standard.md",
    documentText({
      id: "DOC-001",
      title: "Control",
      category: "Control",
      status: "Living",
      owner: "Platform",
      body: "Internal guides live under `docs/guides/`.",
    }),
  );
  setupControl(fx, rows, {
    authority: authorityYaml({ locked: true }),
    notes: "API guides live under `docs/api/guides/`.",
  });
  const report = await auditDocs({ root: fx.root, scope: "docs/api" });
  const categories = new Set(report.findings.map((entry) => entry.category));
  assert.ok(categories.has("SSOT-CONFLICT"));
  assert.ok(categories.has("LIFECYCLE-ERROR"));
  assert.ok(categories.has("SSOT-AMBIGUOUS"));
  assert.ok(categories.has("STRUCTURE-DRIFT"));
  assert.equal(
    report.findings.find((entry) => entry.category === "STRUCTURE-DRIFT").evidenceTier,
    "Review needed",
  );
});

test("current docs/api reproduces the resolved zero-finding baseline", async () => {
  const expected = JSON.parse(
    readFileSync(path.join(SCRIPT_DIR, "fixtures/docs-api-baseline.json"), "utf8"),
  );
  const report = await auditDocs({ root: REPO_ROOT, scope: "docs/api" });
  assert.equal(report.exitCode, 0);
  assert.equal(report.coverage.complete, true);
  assert.equal(report.scope.primaryFiles, expected.primaryFiles);
  assert.equal(report.findings.length, expected.findings);
  assert.deepEqual(report.counts.bySeverity, expected.bySeverity);
  assert.deepEqual(Object.keys(report.counts.byCategory).sort(), expected.categories);
});
