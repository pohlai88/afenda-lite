/**
 * Cursor preToolUse hook — keep @afenda/corporate-administration source files
 * in the greenfield decomposed layout.
 *
 * Stdin: { tool_name, tool_input, ... }
 * @see https://cursor.com/docs/hooks
 */
import path from "node:path";

import {
	WRITE_TOOLS,
	extractPathAndText,
	isBanSurfacePath,
	normalizePath,
	respond,
} from "./hook-policy.mjs";
import { readHookPayload } from "./hook-stdin.mjs";

const CA_SRC_PREFIX = "packages/erp/corporate-administration/src/";

const CA_04_FORBIDDEN_BUSINESS_PATTERNS = [
	/(?:^|\/)packages\/erp\/corporate-administration\/src\/company(?:\/|$)/,
	/(?:^|\/)packages\/erp\/corporate-administration\/src\/adapters\/drizzle\/company\.ts$/,
	/(?:^|\/)packages\/erp\/corporate-administration\/__tests__\/helpers\/legal-company-store\.ts$/,
	/(?:^|\/)apps\/web\/app\/actions\/.*legal-company.*\.ts$/,
	/(?:^|\/)apps\/web\/app\/.*corporate-administration.*$/,
	/(?:^|\/)apps\/web\/features\/corporate-administration(?:\/|$)/,
	/(?:^|\/)apps\/web\/lib\/erp\/corporate-administration-command-options\.ts$/,
	/(?:^|\/)apps\/web\/lib\/erp\/corporate-administration-authorization-port\.ts$/,
];

const APPROVED_ROOT_FILES = new Set([
	"authorization.ts",
	"command-identity.ts",
	"command-options.ts",
	"domain-events.ts",
	"error-codes.ts",
	"event-types.ts",
	"idempotency.ts",
	"index.ts",
	"module-ids.ts",
	"module.manifest.ts",
	"mutation-tables.ts",
	"parse-input.ts",
	"permissions.ts",
	"ports.ts",
	"production-ports.ts",
]);

const FORBIDDEN_ROOT_PATTERNS = [
	/^legal-company\.ts$/,
	/^drizzle-.*\.ts$/,
	/^memory-.*\.ts$/,
	/^.*-store\.ts$/,
	/^(common|utils?|repository|repositories)\.ts$/,
];

/**
 * @param {string} filePath
 */
function sourcePlacementViolation(filePath) {
	const normalized = normalizePath(filePath).toLowerCase();
	const ca04BusinessPath = CA_04_FORBIDDEN_BUSINESS_PATTERNS.find((pattern) =>
		pattern.test(normalized),
	);
	if (ca04BusinessPath !== undefined) {
		return `CA-0.4 business-surface path '${normalized}'`;
	}

	const prefixIndex = normalized.indexOf(CA_SRC_PREFIX);
	if (prefixIndex === -1) {
		return null;
	}

	const relativePath = normalized.slice(prefixIndex + CA_SRC_PREFIX.length);
	if (!relativePath || relativePath.includes("/")) {
		return null;
	}

	const baseName = path.posix.basename(relativePath);
	if (APPROVED_ROOT_FILES.has(baseName)) {
		return null;
	}

	const isForbiddenRoot = FORBIDDEN_ROOT_PATTERNS.some((pattern) =>
		pattern.test(baseName),
	);

	return isForbiddenRoot
		? `root Corporate Administration implementation file '${baseName}'`
		: `unapproved Corporate Administration root source file '${baseName}'`;
}

/**
 * @param {string} filePath
 * @param {string} text
 */
function schemaOwnershipViolation(filePath, text) {
	const normalized = normalizePath(filePath).toLowerCase();
	if (
		!/(?:^|\/)packages\/erp\/corporate-administration\/src\//.test(
			normalized,
		)
	) {
		return null;
	}

	return /(?:drizzle-orm\/pg-core|pgTable\s*\(|mysqlTable\s*\(|sqliteTable\s*\()/.test(
		text,
	)
		? `Drizzle table definition in '${normalized}'`
		: null;
}

try {
	const payload = await readHookPayload();
	const toolName = String(payload.tool_name || payload.toolName || "");
	const toolInput =
		/** @type {Record<string, unknown>} */ (
			payload.tool_input || payload.toolInput || {}
		);

	if (!WRITE_TOOLS.has(toolName)) {
		respond({ permission: "allow" });
		process.exit(0);
	}

	const { filePath, text } = extractPathAndText(toolName, toolInput);
	if (isBanSurfacePath(filePath)) {
		respond({ permission: "allow" });
		process.exit(0);
	}

	const violation =
		sourcePlacementViolation(filePath) ??
		schemaOwnershipViolation(filePath, text);
	if (violation === null) {
		respond({ permission: "allow" });
		process.exit(0);
	}

	respond({
		permission: "deny",
		user_message:
			"Blocked: Corporate Administration source must use the decomposed greenfield layout.",
		agent_message: `DENIED by corporate-administration-source-placement hook: ${violation}. Put domain files under src/<subdomain>/, Drizzle under src/adapters/drizzle/, and test-only memory helpers under __tests__/helpers/.`,
	});
	process.exit(0);
} catch (err) {
	respond({
		permission: "allow",
		agent_message: `corporate-administration-source-placement soft-fail (allow): ${String(err)}`,
	});
	process.exit(0);
}
