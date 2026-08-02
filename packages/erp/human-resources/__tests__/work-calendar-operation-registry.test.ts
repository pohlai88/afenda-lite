import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { humanResourcesModuleManifest } from "../src/composition/module.manifest";
import {
	HUMAN_RESOURCES_WORK_CALENDAR_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_WORK_CALENDAR_COMMAND_IDS,
	HUMAN_RESOURCES_WORK_CALENDAR_COMMANDS,
	HUMAN_RESOURCES_WORK_CALENDAR_QUERIES,
	HUMAN_RESOURCES_WORK_CALENDAR_QUERY_AUTHORIZATION,
	HUMAN_RESOURCES_WORK_CALENDAR_QUERY_IDS,
} from "../src/features/time/operation-registry";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/kernel/authorization/registry";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/kernel/emissions/registry";
import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "../src/kernel/operations/registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_WORK_CALENDAR_COMMANDS),
	...Object.values(HUMAN_RESOURCES_WORK_CALENDAR_QUERIES),
];
const publicCapabilitiesSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/facade/capabilities.ts"),
	"utf8",
);
const handlerSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/features/time/calendar.ts"),
	"utf8",
);
const runnerSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/features/time/run-operation.ts"),
	"utf8",
);
const moduleIdsSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/kernel/operations/module-ids.ts"),
	"utf8",
);

describe("work calendar operation registry", () => {
	it("owns each calendar capability exactly once", () => {
		expect(definitions).toHaveLength(17);
		expect(new Set(definitions.map((definition) => definition.id)).size).toBe(
			definitions.length,
		);

		for (const definition of definitions) {
			expect(definition.owner).toBe("time-attendance");
			expect(publicCapabilitiesSource).toMatch(
				new RegExp(`export const ${definition.publicName}\\s*=`),
			);
			expect(resolveHumanResourcesAuthorizationPolicy(definition.id).id).toBe(
				definition.authorizationPolicy,
			);
		}
	});

	it("derives ids, authorization, and emission coverage", () => {
		expect(HUMAN_RESOURCES_WORK_CALENDAR_COMMAND_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_WORK_CALENDAR_COMMANDS).map(
				(definition) => definition.id,
			),
		);
		expect(HUMAN_RESOURCES_WORK_CALENDAR_QUERY_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_WORK_CALENDAR_QUERIES).map(
				(definition) => definition.id,
			),
		);

		for (const commandId of HUMAN_RESOURCES_WORK_CALENDAR_COMMAND_IDS) {
			expect(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD).toHaveProperty(
				commandId,
			);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_WORK_CALENDAR_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(operationId, permission);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_WORK_CALENDAR_QUERY_AUTHORIZATION,
		)) {
			expect(humanResourcesModuleManifest.authorization.queries).toHaveProperty(
				operationId,
				permission,
			);
		}
	});

	it("composes without collisions and confines handlers to exact store projections", () => {
		expect(
			new Set(
				HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.map(
					(definition) => definition.id,
				),
			).size,
		).toBe(HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.length);
		expect(handlerSource.match(/storeMethods:/g)).toHaveLength(
			definitions.length,
		);
		expect(handlerSource).not.toContain("HumanResourcesStore");
		expect(handlerSource).not.toContain("runTimeCommand");
		expect(handlerSource).not.toContain("runTimeQuery");
		expect(runnerSource).not.toContain("HumanResourcesStore");
		expect(moduleIdsSource).not.toContain("human-resources.work-calendar.");
	});
});
