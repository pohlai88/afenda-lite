/**
 * Run the deterministic identity/category/register subset of the governed
 * documentation validator. Current disk state is authoritative; Git only
 * annotates tracked/untracked files.
 */
import {
	auditDocs,
	reportToMarkdown,
} from "../.cursor/skills/afenda-elite-doc-integrity/scripts/doc-integrity-core.mjs";

const report = await auditDocs({
	root: process.cwd(),
	scope: process.argv[2] ?? "docs",
	profile: "naming",
});

if (report.exitCode !== 0) process.stderr.write(reportToMarkdown(report));
else {
	console.log(
		`check-docs-naming: ok (${report.coverage.primaryInspected}/${report.coverage.primaryExpected} files)`,
	);
}
process.exit(report.exitCode);
