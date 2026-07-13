import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";

import { auditDocs } from "./doc-integrity-core.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PLAN_SCHEMA = JSON.parse(
  readFileSync(path.join(SCRIPT_DIR, "schemas", "remediation-plan.schema.json"), "utf8"),
);

function sha256(value) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function targetWithinRoot(root, target) {
  const absolute = path.resolve(root, target);
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`remediation target escapes repository root: ${target}`);
  }
  return absolute;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sourcePath(finding) {
  return finding.conflictingSource.replace(/:\d+$/, "");
}

function missingHref(finding) {
  const prefix = "Relative link target does not exist: ";
  return finding.evidence
    .find((item) => item.startsWith(prefix))
    ?.slice(prefix.length);
}

function unlinkReplacements(text, href) {
  const pattern = new RegExp(`\\[([^\\]\\r\\n]+)\\]\\(${escapeRegExp(href)}\\)`, "g");
  const replacements = new Map();
  for (const match of text.matchAll(pattern)) {
    const key = `${match[0]}\u0000${match[1]}`;
    const existing = replacements.get(key) ?? {
      from: match[0],
      to: match[1],
      occurrences: 0,
    };
    existing.occurrences += 1;
    replacements.set(key, existing);
  }
  return [...replacements.values()];
}

function applyReplacements(text, replacements) {
  let next = text;
  for (const replacement of replacements) {
    const actual = next.split(replacement.from).length - 1;
    if (actual !== replacement.occurrences) {
      throw new Error(
        `replacement occurrence mismatch: expected ${replacement.occurrences}, found ${actual}`,
      );
    }
    next = next.split(replacement.from).join(replacement.to);
  }
  return next;
}

function validatePlan(plan) {
  const validate = new Ajv({ allErrors: true, strict: false }).compile(PLAN_SCHEMA);
  if (!validate(plan)) {
    throw new Error(
      `remediation plan schema: ${validate.errors.map((error) => `${error.instancePath} ${error.message}`).join("; ")}`,
    );
  }
}

export function buildRemediationPlan(report, options = {}) {
  if (!report.coverage?.complete || report.exitCode === 2) {
    throw new Error("cannot plan remediation from incomplete audit coverage");
  }
  const root = path.resolve(options.root ?? process.cwd());
  const operations = [];
  const plannedFindingIds = new Set();

  for (const finding of report.findings) {
    if (
      finding.fixType !== "AUTO" ||
      finding.category !== "REFERENCE-BROKEN" ||
      finding.authorityAspect !== "relative-reference" ||
      finding.lockStatus !== "Unlocked"
    ) {
      continue;
    }
    const target = sourcePath(finding);
    if (path.basename(target) !== "README.md") continue;
    const href = missingHref(finding);
    if (!href) continue;
    const absolute = targetWithinRoot(root, target);
    if (!existsSync(absolute)) continue;
    const before = readFileSync(absolute, "utf8");
    const replacements = unlinkReplacements(before, href);
    if (replacements.length === 0) continue;
    const after = applyReplacements(before, replacements);
    operations.push({
      id: `FIX-${String(operations.length + 1).padStart(3, "0")}`,
      findingId: finding.id,
      kind: "unlink-missing-navigation-target",
      fixType: "AUTO",
      target,
      beforeSha256: sha256(before),
      afterSha256: sha256(after),
      lockStatus: "Unlocked",
      href,
      replacements,
    });
    plannedFindingIds.add(finding.id);
  }

  const plan = {
    schemaVersion: "1.0.0",
    mode: "plan-fix",
    scope: report.scope.root,
    auditExitCode: report.exitCode,
    afendaRulesetHash: report.provenance.afendaRulesetHash,
    operations,
    unresolved: report.findings
      .filter((finding) => !plannedFindingIds.has(finding.id))
      .map((finding) => ({
        findingId: finding.id,
        category: finding.category,
        fixType: finding.fixType,
        lockStatus: finding.lockStatus,
        conflictingSource: finding.conflictingSource,
        authorityAspect: finding.authorityAspect,
        authority: finding.authority,
        evidence: finding.evidence,
        proposedResolution: finding.proposedResolution,
        versionImpact: finding.versionImpact,
        registerImpact: finding.registerImpact,
        verification: finding.verification,
      })),
  };
  validatePlan(plan);
  return plan;
}

function atomicWrite(target, content, suffix) {
  const temporary = `${target}.${suffix}.tmp`;
  writeFileSync(temporary, content, "utf8");
  try {
    renameSync(temporary, target);
  } finally {
    rmSync(temporary, { force: true });
  }
}

export async function applySafeRemediation(plan, options = {}) {
  validatePlan(plan);
  const root = path.resolve(options.root ?? process.cwd());
  const preflight = await auditDocs({
    root,
    scope: options.scope ?? plan.scope,
    register: options.register,
    authorityMap: options.authorityMap,
  });
  if (!preflight.coverage.complete) {
    throw new Error("apply-safe preflight audit coverage is incomplete");
  }
  if (preflight.provenance.afendaRulesetHash !== plan.afendaRulesetHash) {
    throw new Error("apply-safe plan uses a different Afenda ruleset hash");
  }
  const currentPlan = buildRemediationPlan(preflight, { root });
  const currentById = new Map(currentPlan.operations.map((operation) => [operation.id, operation]));
  const prepared = [];
  for (const operation of plan.operations) {
    if (
      operation.fixType !== "AUTO" ||
      operation.lockStatus !== "Unlocked" ||
      operation.kind !== "unlink-missing-navigation-target" ||
      path.basename(operation.target) !== "README.md"
    ) {
      throw new Error(`operation ${operation.id} is outside the apply-safe allowlist`);
    }
    const current = currentById.get(operation.id);
    if (!current || JSON.stringify(current) !== JSON.stringify(operation)) {
      throw new Error(`operation ${operation.id} no longer matches the current deterministic plan`);
    }
    const absolute = targetWithinRoot(root, operation.target);
    const before = readFileSync(absolute, "utf8");
    if (sha256(before) !== operation.beforeSha256) {
      throw new Error(`operation ${operation.id} failed its beforeSha256 precondition`);
    }
    const after = applyReplacements(before, operation.replacements);
    if (sha256(after) !== operation.afterSha256) {
      throw new Error(`operation ${operation.id} failed its afterSha256 invariant`);
    }
    prepared.push({ ...operation, absolute, before, after });
  }

  const written = [];
  try {
    for (const operation of prepared) {
      atomicWrite(operation.absolute, operation.after, `afenda-${operation.id}`);
      written.push(operation);
    }
    const report = await auditDocs({
      root,
      scope: options.scope ?? plan.scope,
      register: options.register,
      authorityMap: options.authorityMap,
    });
    for (const operation of prepared) {
      const persists = report.findings.some(
        (finding) =>
          finding.category === "REFERENCE-BROKEN" &&
          sourcePath(finding) === operation.target &&
          finding.evidence.some((item) => item.endsWith(operation.href)),
      );
      if (persists) throw new Error(`operation ${operation.id} did not close its finding`);
    }
    const beforeSignatures = new Set(
      preflight.findings.map((finding) =>
        JSON.stringify([finding.category, finding.conflictingSource, finding.evidence]),
      ),
    );
    const introduced = report.findings.filter(
      (finding) =>
        !beforeSignatures.has(
          JSON.stringify([finding.category, finding.conflictingSource, finding.evidence]),
        ),
    );
    if (introduced.length > 0) {
      throw new Error(`apply-safe introduced ${introduced.length} new finding(s)`);
    }
    const nextPlan = buildRemediationPlan(report, { root });
    return {
      schemaVersion: "1.0.0",
      mode: "apply-safe",
      applied: prepared.map((operation) => operation.id),
      idempotent: nextPlan.operations.length === 0,
      report,
    };
  } catch (error) {
    for (const operation of written.reverse()) {
      atomicWrite(operation.absolute, operation.before, `afenda-rollback-${operation.id}`);
    }
    throw error;
  }
}
