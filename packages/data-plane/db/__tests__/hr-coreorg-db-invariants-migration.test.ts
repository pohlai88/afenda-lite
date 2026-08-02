/**
 * HR-COREORG-DB-INVARIANTS — generated-baseline effective-range checks.
 */

import { testingDatabase } from "@afenda/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { assertAdditiveMigrations } from "../scripts/lib/assert-additive-migration.mjs";
import {
	readCurrentMigrationSql,
	readCurrentMigrations,
} from "./helpers/current-migration-sql";

const migrationSql = readCurrentMigrationSql();

const { hasDatabase } = testingDatabase.resolve();

function requireDatabaseTests(): boolean {
	const ci = process.env.CI;
	const requireFlag = process.env.REQUIRE_DATABASE_TESTS;
	return (
		ci === "true" || ci === "1" || requireFlag === "1" || requireFlag === "true"
	);
}

const runDatabaseTests = hasDatabase && requireDatabaseTests();

describe("HR coreorg DB invariants generated migration", () => {
	it("passes additive governance and names all effective-range constraints", () => {
		const result = assertAdditiveMigrations(readCurrentMigrations());
		expect(result.ok).toBe(true);
		expect(migrationSql).toContain('"hr_work_assignment_effective_range_ck"');
		expect(migrationSql).toContain(
			'"hr_employment_contract_effective_range_ck"',
		);
		expect(migrationSql).toContain('"hr_reporting_line_effective_range_ck"');
		expect(migrationSql).toContain('"hr_probation_review_effective_range_ck"');
		expect(migrationSql).toContain('"hr_salary_band_effective_range_ck"');
		expect(migrationSql).toContain(
			'"hr_employee_compensation_effective_range_ck"',
		);
		expect(migrationSql).toContain(
			'"hr_benefit_enrollment_effective_range_ck"',
		);
		expect(migrationSql).toContain('"hr_shift_effective_range_ck"');
	});
});

describe.skipIf(!runDatabaseTests)(
	"HR coreorg DB invariants generated baseline (live)",
	() => {
		const runId = `${Date.now()}`;
		const orgId = `org-coreorg-inv-${runId}`;
		const otherOrgId = `org-coreorg-inv-other-${runId}`;
		const actor = `actor-coreorg-inv-${runId}`;

		const employeeId = crypto.randomUUID();
		const otherEmployeeId = crypto.randomUUID();
		const employmentId = crypto.randomUUID();
		const otherEmploymentId = crypto.randomUUID();
		const positionId = crypto.randomUUID();
		const departmentId = crypto.randomUUID();
		const jobId = crypto.randomUUID();
		const managerEmployeeId = crypto.randomUUID();

		let migrationReady = false;

		beforeAll(async () => {
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			const rows = await sql`
				SELECT 1 AS ok
				FROM pg_constraint
				WHERE conname = 'hr_work_assignment_effective_range_ck'
				LIMIT 1
			`;
			migrationReady = rows.length > 0;
			if (requireDatabaseTests() && !migrationReady) {
				throw new Error(
					"HR-COREORG-DB-INVARIANTS live tests require the generated baseline migration",
				);
			}
		});

		afterAll(async () => {
			if (!migrationReady) {
				return;
			}
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			await sql`
				DELETE FROM hr_work_assignment
				WHERE organization_id IN (${orgId}, ${otherOrgId})
			`;
			await sql`
				DELETE FROM hr_employment_contract
				WHERE organization_id IN (${orgId}, ${otherOrgId})
			`;
			await sql`
				DELETE FROM hr_reporting_line
				WHERE organization_id IN (${orgId}, ${otherOrgId})
			`;
			await sql`
				DELETE FROM hr_employment
				WHERE organization_id IN (${orgId}, ${otherOrgId})
			`;
			await sql`
				DELETE FROM hr_position
				WHERE organization_id IN (${orgId}, ${otherOrgId})
			`;
			await sql`
				DELETE FROM hr_department
				WHERE organization_id IN (${orgId}, ${otherOrgId})
			`;
			await sql`
				DELETE FROM hr_job
				WHERE organization_id IN (${orgId}, ${otherOrgId})
			`;
			await sql`
				DELETE FROM hr_employee
				WHERE organization_id IN (${orgId}, ${otherOrgId})
			`;
		});

		async function seedFoundation(): Promise<void> {
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			await sql`
				INSERT INTO hr_employee (
					id, organization_id, employee_number, normalized_employee_number,
					legal_name, create_idempotency_key, create_request_fingerprint,
					version, created_by, updated_by
				)
				VALUES
					(
						${employeeId}, ${orgId}, 'E-001', 'e-001', 'Invariant Employee',
						${`idem-emp-${runId}`}, ${`fp-emp-${runId}`}, 1, ${actor}, ${actor}
					),
					(
						${managerEmployeeId}, ${orgId}, 'E-MGR', 'e-mgr', 'Invariant Manager',
						${`idem-mgr-${runId}`}, ${`fp-mgr-${runId}`}, 1, ${actor}, ${actor}
					),
					(
						${otherEmployeeId}, ${otherOrgId}, 'E-002', 'e-002', 'Other Org Employee',
						${`idem-other-${runId}`}, ${`fp-other-${runId}`}, 1, ${actor}, ${actor}
					)
			`;
			await sql`
				INSERT INTO hr_employment (
					id, organization_id, employee_id, status, starts_on, ends_on,
					version, created_by, updated_by
				)
				VALUES
					(
						${employmentId}, ${orgId}, ${employeeId}, 'active', '2020-01-01', NULL,
						1, ${actor}, ${actor}
					),
					(
						${otherEmploymentId}, ${otherOrgId}, ${otherEmployeeId}, 'active', '2020-01-01', NULL,
						1, ${actor}, ${actor}
					)
			`;
			await sql`
				INSERT INTO hr_department (
					id, organization_id, code, name, status, version, created_by, updated_by
				)
				VALUES (
					${departmentId}, ${orgId}, 'DEPT-INV', 'Invariant Dept', 'active', 1, ${actor}, ${actor}
				)
			`;
			await sql`
				INSERT INTO hr_job (
					id, organization_id, code, title, status, version, created_by, updated_by
				)
				VALUES (
					${jobId}, ${orgId}, 'JOB-INV', 'Invariant Job', 'active', 1, ${actor}, ${actor}
				)
			`;
			await sql`
				INSERT INTO hr_position (
					id, organization_id, code, title, department_id, job_id, status,
					version, created_by, updated_by
				)
				VALUES (
					${positionId}, ${orgId}, 'POS-INV', 'Invariant Position', ${departmentId},
					${jobId}, 'active', 1, ${actor}, ${actor}
				)
			`;
		}

		it("rejects an assignment whose end precedes its start", async () => {
			if (!migrationReady) {
				return;
			}
			await seedFoundation();
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			await expect(
				sql`
					INSERT INTO hr_work_assignment (
						id, organization_id, employment_id, employee_id, position_id,
						starts_on, ends_on, version, created_by, updated_by
					)
					VALUES (
						${crypto.randomUUID()}, ${orgId}, ${employmentId}, ${employeeId}, ${positionId},
						'2020-06-01', '2020-01-01', 1, ${actor}, ${actor}
					)
				`,
			).rejects.toThrow();
		});

		it("accepts an open-ended assignment", async () => {
			if (!migrationReady) {
				return;
			}
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			const assignmentId = crypto.randomUUID();
			await expect(
				sql`
					INSERT INTO hr_work_assignment (
						id, organization_id, employment_id, employee_id, position_id,
						starts_on, ends_on, version, created_by, updated_by
					)
					VALUES (
						${assignmentId}, ${orgId}, ${employmentId}, ${employeeId}, ${positionId},
						'2020-01-01', NULL, 1, ${actor}, ${actor}
					)
				`,
			).resolves.toBeDefined();
		});

		it("rejects a contract whose end precedes its start", async () => {
			if (!migrationReady) {
				return;
			}
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			await expect(
				sql`
					INSERT INTO hr_employment_contract (
						id, organization_id, employment_id, employee_id, reference_code,
						starts_on, ends_on, lineage_status, reason_code, version, created_by, updated_by
					)
					VALUES (
						${crypto.randomUUID()}, ${orgId}, ${employmentId}, ${employeeId}, 'CTR-BAD',
						'2021-06-01', '2021-01-01', 'active', 'test.invalid-range', 1, ${actor}, ${actor}
					)
				`,
			).rejects.toThrow();
		});

		it("accepts an open-ended contract", async () => {
			if (!migrationReady) {
				return;
			}
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			const contractId = crypto.randomUUID();
			await expect(
				sql`
					INSERT INTO hr_employment_contract (
						id, organization_id, employment_id, employee_id, reference_code,
						starts_on, ends_on, lineage_status, reason_code, version, created_by, updated_by
					)
					VALUES (
						${contractId}, ${orgId}, ${employmentId}, ${employeeId}, 'CTR-OPEN',
						'2020-01-01', NULL, 'active', 'test.open-ended', 1, ${actor}, ${actor}
					)
				`,
			).resolves.toBeDefined();
		});

		it("rejects a reporting line whose end precedes its start", async () => {
			if (!migrationReady) {
				return;
			}
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			await expect(
				sql`
					INSERT INTO hr_reporting_line (
						id, organization_id, employee_id, manager_employee_id, relationship_kind,
						starts_on, ends_on, version, created_by, updated_by
					)
					VALUES (
						${crypto.randomUUID()}, ${orgId}, ${employeeId}, ${managerEmployeeId}, 'primary',
						'2022-06-01', '2022-01-01', 1, ${actor}, ${actor}
					)
				`,
			).rejects.toThrow();
		});

		it("preserves tenant-scoped foreign-key behavior", async () => {
			if (!migrationReady) {
				return;
			}
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			await expect(
				sql`
					INSERT INTO hr_work_assignment (
						id, organization_id, employment_id, employee_id, position_id,
						starts_on, ends_on, version, created_by, updated_by
					)
					VALUES (
						${crypto.randomUUID()}, ${orgId}, ${otherEmploymentId}, ${employeeId}, ${positionId},
						'2020-01-01', NULL, 1, ${actor}, ${actor}
					)
				`,
			).rejects.toThrow();
		});
	},
);

describe.skipIf(!runDatabaseTests)(
	"HR coreorg DB invariants migration (0035 live)",
	() => {
		const runId = `${Date.now()}`;
		const orgId = `org-coreorg-inv35-${runId}`;
		const actor = `actor-coreorg-inv35-${runId}`;

		const employeeId = crypto.randomUUID();
		const employmentId = crypto.randomUUID();
		const gradeId = crypto.randomUUID();
		const planId = crypto.randomUUID();

		let migrationReady = false;

		beforeAll(async () => {
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			const rows = await sql`
				SELECT 1 AS ok
				FROM pg_constraint
				WHERE conname = 'hr_probation_review_effective_range_ck'
				LIMIT 1
			`;
			migrationReady = rows.length > 0;
			if (requireDatabaseTests() && !migrationReady) {
				throw new Error(
					"HR-COREORG-DB-INVARIANTS live tests require the generated baseline migration",
				);
			}
		});

		afterAll(async () => {
			if (!migrationReady) {
				return;
			}
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			await sql`DELETE FROM hr_shift WHERE organization_id = ${orgId}`;
			await sql`DELETE FROM hr_benefit_enrollment WHERE organization_id = ${orgId}`;
			await sql`
				DELETE FROM hr_employee_compensation WHERE organization_id = ${orgId}
			`;
			await sql`DELETE FROM hr_salary_band WHERE organization_id = ${orgId}`;
			await sql`DELETE FROM hr_probation_review WHERE organization_id = ${orgId}`;
			await sql`DELETE FROM hr_benefit_plan WHERE organization_id = ${orgId}`;
			await sql`DELETE FROM hr_compensation_grade WHERE organization_id = ${orgId}`;
			await sql`DELETE FROM hr_employment WHERE organization_id = ${orgId}`;
			await sql`DELETE FROM hr_employee WHERE organization_id = ${orgId}`;
		});

		async function seedFoundation(): Promise<void> {
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			await sql`
				INSERT INTO hr_employee (
					id, organization_id, employee_number, normalized_employee_number,
					legal_name, create_idempotency_key, create_request_fingerprint,
					version, created_by, updated_by
				)
				VALUES (
					${employeeId}, ${orgId}, 'E-035', 'e-035', 'Completion Employee',
					${`idem-emp35-${runId}`}, ${`fp-emp35-${runId}`}, 1, ${actor}, ${actor}
				)
			`;
			await sql`
				INSERT INTO hr_employment (
					id, organization_id, employee_id, status, starts_on, ends_on,
					version, created_by, updated_by
				)
				VALUES (
					${employmentId}, ${orgId}, ${employeeId}, 'active', '2020-01-01', NULL,
					1, ${actor}, ${actor}
				)
			`;
			await sql`
				INSERT INTO hr_compensation_grade (
					id, organization_id, code, name, status, version, created_by, updated_by
				)
				VALUES (
					${gradeId}, ${orgId}, 'G-035', 'Grade 035', 'active', 1, ${actor}, ${actor}
				)
			`;
			await sql`
				INSERT INTO hr_benefit_plan (
					id, organization_id, code, name, status, version, created_by, updated_by
				)
				VALUES (
					${planId}, ${orgId}, 'BP-035', 'Plan 035', 'active', 1, ${actor}, ${actor}
				)
			`;
		}

		it("rejects a probation review whose end precedes its start", async () => {
			if (!migrationReady) {
				return;
			}
			await seedFoundation();
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			await expect(
				sql`
					INSERT INTO hr_probation_review (
						id, organization_id, employment_id, employee_id, status,
						starts_on, ends_on, create_idempotency_key, create_request_fingerprint,
						version, created_by, updated_by
					)
					VALUES (
						${crypto.randomUUID()}, ${orgId}, ${employmentId}, ${employeeId}, 'open',
						'2021-06-01', '2021-01-01', ${`idem-prob-bad-${runId}`}, ${`fp-prob-bad-${runId}`},
						1, ${actor}, ${actor}
					)
				`,
			).rejects.toThrow();
		});

		it("rejects a salary band whose effective_to precedes effective_from", async () => {
			if (!migrationReady) {
				return;
			}
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			await expect(
				sql`
					INSERT INTO hr_salary_band (
						id, organization_id, grade_id, minimum_amount, midpoint_amount, maximum_amount,
						currency_code, effective_from, effective_to, status,
						version, created_by, updated_by
					)
					VALUES (
						${crypto.randomUUID()}, ${orgId}, ${gradeId}, '1000', '1500', '2000',
						'USD', '2021-06-01', '2021-01-01', 'active', 1, ${actor}, ${actor}
					)
				`,
			).rejects.toThrow();
		});

		it("accepts an open-ended salary band", async () => {
			if (!migrationReady) {
				return;
			}
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			await expect(
				sql`
					INSERT INTO hr_salary_band (
						id, organization_id, grade_id, minimum_amount, midpoint_amount, maximum_amount,
						currency_code, effective_from, effective_to, status,
						version, created_by, updated_by
					)
					VALUES (
						${crypto.randomUUID()}, ${orgId}, ${gradeId}, '1000', '1500', '2000',
						'USD', '2020-01-01', NULL, 'active', 1, ${actor}, ${actor}
					)
				`,
			).resolves.toBeDefined();
		});

		it("rejects employee compensation with inverted effective range", async () => {
			if (!migrationReady) {
				return;
			}
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			await expect(
				sql`
					INSERT INTO hr_employee_compensation (
						id, organization_id, employee_id, employment_id, base_amount, currency_code,
						effective_from, effective_to, reason, status,
						create_idempotency_key, create_request_fingerprint,
						version, created_by, updated_by
					)
					VALUES (
						${crypto.randomUUID()}, ${orgId}, ${employeeId}, ${employmentId}, '50000', 'USD',
						'2021-06-01', '2021-01-01', 'test.invalid-range', 'active',
						${`idem-comp-bad-${runId}`}, ${`fp-comp-bad-${runId}`},
						1, ${actor}, ${actor}
					)
				`,
			).rejects.toThrow();
		});

		it("rejects benefit enrollment with inverted effective range", async () => {
			if (!migrationReady) {
				return;
			}
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			await expect(
				sql`
					INSERT INTO hr_benefit_enrollment (
						id, organization_id, employee_id, employment_id, plan_id,
						effective_from, effective_to, status,
						create_idempotency_key, create_request_fingerprint,
						version, created_by, updated_by
					)
					VALUES (
						${crypto.randomUUID()}, ${orgId}, ${employeeId}, ${employmentId}, ${planId},
						'2021-06-01', '2021-01-01', 'active',
						${`idem-ben-bad-${runId}`}, ${`fp-ben-bad-${runId}`},
						1, ${actor}, ${actor}
					)
				`,
			).rejects.toThrow();
		});

		it("rejects shift with inverted effective range", async () => {
			if (!migrationReady) {
				return;
			}
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			await expect(
				sql`
					INSERT INTO hr_shift (
						id, organization_id, code, name, shift_kind, start_local, end_local,
						expected_minutes, status, effective_from, effective_to,
						create_idempotency_key, create_request_fingerprint,
						version, created_by, updated_by
					)
					VALUES (
						${crypto.randomUUID()}, ${orgId}, 'SH-BAD', 'Bad Shift', 'fixed', '09:00', '17:00',
						480, 'active', '2021-06-01', '2021-01-01',
						${`idem-shift-bad-${runId}`}, ${`fp-shift-bad-${runId}`},
						1, ${actor}, ${actor}
					)
				`,
			).rejects.toThrow();
		});

		it("accepts shift with open-ended effective range", async () => {
			if (!migrationReady) {
				return;
			}
			const { getNeonSql } = await import("../src/http-transaction");
			const sql = getNeonSql();
			await expect(
				sql`
					INSERT INTO hr_shift (
						id, organization_id, code, name, shift_kind, start_local, end_local,
						expected_minutes, status, effective_from, effective_to,
						create_idempotency_key, create_request_fingerprint,
						version, created_by, updated_by
					)
					VALUES (
						${crypto.randomUUID()}, ${orgId}, 'SH-OK', 'Open Shift', 'fixed', '09:00', '17:00',
						480, 'active', '2020-01-01', NULL,
						${`idem-shift-ok-${runId}`}, ${`fp-shift-ok-${runId}`},
						1, ${actor}, ${actor}
					)
				`,
			).resolves.toBeDefined();
		});
	},
);
