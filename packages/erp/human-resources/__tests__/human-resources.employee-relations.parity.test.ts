/**
 * Memory vs Drizzle parity for employee-relations (HR-ER-01).
 */

import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	approveEmployeeCaseAction,
	recommendEmployeeCaseAction,
} from "../src/employee-relations/case-action";
import {
	openEmployeeCase,
	recordEmployeeCaseFinding,
} from "../src/employee-relations/employee-case";
import {
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ACTION_APPROVE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_FINDING,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_OPEN,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
} from "../src/permissions";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import {
	createWorkforceHarness,
	type WorkforceStoreAdapter,
} from "./helpers/workforce-harness";

const { hasDatabase } = resolveDatabaseUrlForTests();

const ORG = "org-er-parity";
const ACTOR = "user-er-parity";

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function seedEmployeeEmployment(
	ready: ReturnType<typeof createWorkforceHarness>,
	suffix: string,
) {
	const seedReady = {
		...ready,
		authorization: createGrantingHumanResourcesAuthorization([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
		]),
	};
	const employee = await createEmployee(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-emp-${suffix}`,
			idempotencyKey: `idem-emp-${suffix}`,
			employeeNumber: `E-${suffix}`,
			legalName: `Worker ${suffix}`,
		},
		seedReady,
	);
	if (!employee.ok) {
		throw new Error(`Failed to seed employee: ${employee.code}`);
	}
	const employment = await createEmployment(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-employ-${suffix}`,
			employeeId: employee.data.id,
			startsOn: "2025-01-01",
		},
		seedReady,
	);
	if (!employment.ok) {
		throw new Error(`Failed to seed employment: ${employment.code}`);
	}
	return { employee: employee.data, employment: employment.data };
}

const ER_PARITY_PERMISSIONS = [
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_OPEN,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_FINDING,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ACTION_APPROVE,
] as const;

describe.skipIf(!hasDatabase)(
	"Employee relations memory vs drizzle parity",
	() => {
		afterAll(async () => {
			await cleanupHumanResourcesNeonOrgs([ORG]);
		});

		for (const adapter of ["memory", "drizzle"] as const) {
			it(`${adapter}: open → finding → approve action`, async () => {
				const suffix = uniqueSuffix(adapter);
				const ready = createWorkforceHarness(adapter);
				const authReady = {
					...ready,
					authorization: createGrantingHumanResourcesAuthorization([
						...ER_PARITY_PERMISSIONS,
					]),
				};
				const { employee, employment } = await seedEmployeeEmployment(
					authReady,
					suffix,
				);

				const opened = await openEmployeeCase(
					{
						organizationId: ORG,
						actorUserId: ACTOR,
						correlationId: `corr-open-${suffix}`,
						idempotencyKey: `idem-case-${suffix}`,
						employeeId: employee.id,
						employmentId: employment.id,
						caseType: "conduct",
						severity: "high",
						allegationSummary: "Parity allegation",
						classificationCode: "PARITY-01",
						ownerActorUserId: ACTOR,
						subjectActorUserId: null,
						conflictedActorUserIds: [],
					},
					authReady,
				);
				expect(opened.ok).toBe(true);
				if (!opened.ok) return;

				const finding = await recordEmployeeCaseFinding(
					{
						organizationId: ORG,
						actorUserId: ACTOR,
						correlationId: `corr-finding-${suffix}`,
						caseId: opened.data.id,
						findingCode: "SUBSTANTIATED",
						findingSummary: "Parity finding",
						expectedVersion: opened.data.version,
					},
					authReady,
				);
				expect(finding.ok).toBe(true);
				if (!finding.ok) return;

				const recommended = await recommendEmployeeCaseAction(
					{
						organizationId: ORG,
						actorUserId: ACTOR,
						correlationId: `corr-rec-${suffix}`,
						caseId: opened.data.id,
						idempotencyKey: `idem-action-${suffix}`,
						actionType: "warning",
						expectedVersion: finding.data.version,
					},
					authReady,
				);
				expect(recommended.ok).toBe(true);
				if (!recommended.ok) return;

				const approved = await approveEmployeeCaseAction(
					{
						organizationId: ORG,
						actorUserId: ACTOR,
						correlationId: `corr-app-${suffix}`,
						caseId: opened.data.id,
						actionId: recommended.data.id,
						policyValidationRecorded: true,
						expectedVersion: finding.data.version + 1,
					},
					authReady,
				);
				expect(approved.ok).toBe(true);
				if (!approved.ok) return;
				expect(approved.data.status).toBe("approved");
			});
		}
	},
);
