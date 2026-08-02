import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CORPORATE_ADMINISTRATION_QUERY_IDS } from "../src/operation-registry/registry";

const sourceDirectory = fileURLToPath(new URL("../src/", import.meta.url));
const queryKernelPath = fileURLToPath(
	new URL("../src/internal/query.ts", import.meta.url),
);

describe("Corporate Administration query kernel boundary", () => {
	it("owns registry permission interpretation and terminal observations once", () => {
		const findings: string[] = [];
		for (const file of sourceFiles(sourceDirectory)) {
			if (!/(?:queries(?:\\|\/)|queries\.ts$)/.test(file)) {
				continue;
			}
			const source = readFileSync(file, "utf8");
			for (const forbidden of [
				"CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS",
				"requireCorporateAdministrationPermission",
			]) {
				if (source.includes(forbidden)) {
					findings.push(`${file.replaceAll("\\", "/")}: ${forbidden}`);
				}
			}
		}

		const kernel = readFileSync(queryKernelPath, "utf8");
		expect(kernel).toContain("operation.permission");
		expect(kernel).toContain("runtime.observability.recordOperation");
		expect(findings).toEqual([]);
	});

	it("routes every registry query facade through the private kernel", () => {
		const querySources = sourceFiles(sourceDirectory)
			.filter((file) => /(?:queries(?:\\|\/)|queries\.ts$)/.test(file))
			.map((file) => readFileSync(file, "utf8"));
		const routedOperations = querySources.flatMap((source) =>
			[...source.matchAll(/operationId: "([A-Za-z0-9]+)"/g)].map(
				(match) => match[1],
			),
		);

		expect(routedOperations).toHaveLength(37);
		expect(new Set(routedOperations).size).toBe(37);
		expect([...routedOperations].sort()).toEqual(
			[...CORPORATE_ADMINISTRATION_QUERY_IDS].sort(),
		);
	});

	it("keeps the kernel private and free of domain stores", () => {
		const kernel = readFileSync(queryKernelPath, "utf8");
		const rootFacade = readFileSync(`${sourceDirectory}/index.ts`, "utf8");
		expect(kernel).not.toContain("Store");
		expect(rootFacade).not.toContain("internal/query");
		expect(rootFacade).not.toContain("executeCorporateAdministrationQuery");
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
