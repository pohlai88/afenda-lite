6. First slice command: N1

Use the following as your first actual execution command.

You MUST use /using-afenda-elite-skills to execute the instruction below.

EXECUTE AFENDA NEON ERP SLICE: N1 — NEON ENVIRONMENT CONTRACT
Program posture
NO-MVP
Enterprise-production quality
Execute N1 only
Do not begin N2
Do not modify production Neon resources unless an existing approved operation explicitly requires it
Do not expose or commit secrets
Objective

Establish one typed, validated and operationally explicit Neon environment
contract across local development, CI, preview and production.

Required outcomes
One canonical environment schema owns all Neon and Neon Auth variables.
Product code does not read Neon-related variables directly from
process.env.
The contract distinguishes:
required product variables;
server-only secrets;
public-safe variables;
optional operational variables.
Database URLs are validated for the approved project, branch and pooled
connection posture where applicable.
Neon Auth URLs, application origin and cookie-secret requirements are
validated.
Local, CI, preview and production expectations are documented without
containing secret values.
Existing validation scripts are consolidated rather than duplicated.
Misconfiguration fails early with a clear, typed and actionable error.
Tests prove valid and invalid environment combinations.
Deployment and operations consumers use the same contract.
Variables to discover and classify

Do not assume this list is complete:

DATABASE_URL
NEON_AUTH_BASE_URL
NEON_AUTH_COOKIE_SECRET
APP_URL
NEON_API_KEY
Neon project ID
Neon branch ID
environment or deployment identifiers
development-only auth autofill variables

Development-only credential autofill must remain unavailable in production
bundles and must not expose credentials to the browser.

Mandatory preflight

Inspect:

@afenda/env
all Neon validation scripts;
all direct process.env usages;
.env.example or equivalent templates;
CI workflows;
Vercel configuration;
Neon project/branch metadata files;
Auth package;
database package;
application runtime;
relevant tests and runbooks.

Produce an exact current-state environment map before editing.

Constraints
Secrets never enter client bundles.
No fallback to insecure placeholder secrets.
No implicit localhost production fallback.
No casual neonctl link or branch switching.
No adoption of Data API, Object Storage, Functions or AI Gateway.
Do not change schema, auth flow, routing or permission logic in N1.
Do not log complete connection strings, passwords, secrets or tokens.
Error messages may identify the variable but must redact its value.
Acceptance criteria
Canonical schema exists and is imported by all product consumers.
Relevant direct raw environment reads are removed.
Pooled connection posture is validated where required.
Production origin is HTTPS and explicitly configured.
Cookie secret strength and presence are validated.
Development-only autofill is unavailable under production mode.
Validation command exits non-zero on every invalid tested case.
Validation command passes for the approved environment shape.
Unit tests cover missing, malformed and cross-environment combinations.
Existing application tests and production build pass.
No secret value is added to version control.
Required verification

Run the repository-native equivalents of:

environment package typecheck;
environment package tests;
Neon environment validation;
database package tests where connection parsing changed;
auth package tests where Auth environment parsing changed;
web application tests;
web production build;
repository secret scan if available.
Required response

Use the standard slice output:

verdict;
load confirmation;
before-state findings;
implementation;
gap matrix;
files changed;
contracts changed;
verification evidence;
security proof;
unimplemented findings;
residual risks;
verified completeness;
next authorized slice.

STOP after N1. Do not begin N2.

Operating rhythm

For each slice, use this sequence:

1. Paste the slice execution command into Cursor.
2. Let Cursor complete implementation and tests.
3. Paste the independent slice-close audit.
4. When rejected, run the repair command.
5. Repeat closure audit.
6. Mark the slice closed only after APPROVED.
7. Open the next slice.
   Recommended branch pattern
   program/neon-erp
   ├── slice/n1-environment-contract
   ├── slice/n2-migration-discipline
   ├── slice/n3-backup-recovery
   └── ...

Use one branch and one pull request per slice unless your repository authority specifies another model.

Recommended commit pattern
feat(neon-n1): establish typed environment contract
test(neon-n1): cover invalid Neon environment states
docs(neon-n1): align operational environment guidance

Do not mix several slices into one commit.

Efficiency rules for Cursor

To maximize implementation efficiency:

Keep one conversation per slice.
Put the slice ID in the conversation title.
Start every new conversation with the master controller plus the active slice card.
Do not carry large implementation history forward; carry verified closure evidence.
Allow Cursor to inspect broadly but modify narrowly.
Require tests to be written alongside implementation.
Use the closure audit in a separate Cursor conversation where practical.
Keep the next slice locked until the current slice is approved.
Record discoveries as findings rather than implementing them early.
Prefer existing repository commands, helpers and packages over new scripts.
Require actual command results, not statements such as “should pass.”

This structure gives Cursor enough autonomy for effective vibe coding while preventing it from turning the 18-slice program into one uncontrolled repository-wide rewrite.
