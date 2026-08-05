import { describe, expect, it } from "vitest";
import { HUMAN_RESOURCES_SUBJECT_EXPORT_SCHEMA_VERSION } from "../src/features/privacy/contract";
import {
	anonymizeHumanResourcesSubject,
	evaluateHumanResourcesAnonymization,
	evaluateHumanResourcesRetention,
	exportHumanResourcesSubjectData,
	getHumanResourcesPrivacyCase,
	liftEmployeeDataRestriction,
	placeHumanResourcesLegalHold,
	restrictEmployeeData,
} from "../src/features/privacy/operations";
import {
	HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
} from "../src/kernel/execution/error-codes";
import {
	createMemoryHrObservabilityRecorder,
	type HrObservabilityPorts,
} from "../src/kernel/observability/index";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import {
	createDualTenantPrivacyRecords,
	createHumanResourcesTestOptions,
	createHumanResourcesTestPrivacyPort,
	createValidPrivacyAnonymizeInput,
	createValidPrivacyExportInput,
	createValidPrivacyRestrictionInput,
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

	it("emits shared command and privacy telemetry for legal-hold success", async () => {
		const recorder = createMemoryHrObservabilityRecorder();
		const observability: HrObservabilityPorts = {
			recorder,
			clock: { now: () => new Date("2026-01-01T00:00:00.000Z") },
		};

		const result = await placeHumanResourcesLegalHold(
			{
				...createValidPrivacyExportInput(),
				holdReference: "case-telemetry",
				classifications: DEFAULT_PRIVACY_CLASSIFICATIONS,
			},
			createHumanResourcesTestOptions({
				privacy: createHumanResourcesTestPrivacyPort(),
				observability,
			}),
		);

		expect(result.ok).toBe(true);
		expect(recorder.metrics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: "hr.command.total",
					labels: { area: "privacy", outcome: "success" },
				}),
				expect.objectContaining({
					name: "hr.privacy.operation.total",
					labels: { operation: "rectify", outcome: "success" },
				}),
			]),
		);
	});

	it("emits denial and privacy telemetry for a forbidden privacy query", async () => {
		const recorder = createMemoryHrObservabilityRecorder();
		const observability: HrObservabilityPorts = {
			recorder,
			clock: { now: () => new Date("2026-01-01T00:00:00.000Z") },
		};

		const result = await exportHumanResourcesSubjectData(validExportInput, {
			...createHumanResourcesTestOptions({
				privacy: createHumanResourcesTestPrivacyPort(),
				observability,
			}),
			authorization: createGrantingHumanResourcesAuthorization([]),
		});

		expect(result.ok).toBe(false);
		expect(recorder.metrics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: "hr.authorization.denial.total",
					labels: { area: "privacy", reason: "permission_missing" },
				}),
				expect.objectContaining({
					name: "hr.privacy.operation.total",
					labels: { operation: "export", outcome: "failure" },
				}),
			]),
		);
		expect(
			recorder.metrics.some((metric) => metric.name === "hr.command.total"),
		).toBe(false);
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

	it("places a data restriction through the privacy port", async () => {
		const result = await restrictEmployeeData(
			createValidPrivacyRestrictionInput(),
			createHumanResourcesTestOptions({
				privacy: createHumanResourcesTestPrivacyPort(),
			}),
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw result.error;
		}

		expect(result.data.restrictionId).toBe("test-restriction");
	});

	it("denies restriction when the legal-hold-manage permission is missing", async () => {
		const result = await restrictEmployeeData(
			createValidPrivacyRestrictionInput(),
			{
				...createHumanResourcesTestOptions({
					privacy: createHumanResourcesTestPrivacyPort(),
				}),
				authorization: createGrantingHumanResourcesAuthorization([]),
			},
		);

		expect(result.ok).toBe(false);
		expect(humanResourcesCodeFromResult(result)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);
	});

	it("excludes a restricted subject's data from export while restriction is active", async () => {
		const privacy = createHumanResourcesTestPrivacyPort({
			restriction: { active: true, reasonCode: "processing_restriction" },
		});

		const result = await exportHumanResourcesSubjectData(
			createValidPrivacyExportInput(),
			createHumanResourcesTestOptions({ privacy }),
		);

		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("Expected export to fail while restricted");
		}
		expect(result.code).toBe("CONFLICT");
	});

	it("blocks anonymization while a restriction is active", async () => {
		const privacy = createHumanResourcesTestPrivacyPort({
			restriction: { active: true, reasonCode: "processing_restriction" },
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
		expect(result.data.reasonCode).toBe("processing_restriction");
	});

	it("rejects anonymize execution while a restriction is active", async () => {
		const result = await anonymizeHumanResourcesSubject(
			{
				...createValidPrivacyAnonymizeInput(),
				classifications: DEFAULT_PRIVACY_CLASSIFICATIONS,
			},
			createHumanResourcesTestOptions({
				privacy: createHumanResourcesTestPrivacyPort({
					restriction: { active: true, reasonCode: "processing_restriction" },
				}),
			}),
		);

		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("Expected anonymize to fail while restricted");
		}
		expect(result.code).toBe("CONFLICT");
	});

	it("reflects an active restriction on the privacy case summary", async () => {
		const privacy = createHumanResourcesTestPrivacyPort({
			restriction: { active: true, reasonCode: "processing_restriction" },
		});

		const result = await getHumanResourcesPrivacyCase(
			createValidPrivacyExportInput(),
			createHumanResourcesTestOptions({ privacy }),
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw result.error;
		}

		expect(result.data.activeRestrictions.length).toBeGreaterThan(0);
	});

	it("lifts a restriction and restores export and anonymization eligibility", async () => {
		const privacy = createHumanResourcesTestPrivacyPort({
			restriction: { active: true, reasonCode: "processing_restriction" },
		});
		const options = createHumanResourcesTestOptions({ privacy });

		const blocked = await exportHumanResourcesSubjectData(
			createValidPrivacyExportInput(),
			options,
		);
		expect(blocked.ok).toBe(false);

		const lifted = await liftEmployeeDataRestriction(
			{
				organizationId: PRIVACY_TEST_ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-lift-1",
				restrictionId: "test-restriction",
				reason: "retention_clock_expired",
			},
			options,
		);
		expect(lifted.ok).toBe(true);

		const restored = await evaluateHumanResourcesAnonymization(
			createValidPrivacyAnonymizeInput(),
			options,
		);
		expect(restored.ok).toBe(true);
		if (!restored.ok) {
			throw restored.error;
		}
		expect(restored.data.allowed).toBe(true);
	});

	it("emits shared command and privacy telemetry for restriction success", async () => {
		const recorder = createMemoryHrObservabilityRecorder();
		const observability: HrObservabilityPorts = {
			recorder,
			clock: { now: () => new Date("2026-01-01T00:00:00.000Z") },
		};

		const result = await restrictEmployeeData(
			createValidPrivacyRestrictionInput(),
			createHumanResourcesTestOptions({
				privacy: createHumanResourcesTestPrivacyPort(),
				observability,
			}),
		);

		expect(result.ok).toBe(true);
		expect(recorder.metrics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: "hr.command.total",
					labels: { area: "privacy", outcome: "success" },
				}),
				expect.objectContaining({
					name: "hr.privacy.operation.total",
					labels: { operation: "rectify", outcome: "success" },
				}),
			]),
		);
	});
});
