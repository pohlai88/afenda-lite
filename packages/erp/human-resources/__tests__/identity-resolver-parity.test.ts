import { beforeEach, describe, expect, it } from "vitest";

import { createMemoryHumanResourcesIdentityStore } from "../src/adapters/memory/identity";
import {
	createOrganizationMemoryState,
	type OrganizationMemoryState,
} from "../src/adapters/memory/organization";
import { createMemoryHumanResourcesStore } from "../src/adapters/memory/store";
import type { HumanResourcesEmployeeId } from "../src/brands";
import { createEmployee } from "../src/core/employee";
import { assignPrimaryReportingLine } from "../src/organization/reporting-line";
import {
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
} from "../src/permissions";
import type { HumanResourcesIdentityStore } from "../src/store/identity";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

describe("Identity Resolver Parity - Memory Store", () => {
	let organization: OrganizationMemoryState;
	let store: HumanResourcesIdentityStore;
	const organizationId = "org-identity-parity";
	const userId = "user-123";
	const employeeId =
		"550e8400-e29b-41d4-a716-446655440001" as HumanResourcesEmployeeId;
	const actorUserId = "actor-456";

	beforeEach(() => {
		organization = createOrganizationMemoryState();
		store = createMemoryHumanResourcesIdentityStore(organization);
	});

	describe("getUserEmployeeMapping", () => {
		it("should return null when no mapping exists", async () => {
			const result = await store.getUserEmployeeMapping({
				organizationId,
				userId,
			});

			expect(result.ok).toBe(true);
			expect(result.data).toBeNull();
		});

		it("should return mapping when it exists and is effective", async () => {
			const createResult = await store.createUserEmployeeMapping({
				organizationId,
				userId,
				employeeId,
				relationshipType: "self",
				effectiveFrom: "2024-01-01",
				actorUserId,
			});

			expect(createResult.ok).toBe(true);

			const getResult = await store.getUserEmployeeMapping({
				organizationId,
				userId,
				asOf: "2024-06-01",
			});

			expect(getResult.ok).toBe(true);
			expect(getResult.data).toEqual({
				employeeId,
				relationshipType: "self",
				effectiveFrom: "2024-01-01",
				effectiveUntil: null,
			});
		});

		it("should not return mapping when queried before effective date", async () => {
			const createResult = await store.createUserEmployeeMapping({
				organizationId,
				userId,
				employeeId,
				relationshipType: "self",
				effectiveFrom: "2024-01-01",
				actorUserId,
			});

			expect(createResult.ok).toBe(true);

			const getResult = await store.getUserEmployeeMapping({
				organizationId,
				userId,
				asOf: "2023-12-31",
			});

			expect(getResult.ok).toBe(true);
			expect(getResult.data).toBeNull();
		});

		it("should not return mapping when queried after expiry date", async () => {
			const createResult = await store.createUserEmployeeMapping({
				organizationId,
				userId,
				employeeId,
				relationshipType: "self",
				effectiveFrom: "2024-01-01",
				effectiveUntil: "2024-12-31",
				actorUserId,
			});

			expect(createResult.ok).toBe(true);

			const getResult = await store.getUserEmployeeMapping({
				organizationId,
				userId,
				asOf: "2025-01-01",
			});

			expect(getResult.ok).toBe(true);
			expect(getResult.data).toBeNull();
		});
	});

	describe("getManagerEmployeesForUser", () => {
		it("should return empty array for users without managed employees", async () => {
			const result = await store.getManagerEmployeesForUser({
				organizationId,
				userId,
			});

			expect(result.ok).toBe(true);
			expect(result.data).toEqual([]);
		});

		it("should return direct reports for a mapped manager via reporting lines", async () => {
			const fullStore = createMemoryHumanResourcesStore();
			const authorization = createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
				HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
			]);
			const ports = createMemoryMutationPorts();
			const ready = { store: fullStore, authorization, ports };

			const managerEmp = await createEmployee(
				{
					organizationId,
					actorUserId,
					correlationId: "corr-mgr",
					idempotencyKey: "idem-mgr",
					employeeNumber: "M-1",
					legalName: "Manager",
				},
				ready,
			);
			expect(managerEmp.ok).toBe(true);
			if (!managerEmp.ok) return;

			const reportEmp = await createEmployee(
				{
					organizationId,
					actorUserId,
					correlationId: "corr-report",
					idempotencyKey: "idem-report",
					employeeNumber: "R-1",
					legalName: "Report",
				},
				ready,
			);
			expect(reportEmp.ok).toBe(true);
			if (!reportEmp.ok) return;

			const mapped = await fullStore.createUserEmployeeMapping({
				organizationId,
				userId: "manager-user",
				employeeId: managerEmp.data.id,
				relationshipType: "self",
				effectiveFrom: "2024-01-01",
				actorUserId,
			});
			expect(mapped.ok).toBe(true);

			const line = await assignPrimaryReportingLine(
				{
					organizationId,
					actorUserId,
					correlationId: "corr-line",
					employeeId: reportEmp.data.id,
					managerEmployeeId: managerEmp.data.id,
					startsOn: "2024-01-01",
				},
				ready,
			);
			expect(line.ok).toBe(true);

			const reports = await fullStore.getManagerEmployeesForUser({
				organizationId,
				userId: "manager-user",
				asOf: "2024-06-01",
			});
			expect(reports.ok).toBe(true);
			expect(reports.data).toEqual([reportEmp.data.id]);

			const former = await fullStore.getManagerEmployeesForUser({
				organizationId,
				userId: "manager-user",
				asOf: "2023-01-01",
			});
			expect(former.ok).toBe(true);
			expect(former.data).toEqual([]);
		});
	});
});
