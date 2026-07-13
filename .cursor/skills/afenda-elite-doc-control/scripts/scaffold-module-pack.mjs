#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadModuleContract } from "../../afenda-elite-doc-integrity/scripts/module-pack-core.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);

function parseArgs(argv) {
  const options = { apply: false, format: "markdown" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--prefix") options.prefix = argv[++index];
    else if (arg === "--slug") options.slug = argv[++index];
    else if (arg === "--title") options.title = argv[++index];
    else if (arg === "--owner") options.owner = argv[++index];
    else if (arg === "--profiles") options.profiles = argv[++index];
    else if (arg === "--date") options.date = argv[++index];
    else if (arg === "--root") options.root = argv[++index];
    else if (arg === "--module-contract") options.moduleContract = argv[++index];
    else if (arg === "--format") options.format = argv[++index];
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function assertOptions(options, contract) {
  if (!/^[A-Z][A-Z0-9]{1,7}$/.test(options.prefix ?? "")) throw new Error("--prefix must be 2-8 uppercase letters or digits");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.slug ?? "")) throw new Error("--slug must be lowercase kebab-case");
  if (!options.title?.trim()) throw new Error("--title is required");
  if (!options.owner?.trim()) throw new Error("--owner is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error("--date must be YYYY-MM-DD");
  if (!options.profiles.length) throw new Error("--profiles must activate at least Enterprise Core");
  if (!options.profiles.includes("Enterprise Core")) throw new Error("Enterprise Core is mandatory");
  for (const profile of options.profiles) if (!contract.profiles[profile]) throw new Error(`Unknown profile: ${profile}`);
}

function requirementRows(role, prefix, profiles, contract) {
  let sequence = 1;
  const rows = [];
  for (const profile of profiles) {
    for (const [dimension, owner] of Object.entries(contract.profiles[profile].dimensions)) {
      if (owner !== role) continue;
      rows.push({
        ac: `${prefix}-AC-${role}-${String(sequence++).padStart(2, "0")}`,
        profile,
        dimension,
        applicability: "Core",
      });
    }
  }
  return rows;
}

function metadata(id, title, owner, date) {
  return `# ${id} ${title}\n\n| Field | Value |\n| --- | --- |\n| ID | ${id} |\n| Category | Module |\n| Version | 0.1.0 |\n| Status | Draft |\n| Owner | ${owner} |\n| Updated | ${date} |\n\n**Control State:** Closed\n`;
}

function roleTemplate(role, definition, options, contract) {
  const id = `${options.prefix}-MOD-${role}`;
  let owned = "";
  if (Number(role) <= 8) {
    const rows = requirementRows(role, options.prefix, options.profiles, contract);
    owned = `\n### Enterprise requirements\n\n| ${contract.requirementColumns.join(" | ")} |\n| ${contract.requirementColumns.map(() => "---").join(" | ")} |\n${rows.map((row) => `| ${row.ac} | ${row.profile} | ${row.dimension} | ${row.applicability} | TBD - replace before promotion |`).join("\n")}\n`;
  } else if (role === "009") {
    const rows = Object.keys(contract.roles).slice(0, 8).flatMap((owner) => requirementRows(owner, options.prefix, options.profiles, contract));
    owned = `\n### Structured evidence table\n\n| ${contract.evidenceColumns.join(" | ")} |\n| ${contract.evidenceColumns.map(() => "---").join(" | ")} |\n${rows.map((row) => `| ${row.ac} | ${options.prefix}-MOD-${row.ac.split("-")[3]} | ${row.profile} | ${row.dimension} | ${row.applicability} | Enabled | NOT EVIDENCED | | | | TBD - replace before promotion |`).join("\n")}\n`;
  } else {
    owned = `\n${contract.profilesMarker} ${options.profiles.join(", ")}\n\n**Module Enterprise Readiness claim:** Not claimable\n`;
  }
  return `${metadata(id, definition.title, options.owner, options.date)}\n## 1. Purpose\n\nDefine the ${definition.title.toLowerCase()} authority for ${options.title}.\n\n## 2. Scope\n\nThis provisional document is not authoritative until promoted through documentation control.\n\n## 3. ${definition.title}\n${owned}\n## 4. Decisions and Rationale\n\nNo controlled decisions are recorded in this scratch template.\n\n## 5. Verification\n\nRun the promotion checklist and module-quality validator before registration.\n\n## 6. Change Log\n\n| Version | Date | Summary |\n| --- | --- | --- |\n| 0.1.0 | ${options.date} | Provisional scratch scaffold. |\n`;
}

export function createModulePackPlan(rawOptions) {
  const root = path.resolve(rawOptions.root ?? process.cwd());
  const loaded = loadModuleContract(root, rawOptions.moduleContract);
  const options = {
    ...rawOptions,
    root,
    date: rawOptions.date ?? new Date().toISOString().slice(0, 10),
    profiles: Array.isArray(rawOptions.profiles)
      ? rawOptions.profiles
      : String(rawOptions.profiles ?? "Enterprise Core").split(",").map((value) => value.trim()).filter(Boolean),
  };
  assertOptions(options, loaded.contract);
  const scratchRoot = path.resolve(root, "docs/scratch/module-packs");
  const target = path.resolve(scratchRoot, options.slug);
  if (target === scratchRoot || !target.startsWith(`${scratchRoot}${path.sep}`)) throw new Error("Target must remain under docs/scratch/module-packs");
  const files = [{
    path: "README.md",
    content: `# ${options.title} provisional module pack\n\nProfiles: ${options.profiles.join(", ")}\n\nThis scratch pack is non-authoritative. Promote only through MOD-002 and DOC-001 control.\n`,
  }];
  for (const [role, definition] of Object.entries(loaded.contract.roles)) {
    files.push({ path: `${options.prefix}-MOD-${role}-${definition.slug}.md`, content: roleTemplate(role, definition, options, loaded.contract) });
  }
  const dimensions = options.profiles.flatMap((profile) =>
    Object.entries(loaded.contract.profiles[profile].dimensions).map(([dimension, role]) => ({ profile, dimension, owner: `${options.prefix}-MOD-${role}` })),
  );
  return {
    contractVersion: loaded.contract.contractVersion,
    root,
    scratchRoot,
    target,
    prefix: options.prefix,
    slug: options.slug,
    profiles: options.profiles,
    dimensions,
    files,
    promotionChecklist: [
      "Approve final controlled IDs and replace all placeholders.",
      "Update the MOD-002 module catalogue and DOC-002 register.",
      "Move the bounded pack to docs/modules/<slug> through documentation control.",
      "Run naming, module-quality, and doc-integrity validation.",
      "Close every reopened controlled document.",
    ],
  };
}

export function applyModulePackPlan(plan) {
  const target = path.resolve(plan.target);
  const scratchRoot = path.resolve(plan.scratchRoot);
  if (target === scratchRoot || !target.startsWith(`${scratchRoot}${path.sep}`)) throw new Error("Target must remain under docs/scratch/module-packs");
  if (existsSync(plan.target)) throw new Error(`Refusing to overwrite existing target: ${plan.target}`);
  mkdirSync(plan.target, { recursive: true });
  for (const file of plan.files) writeFileSync(path.join(plan.target, file.path), file.content, { encoding: "utf8", flag: "wx" });
  return plan.target;
}

export function formatPlan(plan, format = "markdown") {
  if (format === "json") return `${JSON.stringify({ ...plan, files: plan.files.map(({ path: filePath }) => filePath) }, null, 2)}\n`;
  const lines = [
    "# Module pack scaffold plan",
    "",
    `- Contract: ${plan.contractVersion}`,
    `- Target: \`${plan.target}\``,
    `- Profiles: ${plan.profiles.join(", ")}`,
    "",
    "## Proposed files",
    "",
    ...plan.files.map((file) => `- \`${file.path}\``),
    "",
    "## Profile dimensions",
    "",
    ...plan.dimensions.map((item) => `- ${item.profile}: ${item.dimension} -> ${item.owner}`),
    "",
    "## Promotion checklist",
    "",
    ...plan.promotionChecklist.map((item) => `- ${item}`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write("Usage: scaffold-module-pack.mjs --prefix INV --slug inventory --title Inventory --owner Platform --profiles 'Enterprise Core,ERP' [--apply]\n");
    return;
  }
  const plan = createModulePackPlan(options);
  if (options.apply) applyModulePackPlan(plan);
  process.stdout.write(formatPlan(plan, options.format));
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(SCRIPT_PATH)) {
  main().catch((error) => {
    process.stderr.write(`module-pack scaffold: ${error.message}\n`);
    process.exitCode = 2;
  });
}

