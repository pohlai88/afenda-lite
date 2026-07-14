/**
 * preToolUse — ban creating/writing under folders named decision or decisions.
 * failClosed: false (soft) — never brick the agent on hook crash.
 */
import { readFileSync } from "node:fs";

function readPayload() {
  try {
    const raw = readFileSync(0, "utf8").trim();
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function respond(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

try {
  const payload = readPayload();
  const input = payload.tool_input || payload.toolInput || {};
  const rawPath =
    input.path || input.target_notebook || input.filePath || input.file_path || "";
  const p = String(rawPath).replace(/\\/g, "/").toLowerCase();

  if (
    p.includes("/.cursor/hooks/no-decision-directory") ||
    p.includes("/.cursor/rules/no-decision-directory")
  ) {
    respond({ permission: "allow" });
    process.exit(0);
  }

  if (/(^|\/)decisions?(\/|$)/.test(p)) {
    const msg =
      "Denied: folder named decision/decisions is forbidden. ADR home is docs/architecture/adr/ (DOC-001). See .cursor/rules/no-decision-directory.mdc";
    respond({
      permission: "deny",
      user_message: `${msg} Path: ${p}`,
      agent_message: `${msg} Path: ${p}`,
    });
    process.exit(0);
  }

  respond({ permission: "allow" });
} catch (err) {
  respond({
    permission: "allow",
    agent_message: `no-decision-directory soft-fail: ${String(err)}`,
  });
}
