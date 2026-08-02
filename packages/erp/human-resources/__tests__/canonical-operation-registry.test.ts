import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
	HUMAN_RESOURCES_COMMAND_IDS,
	HUMAN_RESOURCES_QUERY_IDS,
} from "../src/module-ids";
import { resolveHrOperationArea } from "../src/observability/operation-observability";
import { HR_OBSERVABILITY_AREAS } from "../src/observability/types";
import {
	getHumanResourcesOperationDefinition,
	HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS,
} from "../src/operation-registry/registry";
import { HUMAN_RESOURCES_CAPABILITY_IDS } from "../src/operation-registry/types";
import {
	HUMAN_RESOURCES_SENSITIVE_OPERATION_IDS,
	humanResourcesSensitiveOperationPolicy,
} from "../src/sensitive-operation-policies";

const source = (relativePath: string) =>
	readFileSync(path.resolve(import.meta.dirname, `../${relativePath}`), "utf8");

function typescriptSources(directory: string): readonly string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			return typescriptSources(entryPath);
		}
		return entry.isFile() && entry.name.endsWith(".ts") ? [entryPath] : [];
	});
}

describe("Canonical Human Resources operation registry", () => {
	it("is the exhaustive semantic owner of every command and query ID", () => {
		const inventory = [
			...HUMAN_RESOURCES_COMMAND_IDS,
			...HUMAN_RESOURCES_QUERY_IDS,
		];
		const registeredIds = HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.map(
			({ id }) => id,
		);
		expect(registeredIds).toHaveLength(inventory.length);
		expect(new Set(registeredIds).size).toBe(registeredIds.length);
		expect(new Set(registeredIds)).toEqual(new Set(inventory));
	});

	it("binds every definition to the frozen public facade and a known owner", () => {
		const facade = source("src/public-capabilities.ts");
		const owners = new Set<string>(HUMAN_RESOURCES_CAPABILITY_IDS);
		const registeredPublicNames = new Set(
			HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.map(
				({ publicName }) => publicName,
			),
		);
		const facadePublicNames = new Set(
			[...facade.matchAll(/export const ([A-Za-z0-9_$]+)\s*=/g)].map(
				([, publicName]) => publicName,
			),
		);
		expect(facadePublicNames).toEqual(registeredPublicNames);
		for (const definition of HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS) {
			expect(owners).toContain(definition.owner);
			expect(facade).toMatch(
				new RegExp(`export const ${definition.publicName}\\s*=`),
			);
		}
	});

	it("forbids module-ids from becoming a second literal registry", () => {
		expect(source("src/module-ids.ts")).not.toMatch(
			/["']human-resources\.[a-z0-9.-]+["']/,
		);
	});

	it("derives exhaustive observability classification from operation definitions", () => {
		const areas = new Set<string>(HR_OBSERVABILITY_AREAS);
		for (const definition of HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS) {
			expect(areas).toContain(definition.observabilityArea);
			expect(resolveHrOperationArea(definition.id)).toBe(
				definition.observabilityArea,
			);
		}
	});

	it("preserves explicit classification for cross-capability operation names", () => {
		const exceptionalAreas = {
			"human-resources.session.create": "time",
			"human-resources.session.start": "time",
			"human-resources.session.complete": "time",
			"human-resources.session.cancel": "time",
			"human-resources.session.assign-instructor": "time",
			"human-resources.session.get": "time",
			"human-resources.session.list": "time",
			"human-resources.clearance.get-by-offboarding-case": "compliance",
			"human-resources.approved-payroll-handoff.get": "payroll_delivery",
			"human-resources.offboarding-payroll-handoff.get-by-case":
				"payroll_delivery",
		} as const;

		for (const [operationId, area] of Object.entries(exceptionalAreas)) {
			expect(resolveHrOperationArea(operationId)).toBe(area);
		}
	});

	it("fails closed for an unregistered operation", () => {
		expect(() =>
			getHumanResourcesOperationDefinition("human-resources.not-registered"),
		).toThrow("Unknown Human Resources operation");
	});

	it("forbids observability from reinterpreting operation subjects", () => {
		const observability = source(
			"src/observability/operation-observability.ts",
		);
		expect(observability).not.toMatch(/_SUBJECTS\b|operationSubject\b/);
		expect(observability).not.toMatch(/operationId\.split\(/);
	});

	it("forbids emission metadata from interpreting command identifiers", () => {
		expect(
			existsSync(
				path.resolve(
					import.meta.dirname,
					"../src/emissions/infer-emission-metadata.ts",
				),
			),
		).toBe(false);
		const timeEmissions = source("src/emissions/domains/time.ts");
		expect(timeEmissions).not.toMatch(
			/inferEmissionMetadata|commandId\.(?:includes|startsWith|split)/,
		);
		expect(timeEmissions.match(/timeEmissionMetadata\("/g)).toHaveLength(59);
	});

	it("forbids authorization policy resolution from interpreting ID prefixes", () => {
		const resolver = source("src/shared/authorization-policy-registry.ts");
		expect(resolver).not.toMatch(/operationPrefixes|\.startsWith\(/);
		expect(resolver).toContain(
			"HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITION_RECORD",
		);
	});

	it("forbids distributed operation-ID interpretation across package source", () => {
		const sourceRoot = path.resolve(import.meta.dirname, "../src");
		for (const filePath of typescriptSources(sourceRoot)) {
			const content = readFileSync(filePath, "utf8");
			expect(content, filePath).not.toMatch(
				/(?:operationId|command|query)\.(?:startsWith|includes|split)\(/,
			);
			expect(content, filePath).not.toMatch(
				/\.(?:startsWith|includes)\(["']human-resources\./,
			);
		}
	});

	it("derives the complete sensitivity projection from operation definitions", () => {
		const sensitiveDefinitions =
			HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.filter(
				(definition) => definition.sensitivity !== null,
			);
		expect(sensitiveDefinitions).toHaveLength(278);
		expect(new Set(HUMAN_RESOURCES_SENSITIVE_OPERATION_IDS)).toEqual(
			new Set(sensitiveDefinitions.map(({ id }) => id)),
		);
		for (const definition of HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS) {
			expect(humanResourcesSensitiveOperationPolicy(definition.id)).toBe(
				definition.sensitivity,
			);
		}
	});

	it("forbids sensitivity policy from interpreting operation-name prefixes", () => {
		const sensitivity = source("src/sensitive-operation-policies.ts");
		expect(sensitivity).not.toMatch(/operationPrefixes|\.startsWith\(/);
		expect(source("src/index.ts")).not.toContain(
			"HUMAN_RESOURCES_SENSITIVE_OPERATION_POLICY_RULES",
		);
	});
});
