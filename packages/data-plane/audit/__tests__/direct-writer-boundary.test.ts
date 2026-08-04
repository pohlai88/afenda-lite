import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const directInsertPattern = /insert\s+into\s+platform_audit_log/i;
const directInsertCountPattern = /insert\s+into\s+platform_audit_log/gi;
const defaultFailedPreparationGuardPattern =
	/if \(!prepared(?:[A-Z][A-Za-z]*)?Audit\.ok\)/g;
const serializedMetadataBindingPattern =
	/(?:audit|[a-z][A-Za-z]*Audit)(?:Entry)?(?:\.|\?\.)metadataJson/g;
const literalReasonCodePattern = /reasonCode: "[A-Z][A-Z_]+"/g;
const skippedDirectories = new Set([
	".next",
	"coverage",
	"dist",
	"node_modules",
]);

const approvedLegacyWriters = new Set<string>();

const governedCteWriters = new Map([
	[
		"packages/erp/fulfillment/src/features/deliveries/deliveries.drizzle.ts",
		{
			expectedWrites: 6,
			preparationCallPattern: /afendaAudit\.transaction\.prepare\(\{/g,
		},
	],
	[
		"packages/erp/human-resources/src/features/compensation-benefits/adapters/benefit-methods-drizzle.drizzle.ts",
		{
			expectedWrites: 4,
			preparationCallPattern: /afendaAudit\.transaction\.prepare\(\{/g,
		},
	],
	[
		"packages/erp/human-resources/src/features/compensation-benefits/adapters/compensation-review-cycle-drizzle.drizzle.ts",
		{
			expectedWrites: 2,
			preparationCallPattern: /afendaAudit\.transaction\.prepare\(\{/g,
		},
	],
	[
		"packages/erp/human-resources/src/features/compensation-benefits/adapters/compensation-benefits.drizzle.ts",
		{
			expectedWrites: 26,
			expectedReasonCodes: 26,
			preparationCallPattern:
				/prepare(?:Derived)?CompensationBenefitsAudit\(\{/g,
			transactionGuardPattern:
				/audit_superseded AS \([\s\S]*FROM superseded[\s\S]*audit_successor AS \([\s\S]*FROM successor[\s\S]*audit_review_linked AS \([\s\S]*FROM review_linked/,
		},
	],
	[
		"packages/erp/human-resources/src/features/compliance/adapters/compliance.drizzle.ts",
		{
			expectedWrites: 20,
			expectedReasonCodes: 20,
			preparationCallPattern: /prepareComplianceAudit\(\{/g,
			transactionGuardPattern:
				/FROM existing e\s+INNER JOIN superseded s ON s\.id = e\.id/,
		},
	],
	[
		"packages/erp/human-resources/src/features/workforce-records/employment/adapters/core.drizzle.ts",
		{
			expectedWrites: 11,
			preparationCallPattern: /afendaAudit\.transaction\.prepare\(\{/g,
		},
	],
	[
		"packages/erp/human-resources/src/features/compensation-benefits/adapters/employee-compensation-lifecycle-drizzle.drizzle.ts",
		{
			expectedWrites: 10,
			expectedPreparations: 8,
			expectedMetadataBindings: 10,
			preparationCallPattern:
				/prepare(?:Derived)?EmployeeCompensationAudit\(\{/g,
		},
	],
	[
		"packages/erp/human-resources/src/features/employee-relations/adapters/employee-relations.drizzle.ts",
		{
			expectedWrites: 15,
			expectedReasonCodes: 15,
			preparationCallPattern: /prepareEmployeeRelationsAudit\(\{/g,
		},
	],
	[
		"packages/erp/human-resources/src/features/leave/adapters/leave-transactions.drizzle.ts",
		{
			expectedWrites: 1,
			preparationCallPattern: /afendaAudit\.transaction\.prepareDerived\(\{/g,
		},
	],
	[
		"packages/erp/human-resources/src/features/learning/adapters/learning.drizzle.ts",
		{
			expectedWrites: 18,
			expectedReasonCodes: 18,
			preparationCallPattern: /prepareLearningAudit\(\{/g,
		},
	],
	[
		"packages/erp/human-resources/src/features/employment-lifecycle/adapters/lifecycle.drizzle.ts",
		{
			expectedWrites: 22,
			expectedReasonCodes: 22,
			preparationCallPattern: /prepareLifecycleAudit\(\{/g,
		},
	],
	[
		"packages/erp/human-resources/src/features/organization/adapters/organization.drizzle.ts",
		{
			expectedWrites: 17,
			expectedPreparations: 13,
			expectedMetadataBindings: 17,
			expectedReasonCodes: 13,
			preparationCallPattern: /prepareOrganizationAudit\(\{/g,
		},
	],
	[
		"packages/erp/human-resources/src/features/performance/adapters/performance.drizzle.ts",
		{
			expectedWrites: 45,
			expectedReasonCodes: 45,
			preparationCallPattern: /prepare(?:Derived)?PerformanceAudit\(\{/g,
			transactionGuardPattern:
				/deleted_periods_audited AS \([\s\S]*FROM deleted[\s\S]*inserted_participants_audited AS \([\s\S]*FROM inserted_participants[\s\S]*inserted_assessments_audited AS \([\s\S]*FROM inserted_assessments[\s\S]*updated_assessment_audited AS \([\s\S]*FROM updated_assessment/,
		},
	],
	[
		"packages/erp/human-resources/src/features/recruitment/adapters/recruitment.drizzle.ts",
		{
			expectedWrites: 27,
			expectedPreparations: 24,
			expectedMetadataBindings: 27,
			expectedReasonCodes: 24,
			preparationCallPattern: /prepare(?:Derived)?RecruitmentAudit\(\{/g,
			transactionGuardPattern:
				/reservations_audited AS \([\s\S]*FROM released_reservations[\s\S]*interview_audited AS \([\s\S]*FROM completed_interview[\s\S]*application_audited AS \([\s\S]*FROM updated_application[\s\S]*reservation_audited AS \([\s\S]*FROM consumed_reservation/,
		},
	],
	[
		"packages/erp/human-resources/src/features/talent/adapters/talent.drizzle.ts",
		{
			expectedWrites: 39,
			expectedReasonCodes: 39,
			preparationCallPattern: /prepare(?:Derived)?TalentAudit\(\{/g,
			transactionGuardPattern:
				/superseded_audited AS \([\s\S]*FROM superseded[\s\S]*previous_assessments_audited AS \([\s\S]*FROM supersede_prev[\s\S]*profile_audited AS \([\s\S]*FROM profile_updated[\s\S]*previous_mobility_audited AS \([\s\S]*FROM supersede_prev[\s\S]*previous_readiness_audited AS \([\s\S]*FROM supersede_prev/,
		},
	],
	[
		"packages/erp/human-resources/src/features/workforce-records/identity/adapters/workforce-foundation.drizzle.ts",
		{
			expectedWrites: 12,
			expectedPreparations: 11,
			expectedMetadataBindings: 12,
			preparationCallPattern: /afendaAudit\.transaction\.prepare\(\{/g,
		},
	],
	[
		"packages/erp/human-resources/src/features/workforce-planning/adapters/workforce-planning.drizzle.ts",
		{
			expectedWrites: 10,
			preparationCallPattern: /prepareWorkforcePlanningAudit\(\{/g,
		},
	],
	[
		"packages/erp/human-resources/src/features/hire-to-employee/adapters/hire-orchestration.drizzle.ts",
		{
			expectedWrites: 1,
			preparationCallPattern: /afendaAudit\.transaction\.prepare\(\{/g,
		},
	],
	[
		"packages/erp/human-resources/src/features/leave/adapters/leave.drizzle.ts",
		{
			expectedWrites: 1,
			preparationCallPattern: /afendaAudit\.transaction\.prepare\(\{/g,
		},
	],
	[
		"packages/erp/human-resources/src/features/time/adapters/time-transactions.drizzle.ts",
		{
			expectedWrites: 1,
			preparationCallPattern: /prepareTimeAudit\(\{/g,
		},
	],
	[
		"packages/erp/human-resources/src/features/time/adapters/time.drizzle.ts",
		{
			expectedWrites: 3,
			preparationCallPattern: /prepareTimeAudit\(\{/g,
		},
	],
	[
		"packages/erp/payroll/src/features/payroll-runs/runs.drizzle.ts",
		{
			expectedWrites: 4,
			preparationCallPattern: /afendaAudit\.transaction\.prepare\(\{/g,
		},
	],
	[
		"packages/erp/payroll/src/features/payroll-setup/setup-extended.drizzle.ts",
		{
			expectedWrites: 6,
			preparationCallPattern: /afendaAudit\.transaction\.prepare\(\{/g,
			failedPreparationGuardPattern:
				/!(?:predecessorAudit|successorAudit)\.ok/g,
		},
	],
	[
		"packages/erp/payroll/src/features/reconciliation/reconciliation.drizzle.ts",
		{
			expectedWrites: 2,
			preparationCallPattern: /afendaAudit\.transaction\.prepare\(\{/g,
			failedPreparationGuardPattern: /!prepared\.ok/g,
		},
	],
	[
		"packages/erp/master-data/src/capabilities/data-governance-workflows/drizzle-change-request-store.ts",
		{
			expectedWrites: 2,
			preparationCallPattern: /afendaAudit\.transaction\.prepare\(\{/g,
		},
	],
	[
		"packages/erp/master-data/src/capabilities/core-organization-masters/organization-dimension.ts",
		{
			expectedWrites: 3,
			expectedPreparations: 4,
			expectedMetadataBindings: 4,
			preparationCallPattern: /afendaAudit\.transaction\.prepare\(\{/g,
		},
	],
	[
		"packages/erp/master-data/src/drizzle-store.ts",
		{
			expectedWrites: 23,
			expectedReasonCodes: 23,
			preparationCallPattern: /prepare(?:Derived)?CoreMasterAudit\(\{/g,
		},
	],
	[
		"packages/erp/master-data/src/capabilities/extensions/adapters/drizzle/extension-mutations.ts",
		{
			expectedWrites: 22,
			expectedReasonCodes: 22,
			preparationCallPattern: /prepare(?:Derived)?ExtensionAudit\(\{/g,
		},
	],
	[
		"packages/erp/master-data/src/capabilities/extensions/adapters/drizzle/variant-mutations.ts",
		{
			expectedWrites: 11,
			expectedPreparations: 10,
			expectedMetadataBindings: 11,
			preparationCallPattern: /prepare(?:Derived)?VariantAudit\(\{/g,
		},
	],
	[
		"packages/erp/inventory/src/features/movements/movements.drizzle.ts",
		{
			expectedWrites: 7,
			preparationCallPattern: /afendaAudit\.transaction\.prepare\(\{/g,
		},
	],
	[
		"packages/erp/purchasing/src/features/orders/orders.drizzle.ts",
		{
			expectedWrites: 5,
			preparationCallPattern: /afendaAudit\.transaction\.prepare\(\{/g,
		},
	],
	[
		"packages/erp/receiving/src/features/receipts/receipts.drizzle.ts",
		{
			expectedWrites: 7,
			preparationCallPattern: /afendaAudit\.transaction\.prepare\(\{/g,
		},
	],
]);

const governedGeneratedWriterCallsites = new Map([
	[
		"packages/erp/human-resources/src/features/leave/adapters/leave-sql-builders.drizzle.ts",
		{
			expectedCalls: 15,
			generatorCallPattern: /buildAuditCte\(\{/g,
			reasonCodePattern: /reasonCode: "LEAVE_[A-Z_]+"/g,
		},
	],
]);

function findDirectWriters(directory: string): string[] {
	const writers: string[] = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (!skippedDirectories.has(entry.name)) {
				writers.push(...findDirectWriters(`${directory}/${entry.name}`));
			}
			continue;
		}

		if (!(entry.isFile() && /\.tsx?$/.test(entry.name))) {
			continue;
		}

		const absolutePath = `${directory}/${entry.name}`;
		const relativePath = absolutePath
			.slice(repositoryRoot.length)
			.replaceAll("\\", "/");
		if (
			relativePath.includes("/__tests__/") ||
			relativePath.startsWith("packages/data-plane/audit/")
		) {
			continue;
		}

		if (directInsertPattern.test(readFileSync(absolutePath, "utf8"))) {
			writers.push(relativePath);
		}
	}
	return writers;
}

describe("@afenda/audit direct-writer boundary", () => {
	it("rejects new ungoverned direct platform_audit_log writers", () => {
		const actualWriters = [
			...findDirectWriters(`${repositoryRoot}apps`),
			...findDirectWriters(`${repositoryRoot}packages`),
		].toSorted();
		const actualLegacyWriters = actualWriters.filter(
			(writer) => !governedCteWriters.has(writer),
		);

		expect(actualLegacyWriters).toEqual([...approvedLegacyWriters].toSorted());
		expect(
			actualWriters.filter((writer) => governedCteWriters.has(writer)),
		).toEqual([...governedCteWriters.keys()].toSorted());
	});

	it("requires every governed CTE writer to prepare each insert through the kernel", () => {
		for (const [relativePath, contract] of governedCteWriters) {
			const source = readFileSync(`${repositoryRoot}${relativePath}`, "utf8");
			const expectedPreparations =
				"expectedPreparations" in contract
					? contract.expectedPreparations
					: contract.expectedWrites;
			const expectedMetadataBindings =
				"expectedMetadataBindings" in contract
					? contract.expectedMetadataBindings
					: contract.expectedWrites;
			expect(source.match(directInsertCountPattern)).toHaveLength(
				contract.expectedWrites,
			);
			expect(source.match(contract.preparationCallPattern)).toHaveLength(
				expectedPreparations,
			);
			const preparationGuardPattern =
				"failedPreparationGuardPattern" in contract
					? contract.failedPreparationGuardPattern
					: defaultFailedPreparationGuardPattern;
			expect(
				source.match(preparationGuardPattern) ?? [],
				relativePath,
			).toHaveLength(expectedPreparations);
			expect(source.match(serializedMetadataBindingPattern)).toHaveLength(
				expectedMetadataBindings,
			);
			if ("expectedReasonCodes" in contract) {
				expect(source.match(literalReasonCodePattern)).toHaveLength(
					contract.expectedReasonCodes,
				);
			}
			if ("transactionGuardPattern" in contract) {
				expect(source).toMatch(contract.transactionGuardPattern);
			}
			expect(source).toMatch(
				/(?:afendaAudit\.transaction\.(?:prepare|prepareDerived)|prepare[A-Za-z]+Audit)/,
			);
		}
	});

	it("governs generated SQL audit callsites by actual fan-out", () => {
		for (const [relativePath, contract] of governedGeneratedWriterCallsites) {
			const source = readFileSync(`${repositoryRoot}${relativePath}`, "utf8");
			expect(source.match(contract.generatorCallPattern)).toHaveLength(
				contract.expectedCalls,
			);
			expect(source.match(contract.reasonCodePattern)).toHaveLength(
				contract.expectedCalls,
			);
		}
	});
});
