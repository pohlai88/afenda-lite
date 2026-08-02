import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
	HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMANDS,
	HUMAN_RESOURCES_COMPENSATION_BENEFITS_QUERIES,
	HUMAN_RESOURCES_COMPENSATION_BENEFITS_QUERY_AUTHORIZATION,
} from "../src/compensation-benefits/operation-registry";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/emissions/registry";
import { humanResourcesModuleManifest } from "../src/module.manifest";
import {
	HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_IDS,
	HUMAN_RESOURCES_COMPENSATION_BENEFITS_QUERY_IDS,
} from "../src/module-ids";
import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "../src/operation-registry/registry";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/shared/authorization-policy-registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMANDS),
	...Object.values(HUMAN_RESOURCES_COMPENSATION_BENEFITS_QUERIES),
];
const packageSource = (relativePath: string) =>
	readFileSync(path.resolve(import.meta.dirname, `../${relativePath}`), "utf8");
const handlerSources = [
	"benefit-dependent.ts",
	"benefit-eligibility.ts",
	"benefit-enrollment.ts",
	"benefit-plan.ts",
	"compensation-grade-progression-rule.ts",
	"compensation-grade.ts",
	"compensation-proposal.ts",
	"compensation-review-cycle.ts",
	"compensation-review.ts",
	"employee-compensation.ts",
	"salary-band.ts",
].map((fileName) => packageSource(`src/compensation-benefits/${fileName}`));

describe("Compensation & Benefits operation registry", () => {
	it("owns each public operation exactly once", () => {
		expect(definitions).toHaveLength(54);
		expect(new Set(definitions.map(({ id }) => id)).size).toBe(54);
		expect(new Set(definitions.map(({ publicName }) => publicName)).size).toBe(
			54,
		);

		const publicFacade = packageSource("src/public-capabilities.ts");
		for (const definition of definitions) {
			expect(definition.owner).toBe("compensation-benefits");
			expect(publicFacade).toMatch(
				new RegExp(`export const ${definition.publicName}\\s*=`),
			);
			expect(resolveHumanResourcesAuthorizationPolicy(definition.id).id).toBe(
				definition.authorizationPolicy,
			);
		}
	});

	it("derives IDs, authorization, emissions, and central composition", () => {
		expect(HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMANDS).map(
				({ id }) => id,
			),
		);
		expect(HUMAN_RESOURCES_COMPENSATION_BENEFITS_QUERY_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_COMPENSATION_BENEFITS_QUERIES).map(
				({ id }) => id,
			),
		);
		for (const id of HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_IDS) {
			expect(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD).toHaveProperty(
				id,
			);
		}
		for (const [id, permission] of Object.entries(
			HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(id, permission);
		}
		for (const [id, permission] of Object.entries(
			HUMAN_RESOURCES_COMPENSATION_BENEFITS_QUERY_AUTHORIZATION,
		)) {
			expect(humanResourcesModuleManifest.authorization.queries).toHaveProperty(
				id,
				permission,
			);
		}
		const registeredIds = new Set(
			HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.map(({ id }) => id),
		);
		for (const { id } of definitions) {
			expect(registeredIds).toContain(id);
		}
	});

	it("declares exact compensation policy dispositions without ID parsing", () => {
		const allCompensationDefinitions =
			HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.filter(
				({ authorizationPolicy }) =>
					authorizationPolicy.startsWith("hr.compensation."),
			);
		expect(
			Object.fromEntries(
				[
					"hr.compensation.benefits",
					"hr.compensation.catalog",
					"hr.compensation.employee",
					"hr.compensation.payroll-handoff",
					"hr.compensation.proposal",
				].map((policyId) => [
					policyId,
					allCompensationDefinitions.filter(
						(definition) => definition.authorizationPolicy === policyId,
					).length,
				]),
			),
		).toEqual({
			"hr.compensation.benefits": 11,
			"hr.compensation.catalog": 22,
			"hr.compensation.employee": 15,
			"hr.compensation.payroll-handoff": 2,
			"hr.compensation.proposal": 5,
		});
		for (const definition of allCompensationDefinitions) {
			expect(definition.resourceKind).toBe("compensation");
		}
		const policySource = packageSource(
			"src/shared/authorization-policies/compensation.ts",
		);
		expect(policySource).not.toMatch(/\.startsWith\(|human-resources\./);
	});

	it("confines every handler to an explicit store projection", () => {
		expect(
			handlerSources.reduce(
				(count, source) =>
					count + (source.match(/storeMethods:/g)?.length ?? 0),
				0,
			),
		).toBe(54);
		expect(handlerSources.join("\n")).not.toContain("HumanResourcesStore");
		expect(packageSource("src/compensation-benefits/store.ts")).toMatch(
			/Pick<HumanResourcesCompensationBenefitsCapabilityStore, TMethods\[number\]>/,
		);
	});
});
