import { describe, expect, it } from "vitest";

import {
	createGeneratorLocalRepoGovernanceReport,
	GENERATOR_LOCAL_REPO_GOVERNANCE_SCHEMA,
} from "../engine/local-repo-governance.ts";

const commandNames = (
	report: ReturnType<typeof createGeneratorLocalRepoGovernanceReport>,
) => report.commandCatalog.map((command) => command.name);

describe("generator local repo governance", () => {
	it("declares G15-G17 as local-only with no CI requirement", () => {
		const report = createGeneratorLocalRepoGovernanceReport();

		expect(report.schema).toBe(GENERATOR_LOCAL_REPO_GOVERNANCE_SCHEMA);
		expect(report.localOnly).toEqual({
			ciRequired: false,
			excludedCiPaths: [
				".github/workflows/ci.yml",
				".github/workflows/deploy.yml",
			],
		});
		expect(report.slices).toEqual([
			expect.objectContaining({
				id: "G15",
				localOnly: true,
				ciRequired: false,
			}),
			expect.objectContaining({
				id: "G16",
				localOnly: true,
				ciRequired: false,
			}),
			expect.objectContaining({
				id: "G17",
				localOnly: true,
				ciRequired: false,
			}),
		]);
	});

	it("derives the local command catalog from generator registrations", () => {
		const report = createGeneratorLocalRepoGovernanceReport();

		expect(commandNames(report)).toEqual([
			"erp-generator",
			"erp-generator-add-feature",
			"erp-generator-create-package",
			"erp-generator-plan-upgrade",
			"erp-generator-plan-upgrade-json",
			"erp-generator-reconcile-projection-locks",
			"kernel-generator",
			"kernel-generator-apply-adoption",
			"kernel-generator-plan-upgrade",
			"kernel-generator-plan-upgrade-json",
		]);
		expect(
			report.commandCatalog
				.filter((command) => command.writes)
				.map((command) => command.name),
		).toEqual([
			"erp-generator-add-feature",
			"erp-generator-create-package",
			"erp-generator-reconcile-projection-locks",
			"kernel-generator-apply-adoption",
		]);
	});

	it("declares the generator roadmap stop boundary", () => {
		const report = createGeneratorLocalRepoGovernanceReport();

		expect(report.stopBoundary).toEqual({
			nextGeneratorSlice: null,
			remainingSlices: [],
			reopeningRequiresNewContract: true,
		});
	});
});
