import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
	HUMAN_RESOURCES_COMPLIANCE_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_COMPLIANCE_COMMANDS,
	HUMAN_RESOURCES_COMPLIANCE_QUERIES,
	HUMAN_RESOURCES_COMPLIANCE_QUERY_AUTHORIZATION,
} from "../src/compliance/operation-registry";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/emissions/registry";
import { humanResourcesModuleManifest } from "../src/module.manifest";
import {
	HUMAN_RESOURCES_COMPLIANCE_COMMAND_IDS,
	HUMAN_RESOURCES_COMPLIANCE_QUERY_IDS,
} from "../src/module-ids";
import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "../src/operation-registry/registry";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/shared/authorization-policy-registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_COMPLIANCE_COMMANDS),
	...Object.values(HUMAN_RESOURCES_COMPLIANCE_QUERIES),
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
	"document-requirement.ts",
	"employee-document.ts",
	"work-eligibility.ts",
	"policy-acknowledgement.ts",
	"employee-compliance-summary.ts",
	"expiry-operations.ts",
].map((fileName) =>
	readFileSync(
		path.resolve(import.meta.dirname, `../src/compliance/${fileName}`),
		"utf8",
	),
);
const runnerSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/compliance/run-operation.ts"),
	"utf8",
);
const policySource = readFileSync(
	path.resolve(
		import.meta.dirname,
		"../src/shared/authorization-policies/compliance.ts",
	),
	"utf8",
);
const storeSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/compliance/store.ts"),
	"utf8",
);

describe("Compliance operation registry", () => {
	it("owns every public Compliance operation exactly once", () => {
		expect(definitions).toHaveLength(30);
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
		expect(HUMAN_RESOURCES_COMPLIANCE_COMMAND_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_COMPLIANCE_COMMANDS).map(
				(definition) => definition.id,
			),
		);
		expect(HUMAN_RESOURCES_COMPLIANCE_QUERY_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_COMPLIANCE_QUERIES).map(
				(definition) => definition.id,
			),
		);
		for (const commandId of HUMAN_RESOURCES_COMPLIANCE_COMMAND_IDS) {
			expect(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD).toHaveProperty(
				commandId,
			);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_COMPLIANCE_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(operationId, permission);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_COMPLIANCE_QUERY_AUTHORIZATION,
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

	it("owns compliance authorization and resource semantics without ID parsing", () => {
		expect(
			definitions.filter(
				(definition) =>
					definition.authorizationPolicy === "hr.compliance.admin",
			),
		).toHaveLength(13);
		expect(
			definitions.filter(
				(definition) =>
					definition.authorizationPolicy ===
						"hr.compliance.employee-document" &&
					definition.resourceKind === "employee_document",
			),
		).toHaveLength(10);
		expect(
			definitions.filter(
				(definition) =>
					definition.authorizationPolicy === "hr.compliance.work-eligibility" &&
					definition.resourceKind === "work_eligibility",
			),
		).toHaveLength(7);
		expect(runnerSource).not.toMatch(/\.startsWith\(|human-resources\./);
		expect(policySource).not.toMatch(/\.startsWith\(|human-resources\./);
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
		expect(storeSource).toMatch(
			/Pick<\s*HumanResourcesComplianceCapabilityStore,\s*TMethods\[number\]\s*>/,
		);
		expect(runnerSource).toContain(
			"HumanResourcesComplianceStoreProjection<TMethods>",
		);
		expect(runnerSource).not.toContain("HumanResourcesStore");
		expect(moduleIdsSource).not.toMatch(
			/human-resources\.(?:document-requirement|employee-document|work-eligibility|policy-acknowledgement|employee-compliance-summary|compliance)\./,
		);
	});

	it("declares only the two legitimate peer-store reads", () => {
		expect(storeSource).toContain(
			'Pick<HumanResourcesCoreStore, "getEmployeeById">',
		);
		expect(storeSource).toContain(
			'Pick<HumanResourcesLearningStore, "listExpiringCertifications">',
		);
	});
});
