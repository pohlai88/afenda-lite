/**
 * Cursor beforeShellExecution hook — focused verification lane.
 *
 * Allows package-local checks. Asks before broad root verification gates so
 * agents cannot silently rerun monorepo-wide tests after timeout/failure.
 *
 * Escape: AFENDA_ALLOW_BROAD_VERIFY=1 (operator only).
 *
 * Stdin: { command, cwd, ... }
 * Authority: .cursor/rules/focused-verification-lane.mdc
 */
import { readHookPayload } from "./hook-stdin.mjs";
import { respond } from "./hook-policy.mjs";

const ASK_BROAD_VERIFY = {
	permission: "ask",
	user_message:
		"Broad verification is gated. Use focused package/spec checks first, or approve this one broad gate explicitly.",
	agent_message:
		"ASK: broad verification command detected. Do not retry root pnpm test/check/build:check, broad turbo gates, or full @afenda/web tests after timeout/failure. Use package-local lint/typecheck/test, targeted specs, and relevant validators first. To intentionally run this broad gate, ask the user or set AFENDA_ALLOW_BROAD_VERIFY=1.",
};

/**
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
 * @param {string} command
 */
function hasBroadVerifyOverride(command) {
	const c = normalize(command);
	return (
		process.env.AFENDA_ALLOW_BROAD_VERIFY === "1" ||
		/\bAFENDA_ALLOW_BROAD_VERIFY\s*=\s*["']?1["']?\b/i.test(c) ||
		/\$env:AFENDA_ALLOW_BROAD_VERIFY\s*=\s*["']1["']/i.test(c)
	);
}

/**
 * @param {string} command
 */
function hasFocusedSelector(command) {
	const c = normalize(command);
	return (
		/\b--filter\b/i.test(c) ||
		/\b--project\b/i.test(c) ||
		/\b(test|vitest)\b[\s\S]*\s--\s+\S/i.test(c)
	);
}

/**
 * @param {string} command
 */
function hasExplicitTestTarget(command) {
	const c = normalize(command);
	return /\b(test|vitest)\b[\s\S]*\s--\s+\S/i.test(c);
}

/**
 * @param {string} command
 */
function isBroadWebTest(command) {
	const c = normalize(command);
	if (!c || hasBroadVerifyOverride(c)) {
		return false;
	}

	return (
		/\bpnpm\s+--filter\s+@afenda\/web\s+test\b/i.test(c) &&
		!hasExplicitTestTarget(c)
	);
}

/**
 * @param {string} command
 */
function isBroadRootVerify(command) {
	const c = normalize(command);
	if (!c || hasBroadVerifyOverride(c)) {
		return false;
	}

	if (hasFocusedSelector(c)) {
		return false;
	}

	if (/\bpnpm\s+(test|check|build:check)\b/i.test(c)) {
		return true;
	}

	if (
		/\bpnpm\s+(?:exec\s+)?turbo\s+run\b/i.test(c) &&
		/\btest\b/i.test(c) &&
		(/\blint\b/i.test(c) || /\btypecheck\b/i.test(c) || /\bbuild\b/i.test(c))
	) {
		return true;
	}

	if (
		/\bturbo\s+run\b/i.test(c) &&
		/\btest\b/i.test(c) &&
		(/\blint\b/i.test(c) || /\btypecheck\b/i.test(c) || /\bbuild\b/i.test(c))
	) {
		return true;
	}

	return false;
}

try {
	const payload = await readHookPayload();
	const command = typeof payload.command === "string" ? payload.command : "";

	if (isBroadRootVerify(command) || isBroadWebTest(command)) {
		respond(ASK_BROAD_VERIFY);
		process.exit(0);
	}

	respond({ permission: "allow" });
	process.exit(0);
} catch (err) {
	respond({
		permission: "allow",
		agent_message: `focused-verification-lane soft-fail (allow): ${String(err)}`,
	});
	process.exit(0);
}
