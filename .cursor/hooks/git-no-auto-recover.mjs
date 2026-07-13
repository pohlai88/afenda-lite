/**
 * Cursor beforeShellExecution hook — require user approval for git recover/discard.
 *
 * Agents must not auto-recover working trees, discard changes, or rewind via git
 * without explicit approval. Returns permission: "ask" for matching commands.
 *
 * Stdin: { command, cwd, ... }
 * @see https://cursor.com/docs/hooks
 */
import { readFileSync } from "node:fs";

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

/**
 * Normalize for detection: collapse whitespace, strip common wrappers.
 * @param {string} command
 */
function normalize(command) {
  return command
    .replace(/\r\n/g, "\n")
    .replace(/\\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True if the shell string contains a git recovery / discard operation.
 * @param {string} command
 */
function isGitRecoverCommand(command) {
  const c = normalize(command);
  if (!/\bgit\b/i.test(c)) {
    return false;
  }

  // Direct recovery / discard verbs
  if (/\bgit\s+restore\b/i.test(c)) {
    return true;
  }
  if (/\bgit\s+reset\b/i.test(c)) {
    return true;
  }
  if (/\bgit\s+clean\b/i.test(c)) {
    return true;
  }
  if (/\bgit\s+revert\b/i.test(c)) {
    return true;
  }

  // stash mutations that re-apply or drop recovered state
  if (/\bgit\s+stash\s+(pop|apply|drop|clear)\b/i.test(c)) {
    return true;
  }

  // discard via checkout -- / path restore
  if (/\bgit\s+checkout\s+[^\n]*--/i.test(c)) {
    return true;
  }
  if (/\bgit\s+checkout\s+(-f|--force)\b/i.test(c)) {
    return true;
  }

  // switch with discard
  if (/\bgit\s+switch\s+[^\n]*(-f|--force|--discard-changes)\b/i.test(c)) {
    return true;
  }

  // abort paths that rewind in-progress ops (recovery-shaped)
  if (
    /\bgit\s+(merge|rebase|cherry-pick|am)\s+[^\n]*--abort\b/i.test(c) ||
    /\bgit\s+rebase\s+--quit\b/i.test(c)
  ) {
    return true;
  }

  return false;
}

const payload = readPayload();
const command = typeof payload.command === "string" ? payload.command : "";

if (isGitRecoverCommand(command)) {
  respond({
    permission: "ask",
    user_message:
      "Git recover/discard requires your approval. Agents cannot auto-recover from git without explicit approval.",
    agent_message:
      "Blocked pending user approval: this shell command recovers, discards, or rewinds git state. Do not retry or rewrite to bypass. Explain the intent and wait for the user to approve in chat or via the hook prompt.",
  });
  process.exit(0);
}

respond({ permission: "allow" });
process.exit(0);
