import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { humanResourcesModuleManifest } from "../src/module.manifest";
import {
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_IDS,
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERY_IDS,
} from "../src/module-ids";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/shared/authorization-policy-registry";
import {
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS,
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERIES,
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERY_AUTHORIZATION,
} from "../src/workforce-foundation/operation-registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS),
	...Object.values(HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERIES),
];
const publicCapabilitiesSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/public-capabilities.ts"),
	"utf8",
);
const workforceFoundationHandlerSources = [
	"../src/workforce-foundation/person.ts",
	"../src/workforce-foundation/person-management.ts",
	"../src/workforce-foundation/worker.ts",
	"../src/core/employee.ts",
].map((relativePath) =>
	readFileSync(path.resolve(import.meta.dirname, relativePath), "utf8"),
);
const employeeProfileSource = readFileSync(
	path.resolve(
		import.meta.dirname,
		"../src/workforce-foundation/employee-management.ts",
	),
	"utf8",
);
const workforceFoundationRunnerSource = readFileSync(
	path.resolve(
		import.meta.dirname,
		"../src/workforce-foundation/run-operation.ts",
	),
	"utf8",
);

describe("workforce foundation operation registry", () => {
	it("owns every workforce foundation operation exactly once", () => {
		expect(definitions).toHaveLength(24);
		expect(new Set(definitions.map((definition) => definition.id)).size).toBe(
			definitions.length,
		);
		expect(
			new Set(definitions.map((definition) => definition.publicName)).size,
		).toBe(definitions.length);
		for (const definition of definitions) {
			expect(definition.owner).toBe("workforce-foundation");
			expect(publicCapabilitiesSource).toMatch(
				new RegExp(`export const ${definition.publicName}\\s*=`),
			);
			expect(resolveHumanResourcesAuthorizationPolicy(definition.id).id).toBe(
				definition.authorizationPolicy,
			);
		}
	});

	it("derives command and query inventories from the owner", () => {
		expect(HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS).map(
				(definition) => definition.id,
			),
		);
		expect(HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERY_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERIES).map(
				(definition) => definition.id,
			),
		);
	});

	it("derives manifest authorization without changing permissions", () => {
		expect(HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_AUTHORIZATION).toEqual(
			Object.fromEntries(
				Object.values(HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMANDS).map(
					(definition) => [definition.id, definition.permission],
				),
			),
		);
		expect(HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERY_AUTHORIZATION).toEqual(
			Object.fromEntries(
				Object.values(HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERIES).map(
					(definition) => [definition.id, definition.permission],
				),
			),
		);
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(operationId, permission);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERY_AUTHORIZATION,
		)) {
			expect(humanResourcesModuleManifest.authorization.queries).toHaveProperty(
				operationId,
				permission,
			);
		}
	});

	it("confines every handler to its declared workforce foundation store capabilities", () => {
		const handlerSource = workforceFoundationHandlerSources.join("\n");
		const declaredStoreProjectionCount =
			workforceFoundationHandlerSources.reduce(
				(count, source) =>
					count + (source.match(/storeMethods:/g)?.length ?? 0),
				0,
			);

		// The profile query has a specialized field-level authorization path and
		// declares its composite read capability directly instead of using the runner.
		expect(declaredStoreProjectionCount).toBe(definitions.length - 1);
		expect(
			HUMAN_RESOURCES_WORKFORCE_FOUNDATION_QUERIES.getEmployeeProfile
				.publicName,
		).toBe("getEmployeeProfile");
		expect(handlerSource).not.toMatch(/runCore(?:Command|Query)/);
		expect(handlerSource).not.toContain("HumanResourcesStore");
		expect(handlerSource).not.toContain("resolveCommandDeps");
		expect(workforceFoundationRunnerSource).toMatch(
			/Pick<\s*HumanResourcesWorkforceFoundationOperationStore,\s*TMethods\[number\]\s*>/,
		);
		expect(workforceFoundationRunnerSource).not.toContain(
			"HumanResourcesStore",
		);
		expect(employeeProfileSource).toContain(
			"type EmployeeProfileStore = Pick<",
		);
		expect(employeeProfileSource).not.toContain("HumanResourcesStore");
	});
});
