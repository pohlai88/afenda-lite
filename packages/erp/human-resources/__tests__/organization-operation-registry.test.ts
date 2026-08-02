import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { humanResourcesModuleManifest } from "../src/composition/module.manifest";
import {
	HUMAN_RESOURCES_ORGANIZATION_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_ORGANIZATION_COMMANDS,
	HUMAN_RESOURCES_ORGANIZATION_QUERIES,
	HUMAN_RESOURCES_ORGANIZATION_QUERY_AUTHORIZATION,
} from "../src/features/organization/operation-registry";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/kernel/authorization/registry";
import {
	HUMAN_RESOURCES_ORGANIZATION_COMMAND_IDS,
	HUMAN_RESOURCES_ORGANIZATION_QUERY_IDS,
} from "../src/kernel/operations/module-ids";
import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "../src/kernel/operations/registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_ORGANIZATION_COMMANDS),
	...Object.values(HUMAN_RESOURCES_ORGANIZATION_QUERIES),
];
const publicCapabilitiesSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/facade/capabilities.ts"),
	"utf8",
);
const organizationHandlerSources = [
	"department.ts",
	"job.ts",
	"position.ts",
	"reporting-line.ts",
].map((fileName) =>
	readFileSync(
		path.resolve(
			import.meta.dirname,
			`../src/features/organization/${fileName}`,
		),
		"utf8",
	),
);
const organizationRunnerSource = readFileSync(
	path.resolve(
		import.meta.dirname,
		"../src/features/organization/run-operation.ts",
	),
	"utf8",
);

describe("organization operation registry", () => {
	it("owns every organization operation exactly once", () => {
		expect(definitions).toHaveLength(30);
		expect(new Set(definitions.map((definition) => definition.id)).size).toBe(
			definitions.length,
		);
		expect(
			new Set(definitions.map((definition) => definition.publicName)).size,
		).toBe(definitions.length);

		for (const definition of definitions) {
			expect(definition.owner).toBe("organization");
			expect(publicCapabilitiesSource).toMatch(
				new RegExp(`export const ${definition.publicName}\\s*=`),
			);
			expect(resolveHumanResourcesAuthorizationPolicy(definition.id).id).toBe(
				definition.authorizationPolicy,
			);
		}
	});

	it("composes with registered peer capabilities without identifier collisions", () => {
		expect(
			new Set(
				HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.map(
					(definition) => definition.id,
				),
			).size,
		).toBe(HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.length);
	});

	it("derives command, query, and manifest authorization projections", () => {
		expect(HUMAN_RESOURCES_ORGANIZATION_COMMAND_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_ORGANIZATION_COMMANDS).map(
				(definition) => definition.id,
			),
		);
		expect(HUMAN_RESOURCES_ORGANIZATION_QUERY_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_ORGANIZATION_QUERIES).map(
				(definition) => definition.id,
			),
		);

		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_ORGANIZATION_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(operationId, permission);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_ORGANIZATION_QUERY_AUTHORIZATION,
		)) {
			expect(humanResourcesModuleManifest.authorization.queries).toHaveProperty(
				operationId,
				permission,
			);
		}
	});

	it("confines every handler to declared organization store capabilities", () => {
		const handlerSource = organizationHandlerSources.join("\n");
		const declaredStoreProjectionCount = organizationHandlerSources.reduce(
			(count, source) => count + (source.match(/storeMethods:/g)?.length ?? 0),
			0,
		);

		expect(declaredStoreProjectionCount).toBe(definitions.length);
		expect(handlerSource).not.toContain("HumanResourcesStore");
		expect(handlerSource).not.toContain("resolveCommandDeps");
		expect(handlerSource).not.toMatch(/shared\/organization-command/);
		expect(organizationRunnerSource).toMatch(
			/Pick<\s*HumanResourcesOrganizationStore,\s*TMethods\[number\]\s*>/,
		);
		expect(organizationRunnerSource).not.toContain("HumanResourcesStore");
		expect(
			existsSync(
				path.resolve(
					import.meta.dirname,
					"../src/shared/organization-command.ts",
				),
			),
		).toBe(false);
	});
});
