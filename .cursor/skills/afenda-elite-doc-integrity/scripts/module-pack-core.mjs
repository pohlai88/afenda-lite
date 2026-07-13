import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import addFormats from "ajv-formats";
import Ajv from "ajv";
import { marked } from "marked";

export const DEFAULT_MODULE_CONTRACT =
  ".cursor/skills/afenda-elite-doc-control/module-pack-contract.json";
const BUNDLED_MODULE_CONTRACT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../afenda-elite-doc-control/module-pack-contract.json",
);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const OWNER_PATTERN = /^([A-Z]+)-MOD-(00[1-8])$/;
const MODULE_ID_PATTERN = /^([A-Z]+)-MOD-(\d{3})$/;

function plain(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function tableHeader(table) {
  return table.header.map((cell) => plain(cell.text));
}

function tableRows(table) {
  return table.rows.map((row) => row.map((cell) => plain(cell.text)));
}

function headersEqual(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function parseExactTable(document, columns) {
  const tokens = document.tokens ?? marked.lexer(document.text);
  for (const token of tokens) {
    if (token.type !== "table") continue;
    const header = tableHeader(token);
    if (!headersEqual(header, columns)) continue;
    return {
      present: true,
      rows: tableRows(token).map((cells) =>
        Object.fromEntries(columns.map((column, index) => [column, cells[index] ?? ""])),
      ),
    };
  }
  return { present: false, rows: [] };
}

function finding(category, source, evidence, paths, severity = "High") {
  const requirement = category === "MODULE-REQUIREMENT-DRIFT";
  const pack = category === "MODULE-PACK-DRIFT";
  return {
    id: "",
    severity,
    evidenceTier: "Confirmed",
    category,
    subject: "module-enterprise-readiness",
    authorityAspect: pack ? "fixed-module-pack" : requirement ? "requirements-evidence-join" : "structured-evidence",
    authority: "MOD-002 / executable module contract",
    conflictingSource: source,
    evidence,
    risk: pack
      ? "The module pack no longer implements the controlled ten-role structure."
      : requirement
        ? "Quality requirements and release evidence cannot be joined deterministically."
        : "Invalid evidence can produce an unsupported readiness claim.",
    fixType: "MANUAL",
    proposedResolution: pack
      ? "Align the pack with MOD-002 and the executable contract."
      : requirement
        ? "Repair requirement ownership, profile coverage, and the one-to-one evidence join."
        : "Repair evidence states and supporting references per MOD-002.",
    versionImpact: "Controlled module revision",
    registerImpact: "Synchronize affected controlled rows",
    lockStatus: "Unlocked",
    verification: "Run check:module-quality and require this finding category to be absent.",
    validatorEvidence: paths,
  };
}

function customContractErrors(contract) {
  const errors = [];
  const roles = Object.keys(contract.roles ?? {}).sort();
  const expected = Array.from({ length: 10 }, (_, index) => String(index + 1).padStart(3, "0"));
  if (JSON.stringify(roles) !== JSON.stringify(expected)) errors.push("roles must be exactly 001 through 010");
  const dimensions = new Map();
  for (const [profile, definition] of Object.entries(contract.profiles ?? {})) {
    for (const [dimension, role] of Object.entries(definition.dimensions ?? {})) {
      if (dimensions.has(dimension)) errors.push(`dimension ${dimension} is duplicated across profiles`);
      dimensions.set(dimension, { profile, role });
      if (!/^(00[1-8])$/.test(role)) errors.push(`dimension ${dimension} has invalid owner ${role}`);
    }
  }
  if (!contract.profiles?.["Enterprise Core"]?.mandatory) {
    errors.push("Enterprise Core must exist and be mandatory");
  }
  return errors;
}

export function loadModuleContract(root, contractPath = DEFAULT_MODULE_CONTRACT) {
  const requested = path.resolve(root, contractPath);
  const absolute = contractPath === DEFAULT_MODULE_CONTRACT && !existsSync(requested)
    ? BUNDLED_MODULE_CONTRACT
    : requested;
  if (!existsSync(absolute)) throw new Error(`module contract does not exist: ${contractPath}`);
  const contract = JSON.parse(readFileSync(absolute, "utf8"));
  const schemaPath = path.resolve(path.dirname(absolute), contract.$schema ?? "schemas/module-pack-contract.schema.json");
  if (!existsSync(schemaPath)) throw new Error(`module contract schema does not exist: ${schemaPath}`);
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(JSON.parse(readFileSync(schemaPath, "utf8")));
  if (!validate(contract)) throw new Error(ajv.errorsText(validate.errors, { separator: "; " }));
  const errors = customContractErrors(contract);
  if (errors.length) throw new Error(errors.join("; "));
  return { contract, path: contractPath, absolutePath: absolute };
}

export function parseQualityProfiles(document, contract) {
  const marker = contract.profilesMarker.replace(/\*\*/g, "");
  const expression = new RegExp(`\\*\\*${marker.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\*\\*\\s*([^\\r\\n]+)`, "i");
  const match = expression.exec(document.text);
  return match ? match[1].split(",").map((value) => value.trim()).filter(Boolean) : [];
}

export function parseModuleRequirementTable(document, contract) {
  return parseExactTable(document, contract.requirementColumns);
}

export function parseModuleEvidenceTable(document, contract) {
  return parseExactTable(document, contract.evidenceColumns);
}

export function parseModuleReadinessClaim(document) {
  const match = document.text.match(/\*\*Module Enterprise Readiness claim:\*\*\s*(Claimable|Not claimable)/i);
  return match ? { present: true, claimable: /^Claimable$/i.test(match[1]) } : { present: false, claimable: null };
}

function validateEvidenceRow(row, index, contract) {
  const issues = [];
  const number = index + 1;
  const acMatch = new RegExp(contract.acIdPattern).exec(row["AC-ID"]);
  const ownerMatch = OWNER_PATTERN.exec(row["Owner MOD"]);
  if (!acMatch) issues.push(`row ${number}: malformed AC-ID ${JSON.stringify(row["AC-ID"])}`);
  if (!ownerMatch) issues.push(`row ${number}: malformed Owner MOD ${JSON.stringify(row["Owner MOD"])}`);
  if (acMatch && ownerMatch && (acMatch[1] !== ownerMatch[1] || acMatch[2] !== ownerMatch[2])) {
    issues.push(`row ${number}: AC-ID and Owner MOD disagree`);
  }
  if (!contract.profiles[row.Profile]) issues.push(`row ${number}: inactive or unknown Profile ${JSON.stringify(row.Profile)}`);
  const dimensionOwner = contract.profiles[row.Profile]?.dimensions?.[row["Quality Dimension"]];
  if (!dimensionOwner) issues.push(`row ${number}: unknown Quality Dimension ${JSON.stringify(row["Quality Dimension"])}`);
  if (dimensionOwner && ownerMatch?.[2] !== dimensionOwner) issues.push(`row ${number}: Quality Dimension has wrong owner`);
  for (const [field, values] of [["Applicability", contract.enums.applicability], ["Activation", contract.enums.activation], ["Evidence", contract.enums.evidence]]) {
    if (!values.includes(row[field])) issues.push(`row ${number}: ${field} ${JSON.stringify(row[field])} is invalid`);
  }
  if (row["Evidence Date"] && !ISO_DATE.test(row["Evidence Date"])) issues.push(`row ${number}: Evidence Date must be YYYY-MM-DD`);
  for (const [field, value] of Object.entries(row)) {
    if (contract.placeholders.some((placeholder) => String(value).toUpperCase().includes(placeholder.toUpperCase()))) {
      issues.push(`row ${number}: ${field} contains prohibited placeholder ${JSON.stringify(value)}`);
    }
  }
  if (row.Evidence === "PASS" || row.Evidence === "NOT ENABLED") {
    for (const field of ["Evidence Reference", "Evidence Revision", "Evidence Date"]) {
      if (!row[field]) issues.push(`row ${number}: ${row.Evidence} requires ${field}`);
    }
  }
  if (["FAIL", "BLOCKED", "NOT EVIDENCED", "NOT ENABLED"].includes(row.Evidence) && !row["Blocker / Rationale"]) {
    issues.push(`row ${number}: ${row.Evidence} requires Blocker / Rationale`);
  }
  if (row.Applicability === "Out of Scope") {
    if (row.Activation !== "Uncontracted" || row.Evidence !== "NOT ENABLED" || !row["Blocker / Rationale"]) {
      issues.push(`row ${number}: Out of Scope requires Uncontracted, NOT ENABLED, and authority-backed rationale`);
    }
  }
  return issues;
}

function blocksClaim(row) {
  if (row.Applicability === "Out of Scope") return false;
  if (row.Evidence === "PASS") return !(row["Evidence Reference"] && row["Evidence Revision"] && row["Evidence Date"]);
  if (row.Applicability === "Conditional" && ["Disabled", "Uncontracted"].includes(row.Activation)) {
    return row.Evidence !== "NOT ENABLED";
  }
  return true;
}

export function modulePackFindings(documents, contract) {
  const findings = [];
  const authority = documents.find((document) => document.id === contract.authority.id);
  if (authority) {
    const issues = [];
    if (authority.metadata?.Version !== contract.authority.version) issues.push(`authority version ${authority.metadata?.Version ?? "missing"} does not match contract ${contract.authority.version}`);
    if (!authority.text.includes(contract.authority.marker)) issues.push(`authority marker is missing: ${contract.authority.marker}`);
    if (issues.length) findings.push(finding("MODULE-PACK-DRIFT", authority.id, issues, [authority.path]));
  }
  const moduleDocs = documents.filter((document) => MODULE_ID_PATTERN.test(document.id ?? ""));
  const groups = new Map();
  for (const document of moduleDocs) {
    const [, prefix, role] = MODULE_ID_PATTERN.exec(document.id);
    const group = groups.get(prefix) ?? new Map();
    group.set(role, document);
    groups.set(prefix, group);
  }

  for (const [prefix, group] of groups) {
    const paths = [...group.values()].map((document) => document.path);
    const expectedRoles = Object.keys(contract.roles);
    const actualRoles = [...group.keys()].sort();
    const packIssues = [];
    const missing = expectedRoles.filter((role) => !group.has(role));
    const extra = actualRoles.filter((role) => !contract.roles[role]);
    if (missing.length) packIssues.push(`missing MOD roles: ${missing.join(", ")}`);
    if (extra.length) packIssues.push(`extra MOD roles: ${extra.join(", ")}`);
    for (const [role, document] of group) {
      const definition = contract.roles[role];
      if (!definition) continue;
      const expectedH1 = `${document.id} ${definition.title}`;
      if (document.h1 !== expectedH1) packIssues.push(`${document.id}: expected title ${JSON.stringify(expectedH1)}`);
      const expectedFile = `${document.id}-${definition.slug}.md`;
      if (path.basename(document.path) !== expectedFile) packIssues.push(`${document.id}: expected filename ${expectedFile}`);
      const home = group.get("010") ? path.dirname(group.get("010").path) : path.dirname(document.path);
      if (path.dirname(document.path) !== home) packIssues.push(`${document.id}: module depth folders are prohibited`);
      for (const topic of definition.requiredTopics) {
        if (!new RegExp(`^#{2,6}\\s+.*${topic.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`, "im").test(document.text)) {
          packIssues.push(`${document.id}: missing required section ${topic}`);
        }
      }
    }
    const mod010 = group.get("010");
    const profiles = mod010 ? parseQualityProfiles(mod010, contract) : [];
    for (const [profile, definition] of Object.entries(contract.profiles)) {
      if (definition.mandatory && !profiles.includes(profile)) packIssues.push(`mandatory profile ${profile} is not active`);
    }
    for (const profile of profiles) if (!contract.profiles[profile]) packIssues.push(`unknown active profile ${profile}`);
    if (packIssues.length) findings.push(finding("MODULE-PACK-DRIFT", prefix, packIssues, paths));

    const requirementIssues = [];
    const requirements = new Map();
    for (const role of expectedRoles.slice(0, 8)) {
      const document = group.get(role);
      if (!document) continue;
      const table = parseModuleRequirementTable(document, contract);
      if (!table.present) {
        requirementIssues.push(`${document.id}: missing exact requirement table`);
        continue;
      }
      for (const [index, row] of table.rows.entries()) {
        const ac = row["AC-ID"];
        const acMatch = new RegExp(contract.acIdPattern).exec(ac);
        if (!acMatch) requirementIssues.push(`${document.id} row ${index + 1}: malformed AC-ID ${JSON.stringify(ac)}`);
        else if (acMatch[1] !== prefix || acMatch[2] !== role) requirementIssues.push(`${ac}: wrong module or role owner`);
        if (requirements.has(ac)) requirementIssues.push(`duplicate requirement ${ac}`);
        else requirements.set(ac, { ...row, role, path: document.path });
        if (!profiles.includes(row.Profile)) requirementIssues.push(`${ac}: inactive Profile ${JSON.stringify(row.Profile)}`);
        const owner = contract.profiles[row.Profile]?.dimensions?.[row["Quality Dimension"]];
        if (!owner) requirementIssues.push(`${ac}: unknown Quality Dimension ${JSON.stringify(row["Quality Dimension"])}`);
        else if (owner !== role) requirementIssues.push(`${ac}: Quality Dimension belongs to MOD-${owner}`);
        if (!contract.enums.applicability.includes(row.Applicability)) requirementIssues.push(`${ac}: invalid Applicability`);
        if (contract.placeholders.some((placeholder) => row.Criterion.toUpperCase().includes(placeholder.toUpperCase()))) {
          requirementIssues.push(`${ac}: placeholder criterion is prohibited`);
        }
        if (!row.Criterion) requirementIssues.push(`${ac}: Criterion is required`);
      }
    }
    for (const profile of profiles) {
      for (const [dimension, role] of Object.entries(contract.profiles[profile]?.dimensions ?? {})) {
        if (![...requirements.values()].some((row) => row.Profile === profile && row["Quality Dimension"] === dimension && row.role === role)) {
          requirementIssues.push(`${profile}/${dimension}: no owned AC exists in MOD-${role}`);
        }
      }
    }

    const mod009 = group.get("009");
    const evidenceTable = mod009 ? parseModuleEvidenceTable(mod009, contract) : { present: false, rows: [] };
    if (!evidenceTable.present) {
      findings.push(finding("MODULE-EVIDENCE-DRIFT", mod009?.id ?? `${prefix}-MOD-009`, ["missing exact eleven-column structured evidence table"], paths));
    } else {
      const evidenceIssues = [];
      const evidence = new Map();
      for (const [index, row] of evidenceTable.rows.entries()) {
        evidenceIssues.push(...validateEvidenceRow(row, index, contract));
        const ac = row["AC-ID"];
        if (evidence.has(ac)) evidenceIssues.push(`duplicate evidence row ${ac}`);
        else evidence.set(ac, row);
        const requirement = requirements.get(ac);
        if (!requirement) requirementIssues.push(`orphan evidence row ${ac}`);
        else {
          for (const field of ["Profile", "Quality Dimension", "Applicability"]) {
            if (row[field] !== requirement[field]) requirementIssues.push(`${ac}: requirement/evidence ${field} mismatch`);
          }
          if (row["Owner MOD"] !== `${prefix}-MOD-${requirement.role}`) requirementIssues.push(`${ac}: evidence owner mismatch`);
        }
      }
      for (const ac of requirements.keys()) if (!evidence.has(ac)) requirementIssues.push(`orphan requirement ${ac}: no evidence row`);
      if (evidenceIssues.length) findings.push(finding("MODULE-EVIDENCE-DRIFT", mod009.id, evidenceIssues, [mod009.path]));

      const claim = mod010 ? parseModuleReadinessClaim(mod010) : { present: false, claimable: null };
      const claimIssues = [];
      if (!claim.present) claimIssues.push("exact readiness claim marker is missing");
      if (claim.claimable && evidenceTable.rows.some(blocksClaim)) claimIssues.push("Claimable conflicts with blocking or incomplete evidence");
      if (claimIssues.length) findings.push(finding("MODULE-CLAIM-DRIFT", mod010?.id ?? `${prefix}-MOD-010`, claimIssues, paths, "Critical"));
    }
    if (requirementIssues.length) findings.push(finding("MODULE-REQUIREMENT-DRIFT", prefix, requirementIssues, paths));
  }
  return findings;
}

