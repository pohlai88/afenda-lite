import { describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import {
	amendEmployment,
	createEmployment,
	getEmployment,
} from "../src/core/employment";
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../src/permissions";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG_A = "org-a";
const ACTOR = "user-actor-1";

describe("@afenda/human-resources transaction rollback", () => {
	it("rolls back employee create when outbox emission fails", async () => {
		const store = createMemoryHumanResourcesStore();
		const ports = createMemoryMutationPorts({ outboxFailAfter: 0 });
		const authorization = createGrantingHumanResourcesAuthorization([
			...HUMAN_RESOURCES_PERMISSION_CODES,
		]);
		const created = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-rollback-employee",
				idempotencyKey: "idem-rollback-employee",
				employeeNumber: "E-RB-1",
				legalName: "Rollback Employee",
			},
			{ store, ports, authorization },
		);
		expect(created.ok).toBe(false);

		// Idempotency map and row must be cleared so retry can succeed.
		const portsOk = createMemoryMutationPorts();
		const replay = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-rollback-employee-2",
				idempotencyKey: "idem-rollback-employee",
				employeeNumber: "E-RB-1",
				legalName: "Rollback Employee",
			},
			{ store, ports: portsOk, authorization },
		);
		expect(replay.ok).toBe(true);
		if (replay.ok) {
			expect(replay.data.employeeNumber).toBe("E-RB-1");
			expect(replay.data.version).toBe(1);
		}
	});

	it("rolls back employment create when outbox emission fails", async () => {
		const store = createMemoryHumanResourcesStore();
		const portsOk = createMemoryMutationPorts();
		const authorization = createGrantingHumanResourcesAuthorization([
			...HUMAN_RESOURCES_PERMISSION_CODES,
		]);
		const employee = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-rollback-emp-1",
				idempotencyKey: "idem-rollback-emp-1",
				employeeNumber: "E-RB-2",
				legalName: "Employment Rollback",
			},
			{ store, ports: portsOk, authorization },
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const failingPorts = createMemoryMutationPorts({ outboxFailAfter: 0 });
		const employment = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-rollback-emp-2",
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
				endsOn: null,
			},
			{ store, ports: failingPorts, authorization },
		);
		expect(employment.ok).toBe(false);

		const retry = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-rollback-emp-3",
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
				endsOn: null,
			},
			{ store, ports: portsOk, authorization },
		);
		expect(retry.ok).toBe(true);
	});

	it("rolls back employment amend when outbox emission fails", async () => {
		const store = createMemoryHumanResourcesStore();
		const portsOk = createMemoryMutationPorts();
		const authorization = createGrantingHumanResourcesAuthorization([
			...HUMAN_RESOURCES_PERMISSION_CODES,
		]);
		const employee = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-rollback-amend-1",
				idempotencyKey: "idem-rollback-amend-1",
				employeeNumber: "E-RB-3",
				legalName: "Amend Rollback",
			},
			{ store, ports: portsOk, authorization },
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-rollback-amend-2",
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
				endsOn: null,
			},
			{ store, ports: portsOk, authorization },
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const failingPorts = createMemoryMutationPorts({ outboxFailAfter: 0 });
		const amended = await amendEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-rollback-amend-3",
				employmentId: employment.data.id,
				status: "notice",
				expectedVersion: 1,
			},
			{ store, ports: failingPorts, authorization },
		);
		expect(amended.ok).toBe(false);

		const current = await getEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-rollback-amend-4",
				employmentId: employment.data.id,
			},
			{ store, ports: portsOk, authorization },
		);
		expect(current.ok).toBe(true);
		if (current.ok) {
			expect(current.data.status).toBe("active");
			expect(current.data.version).toBe(1);
		}
	});
});
