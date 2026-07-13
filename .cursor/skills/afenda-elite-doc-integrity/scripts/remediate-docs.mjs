#!/usr/bin/env node

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") options.root = argv[++index];
    else if (arg === "--scope") options.scope = argv[++index];
    else if (arg === "--register") options.register = argv[++index];
    else if (arg === "--authority-map") options.authorityMap = argv[++index];
    else if (arg === "--mode") options.mode = argv[++index];
    else if (arg === "--format") options.format = argv[++index];
    else if (arg === "--plan") options.planFile = argv[++index];
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

const usage = `Usage: node remediate-docs.mjs [options]

Options:
  --root <path>
  --scope <path>          Default: docs/api
  --register <path>
  --authority-map <path>
  --mode <plan-fix|apply-safe>
  --format <json|markdown>
  --plan <path>            Reviewed plan file; required with apply-safe
  --apply                 Required with apply-safe
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
const mode = options.mode ?? "plan-fix";
if (!["plan-fix", "apply-safe"].includes(mode)) {
  process.stderr.write(`Invalid --mode: ${mode}\n`);
  process.exit(2);
}
if (options.format && !["json", "markdown"].includes(options.format)) {
  process.stderr.write(`Invalid --format: ${options.format}\n`);
  process.exit(2);
}
if (mode === "apply-safe" && (!options.apply || !options.planFile)) {
  process.stderr.write("apply-safe requires explicit --apply and --plan <reviewed-plan.json>\n");
  process.exit(2);
}

try {
  const { auditDocs } = await import("./doc-integrity-core.mjs");
  const { applySafeRemediation, buildRemediationPlan } = await import(
    "./doc-integrity-remediation.mjs"
  );
  const reviewedPlan = mode === "apply-safe"
    ? JSON.parse((await import("node:fs")).readFileSync(options.planFile, "utf8"))
    : undefined;
  const auditOptions = {
    root: options.root,
    scope: options.scope ?? reviewedPlan?.scope ?? "docs/api",
    register: options.register,
    authorityMap: options.authorityMap,
  };
  const report = mode === "apply-safe" ? undefined : await auditDocs(auditOptions);
  const plan = reviewedPlan ?? buildRemediationPlan(report, { root: options.root });
  const result = mode === "apply-safe" ? await applySafeRemediation(plan, auditOptions) : plan;
  if (options.format === "markdown") {
    process.stdout.write(
      `# Documentation remediation\n\n- Mode: ${mode}\n- Safe operations: ${plan.operations.length}\n- Unresolved findings: ${plan.unresolved.length}\n${mode === "apply-safe" ? `- Idempotent: ${result.idempotent ? "yes" : "no"}\n` : ""}`,
    );
  } else {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }
  process.exit(mode === "apply-safe" ? result.report.exitCode : report.exitCode);
} catch (error) {
  process.stderr.write(`docs-remediation: ${error.stack ?? error.message}\n`);
  process.exit(2);
}
