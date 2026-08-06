import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { humanResourcesModuleManifest } from "../src/composition/module.manifest";
import {
	HUMAN_RESOURCES_STATUTORY_PROFILE_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_STATUTORY_PROFILE_COMMANDS,
	HUMAN_RESOURCES_STATUTORY_PROFILE_QUERIES,
	HUMAN_RESOURCES_STATUTORY_PROFILE_QUERY_AUTHORIZATION,
} from "../src/features/statutory-profile/operation-registry";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/kernel/authorization/registry";
import { HUMAN_RESOURCES_MUTATION_TABLES } from "../src/kernel/emissions/mutation-tables";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/kernel/emissions/registry";
import {
	HUMAN_RESOURCES_STATUTORY_PROFILE_COMMAND_IDS,
	HUMAN_RESOURCES_STATUTORY_PROFILE_QUERY_IDS,
} from "../src/kernel/operations/module-ids";
import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "../src/kernel/operations/registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_STATUTORY_PROFILE_COMMANDS),
	...Object.values(HUMAN_RESOURCES_STATUTORY_PROFILE_QUERIES),
];
const publicCapabilitiesSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/facade/capabilities.ts"),
	"utf8",
);
const handlerSources = ["statutory-profile.ts", "prior-employer-ytd.ts"].map(
	(fileName) =>
		readFileSync(
			path.resolve(
				import.meta.dirname,
				`../src/features/statutory-profile/${fileName}`,
			),
			"utf8",
		),
);
const runnerSource = readFileSync(
	path.resolve(
		import.meta.dirname,
		"../src/features/statutory-profile/run-operation.ts",
	),
	"utf8",
);
const storeSource = readFileSync(
	path.resolve(
		import.meta.dirname,
		"../src/features/statutory-profile/store.ts",
	),
	"utf8",
);
const privacyStoreSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/features/privacy/store.ts"),
	"utf8",
);
const collectorSource = readFileSync(
	path.resolve(
		import.meta.dirname,
		"../src/features/privacy/subject-data-collector.ts",
	),
	"utf8",
);

describe("Statutory profile operation registry", () => {
	it("owns every public statutory operation exactly once", () => {
		expect(definitions).toHaveLength(5);
		expect(new Set(definitions.map((definition) => definition.id)).size).toBe(
			definitions.length,
		);
		expect(
			new Set(definitions.map((definition) => definition.publicName)).size,
		).toBe(definitions.length);

		for (const definition of definitions) {
			expect(definition.owner).toBe("statutory-profile");
			expect(definition.authorizationPolicy).toBe("hr.statutory-profile");
			expect(publicCapabilitiesSource).toMatch(
				new RegExp(`export const ${definition.publicName}\\s*=`),
			);
			expect(resolveHumanResourcesAuthorizationPolicy(definition.id).id).toBe(
				definition.authorizationPolicy,
			);
		}
	});

	it("reuses the existing sensitive-identifier permission codes", () => {
		for (const definition of Object.values(
			HUMAN_RESOURCES_STATUTORY_PROFILE_COMMANDS,
		)) {
			expect(definition.permission).toBe(
				"human-resources.sensitive-identifiers.manage",
			);
		}
		for (const definition of Object.values(
			HUMAN_RESOURCES_STATUTORY_PROFILE_QUERIES,
		)) {
			expect(definition.permission).toBe(
				"human-resources.sensitive-identifiers.read",
			);
		}
	});

	it("derives IDs, authorization, and mutation emission coverage", () => {
		expect(HUMAN_RESOURCES_STATUTORY_PROFILE_COMMAND_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_STATUTORY_PROFILE_COMMANDS).map(
				(definition) => definition.id,
			),
		);
		expect(HUMAN_RESOURCES_STATUTORY_PROFILE_QUERY_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_STATUTORY_PROFILE_QUERIES).map(
				(definition) => definition.id,
			),
		);
		for (const commandId of HUMAN_RESOURCES_STATUTORY_PROFILE_COMMAND_IDS) {
			expect(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD).toHaveProperty(
				commandId,
			);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_STATUTORY_PROFILE_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(operationId, permission);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_STATUTORY_PROFILE_QUERY_AUTHORIZATION,
		)) {
			expect(humanResourcesModuleManifest.authorization.queries).toHaveProperty(
				operationId,
				permission,
			);
		}
	});

	it("composes without operation collisions", () => {
		expect(
			new Set(
				HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.map(
					(definition) => definition.id,
				),
			).size,
		).toBe(HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.length);
	});

	it("confines every handler to an exact store projection", () => {
		const storeProjectionCount = handlerSources.reduce(
			(count, handlerSource) =>
				count + (handlerSource.match(/storeMethods:/g)?.length ?? 0),
			0,
		);
		expect(storeProjectionCount).toBe(definitions.length);
		expect(handlerSources.join("\n")).not.toContain("HumanResourcesStore");
		expect(storeSource).toContain(
			'Pick<HumanResourcesCoreStore, "getEmployeeById">',
		);
		expect(runnerSource).not.toContain("HumanResourcesStore");
	});

	it("registers both statutory tables as HR mutation tables", () => {
		expect(HUMAN_RESOURCES_MUTATION_TABLES).toContain("hr_statutory_profile");
		expect(HUMAN_RESOURCES_MUTATION_TABLES).toContain("hr_prior_employer_ytd");
	});

	it("registers both statutory tables with the privacy subject collector", () => {
		expect(privacyStoreSource).toContain('"listStatutoryProfiles"');
		expect(privacyStoreSource).toContain('"listPriorEmployerYtd"');
		expect(collectorSource).toContain('entityType: "hr_statutory_profile"');
		expect(collectorSource).toContain('entityType: "hr_prior_employer_ytd"');
	});
});
