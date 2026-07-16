/**
 * Cursor hooks — PREFLIGHT reminder when skills, MCP, or project rules engage.
 *
 * Events (wired in hooks.json):
 * - sessionStart → additional_context (best-effort; IDE may drop this)
 * - beforeMCPExecution → allow + agent_message
 * - postToolUse (Read) → additional_context when path is skill/rule/AGENTS
 *
 * Does not replace the always-apply rule; it reinjects the duty at tool time.
 *
 * @see .cursor/rules/agent-authority-preflight.mdc
 * @see https://cursor.com/docs/hooks
 */
import { respond } from "./hook-policy.mjs";
import { readHookPayload } from "./hook-stdin.mjs";

const PREFLIGHT_TEMPLATE = `### PREFLIGHT
- Engaging: skills | mcp | rules (list which apply)
- Skills: <name(s) or none>
- MCP: <server/tool(s) or none>
- Rules: <rule file stem(s) or none>
- Router: using-afenda-elite-skills | n/a`;

const REMINDER = [
	"AUTHORITY PREFLIGHT REQUIRED.",
	"Before continuing tool-driven work with skills, MCP, or project rules,",
	"your next user-visible reply MUST open with:",
	"",
	PREFLIGHT_TEMPLATE,
	"",
	"See .cursor/rules/agent-authority-preflight.mdc and AGENTS.md.",
].join("\n");

/**
 * @param {string} filePath
 */
function isAuthorityPath(filePath) {
	if (!filePath || typeof filePath !== "string") {
		return false;
	}
	const p = filePath.replace(/\\/g, "/").toLowerCase();
	if (p.endsWith("/agents.md") || p.endsWith("/agent.md")) {
		return true;
	}
	if (p.includes("/.cursor/rules/") && p.endsWith(".mdc")) {
		return true;
	}
	if (p.includes("/.cursor/skills/") || p.includes("/.agents/skills/")) {
		return true;
	}
	return false;
}

/**
 * @param {Record<string, unknown>} payload
 */
function resolveEvent(payload) {
	const named = String(
		payload.hook_event_name || payload.hookEventName || payload.event || "",
	);
	if (named) {
		return named;
	}
	if (
		payload.tool_output !== undefined ||
		payload.duration !== undefined ||
		payload.duration_ms !== undefined
	) {
		return "postToolUse";
	}
	if (
		payload.is_background_agent !== undefined ||
		payload.composer_mode !== undefined
	) {
		if (!payload.tool_name && !payload.toolName) {
			return "sessionStart";
		}
	}
	if (payload.tool_name || payload.toolName) {
		// MCP gate has tool_name without shell cwd; shell uses command+cwd.
		if (payload.cwd === undefined) {
			return "beforeMCPExecution";
		}
	}
	return "";
}

const payload = await readHookPayload();
const event = resolveEvent(payload);

try {
	if (event === "sessionStart") {
		respond({
			additional_context: [
				"## Agent authority PREFLIGHT (session)",
				"",
				"When this session uses skills, MCP, or project rules, open the turn with:",
				"",
				PREFLIGHT_TEMPLATE,
				"",
				"Rule: .cursor/rules/agent-authority-preflight.mdc · AGENTS.md",
			].join("\n"),
			env: {
				AFENDA_AUTHORITY_PREFLIGHT: "required",
			},
		});
		process.exit(0);
	}

	if (event === "beforeMCPExecution") {
		const tool = String(payload.tool_name || payload.toolName || "unknown");
		respond({
			permission: "allow",
			agent_message: [
				REMINDER,
				"",
				`MCP tool about to run: ${tool}`,
				"If this turn’s reply has not yet opened with ### PREFLIGHT naming this MCP, do that before further MCP calls.",
			].join("\n"),
		});
		process.exit(0);
	}

	if (event === "postToolUse") {
		const toolName = String(payload.tool_name || payload.toolName || "");
		const input = /** @type {Record<string, unknown>} */ (
			payload.tool_input || payload.toolInput || {}
		);
		const filePath = String(
			input.path || input.file_path || input.filePath || "",
		);

		if (
			(toolName === "Read" || toolName === "TabRead" || toolName === "") &&
			isAuthorityPath(filePath)
		) {
			respond({
				additional_context: [
					REMINDER,
					"",
					`Authority file just read: ${filePath.replace(/\\/g, "/")}`,
					"Name it under Skills / Rules in ### PREFLIGHT if not already declared this turn.",
				].join("\n"),
			});
			process.exit(0);
		}

		respond({});
		process.exit(0);
	}

	// Unknown / unrecognized payload — stay quiet (no REMINDER spam).
	respond({});
	process.exit(0);
} catch {
	respond({ permission: "allow" });
	process.exit(0);
}
