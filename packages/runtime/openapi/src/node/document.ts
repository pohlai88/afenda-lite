import { writeFileSync } from "node:fs";
import { stringify as stringifyYaml } from "yaml";

/**
 * Serialize an OpenAPI document to YAML with a leading comment header.
 * Deep-clones via JSON so Zod-to-OpenAPI class instances stringify cleanly.
 */
function formatOpenApiYaml(
	document: unknown,
	headerLines: readonly string[],
): string {
	const joined = headerLines.length > 0 ? headerLines.join("\n") : "";
	const header =
		joined.length > 0 && !joined.endsWith("\n") ? `${joined}\n` : joined;
	const body = stringifyYaml(JSON.parse(JSON.stringify(document)), {
		lineWidth: 100,
		aliasDuplicateObjects: false,
	});
	return `${header}${body}\n`;
}

/** Write generator YAML to disk (UTF-8). */
function writeOpenApiYaml(
	outPath: string,
	document: unknown,
	headerLines: readonly string[],
): void {
	writeFileSync(outPath, formatOpenApiYaml(document, headerLines), "utf8");
}

/** Node-only projection for deterministic YAML emission. */
export const openapiNode = Object.freeze({
	yaml: Object.freeze({
		format: formatOpenApiYaml,
		write: writeOpenApiYaml,
	}),
});
