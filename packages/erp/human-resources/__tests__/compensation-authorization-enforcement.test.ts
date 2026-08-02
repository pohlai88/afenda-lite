import { describe, expect, it } from "vitest";
import { createCompensationGrade } from "../src/features/compensation-benefits/compensation-grade";
import { createMemoryCurrencyLookup } from "../src/features/compensation-benefits/currency-lookup";
import {
	createEmployeeCompensation,
	getEmployeeCompensation,
} from "../src/features/compensation-benefits/employee-compensation";
import { createEmployee } from "../src/features/workforce-records/employment/employee";
import { createEmployment } from "../src/features/workforce-records/employment/employment";
import {
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
} from "../src/kernel/authorization/permissions";
import type { EmployeeCompensation } from "../src/kernel/contracts";
import { humanResourcesEmployeeIdSchema } from "../src/kernel/identity/brands";
import { createMemoryHumanResourcesStore } from "../src/testing/index";
import { createMappingIdentityResolver } from "./helpers/identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesContextFromResult } from "./helpers/result-details";

const ORGANIZATION_ID = "org-comp-auth";
const SETUP_ACTOR = "comp-admin";
const MANAGER_EMPLOYEE_ID = humanResourcesEmployeeIdSchema.parse(
	"00000000-0000-4000-8000-000000000901",
);
const OUTSIDER_EMPLOYEE_ID = humanResourcesEmployeeIdSchema.parse(
	"00000000-0000-4000-8000-000000000902",
);

async function seedEmployeeCompensation(): Promise<{
	store: ReturnType<typeof createMemoryHumanResourcesStore>;
	ports: ReturnType<typeof createMemoryMutationPorts>;
	currency: ReturnType<typeof createMemoryCurrencyLookup>;
	compensation: EmployeeCompensation;
}> {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const currency = createMemoryCurrencyLookup();
	const authorization = createGrantingHumanResourcesAuthorization([
		HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
		HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
		HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
		HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
	]);
	const setup = { store, ports, currency, authorization };
	const employee = await createEmployee(
		{
			organizationId: ORGANIZATION_ID,
			actorUserId: SETUP_ACTOR,
			correlationId: "corr-comp-auth-employee",
			idempotencyKey: "idem-comp-auth-employee",
			employeeNumber: "E-COMP-AUTH",
			legalName: "Compensation Subject",
		},
		setup,
	);
	if (!employee.ok) {
		throw new Error(`Employee seed failed: ${employee.code}`);
	}
	const employment = await createEmployment(
		{
			organizationId: ORGANIZATION_ID,
			actorUserId: SETUP_ACTOR,
			correlationId: "corr-comp-auth-employment",
			employeeId: employee.data.id,
			startsOn: "2024-01-01",
		},
		setup,
	);
	if (!employment.ok) {
		throw new Error(`Employment seed failed: ${employment.code}`);
	}
	const compensation = await createEmployeeCompensation(
		{
			organizationId: ORGANIZATION_ID,
			actorUserId: SETUP_ACTOR,
			correlationId: "corr-comp-auth-create",
			idempotencyKey: "idem-comp-auth-create",
			employeeId: employee.data.id,
			employmentId: employment.data.id,
			baseAmount: "125000.0000",
			currencyCode: "USD",
			payFrequency: "monthly",
			effectiveFrom: "2025-01-01",
			reason: "Authorization enforcement fixture",
		},
		setup,
	);
	if (!compensation.ok) {
		throw new Error(`Compensation seed failed: ${compensation.code}`);
	}
	return { store, ports, currency, compensation: compensation.data };
}

describe("compensation authorization enforcement", () => {
	it("loads a compensation record before authorizing its employee subject", async () => {
		const seeded = await seedEmployeeCompensation();
		const result = await getEmployeeCompensation(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: "employee-user",
				correlationId: "corr-comp-auth-subject",
				compensationId: seeded.compensation.id,
			},
			{
				...seeded,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
				]),
				identityResolver: createMappingIdentityResolver({
					"employee-user": seeded.compensation.employeeId,
				}),
			},
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.baseAmount).toBe("125000.0000");
	});

	it("limits a real manager scope to manager-visible fields", async () => {
		const seeded = await seedEmployeeCompensation();
		const result = await getEmployeeCompensation(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: "manager-user",
				correlationId: "corr-comp-auth-manager",
				compensationId: seeded.compensation.id,
			},
			{
				...seeded,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
				]),
				identityResolver: createMappingIdentityResolver(
					{ "manager-user": MANAGER_EMPLOYEE_ID },
					{
						managerReports: {
							"manager-user": [seeded.compensation.employeeId],
						},
					},
				),
			},
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.currencyCode).toBe("USD");
		expect(result.data.payFrequency).toBe("monthly");
		expect(result.data).not.toHaveProperty("baseAmount");
		expect(result.data).not.toHaveProperty("confidentialNote");
	});

	it("denies an employee reader outside subject and manager scope", async () => {
		const seeded = await seedEmployeeCompensation();
		const result = await getEmployeeCompensation(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: "outsider-user",
				correlationId: "corr-comp-auth-outsider",
				compensationId: seeded.compensation.id,
			},
			{
				...seeded,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
				]),
				identityResolver: createMappingIdentityResolver({
					"outsider-user": OUTSIDER_EMPLOYEE_ID,
				}),
			},
		);

		expect(result).toMatchObject({
			ok: false,
			code: "FORBIDDEN",
		});
		expect(humanResourcesContextFromResult(result)).toMatchObject({
			denyCode: "subject_scope_denied",
		});
	});

	it("authorizes manage operations with a real organization resource", async () => {
		const store = createMemoryHumanResourcesStore();
		const result = await createCompensationGrade(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: "comp-manager",
				correlationId: "corr-comp-auth-grade",
				code: "AUTH-GRADE",
				name: "Authorization Grade",
			},
			{
				store,
				ports: createMemoryMutationPorts(),
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
				]),
			},
		);

		expect(result.ok).toBe(true);
	});

	it("cannot use a foreign organization to resolve a compensation resource", async () => {
		const seeded = await seedEmployeeCompensation();
		const result = await getEmployeeCompensation(
			{
				organizationId: "org-comp-auth-foreign",
				actorUserId: "comp-manager",
				correlationId: "corr-comp-auth-foreign",
				compensationId: seeded.compensation.id,
			},
			{
				...seeded,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
					HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
				]),
			},
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("NOT_FOUND");
		}
	});
});
