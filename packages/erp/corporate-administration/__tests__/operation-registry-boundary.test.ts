import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceDirectory = fileURLToPath(new URL("../src/", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));

const semanticOwnerSuffixes = [
	"/company/operations.ts",
	"/establishments/operations.ts",
	"/governance/operations.ts",
	"/officers/operations.ts",
	"/meetings/operations.ts",
	"/resolutions/operations.ts",
] as const;

const applicationConsumers = [
	"apps/web/app/actions/corporate-administration-governance-actions.ts",
	"apps/web/app/actions/legal-company-identity-actions.ts",
	"apps/web/app/actions/legal-company-lifecycle-actions.ts",
	"apps/web/app/actions/legal-establishment-actions.ts",
	"apps/web/app/actions/register-legal-company-draft.ts",
	"apps/web/app/actions/set-company-jurisdiction-profile.ts",
	"apps/web/app/actions/supersede-company-jurisdiction-profile.ts",
	"apps/web/app/actions/update-legal-company-profile.ts",
	"apps/web/features/corporate-administration/corporate-administration-shell.tsx",
] as const;

describe("Corporate Administration operation registry boundary", () => {
	it("forbids production consumers from re-declaring owned operation semantics", () => {
		const findings: string[] = [];
		for (const file of sourceFiles(sourceDirectory)) {
			const normalized = file.replaceAll("\\", "/");
			const source = readFileSync(file, "utf8");
			const isOperationOwner = semanticOwnerSuffixes.some((suffix) =>
				normalized.endsWith(suffix),
			);
			if (
				!(isOperationOwner || normalized.endsWith("/permissions.ts")) &&
				/['"`]corporate_administration\.[a-z_]+\.(?:read|manage)['"`]/.test(
					source,
				)
			) {
				findings.push(`${normalized}: permission literal`);
			}
			if (
				!(isOperationOwner || normalized.endsWith("/event-types.ts")) &&
				/['"`]corporate_administration\.[a-z0-9_.]+\.v\d+['"`]/.test(source)
			) {
				findings.push(`${normalized}: event literal`);
			}
			if (
				!(
					isOperationOwner ||
					normalized.endsWith(
						"/kernel/infrastructure/translate-infrastructure-error.ts",
					)
				) &&
				/['"`]corporate-administration\.[a-z0-9.-]+['"`]/.test(source)
			) {
				findings.push(`${normalized}: durable command identity literal`);
			}
		}

		for (const relativeFile of applicationConsumers) {
			const source = readFileSync(`${repositoryRoot}/${relativeFile}`, "utf8");
			if (
				/CORPORATE_ADMINISTRATION_(?:COMMAND|QUERY)_PERMISSIONS/.test(source)
			) {
				findings.push(`${relativeFile}: authorization registry storage`);
			}
			if (
				/['"`]corporate_administration\.[a-z_]+\.(?:read|manage)['"`]/.test(
					source,
				)
			) {
				findings.push(`${relativeFile}: application permission literal`);
			}
		}

		expect(findings).toEqual([]);
	});
});

function sourceFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = `${directory}/${entry.name}`;
		if (entry.isDirectory()) {
			return sourceFiles(path);
		}
		return entry.isFile() && entry.name.endsWith(".ts") ? [path] : [];
	});
}
