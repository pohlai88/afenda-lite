/**
 * Canonical governance gate registry (GOV-REG-1).
 *
 * This is the single owner of "which governance gates exist, what tier they run
 * at, and who owns them". CI does not list gates; it invokes one dispatcher that
 * reads this file. That makes the failure mode this registry exists to prevent —
 * a gate that quietly stops running because someone edited a workflow —
 * structurally impossible for registered gates.
 *
 * Adding a gate is one edit here. Do not add governance commands directly to
 * `.github/workflows/**`: `--verify-registry` rejects that, in both directions.
 *
 * @typedef {Readonly<{
 *   id: string,
 *   command: string,
 *   tier: "ci-required" | "ci-advisory" | "local",
 *   kind: "leaf" | "aggregate",
 *   members?: readonly string[],
 *   owner: string,
 *   domain: string,
 *   description: string,
 *   negativeFixture?: string,
 *   timeoutSeconds?: number,
 * }>} GovernanceGate
 */

export const GATE_TIERS = ["ci-required", "ci-advisory", "local"];

/**
 * Gate composition kinds.
 *
 * `leaf` gates evaluate one thing and must not invoke another registered gate.
 * `aggregate` gates declare `members`, and the **dispatcher** executes those
 * members — composition stays visible in the registry instead of hiding inside
 * an opaque script, which is what produced double execution and ambiguous
 * failure ownership before.
 */
export const GATE_KINDS = ["leaf", "aggregate"];

/**
 * Commands that mutate state. A `ci-required` gate must be read-only: a
 * pipeline that can rewrite the evidence it verifies proves nothing.
 */
export const MUTATING_COMMAND_PATTERN =
	/\b(?:update|write|fix|apply|generate)\b/;

/** `pnpm --filter <pkg> <script>` */
const FILTERED_COMMAND = /^pnpm\s+--filter\s+(\S+)\s+(?:run\s+)?(\S+)$/;
/** `pnpm <script>` or `pnpm run <script>` */
const ROOT_COMMAND = /^pnpm\s+(?:run\s+)?(\S+)$/;

/** @type {ReadonlyArray<GovernanceGate>} */
export const GOVERNANCE_GATES = [
	{
		id: "package-policy",
		command: "pnpm check:package-policy",
		kind: "leaf",
		tier: "ci-required",
		owner: "monorepo-architecture",
		domain: "package-governance",
		description:
			"Verifies declared package layer, leaf role, entrypoint semantics, export targets, purity, and import boundaries.",
		negativeFixture: "scripts/__tests__/check-package-policy.test.mjs",
	},
	{
		id: "package-internals",
		command: "pnpm check:package-internals",
		kind: "leaf",
		tier: "ci-required",
		owner: "monorepo-architecture",
		domain: "package-governance",
		description:
			"Rejects resolving or executing another package's internal source outside its declared exports.",
		negativeFixture: "scripts/__tests__/check-package-internals.test.mjs",
	},
	{
		id: "package-scaffold-residue",
		command: "pnpm check:package-scaffold-residue",
		kind: "leaf",
		tier: "ci-required",
		owner: "monorepo-architecture",
		domain: "package-governance",
		description:
			"Proves no consumed workspace package carries generator placeholder text — the signature of a scaffold overwriting live capability.",
		negativeFixture:
			"scripts/__tests__/check-package-scaffold-residue.test.mjs",
	},
	{
		id: "protected-files",
		command: "pnpm --filter @afenda/env protect:check",
		kind: "leaf",
		tier: "ci-required",
		owner: "platform-foundation",
		domain: "change-control",
		description:
			"Verifies the @afenda/env protection digest. Verify-only: CI never holds the edit token.",
		negativeFixture: "scripts/__tests__/protect-package-guard.test.mjs",
	},
	{
		id: "env-consumers",
		command: "pnpm check:env-consumers",
		kind: "leaf",
		tier: "ci-required",
		owner: "platform-foundation",
		domain: "configuration-ownership",
		description:
			"AST audit of environment consumption: raw process.env reads, competing schemas, direct env loaders, legacy aliases, docs/product entrypoint ownership, and validation-bypass containment.",
		negativeFixture: "scripts/__tests__/check-env-consumers.test.mjs",
	},
	{
		id: "action-identity-stamp-order",
		command: "pnpm check:action-identity-stamp-order",
		kind: "leaf",
		tier: "ci-required",
		owner: "application-composition",
		domain: "app-scaffolding",
		description:
			"Rejects Server Action payloads that stamp session organizationId before ...parsed.data (client override hole).",
		negativeFixture:
			"scripts/__tests__/check-action-identity-stamp-order.test.mjs",
	},
	{
		id: "app-loader-server-suffix",
		command: "pnpm check:app-loader-server-suffix",
		kind: "leaf",
		tier: "ci-required",
		owner: "application-composition",
		domain: "app-scaffolding",
		description:
			"Requires feature load-*.ts modules to use the .server.ts suffix (APP-SCAFFOLDING §9.1 Loaders).",
		negativeFixture:
			"scripts/__tests__/check-app-loader-server-suffix.test.mjs",
	},
	{
		id: "env-example-parity",
		command: "pnpm check:env-example",
		kind: "leaf",
		tier: "ci-required",
		owner: "platform-foundation",
		domain: "configuration-ownership",
		description:
			"Parity between the committed .env.example template and the declared template policy: declared keys, required developer input, prohibited keys, secret values, duplicates, aliases, and malformed lines.",
		negativeFixture: "scripts/__tests__/check-env-example.test.mjs",
	},
	{
		id: "tenancy-residue-sql",
		command: "pnpm check:tenant-sql-safety",
		kind: "leaf",
		tier: "ci-required",
		owner: "data-plane",
		domain: "tenancy",
		description:
			"Rejects raw SQL against hard tenant roots without an explicit organization_id predicate.",
		negativeFixture: "scripts/__tests__/check-tenant-sql-safety.test.mjs",
	},
	{
		id: "db-boundary",
		command: "pnpm check:db-boundary",
		kind: "leaf",
		tier: "ci-required",
		owner: "data-plane",
		domain: "capability-boundary",
		description:
			"Enforces the @afenda/db capability boundary and rejects legacy root imports and unpublished subpaths.",
		negativeFixture: "scripts/__tests__/check-db-boundary.test.mjs",
	},
	{
		id: "audit-boundary",
		command: "pnpm check:audit-boundary",
		kind: "leaf",
		tier: "ci-required",
		owner: "data-plane",
		domain: "capability-boundary",
		description: "Enforces the @afenda/audit capability boundary.",
		negativeFixture: "scripts/__tests__/check-audit-boundary.test.mjs",
	},
	{
		id: "events-boundary",
		command: "pnpm check:events-boundary",
		kind: "leaf",
		tier: "ci-required",
		owner: "data-plane",
		domain: "capability-boundary",
		description: "Enforces the @afenda/events capability boundary.",
		negativeFixture: "scripts/__tests__/check-events-boundary.test.mjs",
	},
	{
		id: "search-boundary",
		command: "pnpm check:search-boundary",
		kind: "leaf",
		tier: "ci-required",
		owner: "data-plane",
		domain: "capability-boundary",
		description: "Enforces the @afenda/search capability boundary.",
		negativeFixture: "scripts/__tests__/check-search-boundary.test.mjs",
	},
	{
		id: "notifications-boundary",
		command: "pnpm check:notifications-boundary",
		kind: "leaf",
		tier: "ci-required",
		owner: "data-plane",
		domain: "capability-boundary",
		description: "Enforces the @afenda/notifications capability boundary.",
		negativeFixture: "scripts/__tests__/check-notifications-boundary.test.mjs",
	},
	{
		id: "logger-boundary",
		command: "pnpm check:logger-boundary",
		kind: "leaf",
		tier: "ci-required",
		owner: "runtime",
		domain: "capability-boundary",
		description: "Enforces the @afenda/logger capability boundary.",
		negativeFixture: "scripts/__tests__/check-logger-boundary.test.mjs",
	},
	{
		id: "http-boundary",
		command: "pnpm check:http-boundary",
		kind: "leaf",
		tier: "ci-required",
		owner: "runtime",
		domain: "capability-boundary",
		description: "Enforces the @afenda/http capability boundary.",
		negativeFixture: "scripts/__tests__/check-http-boundary.test.mjs",
	},
	{
		id: "security-boundary",
		command: "pnpm check:security-boundary",
		kind: "leaf",
		tier: "ci-required",
		owner: "runtime",
		domain: "capability-boundary",
		description: "Enforces the @afenda/security capability boundary.",
		negativeFixture: "scripts/__tests__/check-security-boundary.test.mjs",
	},
	{
		id: "metrics-boundary",
		command: "pnpm check:metrics-boundary",
		kind: "leaf",
		tier: "ci-required",
		owner: "runtime",
		domain: "capability-boundary",
		description:
			"Enforces the @afenda/metrics capability boundary and authorized export surface.",
		negativeFixture: "scripts/__tests__/check-metrics-boundary.test.mjs",
	},
	{
		id: "cache-boundary",
		command: "pnpm check:cache-boundary",
		kind: "leaf",
		tier: "ci-required",
		owner: "runtime",
		domain: "capability-boundary",
		description:
			"Enforces the @afenda/cache capability boundary, authorized export surface, and private key-prefix ownership.",
		negativeFixture: "scripts/__tests__/check-cache-boundary.test.mjs",
	},
	{
		id: "rate-limit-boundary",
		command: "pnpm check:rate-limit-boundary",
		kind: "leaf",
		tier: "ci-required",
		owner: "runtime",
		domain: "capability-boundary",
		description:
			"Enforces the @afenda/rate-limit capability boundary and forbids direct Upstash vendor bypass.",
		negativeFixture: "scripts/__tests__/check-rate-limit-boundary.test.mjs",
	},
	{
		id: "openapi-boundary",
		command: "pnpm check:openapi-boundary",
		kind: "leaf",
		tier: "ci-required",
		owner: "runtime",
		domain: "capability-boundary",
		description:
			"Enforces the @afenda/openapi capability boundary and single canonical error-schema ownership.",
		negativeFixture: "scripts/__tests__/check-openapi-boundary.test.mjs",
	},
	{
		id: "auth-boundary",
		command: "pnpm check:auth-boundary",
		kind: "leaf",
		tier: "ci-required",
		owner: "control-plane",
		domain: "capability-boundary",
		description: "Enforces the @afenda/auth capability boundary.",
		negativeFixture: "scripts/__tests__/check-auth-boundary.test.mjs",
	},
	{
		id: "admin-boundary",
		command: "pnpm check:admin-boundary",
		kind: "leaf",
		tier: "ci-required",
		owner: "control-plane",
		domain: "capability-boundary",
		description: "Enforces the @afenda/admin capability boundary.",
		negativeFixture: "scripts/__tests__/check-admin-boundary.test.mjs",
	},
	{
		id: "tsconfig-governance",
		command: "pnpm check:tsconfig-governance",
		kind: "leaf",
		tier: "ci-required",
		owner: "monorepo-architecture",
		domain: "build-configuration",
		description:
			"Enforces workspace tsconfig composition and rejects prohibited compiler options.",
		negativeFixture: "scripts/__tests__/check-tsconfig-governance.test.mjs",
	},
	{
		id: "ui-system-governance",
		command: "pnpm check:ui-system",
		kind: "leaf",
		tier: "ci-required",
		owner: "surfaces",
		domain: "design-system",
		description:
			"Enforces @afenda/ui-system flat-barrel governance and owned-source discipline.",
		negativeFixture: "scripts/__tests__/check-ui-system.test.mjs",
	},
	{
		id: "errors-boundary",
		command: "pnpm check:errors-boundary",
		kind: "leaf",
		tier: "ci-required",
		owner: "platform-foundation",
		domain: "capability-boundary",
		description:
			"Enforces the @afenda/errors capability boundary and rejects deleted surfaces.",
		negativeFixture: "scripts/__tests__/check-errors-boundary.test.mjs",
	},
	{
		id: "errors-semantics",
		command: "pnpm check:errors-semantics",
		kind: "leaf",
		tier: "ci-required",
		owner: "platform-foundation",
		domain: "semantic-ownership",
		description:
			"Strict semantic-ownership audit for canonical error construction, serialization, and projection.",
		negativeFixture: "scripts/__tests__/check-errors-semantics.test.mjs",
	},
	{
		id: "kernel-governance",
		command: "pnpm check:kernel-governance",
		kind: "leaf",
		tier: "ci-required",
		owner: "platform-foundation",
		domain: "kernel-family-governance",
		description:
			"Proves the canonical kernel package register matches disk, doctrine, and enforcement declarations.",
		negativeFixture:
			"governance/scripts/__tests__/check-kernel-governance.test.mjs",
	},
];

/**
 * Package script referenced by a gate command, for existence checking.
 *
 * Handles the two shapes in use: `pnpm <script>` / `pnpm run <script>` against
 * the root manifest, and `pnpm --filter <pkg> <script>` against a workspace
 * package.
 *
 * @typedef {{ scope: "root", script: string }
 *   | { scope: "package", packageName: string, script: string }} GateCommandTarget
 *
 * @param {string} command
 * @returns {GateCommandTarget | undefined} undefined when the shape is unrecognized
 */
export function parseGateCommand(command) {
	const filtered = FILTERED_COMMAND.exec(command);
	if (filtered) {
		return { scope: "package", packageName: filtered[1], script: filtered[2] };
	}
	const root = ROOT_COMMAND.exec(command);
	if (root) {
		return { scope: "root", script: root[1] };
	}
}

/**
 * Validate a gate registry against its structural and CI-parity invariants.
 *
 * Pure: all filesystem and workflow access arrives through `context`, so the
 * registry checker can be proven to fire by negative fixtures rather than only
 * being observed to pass on the real repository.
 *
 * @param {ReadonlyArray<GovernanceGate>} gates
 * @param {{
 *   commandResolves: (gate: GovernanceGate) => boolean,
 *   fixtureExists: (fixturePath: string) => boolean,
 *   workflowCommands: ReadonlyArray<{ file: string, run: string }>,
 * }} context
 * @returns {string[]} problems, empty when the registry is valid
 */
function validateGateShape(gate, context) {
	const problems = [];

	if (!GATE_TIERS.includes(gate.tier)) {
		problems.push(`${gate.id}: invalid tier "${gate.tier}"`);
	}
	if (!gate.owner?.trim()) {
		problems.push(`${gate.id}: missing owner — no anonymous mandatory gates`);
	}
	if (!gate.description?.trim()) {
		problems.push(`${gate.id}: missing description`);
	}
	if (!context.commandResolves(gate)) {
		problems.push(
			`${gate.id}: command "${gate.command}" does not resolve to an existing package script`,
		);
	}
	if (
		gate.tier === "ci-required" &&
		MUTATING_COMMAND_PATTERN.test(gate.command)
	) {
		problems.push(
			`${gate.id}: ci-required gates must be read-only, but the command looks mutating`,
		);
	}
	if (gate.tier !== "local" && !gate.negativeFixture) {
		problems.push(
			`${gate.id}: enforced gates require a negative fixture proving the gate fires`,
		);
	}
	if (gate.negativeFixture && !context.fixtureExists(gate.negativeFixture)) {
		problems.push(
			`${gate.id}: negative fixture ${gate.negativeFixture} does not exist`,
		);
	}
	if (!GATE_KINDS.includes(gate.kind)) {
		problems.push(`${gate.id}: invalid kind "${gate.kind}"`);
	}
	if (gate.kind === "leaf" && gate.members !== undefined) {
		problems.push(
			`${gate.id}: leaf gates must not declare members — use kind "aggregate"`,
		);
	}
	if (gate.kind === "aggregate" && !(gate.members?.length > 0)) {
		problems.push(`${gate.id}: aggregate gates must declare members`);
	}

	return problems;
}

/** Aggregate membership: members exist, no self-reference, no cycles. */
function validateComposition(gates, problems) {
	const byId = new Map(gates.map((gate) => [gate.id, gate]));

	for (const gate of gates) {
		for (const member of gate.members ?? []) {
			if (!byId.has(member)) {
				problems.push(`${gate.id}: declares unknown member "${member}"`);
			}
			if (member === gate.id) {
				problems.push(`${gate.id}: declares itself as a member`);
			}
		}
	}

	// Depth-first cycle detection. A governance system that needs a complex
	// scheduler is harder to trust than the checks it coordinates, so cycles are
	// rejected outright rather than resolved.
	const state = new Map();
	const walk = (id, trail) => {
		if (state.get(id) === "done") {
			return;
		}
		if (state.get(id) === "visiting") {
			problems.push(`gate dependency cycle: ${[...trail, id].join(" -> ")}`);
			return;
		}
		state.set(id, "visiting");
		for (const member of byId.get(id)?.members ?? []) {
			if (byId.has(member)) {
				walk(member, [...trail, id]);
			}
		}
		state.set(id, "done");
	};
	for (const gate of gates) {
		walk(gate.id, []);
	}
}

const REGEX_METACHARACTERS = /[.*+?^${}()|[\]\\]/g;

/**
 * Does `source` actually *invoke* `script`, rather than merely mention it?
 *
 * Two forms count: the full `pnpm <script>` command line, and the script name
 * as a complete quoted argument (`runPnpm(["check:x"])`). A name appearing
 * inside a longer prose string — an allowlist reason, a diagnostic message —
 * is documentation, not execution, and flagging it would make the gate fire on
 * the very registry tooling that describes the gates.
 */
function invokesScript(source, script) {
	const escaped = script.replace(REGEX_METACHARACTERS, "\\$&");
	const asCommand = new RegExp(
		`pnpm\\s+(?:run\\s+)?${escaped}(?:\\s|$|["'\`])`,
	);
	const asQuotedArgument = new RegExp(`["'\`]${escaped}["'\`]`);
	return asCommand.test(source) || asQuotedArgument.test(source);
}

/**
 * Nested execution: no script may invoke a registered gate behind the
 * dispatcher's back.
 *
 * This is the rule that prevents the next double-execution rather than fixing
 * the last one. A leaf gate invoking another leaf gate — or a CI-invoked script
 * doing so — makes failure ownership ambiguous and runs work twice. Legitimate
 * composition is expressed as an `aggregate` with declared members, which the
 * dispatcher executes visibly.
 *
 * @param {ReadonlyArray<GovernanceGate>} gates
 * @param {ReadonlyArray<{file: string, source: string, gateId?: string}>} scriptSources
 */
function validateNestedExecution(gates, scriptSources, problems) {
	const byId = new Map(gates.map((gate) => [gate.id, gate]));

	for (const { file, source, gateId } of scriptSources) {
		const invoker = gateId ? byId.get(gateId) : undefined;
		const declaredMembers = new Set(invoker?.members ?? []);

		for (const gate of gates) {
			if (gate.id === gateId) {
				continue;
			}
			// Command shape is validated by `validateGateShape`, which reports an
			// unparseable command as its own problem before this point.
			const { script } = parseGateCommand(gate.command);
			if (!invokesScript(source, script)) {
				continue;
			}
			if (declaredMembers.has(gate.id)) {
				continue; // declared composition — the dispatcher runs it
			}
			problems.push(
				`${file}: invokes registered gate "${gate.id}" (${script}) — declare an aggregate with members, or remove the nested call`,
			);
		}
	}
}

/** Bidirectional parity between the registry and the workflows. */
function validateWorkflowParity(gates, workflowCommands) {
	const problems = [];

	// Registry → CI: required gates must actually be dispatched somewhere.
	// Use invocation detection (not substring presence) so a prose mention of
	// "check:governance" in an unrelated step cannot satisfy the control.
	const dispatched = workflowCommands.some(({ run }) =>
		invokesScript(run, "check:governance"),
	);
	if (gates.some((gate) => gate.tier === "ci-required") && !dispatched) {
		problems.push(
			"registry declares ci-required gates but no workflow invokes pnpm check:governance",
		);
	}

	// CI → registry: without this direction, inline gates keep accumulating.
	for (const gate of gates) {
		const parsed = parseGateCommand(gate.command);
		if (!parsed) {
			continue;
		}
		for (const { file, run } of workflowCommands) {
			if (invokesScript(run, parsed.script)) {
				problems.push(
					`${file}: invokes registered gate "${gate.id}" directly — remove the inline step; the dispatcher runs it`,
				);
			}
		}
	}

	return problems;
}

export function validateGateRegistry(gates, context) {
	const problems = [];
	const seen = new Set();

	for (const gate of gates) {
		if (seen.has(gate.id)) {
			problems.push(`duplicate gate id: ${gate.id}`);
		}
		seen.add(gate.id);
		problems.push(...validateGateShape(gate, context));
	}

	validateComposition(gates, problems);
	validateNestedExecution(gates, context.scriptSources ?? [], problems);
	problems.push(...validateWorkflowParity(gates, context.workflowCommands));

	return problems;
}
