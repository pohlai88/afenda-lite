/**
 * The repository's one JSONC reader for governance scripts.
 *
 * `tsconfig.json` and `biome.jsonc` are JSONC in practice — comments and
 * trailing commas are legal there and the checkout uses both. TypeScript's own
 * parser owns that grammar, so governance reads these files exactly as the
 * compiler does. `JSON.parse` rejects every commented config as malformed,
 * which reads as a parse failure rather than the passing check it should be.
 */

import { readFileSync } from "node:fs";

import ts from "typescript";

/**
 * @param {string} file absolute path to a JSONC document
 * @returns {{ config?: unknown, error?: string }} parsed document, or the
 *   flattened diagnostic when the text is not valid JSONC
 */
export function readJsonc(file) {
	const parsed = ts.parseConfigFileTextToJson(file, readFileSync(file, "utf8"));
	if (parsed.error) {
		return {
			error: ts.flattenDiagnosticMessageText(parsed.error.messageText, " "),
		};
	}
	return { config: parsed.config };
}
