/**
 * Employee-relations case list ACL — Drizzle/Neon parity (HR-ENT-ER-CASE-LIST-ACL evidence residual).
 */

import { afterAll, describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	listEmployeeCases,
	openEmployeeCase,
} from "../src/employee-relations/employee-case";
import { HUMAN_RESOURCES_ERROR_FORBIDDEN } from "../src/error-codes";
import {
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_OPEN,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
} from "../src/permissions";
import { runDrizzleParity } from "./helpers/database-gate";
import { createHrParityHarness } from "./helpers/hr-parity-harness";
import {
	createStoreBackedIdentityResolver,
	mapActorToEmployee,
} from "./helpers/identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const INVESTIGATOR_PERMISSIONS = [
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_OPEN,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
] as const;

describe.skipIf(!runDrizzleParity)(
	"employee relations case list ACL (drizzle)",
	() => {
		const neonOrgs = createNeonOrgTracker();
		const suiteSuffix = `drizzle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		const OWNER = `user-er-list-owner-${suiteSuffix}`;
		const PARTICIPANT = `user-er-list-participant-${suiteSuffix}`;
		const OUTSIDER = `user-er-list-outsider-${suiteSuffix}`;

		afterAll(async () => {
			await neonOrgs.cleanup();
		});

		function authReady(
			permissions: readonly (typeof INVESTIGATOR_PERMISSIONS)[number][] = INVESTIGATOR_PERMISSIONS,
		) {
			const ready = createHrParityHarness("drizzle");
			return {
				...ready,
				authorization: createGrantingHumanResourcesAuthorization(permissions),
				identityResolver: createStoreBackedIdentityResolver(ready.store),
			};
		}

		async function seedCaseActors(
			ready: ReturnType<typeof authReady>,
			runId: string,
		) {
			const local = `${suiteSuffix}-${runId}`;
			const organizationId = neonOrgs.trackOrg(`org-er-list-acl-${local}`);
			const seedReady = {
				...ready,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
					HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
				]),
			};

			const subjectEmployee = await createEmployee(
				{
					organizationId,
					actorUserId: OWNER,
					correlationId: `corr-subject-${local}`,
					idempotencyKey: `idem-subject-${local}`,
					employeeNumber: `E-SUB-${local}`,
					legalName: "Case Subject",
				},
				seedReady,
			);
			if (!subjectEmployee.ok) {
				throw new Error(subjectEmployee.message);
			}

			const ownerEmployee = await createEmployee(
				{
					organizationId,
					actorUserId: OWNER,
					correlationId: `corr-owner-${local}`,
					idempotencyKey: `idem-owner-${local}`,
					employeeNumber: `E-OWN-${local}`,
					legalName: "Case Owner",
				},
				seedReady,
			);
			if (!ownerEmployee.ok) {
				throw new Error(ownerEmployee.message);
			}

			const participantEmployee = await createEmployee(
				{
					organizationId,
					actorUserId: OWNER,
					correlationId: `corr-participant-${local}`,
					idempotencyKey: `idem-participant-${local}`,
					employeeNumber: `E-PART-${local}`,
					legalName: "Case Participant",
				},
				seedReady,
			);
			if (!participantEmployee.ok) {
				throw new Error(participantEmployee.message);
			}

			await mapActorToEmployee(ready.store, {
				organizationId,
				userId: OWNER,
				employeeId: ownerEmployee.data.id,
				actorUserId: OWNER,
				effectiveFrom: "2025-01-01",
			});
			await mapActorToEmployee(ready.store, {
				organizationId,
				userId: PARTICIPANT,
				employeeId: participantEmployee.data.id,
				actorUserId: OWNER,
				effectiveFrom: "2025-01-01",
			});

			const employment = await createEmployment(
				{
					organizationId,
					actorUserId: OWNER,
					correlationId: `corr-employ-${local}`,
					employeeId: subjectEmployee.data.id,
					startsOn: "2025-01-01",
				},
				seedReady,
			);
			if (!employment.ok) {
				throw new Error(employment.message);
			}

			return {
				organizationId,
				subjectEmployee: subjectEmployee.data,
				employment: employment.data,
			};
		}

		async function openSeededCase(
			ready: ReturnType<typeof authReady>,
			input: {
				organizationId: string;
				employeeId: string;
				employmentId: string;
				ownerActorUserId?: string;
			},
		) {
			return openEmployeeCase(
				{
					organizationId: input.organizationId,
					actorUserId: OWNER,
					correlationId: `corr-open-${suiteSuffix}-${Math.random()}`,
					idempotencyKey: `idem-case-${suiteSuffix}-${Math.random()}`,
					employeeId: input.employeeId,
					employmentId: input.employmentId,
					caseType: "conduct",
					severity: "medium",
					allegationSummary: "Sensitive allegation narrative",
					classificationCode: "CONDUCT-01",
					ownerActorUserId: input.ownerActorUserId ?? OWNER,
					subjectActorUserId: null,
					conflictedActorUserIds: [],
				},
				ready,
			);
		}

		it("denies list queries for actors without employee identity mapping", async () => {
			const ready = authReady();
			const { organizationId, subjectEmployee, employment } =
				await seedCaseActors(ready, "outsider-deny");
			const opened = await openSeededCase(ready, {
				organizationId,
				employeeId: subjectEmployee.id,
				employmentId: employment.id,
			});
			expect(opened.ok).toBe(true);
			if (!opened.ok) return;

			const listed = await listEmployeeCases(
				{
					organizationId,
					actorUserId: OUTSIDER,
					correlationId: `corr-outsider-list-${suiteSuffix}`,
				},
				{
					...ready,
					authorization: createGrantingHumanResourcesAuthorization([
						HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
					]),
				},
			);
			expect(listed.ok).toBe(false);
			expect(humanResourcesCodeFromResult(listed)).toBe(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			);
		});

		it("includes only authorized cases for mixed visibility", async () => {
			const ready = authReady();
			const { organizationId, subjectEmployee, employment } =
				await seedCaseActors(ready, "mixed-visibility");

			const visible = await openSeededCase(ready, {
				organizationId,
				employeeId: subjectEmployee.id,
				employmentId: employment.id,
			});
			expect(visible.ok).toBe(true);
			if (!visible.ok) return;

			const hidden = await openSeededCase(ready, {
				organizationId,
				employeeId: subjectEmployee.id,
				employmentId: employment.id,
				ownerActorUserId: PARTICIPANT,
			});
			expect(hidden.ok).toBe(true);
			if (!hidden.ok) return;

			const ownerList = await listEmployeeCases(
				{
					organizationId,
					actorUserId: OWNER,
					correlationId: `corr-owner-list-${suiteSuffix}`,
				},
				ready,
			);
			expect(ownerList.ok).toBe(true);
			if (!ownerList.ok) return;
			expect(ownerList.data.totalCount).toBe(1);
			expect(ownerList.data.cases.map((item) => item.id)).toEqual([
				visible.data.id,
			]);
		});

		it("paginates authorized rows after access filtering", async () => {
			const ready = authReady();
			const { organizationId, subjectEmployee, employment } =
				await seedCaseActors(ready, "pagination");

			for (let index = 0; index < 3; index += 1) {
				const opened = await openSeededCase(ready, {
					organizationId,
					employeeId: subjectEmployee.id,
					employmentId: employment.id,
				});
				expect(opened.ok).toBe(true);
			}

			const pageOne = await listEmployeeCases(
				{
					organizationId,
					actorUserId: OWNER,
					correlationId: `corr-page-1-${suiteSuffix}`,
					page: 1,
					pageSize: 2,
				},
				ready,
			);
			expect(pageOne.ok).toBe(true);
			if (!pageOne.ok) return;
			expect(pageOne.data.totalCount).toBe(3);
			expect(pageOne.data.cases).toHaveLength(2);

			const pageTwo = await listEmployeeCases(
				{
					organizationId,
					actorUserId: OWNER,
					correlationId: `corr-page-2-${suiteSuffix}`,
					page: 2,
					pageSize: 2,
				},
				ready,
			);
			expect(pageTwo.ok).toBe(true);
			if (!pageTwo.ok) return;
			expect(pageTwo.data.totalCount).toBe(3);
			expect(pageTwo.data.cases).toHaveLength(1);
		});

		it("rejects cross-organization list visibility", async () => {
			const ready = authReady();
			const { organizationId, subjectEmployee, employment } =
				await seedCaseActors(ready, "cross-org");
			const otherOrganizationId = neonOrgs.trackOrg(
				`org-er-list-acl-other-${suiteSuffix}-cross-org`,
			);
			const opened = await openSeededCase(ready, {
				organizationId,
				employeeId: subjectEmployee.id,
				employmentId: employment.id,
			});
			expect(opened.ok).toBe(true);
			if (!opened.ok) return;

			const crossOrg = await listEmployeeCases(
				{
					organizationId: otherOrganizationId,
					actorUserId: OWNER,
					correlationId: `corr-cross-org-list-${suiteSuffix}`,
				},
				ready,
			);
			expect(crossOrg.ok).toBe(false);
			expect(humanResourcesCodeFromResult(crossOrg)).toBe(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			);
		});
	},
);
