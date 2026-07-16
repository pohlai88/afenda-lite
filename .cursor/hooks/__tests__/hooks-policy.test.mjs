/**
 * Fixture suite for Cursor hook allow/ask/deny policy.
 * Run: node --test .cursor/hooks/__tests__/hooks-policy.test.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const hooksDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

/**
 * @param {string} scriptName
 * @param {Record<string, unknown>} payload
 * @param {NodeJS.ProcessEnv} [env]
 */
function runHook(scriptName, payload, env = process.env) {
	const result = spawnSync(
		process.execPath,
		[path.join(hooksDir, scriptName)],
		{
			input: `${JSON.stringify(payload)}\n`,
			encoding: "utf8",
			env,
			cwd: path.resolve(hooksDir, "../.."),
		},
	);
	assert.equal(
		result.status,
		0,
		`${scriptName} exited ${result.status}: ${result.stderr}`,
	);
	const line = (result.stdout || "").trim().split("\n").pop() || "{}";
	return JSON.parse(line);
}

describe("git-no-auto-recover", () => {
	it("allows git status / log / show Target testing / checkout --orphan", () => {
		for (const command of [
			"git status",
			"git log -1 --oneline",
			"git show HEAD:testing/README.md",
			"git checkout --orphan tmp-branch",
			"git checkout --help",
			"git checkout --track origin/main",
		]) {
			const out = runHook("git-no-auto-recover.mjs", { command });
			assert.equal(out.permission, "allow", command);
		}
	});

	it("asks on restore and Collapse app/ mining", () => {
		const restore = runHook("git-no-auto-recover.mjs", {
			command: "git restore .",
		});
		assert.equal(restore.permission, "ask");

		const showApp = runHook("git-no-auto-recover.mjs", {
			command: "git show HEAD:app/page.tsx",
		});
		assert.equal(showApp.permission, "ask");

		const pathRestore = runHook("git-no-auto-recover.mjs", {
			command: "git checkout HEAD -- apps/web/package.json",
		});
		assert.equal(pathRestore.permission, "ask");
	});
});

describe("no-drizzle-baseline-migrate", () => {
	it("denies db:migrate without override", () => {
		const out = runHook("no-drizzle-baseline-migrate.mjs", {
			command: "pnpm --filter @afenda/db db:migrate",
		});
		assert.equal(out.permission, "deny");
	});

	it("allows when AFENDA_ALLOW_DB_MIGRATE=1 in command", () => {
		const out = runHook("no-drizzle-baseline-migrate.mjs", {
			command: "AFENDA_ALLOW_DB_MIGRATE=1 pnpm db:migrate",
		});
		assert.equal(out.permission, "allow");
	});
});

describe("no-shim-stub-tech-debt", () => {
	it("allows AGENTS.md ban checklist language", () => {
		const out = runHook("no-shim-stub-tech-debt.mjs", {
			tool_name: "Write",
			tool_input: {
				path: "AGENTS.md",
				contents:
					"| **No shims / stubs** | never MVP | No tech debt allowances |\n",
			},
		});
		assert.equal(out.permission, "allow");
	});

	it("allows JSX placeholder= and prose shim warning", () => {
		const placeholder = runHook("no-shim-stub-tech-debt.mjs", {
			tool_name: "StrReplace",
			tool_input: {
				path: "apps/web/features/demo.tsx",
				old_string: "x",
				new_string: '<Input placeholder="Enter your email" />',
			},
		});
		assert.equal(placeholder.permission, "allow");

		const prose = runHook("no-shim-stub-tech-debt.mjs", {
			tool_name: "Write",
			tool_input: {
				path: "apps/web/app/actions/invite-org-member.ts",
				contents:
					"/** do not invent a permission-code shim here. */\nexport async function invite() {}\n",
			},
		});
		assert.equal(prose.permission, "allow");
	});

	it("denies stub filename and TODO: implement", () => {
		const stubFile = runHook("no-shim-stub-tech-debt.mjs", {
			tool_name: "Write",
			tool_input: {
				path: "apps/web/lib/foo.stub.ts",
				contents: "export const x = 1;\n",
			},
		});
		assert.equal(stubFile.permission, "deny");

		const todo = runHook("no-shim-stub-tech-debt.mjs", {
			tool_name: "Write",
			tool_input: {
				path: "apps/web/lib/todo-impl.ts",
				contents: "// TODO: implement the real handler\nexport {}\n",
			},
		});
		assert.equal(todo.permission, "deny");
	});
});

describe("no-mvp-quality-bar", () => {
	it("allows AGENTS.md mentioning MVP ban", () => {
		const out = runHook("no-mvp-quality-bar.mjs", {
			tool_name: "Write",
			tool_input: {
				path: "AGENTS.md",
				contents: "never MVP / good enough later\nNo shim/MVP language\n",
			},
		});
		assert.equal(out.permission, "allow");
	});

	it("denies increasing MVP quality language on new product file", () => {
		const out = runHook("no-mvp-quality-bar.mjs", {
			tool_name: "Write",
			tool_input: {
				path: "apps/web/docs/feature-notes.md",
				contents: "Ship as MVP first then harden for production.\n",
			},
		});
		assert.equal(out.permission, "deny");
	});
});

describe("no-decision-directory", () => {
	it("denies writes under decisions/", () => {
		const out = runHook("no-decision-directory.mjs", {
			tool_name: "Write",
			tool_input: {
				path: "docs/architecture/decisions/x.md",
				contents: "# no\n",
			},
		});
		assert.equal(out.permission, "deny");
	});

	it("allows adr path", () => {
		const out = runHook("no-decision-directory.mjs", {
			tool_name: "Write",
			tool_input: {
				path: "docs/architecture/adr/ADR-010-example.md",
				contents: "# ADR\n",
			},
		});
		assert.equal(out.permission, "allow");
	});
});

describe("no-tsconfig-baseurl", () => {
	it("allows tsconfig without baseUrl", () => {
		const out = runHook("no-tsconfig-baseurl.mjs", {
			tool_name: "Write",
			tool_input: {
				path: "tsconfig.json",
				contents: '{\n  "compilerOptions": {\n    "paths": {}\n  }\n}\n',
			},
		});
		assert.equal(out.permission, "allow");
	});

	it("denies baseUrl in tsconfig", () => {
		const out = runHook("no-tsconfig-baseurl.mjs", {
			tool_name: "Write",
			tool_input: {
				path: "tsconfig.json",
				contents:
					'{\n  "compilerOptions": {\n    "baseUrl": ".",\n    "paths": {}\n  }\n}\n',
			},
		});
		assert.equal(out.permission, "deny");
	});
});

describe("agent-authority-preflight", () => {
	it("returns empty object on unknown event", () => {
		const out = runHook("agent-authority-preflight.mjs", {
			unexpected: true,
		});
		assert.deepEqual(out, {});
	});

	it("allows MCP with reminder", () => {
		const out = runHook("agent-authority-preflight.mjs", {
			hook_event_name: "beforeMCPExecution",
			tool_name: "example_tool",
		});
		assert.equal(out.permission, "allow");
		assert.match(String(out.agent_message || ""), /PREFLIGHT/);
	});
});
