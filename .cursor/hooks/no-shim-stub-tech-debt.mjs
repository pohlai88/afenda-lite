/**
 * Cursor preToolUse hook — deny shims, stubs, and tech-debt carve-outs in edits.
 *
 * Stdin: { tool_name, tool_input, ... }
 * @see https://cursor.com/docs/hooks
 */
import { readFileSync } from "node:fs";
import path from "node:path";

function readPayload() {
  try {
    const raw = readFileSync(0, "utf8").trim();
    if (!raw) {
      return {};
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function respond(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

const WRITE_TOOLS = new Set(["Write", "StrReplace", "EditNotebook", "TabWrite"]);

/** Paths where test doubles / documenting the ban are allowed. */
function isExemptPath(filePath) {
  if (!filePath) {
    return false;
  }
  const p = filePath.replace(/\\/g, "/").toLowerCase();
  if (
    p.includes("/.cursor/hooks/no-shim-stub-tech-debt") ||
    p.includes("/.cursor/rules/no-shim-stub-tech-debt")
  ) {
    return true;
  }
  if (
    /\.(test|spec|interaction\.test)\.[cm]?[jt]sx?$/.test(p) ||
    p.includes("/__mocks__/") ||
    p.includes("/testing/") ||
    p.includes("/e2e/")
  ) {
    return true;
  }
  return false;
}

/**
 * Suspicious filename for new shim/stub surfaces.
 * @param {string} filePath
 */
function isForbiddenFileName(filePath) {
  if (!filePath) {
    return false;
  }
  const base = path.basename(filePath).toLowerCase();
  return (
    /(^|[._-])(shim|stub|placeholder|noop|dummy)([._-]|$)/.test(base) ||
    base.includes(".shim.") ||
    base.includes(".stub.") ||
    base.includes("-shim.") ||
    base.includes("-stub.")
  );
}

/**
 * Content patterns that signal incomplete / deferred work.
 * Intentionally strict — agents must ship real code or stop.
 * @param {string} text
 */
function findForbiddenContent(text) {
  if (!text || typeof text !== "string") {
    return null;
  }

  const patterns = [
    {
      re: /\bnotImplemented\b|\bNotImplementedError\b/i,
      why: "notImplemented / NotImplementedError",
    },
    {
      re: /throw\s+new\s+Error\s*\(\s*['"`][^'"`]*(TODO|FIXME|not\s*implemented|stub|shim)/i,
      why: "throw Error used as stub/TODO",
    },
    {
      re: /\/\/\s*(stub|shim)\b|\/\*\s*(stub|shim)\b/i,
      why: "stub/shim comment marker",
    },
    {
      re: /\btech\s*debt\b|\bacceptable\s+debt\b/i,
      why: "tech debt allowance language",
    },
    {
      re: /\b(temporary\s+workaround|workaround\s+for\s+now|fix\s+later|ship\s+later|implement\s+later)\b/i,
      why: "deferred-work / workaround language",
    },
    {
      re: /\b(leave\s+a\s+stub|stub\s+for\s+now|shim\s+for\s+(now|convenience)|placeholder\s+implementation)\b/i,
      why: "explicit stub/shim/placeholder plan",
    },
    {
      re: /\bTODO:\s*implement\b|\bFIXME:\s*(implement|stub|shim)\b/i,
      why: "TODO/FIXME standing in for real work",
    },
    {
      re: /\b(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{\s*\})/m,
      why: "empty default export function body",
    },
  ];

  for (const { re, why } of patterns) {
    if (re.test(text)) {
      return why;
    }
  }
  return null;
}

function extractPathAndText(toolName, toolInput) {
  if (!toolInput || typeof toolInput !== "object") {
    return { filePath: "", text: "" };
  }

  if (toolName === "Write") {
    return {
      filePath: String(toolInput.path || toolInput.file_path || ""),
      text: String(toolInput.contents ?? toolInput.content ?? ""),
    };
  }

  if (toolName === "StrReplace") {
    return {
      filePath: String(toolInput.path || toolInput.file_path || ""),
      text: String(toolInput.new_string ?? toolInput.new_str ?? ""),
    };
  }

  if (toolName === "EditNotebook") {
    return {
      filePath: String(toolInput.target_notebook || toolInput.path || ""),
      text: String(toolInput.new_string ?? ""),
    };
  }

  if (toolName === "TabWrite") {
    return {
      filePath: String(toolInput.path || toolInput.file_path || ""),
      text: String(toolInput.contents ?? toolInput.content ?? toolInput.new_string ?? ""),
    };
  }

  return { filePath: "", text: "" };
}

const payload = readPayload();
const toolName = String(payload.tool_name || "");
const toolInput = payload.tool_input || {};

if (!WRITE_TOOLS.has(toolName)) {
  respond({ permission: "allow" });
  process.exit(0);
}

const { filePath, text } = extractPathAndText(toolName, toolInput);

if (isExemptPath(filePath)) {
  respond({ permission: "allow" });
  process.exit(0);
}

if (isForbiddenFileName(filePath)) {
  respond({
    permission: "deny",
    user_message:
      "Blocked: shim/stub/placeholder filenames are not allowed. Ship a real module or get an explicit exception this turn.",
    agent_message:
      "DENIED by no-shim-stub-tech-debt hook: forbidden filename. Do not create shim/stub/placeholder/noop/dummy files. Implement the real surface or stop and ask the user for an explicit written exception in this turn. Do not bypass by renaming.",
  });
  process.exit(0);
}

const reason = findForbiddenContent(text);
if (reason) {
  respond({
    permission: "deny",
    user_message: `Blocked: ${reason}. No shims, stubs, or tech-debt allowances.`,
    agent_message: `DENIED by no-shim-stub-tech-debt hook (${reason}). Shims, stubs, placeholders, and tech-debt carve-outs are NOT ALLOWED. Remove the incomplete pattern and ship the real implementation, or stop and ask the user for an explicit written exception in this turn. Do not split/encode the edit to bypass the hook.`,
  });
  process.exit(0);
}

respond({ permission: "allow" });
process.exit(0);
