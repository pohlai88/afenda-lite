/**
 * Cursor preToolUse hook — keep @afenda/corporate-administration source files
 * in its requirements-driven decomposed layout.
 *
 * Stdin: { tool_name, tool_input, ... }
 * @see https://cursor.com/docs/hooks
 */
import {
	WRITE_TOOLS,
	extractPathAndText,
	isBanSurfacePath,
	normalizePath,
	respond,
} from "./hook-policy.mjs";
import { readHookPayload } from "./hook-stdin.mjs";

const CA_SRC_PREFIX = "packages/erp/corporate-administration/src/";

const APPROVED_TOP_LEVEL_DIRECTORIES = new Set([
	"composition",
	"features",
	"kernel",
	"testing",
]);
const FORBIDDEN_LAYER_ROOTS = new Set([
	"adapters",
	"company",
	"establishments",
	"governance",
	"internal",
	"meetings",
	"officers",
	"operation-registry",
	"resolutions",
	"schemas",
	"store",
]);

/**
 * @param {string} filePath
 */
function sourcePlacementViolation(filePath) {
	const normalized = normalizePath(filePath).toLowerCase();
	const prefixIndex = normalized.indexOf(CA_SRC_PREFIX);
	if (prefixIndex === -1) {
		return null;
	}

	const relativePath = normalized.slice(prefixIndex + CA_SRC_PREFIX.length);
	if (!relativePath) {
		return null;
	}
	const segments = relativePath.split("/");
	if (segments.length === 1) {
		return relativePath === "index.ts"
			? null
			: `unapproved Corporate Administration root source file '${relativePath}'`;
	}
	if (FORBIDDEN_LAYER_ROOTS.has(segments[0])) {
		return `forbidden layer-first Corporate Administration root '${segments[0]}'`;
	}
	if (!APPROVED_TOP_LEVEL_DIRECTORIES.has(segments[0])) {
		return `unapproved Corporate Administration source root '${segments[0]}'`;
	}
	if (
		segments[0] === "features" &&
		["composition", "facade", "testing"].includes(segments[1])
	) {
		return `reserved Corporate Administration feature name '${segments[1]}'`;
	}
	return null;
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
			"Blocked: Corporate Administration source must use the requirements-driven decomposed layout.",
		agent_message: `DENIED by corporate-administration-source-placement hook: ${violation}. Put domain files and their adapters under src/features/<feature>/, shared semantics under src/kernel/, assembly under src/composition/, and non-production capabilities under src/testing/.`,
	});
	process.exit(0);
} catch (err) {
	respond({
		permission: "allow",
		agent_message: `corporate-administration-source-placement soft-fail (allow): ${String(err)}`,
	});
	process.exit(0);
}
