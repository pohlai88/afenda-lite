import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/emissions/registry";
import {
	HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMANDS,
	HUMAN_RESOURCES_EMPLOYEE_RELATIONS_QUERIES,
	HUMAN_RESOURCES_EMPLOYEE_RELATIONS_QUERY_AUTHORIZATION,
} from "../src/employee-relations/operation-registry";
import { humanResourcesModuleManifest } from "../src/module.manifest";
import {
	HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMAND_IDS,
	HUMAN_RESOURCES_EMPLOYEE_RELATIONS_QUERY_IDS,
} from "../src/module-ids";
import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "../src/operation-registry/registry";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/shared/authorization-policy-registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMANDS),
	...Object.values(HUMAN_RESOURCES_EMPLOYEE_RELATIONS_QUERIES),
];
const publicCapabilitiesSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/public-capabilities.ts"),
	"utf8",
);
const moduleIdsSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/module-ids.ts"),
	"utf8",
);
const handlerSources = [
	"employee-case.ts",
	"case-action.ts",
	"case-event.ts",
	"case-appeal.ts",
].map((fileName) =>
	readFileSync(
		path.resolve(import.meta.dirname, `../src/employee-relations/${fileName}`),
		"utf8",
	),
);
const runnerSource = readFileSync(
	path.resolve(
		import.meta.dirname,
		"../src/employee-relations/run-operation.ts",
	),
	"utf8",
);
const storeSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/employee-relations/store.ts"),
	"utf8",
);

describe("Employee Relations operation registry", () => {
	it("owns every Employee Relations operation exactly once", () => {
		expect(definitions).toHaveLength(22);
		expect(new Set(definitions.map((definition) => definition.id)).size).toBe(
			definitions.length,
		);
		expect(
			new Set(definitions.map((definition) => definition.publicName)).size,
		).toBe(definitions.length);

		for (const definition of definitions) {
			expect(definition.owner).toBe("compliance-employee-relations");
			expect(publicCapabilitiesSource).toMatch(
				new RegExp(`export const ${definition.publicName}\\s*=`),
			);
			expect(resolveHumanResourcesAuthorizationPolicy(definition.id).id).toBe(
				definition.authorizationPolicy,
			);
		}
	});

	it("derives IDs, authorization, and mutation emission coverage", () => {
		expect(HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMAND_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMANDS).map(
				(definition) => definition.id,
			),
		);
		expect(HUMAN_RESOURCES_EMPLOYEE_RELATIONS_QUERY_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_EMPLOYEE_RELATIONS_QUERIES).map(
				(definition) => definition.id,
			),
		);

		for (const commandId of HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMAND_IDS) {
			expect(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD).toHaveProperty(
				commandId,
			);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(operationId, permission);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_EMPLOYEE_RELATIONS_QUERY_AUTHORIZATION,
		)) {
			expect(humanResourcesModuleManifest.authorization.queries).toHaveProperty(
				operationId,
				permission,
			);
		}
	});

	it("composes with all registered capabilities without collisions", () => {
		expect(
			new Set(
				HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.map(
					(definition) => definition.id,
				),
			).size,
		).toBe(HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.length);
	});

	it("confines every handler to an exact store projection", () => {
		const source = handlerSources.join("\n");
		const storeProjectionCount = handlerSources.reduce(
			(count, handlerSource) =>
				count + (handlerSource.match(/storeMethods:/g)?.length ?? 0),
			0,
		);

		expect(storeProjectionCount).toBe(definitions.length);
		expect(source).not.toContain("HumanResourcesStore");
		expect(source).not.toContain("runEmployeeRelationsCommand");
		expect(source).not.toContain("runEmployeeRelationsQuery");
		expect(storeSource).toMatch(
			/Pick<\s*HumanResourcesEmployeeRelationsCapabilityStore,\s*TMethods\[number\]\s*>/,
		);
		expect(runnerSource).toContain(
			"HumanResourcesEmployeeRelationsStoreProjection<TMethods>",
		);
		expect(runnerSource).not.toContain("HumanResourcesStore");
		expect(moduleIdsSource).not.toMatch(
			/human-resources\.(?:employee-case|employee-relations)\./,
		);
	});

	it("limits identity-aware case access to the two declared peer reads", () => {
		const caseAccessProjection = storeSource.match(
			/export type HumanResourcesEmployeeRelationsCaseAccessStore = Pick<[\s\S]*?>;/,
		)?.[0];

		expect(caseAccessProjection).toContain("getUserEmployeeMapping");
		expect(caseAccessProjection).toContain("getPrimaryManagerForEmployee");
		expect(caseAccessProjection?.match(/"get[A-Za-z]+"/g)).toHaveLength(2);
	});
});
