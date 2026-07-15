#!/usr/bin/env node

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--scope") options.scope = argv[++index];
    else if (arg === "--register") options.register = argv[++index];
    else if (arg === "--authority-map") options.authorityMap = argv[++index];
    else if (arg === "--module-contract") options.moduleContract = argv[++index];
    else if (arg === "--format") options.format = argv[++index];
    else if (arg === "--profile") options.profile = argv[++index];
    else if (arg === "--root") options.root = argv[++index];
    else if (arg === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

const usage = `Usage: node audit-docs.mjs [options]

Options:
  --root <path>           Repository root (default: cwd)
  --scope <path>          Primary docs dir or single .md/.yaml/.yml/.json (default: docs/api)
  --register <path>       DOC-002 register path
  --authority-map <path>  Aspect-aware authority map
  --module-contract <path> Executable module contract override
  --format <json|markdown>
  --profile <full|naming>
`;

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error.message}\n${usage}`);
  process.exit(2);
}
if (options.help) {
  process.stdout.write(usage);
  process.exit(0);
}
if (options.format && !["json", "markdown"].includes(options.format)) {
  process.stderr.write(`Invalid --format: ${options.format}\n`);
  process.exit(2);
}
if (options.profile && !["full", "naming"].includes(options.profile)) {
  process.stderr.write(`Invalid --profile: ${options.profile}\n`);
  process.exit(2);
}

try {
  const { auditDocs, reportToMarkdown } = await import("./doc-integrity-core.mjs");
  const report = await auditDocs(options);
  process.stdout.write(
    options.format === "json"
      ? `${JSON.stringify(report, null, 2)}\n`
      : reportToMarkdown(report),
  );
  process.exit(report.exitCode);
} catch (error) {
  const diagnostic = {
    schemaVersion: "1.0.0",
    coverage: { complete: false, failures: [error.message] },
    findings: [],
    exitCode: 2,
  };
  process.stderr.write(
    options.format === "json"
      ? `${JSON.stringify(diagnostic, null, 2)}\n`
      : `doc-integrity: dependency or validator failure: ${error.stack ?? error.message}\n`,
  );
  process.exit(2);
}
