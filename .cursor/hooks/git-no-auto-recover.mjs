/**
 * Cursor beforeShellExecution hook — require user approval for git recover/discard.
 *
 * Agents must not auto-recover working trees, discard changes, or rewind via git
 * without explicit approval. Returns permission: "ask" for matching commands.
 *
 * Stdin: { command, cwd, ... }
 * @see https://cursor.com/docs/hooks
 */
import { readHookPayload } from "./hook-stdin.mjs";
import { respond } from "./hook-policy.mjs";

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
 * Path-restore form: `git checkout [<rev>] -- <path>` where `--` is the
 * path separator, not a long option like `--orphan` / `--help` / `--track`.
 * @param {string} c
 */
function isCheckoutPathRestore(c) {
	// Match `--` as its own argv token (spaces around it), not `--orphan`.
	return /\bgit\s+checkout\b[\s\S]*\s--\s+\S/i.test(c);
}

/**
 * Collapse / legacy path mining via git show / cat-file / archive (rev:path).
 * Only unambiguous Collapse roots — not Target-overlapping testing/e2e/db/messages.
 * @param {string} c
 */
function isCollapsePathMining(c) {
	const bannedRevPath =
		/:(?:\.\/)?(?:app|modules|features|components-V2|components\/ui|lib)(?:\/|\b)/i;

	if (/\bgit\s+show\b/i.test(c) && bannedRevPath.test(c)) {
		return true;
	}
	if (/\bgit\s+cat-file\b/i.test(c) && bannedRevPath.test(c)) {
		return true;
	}
	if (
		/\bgit\s+archive\b/i.test(c) &&
		/(?:^|\s)(?:\.\/)?(?:app|modules|features|components-V2|components\/ui|lib)(?:\/|\s|$)/i.test(
			c,
		)
	) {
		return true;
	}
	return false;
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

	if (/\bgit\s+stash\s+(pop|apply|drop|clear)\b/i.test(c)) {
		return true;
	}

	if (isCheckoutPathRestore(c)) {
		return true;
	}
	if (/\bgit\s+checkout\s+(-f|--force)\b/i.test(c)) {
		return true;
	}

	if (/\bgit\s+switch\s+[^\n]*(-f|--force|--discard-changes)\b/i.test(c)) {
		return true;
	}

	if (
		/\bgit\s+(merge|rebase|cherry-pick|am)\s+[^\n]*--abort\b/i.test(c) ||
		/\bgit\s+rebase\s+--quit\b/i.test(c)
	) {
		return true;
	}

	if (isCollapsePathMining(c)) {
		return true;
	}

	return false;
}

try {
	const payload = await readHookPayload();
	const command = typeof payload.command === "string" ? payload.command : "";

	if (isGitRecoverCommand(command)) {
		respond({
			permission: "ask",
			user_message:
				"Git recover/discard or Collapse path mining requires your approval. Agents cannot auto-recover banned trees (or git show them as seeds) without explicit approval.",
			agent_message:
				"Blocked pending user approval: this shell command recovers, discards, rewinds git state, or dumps banned Collapse path contents (git show/cat-file/archive of app|modules|features|components-V2|components/ui|lib). Do not retry or rewrite to bypass. Explain the intent and wait for the user to approve in chat or via the hook prompt. Authority: ARCH-028 Anti-contamination lock · no-collapse-legacy-recovery.",
		});
		process.exit(0);
	}

	respond({ permission: "allow" });
	process.exit(0);
} catch (err) {
	respond({
		permission: "allow",
		agent_message: `git-no-auto-recover soft-fail (allow): ${String(err)}`,
	});
	process.exit(0);
}
