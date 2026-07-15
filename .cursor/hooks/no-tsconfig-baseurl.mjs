/**
 * Cursor preToolUse hook — deny deprecated TypeScript `baseUrl` in tsconfig edits.
 *
 * TS 6.0 deprecates `compilerOptions.baseUrl` (removed as a look-up root in TS 7.0).
 * Put the prefix on each `paths` entry relative to the tsconfig file instead.
 * Do not use `ignoreDeprecations` to bury `baseUrl`.
 *
 * Stdin: { tool_name, tool_input, ... }
 * @see https://cursor.com/docs/hooks
 * @see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
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

const BASE_URL_KEY = /"baseUrl"\s*:/;

function isExemptPath(filePath) {
  if (!filePath) {
    return false;
  }
  const p = filePath.replace(/\\/g, "/").toLowerCase();
  return (
    p.includes("/.cursor/hooks/no-tsconfig-baseurl") ||
    p.includes("/.cursor/rules/no-tsconfig-baseurl") ||
    p.includes("/scripts/check-tsconfig-no-baseurl")
  );
}

function isTsconfigPath(filePath) {
  if (!filePath) {
    return false;
  }
  const base = path.basename(filePath).toLowerCase();
  return /^tsconfig.*\.json$/.test(base);
}

/**
 * @param {Record<string, unknown>} toolInput
 * @param {string} toolName
 */
function collectText(toolInput, toolName) {
  const parts = [];
  if (typeof toolInput.contents === "string") {
    parts.push(toolInput.contents);
  }
  if (typeof toolInput.new_string === "string") {
    parts.push(toolInput.new_string);
  }
  if (typeof toolInput.new_source === "string") {
    parts.push(toolInput.new_source);
  }
  if (toolName === "EditNotebook" && typeof toolInput.new_string === "string") {
    parts.push(toolInput.new_string);
  }
  return parts.join("\n");
}

/**
 * @param {Record<string, unknown>} toolInput
 */
function resolvePath(toolInput) {
  const candidates = [
    toolInput.path,
    toolInput.file_path,
    toolInput.target_notebook,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) {
      return c;
    }
  }
  return "";
}

const payload = readPayload();
const toolName = String(payload.tool_name ?? payload.toolName ?? "");
const toolInput =
  payload.tool_input && typeof payload.tool_input === "object"
    ? /** @type {Record<string, unknown>} */ (payload.tool_input)
    : {};

if (!WRITE_TOOLS.has(toolName)) {
  respond({ permission: "allow" });
  process.exit(0);
}

const filePath = resolvePath(toolInput);
if (isExemptPath(filePath) || !isTsconfigPath(filePath)) {
  respond({ permission: "allow" });
  process.exit(0);
}

const text = collectText(toolInput, toolName);
if (BASE_URL_KEY.test(text)) {
  respond({
    permission: "deny",
    user_message:
      "Blocked: compilerOptions.baseUrl is deprecated in TypeScript 6.0 and removed as a look-up root in TS 7.0. Remove baseUrl and put the prefix on each paths entry relative to the tsconfig file (e.g. \"@/testing/*\": [\"../testing/*\"]). Do not silence with ignoreDeprecations.",
  });
  process.exit(0);
}

respond({ permission: "allow" });
process.exit(0);
