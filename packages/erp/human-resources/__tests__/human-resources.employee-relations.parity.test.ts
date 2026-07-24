/**
 * Memory vs Drizzle parity for employee-relations (HR-ER-01).
 */

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
import { runDrizzleParity } from "./helpers/database-gate";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";

const ACTOR = "user-er-parity";

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function seedEmployeeEmployment(
	ready: ReturnType<typeof createHrParityHarness>,
	input: { organizationId: string; suffix: string },
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
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-emp-${input.suffix}`,
			idempotencyKey: `idem-emp-${input.suffix}`,
			employeeNumber: `E-${input.suffix}`,
			legalName: `Worker ${input.suffix}`,
		},
		seedReady,
	);
	if (!employee.ok) {
		throw new Error(`Failed to seed employee: ${employee.code}`);
	}
	const employment = await createEmployment(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-employ-${input.suffix}`,
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

describe.skipIf(!runDrizzleParity)(
	"Employee relations memory vs drizzle parity",
	() => {
		const neonOrgs = createNeonOrgTracker();
		const ORG = neonOrgs.trackOrg("org-er-parity");

		afterAll(async () => {
			await neonOrgs.cleanup();
		});

		for (const adapter of ["memory", "drizzle"] as const) {
			it(`${adapter}: open → finding → approve action`, async () => {
				const suffix = uniqueSuffix(adapter);
				const ready = createHrParityHarness(adapter);
				const authReady = {
					...ready,
					authorization: createGrantingHumanResourcesAuthorization([
						...ER_PARITY_PERMISSIONS,
					]),
				};
				const { employee, employment } = await seedEmployeeEmployment(
					authReady,
					{ organizationId: ORG, suffix },
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
