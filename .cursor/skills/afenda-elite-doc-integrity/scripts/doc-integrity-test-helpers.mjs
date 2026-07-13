import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "afenda-doc-integrity-"));
  const write = (relative, content) => {
    const target = path.join(root, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content, "utf8");
  };
  const remove = (relative) => rmSync(path.join(root, relative), { force: true });
  return { root, write, remove, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

export function documentText({
  id,
  title,
  category = "API",
  version = "1.0.0",
  status = "Draft",
  controlState = "Closed",
  owner = "Backend",
  updated = "2026-07-13",
  body = "None.",
  structured = true,
  modern = true,
  changeLog = true,
  controlStateNote = "",
  omitControlStateNote = false,
}) {
  const key = (value) => (modern ? `**${value}**` : value);
  const note = omitControlStateNote
    ? ""
    : controlStateNote ||
      (controlState === "Reopened"
        ? "\n**Control-state note:** Reopened by Fixture on 2026-07-13 for fixture authorization. Automatically returns to Closed after successful verification.\n"
        : "");
  const header = `# ${id} ${title}

| Field | Value |
| --- | --- |
| ${key("ID")} | ${id} |
| ${key("Category")} | ${category} |
| ${key("Version")} | ${version} |
| ${key("Status")} | ${status} |
| ${key("Control State")} | ${controlState} |
| ${key("Owner")} | ${owner} |
| ${key("Updated")} | ${updated} |
${note}`;
  const changeLogSection = changeLog
    ? `
| Version | Date | Summary |
| --- | --- | --- |
| ${version} | ${updated} | Fixture. |
`
    : "\nNone recorded.\n";
  if (!structured) {
    return `${header}
## Contract

${body}

## Change Log
${changeLogSection}`;
  }
  return `${header}
# 1. Purpose

${body}

# 2. Scope

None.

# 3. Contract

${body}

# 4. References

None.

# 5. Change Log
${changeLogSection}
# 6. Notes

None.
`;
}

export function authorityYaml({ locked = false } = {}) {
  return `version: 2
subjects:
  documentation-governance:
    aspects:
      catalogue-metadata:
        precedence: [DOC-001, DOC-002]
cross_subject_sets: {}
locks:${locked ? `
  - id: GUIDE-015
    locked_by: Fixture Owner
    locked_on: 2026-07-13
    scope: Fixture paths` : " []"}
`;
}

export function registerText(rows, notes = "") {
  return `# DOC-002 Documentation Register

| Field | Value |
| --- | --- |
| **ID** | DOC-002 |
| **Category** | Control |
| **Version** | 1.0.0 |
| **Status** | Living |
| **Control State** | Closed |
| **Owner** | Platform |
| **Updated** | 2026-07-13 |

| ID | Category | Title | Version | Status | Owner | Updated |
| --- | --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| ${row.join(" | ")} |`).join("\n")}

${notes}
`;
}

export function setupControl(fx, rows, { authority = authorityYaml(), notes = "" } = {}) {
  fx.write("docs/_control/DOC-002-documentation-register.md", registerText(rows, notes));
  fx.write(
    ".cursor/skills/afenda-elite-doc-integrity/authority-map.yaml",
    authority,
  );
}
