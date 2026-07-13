import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { marked } from "marked";

import { loadModuleContract, modulePackFindings } from "./module-pack-core.mjs";

const root = path.resolve(import.meta.dirname, "../../../..");
const contractPath = path.join(root, ".cursor/skills/afenda-elite-doc-control/module-pack-contract.json");
const schemaPath = path.join(root, ".cursor/skills/afenda-elite-doc-control/schemas/module-pack-contract.schema.json");
const contract = loadModuleContract(root).contract;

function fixtureContract(mutator) {
  const temporary = mkdtempSync(path.join(tmpdir(), "module-contract-"));
  const directory = path.join(temporary, "contract");
  mkdirSync(path.join(directory, "schemas"), { recursive: true });
  const value = JSON.parse(readFileSync(contractPath, "utf8"));
  mutator(value);
  writeFileSync(path.join(directory, "module-pack-contract.json"), JSON.stringify(value, null, 2));
  writeFileSync(path.join(directory, "schemas/module-pack-contract.schema.json"), readFileSync(schemaPath));
  return { temporary, contractPath: path.join(directory, "module-pack-contract.json") };
}

for (const [name, mutate] of [
  ["invalid version", (value) => { value.contractVersion = "one"; }],
  ["invalid enum", (value) => { value.enums.evidence = ["PASS", "MAYBE"]; }],
  ["invalid role owner", (value) => { value.profiles.ERP.dimensions["ERP-REPORTING"] = "009"; }],
  ["duplicate dimension", (value) => { value.profiles.ERP.dimensions["CORE-ARCH"] = "001"; }],
  ["missing mandatory profile", (value) => { delete value.profiles["Enterprise Core"]; }],
]) {
  test(`contract fails closed for ${name}`, () => {
    const fixture = fixtureContract(mutate);
    try {
      assert.throws(() => loadModuleContract(root, fixture.contractPath));
    } finally {
      rmSync(fixture.temporary, { recursive: true, force: true });
    }
  });
}

function document(id, title, body, slug) {
  const text = `# ${id} ${title}\n\n${body}\n`;
  return {
    id,
    h1: `${id} ${title}`,
    path: `docs/modules/fixture/${id}-${slug}.md`,
    text,
    tokens: marked.lexer(text),
    metadata: { Version: "1.0.0" },
  };
}

function validPack() {
  const prefix = "INV";
  const documents = [];
  const rows = [];
  for (const [role, definition] of Object.entries(contract.roles)) {
    if (Number(role) <= 8) {
      const [dimension] = Object.entries(contract.profiles["Enterprise Core"].dimensions).find(([, owner]) => owner === role);
      const ac = `${prefix}-AC-${role}-01`;
      rows.push({ ac, role, dimension });
      documents.push(document(
        `${prefix}-MOD-${role}`,
        definition.title,
        `## 3. ${definition.title}\n\n### Enterprise requirements\n\n| ${contract.requirementColumns.join(" | ")} |\n| ${contract.requirementColumns.map(() => "---").join(" | ")} |\n| ${ac} | Enterprise Core | ${dimension} | Core | Verifiable criterion for ${dimension}. |`,
        definition.slug,
      ));
    }
  }
  const evidence = rows.map(({ ac, role, dimension }) =>
    `| ${ac} | ${prefix}-MOD-${role} | Enterprise Core | ${dimension} | Core | Enabled | NOT EVIDENCED | | | | Fixture evidence is intentionally absent. |`,
  ).join("\n");
  documents.push(document(
    `${prefix}-MOD-009`,
    contract.roles["009"].title,
    `## 3. Verification\n\n### Structured evidence table\n\n| ${contract.evidenceColumns.join(" | ")} |\n| ${contract.evidenceColumns.map(() => "---").join(" | ")} |\n${evidence}`,
    contract.roles["009"].slug,
  ));
  documents.push(document(
    `${prefix}-MOD-010`,
    contract.roles["010"].title,
    `## 3. Index\n\n### Module Enterprise Readiness claim\n\n${contract.profilesMarker} Enterprise Core\n\n**Module Enterprise Readiness claim:** Not claimable`,
    contract.roles["010"].slug,
  ));
  return documents;
}

test("valid fixed pack has no module findings", () => {
  assert.deepEqual(modulePackFindings(validPack(), contract), []);
});

test("pack drift detects missing role, extra role, wrong title, and missing section", () => {
  const documents = validPack().filter((item) => item.id !== "INV-MOD-008");
  documents[0].h1 = "INV-MOD-001 Wrong";
  documents[1].text = documents[1].text.replace("Enterprise requirements", "Requirements");
  documents.push(document("INV-MOD-011", "Extra", "## 3. Extra", "extra"));
  const findings = modulePackFindings(documents, contract);
  assert.ok(findings.some((item) => item.category === "MODULE-PACK-DRIFT"));
});

test("requirement drift detects malformed and orphan requirement/evidence rows", () => {
  const documents = validPack();
  const mod001 = documents.find((item) => item.id === "INV-MOD-001");
  mod001.text = mod001.text.replace("INV-AC-001-01", "BAD-AC");
  mod001.tokens = marked.lexer(mod001.text);
  const findings = modulePackFindings(documents, contract);
  assert.ok(findings.some((item) => item.category === "MODULE-REQUIREMENT-DRIFT"));
});

