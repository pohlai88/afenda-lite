import { describe, expect, it } from "vitest";
import { HUMAN_RESOURCES_SUBJECT_EXPORT_SCHEMA_VERSION } from "../src/privacy";
import {
	evaluateHumanResourcesAnonymization,
	exportHumanResourcesSubjectData,
} from "../src/privacy/operations";
import { runSequential } from "../src/shared/run-sequential";
import { runDrizzleParity } from "./helpers/database-gate";
import {
	createDualTenantPrivacyRecords,
	createHumanResourcesTestOptions,
	createHumanResourcesTestPrivacyPort,
	createValidPrivacyAnonymizeInput,
	createValidPrivacyExportInput,
	PRIVACY_TEST_ORG_A,
	PRIVACY_TEST_PERSON_A,
	PRIVACY_TEST_PERSON_B,
	seedPrivacySubjectEmployee,
} from "./helpers/privacy-options";

describe("human-resources privacy adapter parity", () => {
	it("exports only records from the requested organization across adapters", async () => {
		const { store, employee } = await seedPrivacySubjectEmployee({
			organizationId: PRIVACY_TEST_ORG_A,
			personId: PRIVACY_TEST_PERSON_A,
		});
		await seedPrivacySubjectEmployee({
			organizationId: "org-b",
			personId: PRIVACY_TEST_PERSON_B,
			options: { store },
		});

		const adapters = [
			createHumanResourcesTestPrivacyPort({
				records: createDualTenantPrivacyRecords(),
			}),
			createHumanResourcesTestPrivacyPort({
				records: createDualTenantPrivacyRecords().map((record) => ({
					...record,
					entity: "hr_employee_core",
				})),
			}),
		];

		await runSequential(adapters, async (privacy) => {
			const result = await exportHumanResourcesSubjectData(
				createValidPrivacyExportInput({ personId: employee.id }),
				createHumanResourcesTestOptions({ privacy, store }),
			);

			expect(result.ok).toBe(true);
			if (!result.ok) {
				throw result.error;
			}

			expect(result.data.schemaVersion).toBe(
				HUMAN_RESOURCES_SUBJECT_EXPORT_SCHEMA_VERSION,
			);
			expect(result.data.organizationId).toBe(PRIVACY_TEST_ORG_A);
			expect(JSON.stringify(result.data.records)).not.toContain(
				PRIVACY_TEST_PERSON_B,
			);
		});
	});

	it("blocks anonymization while legal hold is active across adapters", async () => {
		const adapters = [
			createHumanResourcesTestPrivacyPort({
				legalHold: {
					active: true,
					reasonCode: "employee_relations_case",
				},
			}),
			createHumanResourcesTestPrivacyPort({
				records: createDualTenantPrivacyRecords(),
				legalHold: {
					active: true,
					reasonCode: "employee_relations_case",
				},
			}),
		];

		await runSequential(adapters, async (privacy) => {
			const result = await evaluateHumanResourcesAnonymization(
				createValidPrivacyAnonymizeInput(),
				createHumanResourcesTestOptions({ privacy }),
			);

			expect(result.ok).toBe(true);
			if (!result.ok) {
				throw result.error;
			}
			expect(result.data.allowed).toBe(false);
			expect(result.data.reasonCode).toBe("employee_relations_case");
		});
	});
});

describe.runIf(runDrizzleParity)(
	"human-resources privacy drizzle inventory gate",
	() => {
		it("requires explicit database parity mode", () => {
			expect(runDrizzleParity).toBe(true);
		});
	},
);
