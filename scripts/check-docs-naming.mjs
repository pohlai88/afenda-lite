/**
 * Run the deterministic identity/category/register subset of the governed
 * documentation validator. Current disk state is authoritative; Git only
 * annotates tracked/untracked files.
 *
 * Living `docs/` absent (cutover 71176a0 / docs-V2 Scratch era) → skip exit 0.
 * DOC-002 control register absent → skip exit 0 (partial trunk: templates +
 * OPEN-001 may exist without Docs-lane control plane; templates are excluded
 * from the naming scan by doc-integrity-core).
 */
import { existsSync } from "node:fs";
import path from "node:path";

import {
	auditDocs,
	reportToMarkdown,
} from "../.cursor/skills/afenda-elite-doc-integrity/scripts/doc-integrity-core.mjs";

const root = process.cwd();
const livingDocs = path.join(root, "docs");
if (!existsSync(livingDocs)) {
	console.log(
		"check-docs-naming: skipped — Living docs/ absent (docs-V2 Scratch era; cutover 71176a0)",
	);
	process.exit(0);
}

const registerPath = path.join(
	root,
	"docs/_control/DOC-002-documentation-register.md",
);
if (!existsSync(registerPath)) {
	console.log(
		"check-docs-naming: skipped — DOC-002 register absent (Docs-lane control plane not restored; templates excluded from naming)",
	);
	process.exit(0);
}

const report = await auditDocs({
	root,
	scope: process.argv[2] ?? "docs",
	profile: "naming",
});

if (report.exitCode === 0) {
	console.log(
		`check-docs-naming: ok (${report.coverage.primaryInspected}/${report.coverage.primaryExpected} files)`,
	);
} else {
	process.stderr.write(reportToMarkdown(report));
}
process.exit(report.exitCode);
