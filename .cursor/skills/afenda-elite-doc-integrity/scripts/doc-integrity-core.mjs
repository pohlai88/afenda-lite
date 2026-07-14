import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Resolver } from "@stoplight/json-ref-resolver";
import spectralCore from "@stoplight/spectral-core";
import spectralParsers from "@stoplight/spectral-parsers";
import spectralRulesets from "@stoplight/spectral-rulesets";
import stoplightYaml from "@stoplight/yaml";
import addFormats from "ajv-formats";
import Ajv from "ajv";
import fg from "fast-glob";
import { marked } from "marked";

import { afendaOpenApiRuleset } from "./spectral-afenda-ruleset.mjs";
import { loadModuleContract, modulePackFindings } from "./module-pack-core.mjs";

const { Document, Spectral } = spectralCore;
const { Yaml } = spectralParsers;
const { oas } = spectralRulesets;
const { parseWithPointers } = stoplightYaml;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = path.join(SCRIPT_DIR, "schemas");
const require = createRequire(import.meta.url);

// require.resolve(`${name}/package.json`) fails for packages whose
// package.json restricts subpaths via "exports" (e.g. @stoplight/spectral-core).
// Resolving the package's main entry and walking up to its own package.json
// works regardless of each dependency's exports map.
function packageVersion(name) {
  let dir = path.dirname(require.resolve(name));
  while (true) {
    const candidate = path.join(dir, "package.json");
    if (existsSync(candidate)) {
      const pkg = JSON.parse(readFileSync(candidate, "utf8"));
      if (pkg.name === name) return pkg.version;
    }
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`Could not locate package.json for ${name}`);
    dir = parent;
  }
}

// A hash of the Afenda-specific ruleset source (not the upstream `oas`
// ruleset) so a JSON report can prove exactly which policy rules produced
// its findings, independent of dependency upgrades bumping tool versions.
function afendaRulesetHash() {
  const source = readFileSync(path.join(SCRIPT_DIR, "spectral-afenda-ruleset.mjs"), "utf8");
  return `sha256:${createHash("sha256").update(source, "utf8").digest("hex")}`;
}

function buildProvenance() {
  return {
    parsers: {
      markdown: `marked@${packageVersion("marked")}`,
      yaml: `@stoplight/yaml@${packageVersion("@stoplight/yaml")}`,
      jsonSchema: `ajv@${packageVersion("ajv")}`,
    },
    openapi: {
      refResolver: `@stoplight/json-ref-resolver@${packageVersion("@stoplight/json-ref-resolver")}`,
      spectralCore: `@stoplight/spectral-core@${packageVersion("@stoplight/spectral-core")}`,
      spectralRulesets: `@stoplight/spectral-rulesets@${packageVersion("@stoplight/spectral-rulesets")}`,
      jsonpathPlus: `jsonpath-plus@${packageVersion("jsonpath-plus")}`,
    },
    afendaRulesetHash: afendaRulesetHash(),
  };
}
const ALLOWED_STATUSES = new Set([
  "Draft",
  "Review",
  "Accepted",
  "Living",
  "Target",
  "Superseded",
  "Retired",
]);
const ALLOWED_CONTROL_STATES = new Set(["Open", "Closed", "Reopened"]);
const CONTROL_FIELDS = [
  "ID",
  "Category",
  "Title",
  "Version",
  "Status",
  "Owner",
  "Updated",
];
const SEVERITY_ORDER = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Info: 4,
};
const ID_PATTERN = /^[A-Z]+(?:-[A-Z]+)*-\d{3}$/;
const FILE_PATTERN = /^([A-Z]+(?:-[A-Z]+)*-\d{3})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;

function posix(value) {
  return value.split(path.sep).join("/");
}

function rel(root, value) {
  return posix(path.relative(root, value));
}

function lineOf(text, needle, from = 0) {
  const index = text.indexOf(needle, from);
  return index < 0 ? 1 : text.slice(0, index).split("\n").length;
}

function plain(value = "") {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*|__|`|~~/g, "")
    .trim();
}

export function githubAnchor(value) {
  return plain(value)
    .toLowerCase()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, "")
    .replace(/\s+/g, "-");
}

function headingAnchors(tokens) {
  const counts = new Map();
  const anchors = new Set();
  for (const token of tokens) {
    if (token.type !== "heading") continue;
    const base = githubAnchor(token.text);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }
  return anchors;
}

function tableHeader(table) {
  return table.header.map((cell) => plain(cell.text));
}

function tableRows(table) {
  return table.rows.map((row) => row.map((cell) => plain(cell.text)));
}

function firstMetadataTable(tokens) {
  const table = tokens.find(
    (token) =>
      token.type === "table" &&
      tableHeader(token).join("|").toLowerCase() === "field|value",
  );
  if (!table) return {};
  return Object.fromEntries(
    tableRows(table)
      .filter((row) => row.length === 2)
      .map(([key, value]) => [key, value]),
  );
}

function findChangeLog(tokens) {
  const index = tokens.findIndex(
    (token) =>
      token.type === "heading" && /^(?:5\.\s*)?change log$/i.test(plain(token.text)),
  );
  if (index < 0) return null;
  const table = tokens.slice(index + 1).find((token) => token.type === "table");
  if (!table) return null;
  const row = tableRows(table).find(
    (cells) =>
      /^\d+\.\d+\.\d+$/.test(cells[0] ?? "") &&
      /^\d{4}-\d{2}-\d{2}$/.test(cells[1] ?? ""),
  );
  return row ? { version: row[0], updated: row[1] } : null;
}

function collectLinks(tokens) {
  const links = [];
  const seen = new WeakSet();
  function walk(value) {
    if (!value || typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const entry of value) walk(entry);
      return;
    }
    if (value.type === "link" && typeof value.href === "string") {
      links.push({ href: value.href, text: plain(value.text ?? "") });
    }
    for (const child of Object.values(value)) walk(child);
  }
  walk(tokens);
  return links;
}

export function parseMarkdown(text, filePath = "unknown.md") {
  const tokens = marked.lexer(text, { gfm: true });
  const h1 = tokens.find(
    (token) => token.type === "heading" && token.depth === 1,
  );
  const metadata = firstMetadataTable(tokens);
  const id = metadata.ID ?? "";
  const h1Text = plain(h1?.text ?? "");
  const title = id && h1Text.startsWith(`${id} `)
    ? h1Text.slice(id.length + 1)
    : h1Text;
  const numberedSections = new Set(
    tokens
      .filter((token) => token.type === "heading" && token.depth === 1)
      .map((token) => plain(token.text).match(/^([1-6])\.\s+/)?.[1])
      .filter(Boolean),
  );
  return {
    path: filePath,
    text,
    tokens,
    metadata,
    id,
    h1: h1Text,
    title,
    status: metadata.Status ?? "",
    controlState: metadata["Control State"] ?? "",
    changeLog: findChangeLog(tokens),
    links: collectLinks(tokens),
    anchors: headingAnchors(tokens),
    hasSixSections: ["1", "2", "3", "4", "5", "6"].every((section) =>
      numberedSections.has(section),
    ),
    hasControlStateNote: /\*\*Control-state note:\*\*/i.test(text),
  };
}

function parseRegister(document) {
  const table = document.tokens.find(
    (token) =>
      token.type === "table" &&
      tableHeader(token).join("|") === CONTROL_FIELDS.join("|"),
  );
  if (!table) return { rows: new Map(), errors: ["no exact seven-field register table found"] };
  const rows = new Map();
  const errors = [];
  for (const [index, row] of tableRows(table).entries()) {
    if (row.length !== CONTROL_FIELDS.length || row.some((cell) => !cell)) {
      errors.push(`register row ${index + 1} does not contain seven non-empty fields`);
      continue;
    }
    if (!ID_PATTERN.test(row[0])) {
      errors.push(`register row ${index + 1} has invalid ID ${JSON.stringify(row[0])}`);
      continue;
    }
    if (rows.has(row[0])) {
      errors.push(`register contains duplicate ID ${row[0]}`);
      continue;
    }
    rows.set(
      row[0],
      Object.fromEntries(CONTROL_FIELDS.map((field, fieldIndex) => [field, row[fieldIndex]])),
    );
  }
  return { rows, errors };
}

function yamlResult(text) {
  const parsed = parseWithPointers(text);
  return {
    data: parsed.data,
    diagnostics: parsed.diagnostics ?? [],
    astErrors: parsed.ast?.errors ?? [],
  };
}

function loadJsonSchema(name) {
  return JSON.parse(readFileSync(path.join(SCHEMA_DIR, name), "utf8"));
}

function createAjv() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
}

function gitState(root) {
  const trackedResult = spawnSync("git", ["ls-files", "--cached"], {
    cwd: root,
    encoding: "utf8",
  });
  const untrackedResult = spawnSync(
    "git",
    ["ls-files", "--others", "--exclude-standard"],
    { cwd: root, encoding: "utf8" },
  );
  const lines = (result) =>
    result.status === 0
      ? new Set(result.stdout.split(/\r?\n/).filter(Boolean).map(posix))
      : new Set();
  return { tracked: lines(trackedResult), untracked: lines(untrackedResult) };
}

function categoryForId(id) {
  const part = id.split("-").at(-2);
  return {
    DOC: "Control",
    ADR: "ADR",
    ARCH: "Architecture",
    API: "API",
    REST: "REST",
    OPEN: "OPEN",
    RB: "Runbook",
    GUIDE: "Guide",
    MOD: "Module",
  }[part];
}

function categoryHomeMatches(doc, registerDocument) {
  const category = doc.metadata.Category;
  const rules = {
    Control: ["docs/_control/"],
    Architecture: ["docs/architecture/"],
    ADR: ["docs/architecture/adr/"],
    API: ["docs/api/"],
    REST: ["docs/api/", "docs/modules/"],
    OPEN: ["docs/api/"],
    Runbook: ["docs/runbooks/"],
    Module: ["docs/modules/"],
  };
  if (category === "Guide") {
    if (
      doc.path.startsWith("docs/api/guides/") &&
      registerDocument?.text.includes("API guides live under `docs/api/guides/`")
    ) {
      return true;
    }
    return doc.path.startsWith("docs/guides/");
  }
  if (category === "Runbook") {
    if (
      doc.path.startsWith("docs/api/runbooks/") &&
      registerDocument?.text.includes("API runbooks live under `docs/api/runbooks/`")
    ) {
      return true;
    }
    return doc.path.startsWith("docs/runbooks/");
  }
  const homes = rules[category];
  return !homes || homes.some((home) => doc.path.startsWith(home));
}

function isExternal(href) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
}

function splitHref(href) {
  const hash = href.indexOf("#");
  if (hash < 0) return { file: href, anchor: "" };
  return { file: href.slice(0, hash), anchor: decodeURIComponent(href.slice(hash + 1)) };
}

function walkObject(value, visit, pathParts = []) {
  if (!value || typeof value !== "object") return;
  visit(value, pathParts);
  for (const [key, child] of Object.entries(value)) {
    walkObject(child, visit, [...pathParts, key]);
  }
}

async function readReferencedArtifact(targetPath) {
  const raw = readFileSync(targetPath, "utf8");
  if (/\.(?:ya?ml)$/i.test(targetPath)) {
    const parsed = yamlResult(raw);
    if (parsed.diagnostics.length || parsed.astErrors.length || parsed.data === undefined) {
      throw new Error(`external reference target could not be parsed as YAML: ${targetPath}`);
    }
    return parsed.data;
  }
  return JSON.parse(raw);
}

function createOpenApiRefResolver() {
  return new Resolver({
    resolvers: {
      file: {
        resolve: (ref) => readReferencedArtifact(decodeURIComponent(String(ref))),
      },
    },
  });
}

// @stoplight/json-ref-resolver dereferences chained refs, allOf/anyOf/oneOf
// composition members, and file-relative external references in one pass,
// with built-in circular-reference safety (a cycle is left as a terminal
// $ref rather than expanded infinitely).
async function resolveOpenApiDocument(rawDocument, absolutePath) {
  const resolver = createOpenApiRefResolver();
  return resolver.resolve(rawDocument, { baseUri: absolutePath });
}

function normalizeForCompare(value) {
  return value.replace(/\\/g, "/").toLowerCase();
}

// With `baseUri` set, even same-document `#/...` refs stringify with the
// document's own absolute path prepended, so "internal" means the URI's
// non-fragment part resolves back to the document being validated — not
// that the URI string is empty.
function describeRefResolutionError(error, documentPath) {
  const uriString = String(error.uri ?? "");
  const hashIndex = uriString.indexOf("#");
  const filePart = hashIndex >= 0 ? uriString.slice(0, hashIndex) : uriString;
  const fragment = hashIndex >= 0 ? uriString.slice(hashIndex) : "";
  const isSameDocument = !filePart || normalizeForCompare(filePart) === normalizeForCompare(documentPath);
  if (!isSameDocument) {
    return `unresolved external reference ${uriString}: ${error.message}`;
  }
  const pointer = fragment || error.message.match(/'([^']+)'/)?.[1] || error.message;
  return `unresolved internal reference ${pointer}`;
}

export async function validateOpenApiFile(filePath, options = {}) {
  const raw = readFileSync(filePath, "utf8");
  const yaml = yamlResult(raw);
  if (yaml.diagnostics.length || yaml.astErrors.length || !yaml.data) {
    return {
      complete: false,
      issues: ["OpenAPI YAML could not be parsed completely"],
      diagnostics: [...yaml.diagnostics, ...yaml.astErrors],
    };
  }

  const rawOpenApi = yaml.data;
  const resolved = await resolveOpenApiDocument(rawOpenApi, filePath);
  const openapi = resolved.result;
  const issues = resolved.errors.map((error) => describeRefResolutionError(error, filePath));
  const operations = [];
  const methods = new Set(["get", "put", "post", "patch", "delete", "options", "head", "trace"]);
  for (const [route, pathItem] of Object.entries(openapi.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!methods.has(method)) continue;
      operations.push({ route, method, operation });
    }
  }

  // Afenda-specific policy (operation identity, lifecycle status,
  // contract-only try-it gating, response envelope, document provenance)
  // runs as its own Spectral ruleset/instance — see spectral-afenda-ruleset.mjs.
  // Kept separate from the `oas` ruleset below so toggling `afendaRules`
  // never changes oas's own rules or severities.
  if (options.afendaRules !== false) {
    const afendaSpectral = new Spectral();
    afendaSpectral.setRuleset(afendaOpenApiRuleset);
    const afendaDiagnostics = await afendaSpectral.run(openapi);
    for (const diagnostic of afendaDiagnostics) {
      if (String(diagnostic.code).startsWith("afenda-")) {
        issues.push(diagnostic.message);
      }
    }
  }

  const spectral = new Spectral();
  spectral.setRuleset(oas);
  const spectralDiagnostics = await spectral.run(new Document(raw, Yaml, filePath));
  let spectralOverrides = { "info-contact": "off", "info-description": "off" };
  if (options.spectralConfigPath) {
    const config = yamlResult(readFileSync(options.spectralConfigPath, "utf8"));
    if (config.diagnostics.length || config.astErrors.length || !config.data) {
      return { complete: false, issues: ["Spectral configuration could not be parsed completely"], diagnostics: [] };
    }
    spectralOverrides = config.data.rules ?? {};
  }
  const relevantDiagnostics = spectralDiagnostics
    .filter(
      (diagnostic) =>
        resolved.errors.length === 0 || String(diagnostic.code) !== "invalid-ref",
    )
    .filter((diagnostic) => spectralOverrides[String(diagnostic.code)] !== "off")
    .map((diagnostic) => {
      const override = spectralOverrides[String(diagnostic.code)];
      return override === "error" ? { ...diagnostic, severity: 0 } : diagnostic;
    })
    .filter((diagnostic) => diagnostic.severity === 0);
  for (const diagnostic of relevantDiagnostics) {
    const message = `${diagnostic.code}: ${diagnostic.message}`;
    if (!issues.some((issue) => issue.includes("operationId") && message.includes("operationId"))) {
      issues.push(message);
    }
  }

  return {
    complete: true,
    issues: [...new Set(issues)].sort(),
    diagnostics: relevantDiagnostics,
    operations: operations.length,
    refs: (() => {
      let count = 0;
      walkObject(rawOpenApi, (value) => {
        if (typeof value.$ref === "string") count += 1;
      });
      return count;
    })(),
  };
}

function finding(input) {
  return {
    id: "",
    severity: input.severity,
    evidenceTier: input.evidenceTier ?? "Confirmed",
    category: input.category,
    subject: input.subject,
    authorityAspect: input.authorityAspect,
    authority: input.authority,
    conflictingSource: input.conflictingSource,
    evidence: input.evidence,
    risk: input.risk,
    fixType: input.fixType ?? "MANUAL",
    proposedResolution: input.proposedResolution,
    versionImpact: input.versionImpact ?? "Determine through controlled-document workflow",
    registerImpact: input.registerImpact ?? "Determine through controlled-document workflow",
    lockStatus: input.lockStatus ?? "Unlocked",
    verification: input.verification,
    validatorEvidence: input.validatorEvidence ?? [],
  };
}

function normalizeFindings(findings) {
  const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  return findings
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        compare(a.category, b.category) ||
        compare(a.conflictingSource, b.conflictingSource),
    )
    .map((entry, index) => ({ ...entry, id: `DOC-CONS-${String(index + 1).padStart(3, "0")}` }));
}

/** Cross-subject sets with automated checks in semanticFindings / OpenAPI gates. */
const IMPLEMENTED_CROSS_SUBJECT_SETS = new Set([
  "response-envelope-consistency",
  "release-verification-consistency",
  "guide-home-consistency",
  "multi-tenancy-consistency",
]);

function documentMatchesEvidenceToken(document, token) {
  if (!document) return false;
  if (document.id === token) return true;
  const normalizedToken = token.replace(/\\/g, "/");
  const normalizedPath = document.path.replace(/\\/g, "/");
  return (
    normalizedPath === normalizedToken ||
    normalizedPath.endsWith(`/${normalizedToken}`) ||
    normalizedPath.endsWith(normalizedToken)
  );
}

function comparisonSetInScope(setDef, documents) {
  const hits = (setDef.evidence ?? []).filter((token) =>
    [...documents.values()].some((doc) => documentMatchesEvidenceToken(doc, token)),
  );
  return hits.length >= 2;
}

export function buildResidualRisk({ failures, findings, authority, documents, scopeRoot = "" }) {
  if (failures.length) {
    return "Validation coverage is incomplete; do not claim a clean audit.";
  }

  const standing =
    "standing exclusions (external HTTP availability; code-to-document runtime drift)";
  const sets = Object.entries(authority?.cross_subject_sets ?? {});
  const unimplementedInScope = sets
    .filter(
      ([id, def]) =>
        comparisonSetInScope(def, documents) && !IMPLEMENTED_CROSS_SUBJECT_SETS.has(id),
    )
    .map(([id]) => id)
    .sort();

  const guidesBaseline =
    scopeRoot.replace(/\\/g, "/") === "docs/guides" &&
    findings.length === 29 &&
    "Known guides archive baseline: 29 findings on GUIDE-001…004/006 — leave untouched unless material revision is authorized (DOC-002 Notes).";

  if (guidesBaseline) return guidesBaseline;

  if (findings.length === 0 && unimplementedInScope.length === 0) {
    return `None for this scope beyond ${standing}.`;
  }
  if (findings.length === 0) {
    return `Zero findings on executed checks. Human pairwise review still required for unimplemented in-scope comparison sets: ${unimplementedInScope.join(", ")}.`;
  }
  if (unimplementedInScope.length) {
    return `Findings remain (see report). Unimplemented in-scope comparison sets still need human pairwise review: ${unimplementedInScope.join(", ")}.`;
  }
  return `Findings remain (see report). Declared comparison sets in scope were executed by the validator; residual is limited to ${standing}.`;
}

function multiTenancyFindings(byId) {
  const findings = [];
  const arch023 = byId.get("ARCH-023");
  const arch025 = byId.get("ARCH-025");
  const arch028 = byId.get("ARCH-028");
  if (!arch023 || arch023.status !== "Living") return findings;

  const inventedHomes = [
    "fft_orders",
    "fft_items",
    "fft_pickups",
    "declaration_items",
    "declaration_statuses",
  ];
  const livingRoots = [
    "surveys",
    "client_invitations",
    "client_profiles",
    "client_assignments",
    "fft_event",
    "fft_sales_member",
    "fft_role",
    "fft_role_assignment",
  ];
  const missingLivingRoots = livingRoots.filter((name) => !arch023.text.includes(name));
  if (missingLivingRoots.length) {
    findings.push(
      finding({
        severity: "High",
        category: "SCOPE-GAP",
        subject: "multi-tenancy",
        authorityAspect: "shared-schema-and-org-predicates",
        authority: "ARCH-023 Living tenant roots",
        conflictingSource: "ARCH-023",
        evidence: [
          `Living ARCH-023 is missing expected tenant-root tokens: ${missingLivingRoots.join(", ")}.`,
        ],
        risk: "Target data-layer docs cannot reconcile against a complete Living inventory.",
        proposedResolution: "Restore Living tenant-root inventory in ARCH-023 or update the authority-map evidence list.",
        verification: "Confirm ARCH-023 lists Declarations and FFT tenant roots from migration 027.",
        validatorEvidence: [arch023.path],
      }),
    );
  }

  for (const [doc, id] of [
    [arch025, "ARCH-025"],
    [arch028, "ARCH-028"],
  ]) {
    if (!doc) continue;
    const affirmativeHits = inventedHomes.filter((name) =>
      new RegExp(`←\\s*[^\\n]*\\b${name}\\b`).test(doc.text),
    );
    if (affirmativeHits.length) {
      findings.push(
        finding({
          severity: "High",
          category: "ARCH-MISALIGNMENT",
          subject: "multi-tenancy",
          authorityAspect: "shared-schema-and-org-predicates",
          authority: "ARCH-023 Living tenant roots",
          conflictingSource: id,
          evidence: [
            `${id} affirms invented tenant-table homes: ${affirmativeHits.join(", ")}.`,
            "Living ARCH-023 owns surveys / client_* / fft_event / fft_sales_member / fft_role / fft_role_assignment.",
          ],
          risk: "Target schema sketches can diverge from shipped Neon tenant roots.",
          proposedResolution: "Align Target schema inventories to ARCH-023 or introspect the live branch before inventing names.",
          verification: "Re-extract schema inventories; Target docs must not use ← invented table homes.",
          validatorEvidence: [arch023.path, doc.path],
        }),
      );
    }
    if (
      /organizationId\s*:\s*text\(\s*['"]organization_id['"]\s*\)/.test(doc.text) &&
      !/match(?:ing)?\s+shipped\s+migrations/i.test(doc.text)
    ) {
      findings.push(
        finding({
          severity: "Medium",
          category: "ARCH-MISALIGNMENT",
          subject: "multi-tenancy",
          authorityAspect: "shared-schema-and-org-predicates",
          authority: "ARCH-023 organization_id type (uuid in shipped migrations)",
          conflictingSource: id,
          evidence: [
            `${id} hard-codes text('organization_id') without deferring to shipped migration types.`,
          ],
          risk: "Drizzle Target types can diverge from Living uuid organization_id columns.",
          proposedResolution: "Require organization_id types to match shipped migrations (uuid today per ARCH-023).",
          verification: "Confirm Target acceptance language defers type to ARCH-023 / shipped migrations.",
          validatorEvidence: [arch023.path, doc.path],
        }),
      );
    }
  }
  return findings;
}

function readDocument(root, absolutePath, cache) {
  const resolved = realpathSync(absolutePath);
  if (cache.has(resolved)) return cache.get(resolved);
  const text = readFileSync(resolved, "utf8");
  const document = parseMarkdown(text, rel(root, resolved));
  document.absolutePath = resolved;
  cache.set(resolved, document);
  return document;
}

function semanticFindings(documents, authority, primaryDocuments) {
  const findings = [];
  const byId = new Map(
    [...documents.values()].filter((doc) => doc.id).map((doc) => [doc.id, doc]),
  );
  const api001 = byId.get("API-001");
  const api003 = byId.get("API-003");
  const rest001 = byId.get("REST-001");
  if (
    api001?.text.includes("Always `{ data:") &&
    /type\s+PaginatedResult<[^>]+>\s*=\s*\{[\s\S]*?data:\s*T\[\][\s\S]*?pagination:/m.test(api003?.text ?? "") &&
    /"data"\s*:\s*\[\][\s\S]*?"pagination"\s*:/m.test(rest001?.text ?? "")
  ) {
    findings.push(finding({
      severity: "Critical",
      category: "SSOT-CONFLICT",
      subject: "response-envelope",
      authorityAspect: "http-success.list-pagination",
      authority: "ARCH-029 §3.5 / API-001 success envelope",
      conflictingSource: "API-003 PaginatedResult / REST-001 list example",
      evidence: [
        "API-001 requires every HTTP success to use { data: T }.",
        "API-003 and REST-001 place pagination beside a top-level data array.",
      ],
      risk: "Servers, clients, and generated contracts can implement incompatible list response shapes.",
      proposedResolution: "Adopt one list envelope, preferably { data: { items, pagination } }, and align all Living contracts.",
      verification: "Re-extract response claims and validate one identical list wire shape across API, REST, and OpenAPI.",
      validatorEvidence: [api001.path, api003.path, rest001.path],
    }));
  }

  const arch029 = byId.get("ARCH-029");
  const guide014 = byId.get("GUIDE-014");
  if (
    arch029?.status === "Living" &&
    arch029.text.includes("Evidence bar: [GUIDE-014]") &&
    guide014?.status === "Draft" &&
    /Do not treat this Draft as Living release blocker/i.test(guide014.text)
  ) {
    findings.push(finding({
      severity: "High",
      category: "LIFECYCLE-ERROR",
      subject: "verification-gate",
      authorityAspect: "release-evidence",
      authority: "ARCH-029 change gate",
      conflictingSource: "GUIDE-014 Draft disclaimer",
      evidence: [
        "Living ARCH-029 names GUIDE-014 as its evidence bar.",
        "GUIDE-014 is Draft, a placeholder, and explicitly not a Living release blocker.",
      ],
      risk: "The documented release gate cannot be proven from an enforceable evidence standard.",
      proposedResolution: "Keep a complete current evidence bar in ARCH-029 until GUIDE-014 is expanded and promoted in roadmap order.",
      verification: "Confirm every active gate points only to enforceable criteria or is explicitly marked planned.",
      validatorEvidence: [arch029.path, guide014.path],
    }));
  }

  const doc001 = byId.get("DOC-001");
  const doc002 = byId.get("DOC-002");
  const guidePaths = primaryDocuments.filter((doc) => doc.path.startsWith("docs/api/guides/") && doc.id);
  const hasApiGuideColocationException =
    doc001?.text.includes("API-pack implementation and verification guides may be co-located under `docs/api/guides/`");
  if (
    guidePaths.length > 0 &&
    doc001?.text.includes("`docs/guides/`") &&
    doc002?.text.includes("API guides live under `docs/api/guides/`") &&
    !hasApiGuideColocationException
  ) {
    const lock = authority?.locks?.find((entry) => entry.id === "GUIDE-015");
    findings.push(finding({
      severity: "High",
      category: "SSOT-AMBIGUOUS",
      subject: "documentation-governance",
      authorityAspect: "guide-home",
      authority: "DOC-001 folder roles",
      conflictingSource: "DOC-002 notes and locked GUIDE-015 paths",
      evidence: [
        "DOC-001 assigns internal guides to docs/guides/.",
        `DOC-002 assigns ${guidePaths.length} API guides to docs/api/guides/.`,
      ],
      risk: "A home-folder check cannot comply with both authorities, and an automatic move could violate the roadmap lock.",
      fixType: "ASK-LOCK",
      proposedResolution: "Approve a category-specific co-location exception or obtain lock approval before moving files.",
      lockStatus: lock ? `Locked-by-${lock.locked_by}` : "Lock scope unresolved",
      verification: "Confirm DOC-001, DOC-002, the category authority, and GUIDE-015 name one permitted home.",
      validatorEvidence: [doc001.path, doc002.path, ...guidePaths.map((doc) => doc.path)],
    }));
  }

  const structureDrift = primaryDocuments.filter(
    (doc) => doc.id && doc.status === "Living" && !doc.hasSixSections,
  );
  if (structureDrift.length) {
    findings.push(finding({
      severity: "Medium",
      evidenceTier: "Review needed",
      category: "STRUCTURE-DRIFT",
      subject: "documentation-governance",
      authorityAspect: "controlled-document-structure",
      authority: "DOC-001 §3.8 / DOC-003",
      conflictingSource: structureDrift.map((doc) => doc.id).join(", "),
      evidence: [
        `${structureDrift.length} Living controlled documents do not use all six numbered sections.`,
        "Whether every document has crossed the 'materially revised' threshold still requires governance judgment.",
      ],
      risk: "Living contracts do not consistently satisfy the structure required for automated validation and navigation.",
      proposedResolution: "Retrofit on the next approved material revision or record an explicit grandfathering rule.",
      verification: "Confirm each affected Living document either has sections 1–6 or an explicit approved exception.",
      validatorEvidence: structureDrift.map((doc) => doc.path),
    }));
  }

  const open001 = byId.get("OPEN-001");
  const guide011 = byId.get("GUIDE-011");
  if (
    open001?.text.includes("OpenAPI recipes moved to GUIDE-011") &&
    open001.text.includes("## Forward — Zod SSOT handoff") &&
    guide011?.text.includes("move recipes out of OPEN-001") &&
    guide011.text.includes("Until Living, follow generate notes in [OPEN-001]")
  ) {
    findings.push(finding({
      severity: "Medium",
      category: "STALE-CLAIM",
      subject: "openapi-governance",
      authorityAspect: "recipe-ownership",
      authority: "OPEN-001 / GUIDE-011 responsibility boundary",
      conflictingSource: "OPEN-001 1.1.4 change-log claim",
      evidence: [
        "OPEN-001 says recipes moved to GUIDE-011 but retains the recipes.",
        "GUIDE-011 remains a placeholder and directs readers back to OPEN-001.",
      ],
      risk: "Recorded ownership and actual operational guidance disagree.",
      proposedResolution: "Complete the move or record a new controlled correction describing current ownership.",
      verification: "Confirm only one document owns executable recipes and all cross-references agree.",
      validatorEvidence: [open001.path, guide011.path],
    }));
  }

  findings.push(...multiTenancyFindings(byId));
  return findings;
}

export async function auditDocs(options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const scopeRel = posix(options.scope ?? "docs/api").replace(/^\.\//, "").replace(/\/$/, "");
  const registerRel = posix(options.register ?? "docs/_control/DOC-002-documentation-register.md");
  const authorityRel = posix(
    options.authorityMap ?? ".cursor/skills/afenda-elite-doc-integrity/authority-map.yaml",
  );
  const profile = options.profile ?? "full";
  const failures = [];
  const findings = [];
  const cache = new Map();
  const git = gitState(root);
  let moduleContract;
  try {
    moduleContract = loadModuleContract(root, options.moduleContract).contract;
  } catch (error) {
    failures.push(`Module contract validation failure: ${error.message}`);
  }

  const absoluteScope = path.resolve(root, scopeRel);
  if (!existsSync(absoluteScope) || !statSync(absoluteScope).isDirectory()) {
    failures.push(`Scope directory does not exist: ${scopeRel}`);
  }
  const primaryPaths = failures.length
    ? []
    : (await fg(`${scopeRel}/**/*`, {
        cwd: root,
        onlyFiles: true,
        dot: true,
        ignore: scopeRel === "docs" ? ["docs/scratch/**"] : [],
      })).sort();
  const primaryDocuments = [];
  const artifacts = [];
  let artifactsInspected = 0;
  for (const file of primaryPaths) {
    const absolute = path.resolve(root, file);
    const extension = path.extname(file).toLowerCase();
    if (extension === ".md") {
      try {
        primaryDocuments.push(readDocument(root, absolute, cache));
      } catch (error) {
        failures.push(`${file}: Markdown parse/read failure: ${error.message}`);
      }
    } else if ([".yaml", ".yml", ".json"].includes(extension)) {
      const artifact = { path: file, absolutePath: absolute, extension };
      artifacts.push(artifact);
      try {
        const raw = readFileSync(absolute, "utf8");
        if (extension === ".json") JSON.parse(raw);
        else {
          const parsed = yamlResult(raw);
          if (parsed.diagnostics.length || parsed.astErrors.length || parsed.data === undefined) {
            throw new Error("YAML parser reported diagnostics or no data");
          }
        }
        artifactsInspected += 1;
      } catch (error) {
        failures.push(`${file}: structured artifact parse failure: ${error.message}`);
      }
    } else {
      failures.push(`${file}: unsupported primary-scope file type`);
    }
  }

  let registerDocument;
  let register = new Map();
  const registerPath = path.resolve(root, registerRel);
  if (!existsSync(registerPath)) {
    failures.push(`Register does not exist: ${registerRel}`);
  } else {
    try {
      registerDocument = readDocument(root, registerPath, cache);
      const parsedRegister = parseRegister(registerDocument);
      register = parsedRegister.rows;
      for (const error of parsedRegister.errors) failures.push(`${registerRel}: ${error}`);
      if (register.size === 0 && parsedRegister.errors.length === 0) {
        failures.push(`${registerRel}: no valid register rows found`);
      }
    } catch (error) {
      failures.push(`${registerRel}: register parse/read failure: ${error.message}`);
    }
  }

  let authority;
  const authorityPath = path.resolve(root, authorityRel);
  if (!existsSync(authorityPath)) {
    failures.push(`Authority map does not exist: ${authorityRel}`);
  } else {
    try {
      const parsed = yamlResult(readFileSync(authorityPath, "utf8"));
      if (parsed.diagnostics.length || parsed.astErrors.length || !parsed.data) {
        failures.push(`${authorityRel}: YAML parse failure`);
      } else {
        authority = parsed.data;
        const ajv = createAjv();
        const validate = ajv.compile(loadJsonSchema("authority-map.schema.json"));
        if (!validate(authority)) {
          failures.push(`${authorityRel}: ${ajv.errorsText(validate.errors, { separator: "; " })}`);
        }
      }
    } catch (error) {
      failures.push(`${authorityRel}: authority-map validation failure: ${error.message}`);
    }
  }

  for (const extra of [
    "docs/_control/DOC-001-documentation-control-standard.md",
    "docs/_control/DOC-003-controlled-document-template.md",
    "docs/guides/GUIDE-006-guides-index.md",
  ]) {
    const absolute = path.resolve(root, extra);
    if (existsSync(absolute)) {
      try {
        readDocument(root, absolute, cache);
      } catch (error) {
        failures.push(`${extra}: dependency parse/read failure: ${error.message}`);
      }
    }
  }

  const primaryIds = new Map();
  const linkTargets = new Set();
  for (const doc of primaryDocuments) {
    const base = path.basename(doc.path);
    if (base !== "README.md") {
      const match = base.match(FILE_PATTERN);
      if (!match) {
        findings.push(finding({
          severity: "High",
          category: "HEADER-DRIFT",
          subject: "documentation-governance",
          authorityAspect: "filename-id",
          authority: "DOC-001 filename convention",
          conflictingSource: doc.path,
          evidence: [`Filename does not match {ID}-{kebab-slug}.md: ${base}`],
          risk: "The controlled document cannot be reliably found by ID.",
          fixType: "MANUAL",
          proposedResolution: "Rename through the controlled-document workflow.",
          verification: "Re-run filename, backlink, and register checks.",
          validatorEvidence: [doc.path],
        }));
      } else if (match[1] !== doc.id) {
        findings.push(finding({
          severity: "High",
          category: "HEADER-DRIFT",
          subject: "documentation-governance",
          authorityAspect: "filename-id",
          authority: "DOC-001 filename convention",
          conflictingSource: doc.path,
          evidence: [`Filename ID ${match[1]} differs from header ID ${doc.id || "missing"}.`],
          risk: "File identity is ambiguous.",
          proposedResolution: "Align filename and header through the controlled-document workflow.",
          verification: "Re-run identity checks.",
          validatorEvidence: [doc.path],
        }));
      }
      if (!doc.h1 || !doc.id || !doc.h1.startsWith(`${doc.id} `)) {
        findings.push(finding({
          severity: "High",
          category: "HEADER-DRIFT",
          subject: "documentation-governance",
          authorityAspect: "h1-id",
          authority: "DOC-001 document identity",
          conflictingSource: doc.path,
          evidence: [`H1 ${JSON.stringify(doc.h1 || null)} does not begin with metadata ID ${JSON.stringify(doc.id || null)}.`],
          risk: "The visible document identity disagrees with controlled metadata.",
          proposedResolution: "Align the H1 and metadata ID through the controlled-document workflow.",
          verification: "Re-run filename, metadata, H1, and register identity checks.",
          validatorEvidence: [doc.path],
        }));
      }
      if (!doc.id || !ID_PATTERN.test(doc.id)) failures.push(`${doc.path}: missing or invalid controlled ID`);
      const expectedCategory = categoryForId(doc.id);
      if (expectedCategory && doc.metadata.Category !== expectedCategory) {
        findings.push(finding({
          severity: "High",
          category: "CATEGORY-ERROR",
          subject: "documentation-governance",
          authorityAspect: "category-prefix",
          authority: "DOC-001 category table",
          conflictingSource: doc.path,
          evidence: [`${doc.id} expects ${expectedCategory}; header has ${doc.metadata.Category ?? "missing"}.`],
          risk: "Category ownership and home rules cannot be applied consistently.",
          proposedResolution: "Align the approved ID/category pair through documentation control.",
          verification: "Re-run category and register checks.",
          validatorEvidence: [doc.path],
        }));
      }
      if (!categoryHomeMatches(doc, registerDocument)) {
        findings.push(finding({
          severity: "High",
          category: "HOME-ERROR",
          subject: "documentation-governance",
          authorityAspect: "category-home",
          authority: "DOC-001 folder roles",
          conflictingSource: doc.path,
          evidence: [`${doc.metadata.Category} document is outside its governed home.`],
          risk: "The document cannot be discovered through its category's controlled location.",
          proposedResolution: "Resolve the home through documentation control and check locks before moving.",
          verification: "Re-run home, register, backlink, and lock checks.",
          validatorEvidence: [doc.path],
        }));
      }
      if (doc.id) {
        const duplicates = primaryIds.get(doc.id) ?? [];
        duplicates.push(doc.path);
        primaryIds.set(doc.id, duplicates);
      }
      if (profile !== "naming" && !ALLOWED_STATUSES.has(doc.status)) failures.push(`${doc.path}: invalid or missing lifecycle status`);
      {
        const requiresControlState =
          doc.path.startsWith("docs/_control/") || Boolean(doc.controlState);
        if (requiresControlState && !doc.controlState) {
          findings.push(finding({
            severity: "High",
            category: "STRUCTURE-DRIFT",
            subject: "documentation-governance",
            authorityAspect: "control-state-header",
            authority: "DOC-001 §3.7",
            conflictingSource: doc.path,
            evidence: ["Mandatory header field Control State is missing."],
            risk: "Edit authorization cannot be distinguished from lifecycle Status.",
            proposedResolution: "Add Control State (Open · Closed · Reopened) to the document header.",
            verification: "Confirm the header declares Control State with an allowed value.",
            validatorEvidence: [doc.path],
          }));
        } else if (doc.controlState && !ALLOWED_CONTROL_STATES.has(doc.controlState)) {
          findings.push(finding({
            severity: "High",
            category: "LIFECYCLE-ERROR",
            subject: "documentation-governance",
            authorityAspect: "control-state-value",
            authority: "DOC-001 §3.5.1",
            conflictingSource: doc.path,
            evidence: [`Invalid Control State ${JSON.stringify(doc.controlState)}; allowed: Open · Closed · Reopened.`],
            risk: "Agents may misread edit permission or confuse Control State with Status.",
            proposedResolution: "Set Control State to Open, Closed, or Reopened.",
            verification: "Re-parse the header Control State field.",
            validatorEvidence: [doc.path],
          }));
        } else if (doc.controlState === "Reopened" && !doc.hasControlStateNote) {
          findings.push(finding({
            severity: "High",
            category: "STRUCTURE-DRIFT",
            subject: "documentation-governance",
            authorityAspect: "control-state-note",
            authority: "DOC-001 §3.5.1",
            conflictingSource: doc.path,
            evidence: ["Control State is Reopened but the required Control-state note is missing."],
            risk: "Reopen authorization is not attributable to a named purpose.",
            proposedResolution: "Add the Control-state note directly below the metadata table.",
            verification: "Confirm the note names author, date, and bounded purpose.",
            validatorEvidence: [doc.path],
          }));
        }
      }
      if (profile !== "naming" && !doc.changeLog) {
        findings.push(finding({
          severity: "Medium",
          category: "VERSION-DRIFT",
          subject: "documentation-governance",
          authorityAspect: "version-change-log",
          authority: "DOC-001 versioning",
          conflictingSource: doc.path,
          evidence: ["No parseable latest Change Log row was found."],
          risk: "The document version cannot be reconciled with its history.",
          proposedResolution: "Add or repair the controlled Change Log.",
          verification: "Confirm header and latest Change Log version/date agree.",
          validatorEvidence: [doc.path],
        }));
      } else if (
        profile !== "naming" &&
        (doc.changeLog.version !== doc.metadata.Version ||
          doc.changeLog.updated !== doc.metadata.Updated)
      ) {
        findings.push(finding({
          severity: "High",
          category: "VERSION-DRIFT",
          subject: "documentation-governance",
          authorityAspect: "version-change-log",
          authority: "DOC-001 versioning",
          conflictingSource: doc.path,
          evidence: [`Header ${doc.metadata.Version}/${doc.metadata.Updated}; latest Change Log ${doc.changeLog.version}/${doc.changeLog.updated}.`],
          risk: "Readers cannot identify the current controlled version.",
          proposedResolution: "Synchronize version and date through documentation control.",
          verification: "Re-run header, Change Log, and register checks.",
          validatorEvidence: [doc.path],
        }));
      }

      const row = register.get(doc.id);
      if (!row) {
        findings.push(finding({
          severity: "High",
          category: "REGISTER-DRIFT",
          subject: "documentation-governance",
          authorityAspect: "register-membership",
          authority: "DOC-002 register",
          conflictingSource: doc.path,
          evidence: [`No DOC-002 row exists for ${doc.id}.`],
          risk: "The controlled document is absent from the catalogue of record.",
          proposedResolution: "Resolve registration through the controlled-document workflow.",
          registerImpact: `${doc.id} row requires an approved decision`,
          verification: "Confirm file, header, and approved register row agree.",
          validatorEvidence: [doc.path, registerRel],
        }));
      } else {
        const actual = { ...doc.metadata, Title: doc.title };
        for (const field of CONTROL_FIELDS.slice(1)) {
          if (actual[field] === row[field]) continue;
          findings.push(finding({
            severity: field === "Title" ? "Low" : "High",
            category: "REGISTER-DRIFT",
            subject: "documentation-governance",
            authorityAspect: `register-${field.toLowerCase()}`,
            authority: "DOC-002 register",
            conflictingSource: doc.path,
            evidence: [`${field}: document=${JSON.stringify(actual[field] ?? null)}, register=${JSON.stringify(row[field] ?? null)}.`],
            risk: "The catalogue and controlled document identify different current metadata.",
            proposedResolution: `Align ${field} through a controlled patch-level revision.`,
            registerImpact: `${doc.id} ${field}`,
            verification: "Re-run exact seven-field register comparison.",
            validatorEvidence: [doc.path, registerRel],
          }));
        }
      }
    }

    if (profile !== "naming") {
      for (const link of doc.links) {
        if (isExternal(link.href)) continue;
        const { file, anchor } = splitHref(link.href);
        const destination = file
          ? path.resolve(path.dirname(doc.absolutePath), decodeURIComponent(file))
          : doc.absolutePath;
        if (!existsSync(destination)) {
          const navigationOnly = path.basename(doc.path) === "README.md";
          findings.push(finding({
            severity: "Medium",
            category: "REFERENCE-BROKEN",
            subject: "documentation-governance",
            authorityAspect: "relative-reference",
            authority: doc.id || doc.path,
            conflictingSource: `${doc.path}:${lineOf(doc.text, link.href)}`,
            evidence: [`Relative link target does not exist: ${link.href}`],
            risk: "Readers cannot reach the referenced authority or supporting material.",
            fixType: navigationOnly ? "AUTO" : "SEMI",
            proposedResolution: navigationOnly
              ? "Remove the unresolved hyperlink while retaining its navigation label as plain text."
              : "Point to an existing authority or remove the link while retaining plain future-scope wording.",
            versionImpact: doc.id ? `${doc.id} patch revision` : "Navigation-only edit",
            verification: "Resolve the link and rerun the link graph check.",
            validatorEvidence: [doc.path],
          }));
          continue;
        }
        if (statSync(destination).isFile()) {
          linkTargets.add(realpathSync(destination));
          if (path.extname(destination).toLowerCase() === ".md") {
            try {
              const targetDoc = readDocument(root, destination, cache);
              if (anchor && !targetDoc.anchors.has(githubAnchor(anchor))) {
                findings.push(finding({
                  severity: "Medium",
                  category: "REFERENCE-BROKEN",
                  subject: "documentation-governance",
                  authorityAspect: "relative-anchor",
                  authority: doc.id || doc.path,
                  conflictingSource: `${doc.path}:${lineOf(doc.text, link.href)}`,
                  evidence: [`Anchor does not exist: ${link.href}`],
                  risk: "The reference resolves to the wrong location.",
                  fixType: "SEMI",
                  proposedResolution: "Update the anchor to the target document's generated heading anchor.",
                  verification: "Rerun anchor validation.",
                  validatorEvidence: [doc.path, targetDoc.path],
                }));
              }
            } catch (error) {
              failures.push(`${doc.path}: could not parse linked Markdown ${link.href}: ${error.message}`);
            }
          }
        }
      }
    }
  }

  for (const [id, paths] of primaryIds) {
    if (paths.length > 1) {
      findings.push(finding({
        severity: "Critical",
        category: "HEADER-DRIFT",
        subject: "documentation-governance",
        authorityAspect: "duplicate-id",
        authority: "DOC-001 ID allocation",
        conflictingSource: paths.join(", "),
        evidence: [`${id} is claimed by ${paths.length} files.`],
        risk: "The authoritative document cannot be uniquely identified.",
        proposedResolution: "Resolve the duplicate through explicit controlled ID allocation.",
        verification: "Confirm exactly one file and one register row claim the ID.",
        validatorEvidence: paths,
      }));
    }
  }

  if (profile !== "naming") {
    for (const artifact of artifacts.filter((entry) => [".yaml", ".yml"].includes(entry.extension))) {
      if (!/openapi/i.test(artifact.path)) continue;
      try {
        const result = await validateOpenApiFile(artifact.absolutePath);
        if (!result.complete) failures.push(`${artifact.path}: incomplete OpenAPI validation`);
        if (result.issues.length) {
          findings.push(finding({
            severity: "High",
            category: "ARTIFACT-DRIFT",
            subject: "openapi-artifact",
            authorityAspect: "operation-identity-status-provenance",
            authority: "ARCH-029 §3.8 / OPEN-001",
            conflictingSource: artifact.path,
            evidence: result.issues,
            risk: "Generated clients, lifecycle-aware consumers, and provenance checks cannot rely on the artifact.",
            proposedResolution: "Add stable operation IDs, Afenda status/provenance metadata, regenerate, and run the structured OAS gate.",
            verification: "Require zero Afenda and relevant Spectral diagnostics with all internal references resolved.",
            validatorEvidence: [`${artifact.path}: ${result.operations ?? 0} operations, ${result.refs ?? 0} refs`],
          }));
        }
      } catch (error) {
        failures.push(`${artifact.path}: OpenAPI validator failure: ${error.message}`);
      }
    }
    findings.push(...semanticFindings(cache, authority, primaryDocuments));
    if (moduleContract) findings.push(...modulePackFindings(primaryDocuments, moduleContract));
  }

  const normalized = normalizeFindings(findings);
  const counts = {
    bySeverity: Object.fromEntries(
      Object.keys(SEVERITY_ORDER).map((severity) => [severity, normalized.filter((entry) => entry.severity === severity).length]),
    ),
    byCategory: Object.fromEntries(
      [...new Set(normalized.map((entry) => entry.category))]
        .sort()
        .map((category) => [category, normalized.filter((entry) => entry.category === category).length]),
    ),
  };
  const primarySet = new Set(primaryPaths);
  const dependencies = [...cache.values()]
    .filter((doc) => !primarySet.has(doc.path))
    .map((doc) => doc.path)
    .sort();
  const report = {
    schemaVersion: "1.0.0",
    mode: "audit",
    profile,
    provenance: buildProvenance(),
    scope: {
      root: scopeRel,
      primaryFiles: primaryPaths.length,
      markdownFiles: primaryDocuments.length,
      artifacts: artifacts.length,
      dependencies,
      exclusions: ["external HTTP link availability", "code-to-document runtime drift"],
    },
    coverage: {
      primaryExpected: primaryPaths.length,
      primaryInspected: primaryDocuments.length + artifactsInspected,
      complete: failures.length === 0 && primaryDocuments.length + artifactsInspected === primaryPaths.length,
      failures,
    },
    git: {
      trackedPrimary: primaryPaths.filter((file) => git.tracked.has(file)).length,
      untrackedPrimary: primaryPaths.filter((file) => git.untracked.has(file)).length,
    },
    findings: normalized,
    counts,
    residualRisk: buildResidualRisk({
      failures,
      findings: normalized,
      authority,
      documents: cache,
      scopeRoot: scopeRel,
    }),
  };

  report.exitCode = report.coverage.complete ? (report.findings.length ? 1 : 0) : 2;
  try {
    const ajv = createAjv();
    const validate = ajv.compile(loadJsonSchema("report.schema.json"));
    if (!validate(report)) {
      report.coverage.complete = false;
      report.coverage.failures.push(`report schema: ${ajv.errorsText(validate.errors, { separator: "; " })}`);
      report.exitCode = 2;
    }
  } catch (error) {
    report.coverage.complete = false;
    report.coverage.failures.push(`report schema validation failed: ${error.message}`);
    report.exitCode = 2;
  }
  return report;
}

export function reportToMarkdown(report) {
  const lines = [
    "# Documentation integrity audit",
    "",
    `- Scope: \`${report.scope.root}\``,
    `- Profile: \`${report.profile}\``,
    `- Primary coverage: ${report.coverage.primaryInspected}/${report.coverage.primaryExpected}`,
    `- Coverage complete: ${report.coverage.complete ? "yes" : "no"}`,
    `- Findings: ${report.findings.length}`,
    `- Afenda ruleset: ${report.provenance.afendaRulesetHash}`,
    "",
  ];
  if (report.coverage.failures.length) {
    lines.push("## Coverage failures", "");
    for (const failure of report.coverage.failures) lines.push(`- ${failure}`);
    lines.push("");
  }
  for (const entry of report.findings) {
    lines.push(
      `## ${entry.id} — ${entry.severity} — ${entry.category}`,
      "",
      `| Field | Value |`,
      `| --- | --- |`,
      `| Evidence tier | ${entry.evidenceTier} |`,
      `| Subject | ${entry.subject} |`,
      `| Authority aspect | ${entry.authorityAspect} |`,
      `| Authority | ${entry.authority} |`,
      `| Conflicting source | ${entry.conflictingSource} |`,
      `| Fix type | ${entry.fixType} |`,
      `| Lock status | ${entry.lockStatus} |`,
      "",
      ...entry.evidence.map((item) => `- ${item}`),
      "",
      `**Risk:** ${entry.risk}`,
      "",
      `**Resolution:** ${entry.proposedResolution}`,
      "",
      `**Verification:** ${entry.verification}`,
      "",
    );
  }
  lines.push("## Completion", "", `Residual risk: ${report.residualRisk}`, "");
  return `${lines.join("\n")}\n`;
}
