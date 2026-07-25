import { describe, expect, it } from "vitest";

import {
	HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
} from "../src/error-codes";
import { HUMAN_RESOURCES_SUBJECT_EXPORT_SCHEMA_VERSION } from "../src/privacy";
import {
	anonymizeHumanResourcesSubject,
	evaluateHumanResourcesAnonymization,
	evaluateHumanResourcesRetention,
	exportHumanResourcesSubjectData,
	getHumanResourcesPrivacyCase,
	placeHumanResourcesLegalHold,
} from "../src/privacy/operations";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import {
	createDualTenantPrivacyRecords,
	createHumanResourcesTestOptions,
	createHumanResourcesTestPrivacyPort,
	createValidPrivacyAnonymizeInput,
	createValidPrivacyExportInput,
	DEFAULT_PRIVACY_CLASSIFICATIONS,
	PRIVACY_TEST_ORG_A,
	PRIVACY_TEST_ORG_B,
	PRIVACY_TEST_PERSON_A,
	PRIVACY_TEST_PERSON_B,
	seedPrivacySubjectEmployee,
} from "./helpers/privacy-options";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

describe("human-resources privacy operations", () => {
	const validExportInput = createValidPrivacyExportInput();

	it("fails closed when privacy is not composed", async () => {
		const result = await exportHumanResourcesSubjectData(
			validExportInput,
			createHumanResourcesTestOptions({ privacy: undefined }),
		);

		expect(result.ok).toBe(false);
		expect(humanResourcesCodeFromResult(result)).toBe(
			HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
		);
	});

	it("denies export when privacy.export permission is missing", async () => {
		const result = await exportHumanResourcesSubjectData(validExportInput, {
			...createHumanResourcesTestOptions({
				privacy: createHumanResourcesTestPrivacyPort(),
			}),
			authorization: createGrantingHumanResourcesAuthorization([]),
		});

		expect(result.ok).toBe(false);
		expect(humanResourcesCodeFromResult(result)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);
	});

	it("exports a subject bundle with collector depth", async () => {
		const { store, employee, person } = await seedPrivacySubjectEmployee({
			organizationId: PRIVACY_TEST_ORG_A,
			personId: PRIVACY_TEST_PERSON_A,
		});
		const privacy = createHumanResourcesTestPrivacyPort();

		const result = await exportHumanResourcesSubjectData(
			createValidPrivacyExportInput({ personId: employee.id }),
			{
				...createHumanResourcesTestOptions({ privacy, store }),
			},
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw result.error;
		}

		expect(result.data.schemaVersion).toBe(
			HUMAN_RESOURCES_SUBJECT_EXPORT_SCHEMA_VERSION,
		);
		expect(result.data.organizationId).toBe(PRIVACY_TEST_ORG_A);
		expect(
			result.data.records.some((record) => record.entityType === "hr_employee"),
		).toBe(true);
		expect(
			result.data.records.some((record) => record.entityType === "hr_person"),
		).toBe(true);
		expect(result.data.subject.personId).toBe(person.id);
		expect(result.data.subject.personId).not.toBe(employee.id);
		expect(result.data.exportReference).toContain("test://");
		expect(result.data.recordCount).toBe(result.data.records.length);
	});

	it("exports only records from the requested organization", async () => {
		const { store, employee } = await seedPrivacySubjectEmployee({
			organizationId: PRIVACY_TEST_ORG_A,
			personId: PRIVACY_TEST_PERSON_A,
		});
		await seedPrivacySubjectEmployee({
			organizationId: PRIVACY_TEST_ORG_B,
			personId: PRIVACY_TEST_PERSON_B,
			options: { store },
		});
		const privacy = createHumanResourcesTestPrivacyPort({
			records: createDualTenantPrivacyRecords(),
		});

		const result = await exportHumanResourcesSubjectData(
			createValidPrivacyExportInput({ personId: employee.id }),
			{
				...createHumanResourcesTestOptions({ privacy, store }),
			},
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw result.error;
		}

		expect(
			result.data.records.every(
				(record) => !JSON.stringify(record).includes(PRIVACY_TEST_PERSON_B),
			),
		).toBe(true);
		expect(result.data.organizationId).toBe(PRIVACY_TEST_ORG_A);
	});

	it("returns privacy case summary through the privacy port", async () => {
		const { store, employee } = await seedPrivacySubjectEmployee({
			organizationId: PRIVACY_TEST_ORG_A,
			personId: PRIVACY_TEST_PERSON_A,
		});
		const privacy = createHumanResourcesTestPrivacyPort({
			legalHold: {
				active: true,
				reasonCode: "employee_relations_case",
			},
		});

		const result = await getHumanResourcesPrivacyCase(
			createValidPrivacyExportInput({ personId: employee.id }),
			{
				...createHumanResourcesTestOptions({ privacy, store }),
			},
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw result.error;
		}

		expect(result.data.subjectEmployeeId).toBe(employee.id);
		expect(result.data.activeLegalHolds.length).toBeGreaterThan(0);
	});

	it("blocks anonymization while legal hold is active", async () => {
		const privacy = createHumanResourcesTestPrivacyPort({
			legalHold: {
				active: true,
				reasonCode: "employee_relations_case",
			},
		});

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

	it("returns retention policies for a subject", async () => {
		const result = await evaluateHumanResourcesRetention(
			createValidPrivacyExportInput(),
			createHumanResourcesTestOptions(),
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw result.error;
		}

		expect(result.data.policies.length).toBeGreaterThan(0);
	});

	it("places a legal hold through the privacy port", async () => {
		const result = await placeHumanResourcesLegalHold(
			{
				...createValidPrivacyExportInput(),
				holdReference: "case-42",
				classifications: DEFAULT_PRIVACY_CLASSIFICATIONS,
			},
			createHumanResourcesTestOptions({
				privacy: createHumanResourcesTestPrivacyPort(),
			}),
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw result.error;
		}

		expect(result.data.legalHoldId).toBe("test-hold");
	});

	it("anonymizes subject records when legal hold is inactive", async () => {
		const privacy = createHumanResourcesTestPrivacyPort({
			records: createDualTenantPrivacyRecords(),
		});

		const result = await anonymizeHumanResourcesSubject(
			{
				...createValidPrivacyAnonymizeInput(),
				classifications: DEFAULT_PRIVACY_CLASSIFICATIONS,
			},
			createHumanResourcesTestOptions({ privacy }),
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw result.error;
		}

		expect(result.data.anonymizedRecordCount).toBe(1);
	});
});
