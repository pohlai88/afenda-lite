import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/emissions/registry";
import {
	HUMAN_RESOURCES_LEAVE_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_LEAVE_COMMANDS,
	HUMAN_RESOURCES_LEAVE_QUERIES,
	HUMAN_RESOURCES_LEAVE_QUERY_AUTHORIZATION,
} from "../src/leave/operation-registry";
import { humanResourcesModuleManifest } from "../src/module.manifest";
import {
	HUMAN_RESOURCES_LEAVE_COMMAND_IDS,
	HUMAN_RESOURCES_LEAVE_QUERY_IDS,
} from "../src/module-ids";
import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "../src/operation-registry/registry";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/shared/authorization-policy-registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_LEAVE_COMMANDS),
	...Object.values(HUMAN_RESOURCES_LEAVE_QUERIES),
];
const publicCapabilitiesSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/public-capabilities.ts"),
	"utf8",
);
const moduleIdsSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/module-ids.ts"),
	"utf8",
);
const leaveHandlerSources = [
	"leave-policy.ts",
	"entitlement.ts",
	"leave-request.ts",
].map((fileName) =>
	readFileSync(
		path.resolve(import.meta.dirname, `../src/leave/${fileName}`),
		"utf8",
	),
);
const leaveRunnerSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/leave/run-operation.ts"),
	"utf8",
);
const drizzleLeaveSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/adapters/drizzle/leave.ts"),
	"utf8",
);

describe("Leave operation registry", () => {
	it("owns every Leave operation exactly once", () => {
		expect(definitions).toHaveLength(30);
		expect(new Set(definitions.map((definition) => definition.id)).size).toBe(
			definitions.length,
		);
		expect(
			new Set(definitions.map((definition) => definition.publicName)).size,
		).toBe(definitions.length);

		for (const definition of definitions) {
			expect(definition.owner).toBe("leave-time");
			expect(publicCapabilitiesSource).toMatch(
				new RegExp(`export const ${definition.publicName}\\s*=`),
			);
			expect(resolveHumanResourcesAuthorizationPolicy(definition.id).id).toBe(
				definition.authorizationPolicy,
			);
		}
	});

	it("derives IDs, authorization, and mutation emission coverage", () => {
		expect(HUMAN_RESOURCES_LEAVE_COMMAND_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_LEAVE_COMMANDS).map(
				(definition) => definition.id,
			),
		);
		expect(HUMAN_RESOURCES_LEAVE_QUERY_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_LEAVE_QUERIES).map(
				(definition) => definition.id,
			),
		);

		for (const commandId of HUMAN_RESOURCES_LEAVE_COMMAND_IDS) {
			expect(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD).toHaveProperty(
				commandId,
			);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_LEAVE_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(operationId, permission);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_LEAVE_QUERY_AUTHORIZATION,
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

	it("confines handlers to explicit Leave store projections", () => {
		const source = leaveHandlerSources.join("\n");
		const storeProjectionCount = leaveHandlerSources.reduce(
			(count, handlerSource) =>
				count + (handlerSource.match(/storeMethods:/g)?.length ?? 0),
			0,
		);

		expect(storeProjectionCount).toBe(definitions.length);
		expect(source).not.toContain("HumanResourcesStore");
		expect(source).not.toContain("runLeaveCommand");
		expect(source).not.toContain("runLeaveQuery");
		expect(leaveRunnerSource).toMatch(
			/Pick<\s*HumanResourcesLeaveCapabilityStore,\s*TMethods\[number\]\s*>/,
		);
		expect(leaveRunnerSource).not.toContain("HumanResourcesStore");
		expect(moduleIdsSource).not.toMatch(
			/human-resources\.(?:leave-policy|leave-entitlement|leave-balance|leave-request|approved-leave-handoff)\./,
		);
	});

	it("keeps policy updates and supersession inside atomic persistence boundaries", () => {
		expect(drizzleLeaveSource).toMatch(
			/async updateLeavePolicy[\s\S]*?WITH mutated AS[\s\S]*?eligibility_updated AS[\s\S]*?audited AS[\s\S]*?SELECT mutated\.id FROM mutated, audited/,
		);
		expect(drizzleLeaveSource).toMatch(
			/async supersedeLeavePolicy[\s\S]*?runLeaveTransaction[\s\S]*?sqlClient\.query\(transitionSql\)[\s\S]*?sqlClient\.query\(successorSql\)/,
		);
		expect(drizzleLeaveSource).not.toContain(
			"emitHumanResourcesMutationOutcome",
		);
		expect(drizzleLeaveSource).not.toContain("transitionLeavePolicyStatus");
	});
});
