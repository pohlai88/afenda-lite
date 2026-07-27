/**
 * Cursor preToolUse hook — keep @afenda/corporate-administration dependencies
 * limited to shipped source imports.
 *
 * Stdin: { tool_name, tool_input, ... }
 * @see https://cursor.com/docs/hooks
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import {
	WRITE_TOOLS,
	extractPathAndText,
	isBanSurfacePath,
	normalizePath,
	respond,
} from "./hook-policy.mjs";
import { readHookPayload } from "./hook-stdin.mjs";

const PACKAGE_JSON_PATH =
	"packages/erp/corporate-administration/package.json";
const PACKAGE_ROOT = path.resolve(
	process.cwd(),
	"packages/erp/corporate-administration",
);
const SRC_ROOT = path.join(PACKAGE_ROOT, "src");

const ALLOWED_RUNTIME_DEPENDENCIES = new Set([
	"@afenda/audit",
	"@afenda/db",
	"@afenda/errors",
	"server-only",
	"zod",
]);

const ALLOWED_DEV_DEPENDENCIES = new Set([
	"@afenda/config",
	"@afenda/testing",
	"@types/node",
	"typescript",
]);

const FORBIDDEN_DEPENDENCIES = new Set([
	"@afenda/master-data",
	"@afenda/accounting",
	"@afenda/payments",
	"@afenda/human-resources",
	"@afenda/documents",
	"@afenda/search",
	"drizzle-orm",
	"next",
	"react",
	"react-dom",
	"express",
	"fastify",
	"hono",
	"@tanstack/react-query",
	"lucide-react",
]);

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readSourceText(directory = SRC_ROOT) {
	return readdirSync(directory)
		.map((entry) => path.join(directory, entry))
		.map((target) =>
			statSync(target).isDirectory()
				? readSourceText(target)
				: target.endsWith(".ts")
					? readFileSync(target, "utf8")
					: "",
		)
		.join("\n");
}

function dependencyHasSourceImport(dependency) {
	const sourceText = readSourceText();
	const escaped = escapeRegExp(dependency);
	const pattern = new RegExp(
		`(?:from\\s+["']${escaped}(?:/[^"']*)?["']|import\\s+["']${escaped}["'])`,
	);
	return pattern.test(sourceText);
}

function dependencyPolicyViolation(packageJsonText) {
	let parsed;
	try {
		parsed = JSON.parse(packageJsonText);
	} catch {
		return "invalid package.json";
	}

	const dependencies = Object.keys(parsed.dependencies ?? {});
	const devDependencies = Object.keys(parsed.devDependencies ?? {});
	const allDependencies = [...dependencies, ...devDependencies];

	const forbidden = allDependencies.find((dependency) =>
		FORBIDDEN_DEPENDENCIES.has(dependency),
	);
	if (forbidden !== undefined) {
		return `forbidden dependency '${forbidden}'`;
	}

	const unapprovedRuntime = dependencies.find(
		(dependency) => !ALLOWED_RUNTIME_DEPENDENCIES.has(dependency),
	);
	if (unapprovedRuntime !== undefined) {
		return `unapproved runtime dependency '${unapprovedRuntime}'`;
	}

	const unapprovedDev = devDependencies.find(
		(dependency) => !ALLOWED_DEV_DEPENDENCIES.has(dependency),
	);
	if (unapprovedDev !== undefined) {
		return `unapproved dev dependency '${unapprovedDev}'`;
	}

	const unauditedRuntime = dependencies.find(
		(dependency) => !dependencyHasSourceImport(dependency),
	);
	return unauditedRuntime === undefined
		? null
		: `runtime dependency '${unauditedRuntime}' has no direct source import`;
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
	const normalizedPath = normalizePath(filePath).toLowerCase();
	if (isBanSurfacePath(filePath) || !normalizedPath.endsWith(PACKAGE_JSON_PATH)) {
		respond({ permission: "allow" });
		process.exit(0);
	}

	const violation = dependencyPolicyViolation(text);
	if (violation === null) {
		respond({ permission: "allow" });
		process.exit(0);
	}

	respond({
		permission: "deny",
		user_message:
			"Blocked: Corporate Administration dependencies must match shipped source imports.",
		agent_message: `DENIED by corporate-administration-dependency-policy hook: ${violation}. Use only direct dependencies required by shipped CA source; do not add peer ERP, UI, HTTP, queue, event-bus, storage, signature, notification, or direct drizzle dependencies.`,
	});
	process.exit(0);
} catch (err) {
	respond({
		permission: "allow",
		agent_message: `corporate-administration-dependency-policy soft-fail (allow): ${String(err)}`,
	});
	process.exit(0);
}
