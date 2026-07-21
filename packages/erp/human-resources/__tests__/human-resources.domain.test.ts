import { describe, expect, it } from "vitest";

import { createEmployee, getEmployeeById } from "../src/core/employee";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
} from "../src/error-codes";
import {
	HUMAN_RESOURCES_PERMISSION_CODES,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
} from "../src/permissions";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const ORG_A = "org-a";
const ORG_B = "org-b";
const ACTOR = "user-actor-1";

function harness() {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization([
		...HUMAN_RESOURCES_PERMISSION_CODES,
	]);
	return { store, ports, authorization };
}

describe("@afenda/human-resources domain", () => {
	it("creates an employee with audit and outbox in the mutation path", async () => {
		const { store, ports, authorization } = harness();
		const created = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-create-1",
				idempotencyKey: "idem-create-1",
				employeeNumber: "E-100",
				legalName: "Alex Example",
			},
			{ store, ports, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.employeeNumber).toBe("E-100");
		expect(created.data.organizationId).toBe(ORG_A);
		expect(ports.audit.calls).toHaveLength(1);
		expect(ports.outbox.calls).toHaveLength(1);
	});

	it("replays create under the same idempotency key and payload", async () => {
		const ready = harness();
		const first = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-idem-1",
				idempotencyKey: "idem-replay",
				employeeNumber: "E-200",
				legalName: "Replay Example",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}
		const second = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-idem-2",
				idempotencyKey: "idem-replay",
				employeeNumber: "E-200",
				legalName: "Replay Example",
			},
			ready,
		);
		expect(second.ok).toBe(true);
		if (second.ok) {
			expect(second.data.id).toBe(first.data.id);
		}
		expect(ready.ports.audit.calls).toHaveLength(1);
		expect(ready.ports.outbox.calls).toHaveLength(1);
	});

	it("rejects idempotency key reuse with a different payload", async () => {
		const ready = harness();
		const first = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-conflict-1",
				idempotencyKey: "idem-conflict",
				employeeNumber: "E-300",
				legalName: "Original Name",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		const conflict = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-conflict-2",
				idempotencyKey: "idem-conflict",
				employeeNumber: "E-300",
				legalName: "Different Name",
			},
			ready,
		);
		expect(conflict.ok).toBe(false);
		if (!conflict.ok) {
			expect(conflict.code).toBe("CONFLICT");
			expect(humanResourcesCodeFromResult(conflict)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
	});

	it("rejects duplicate employee numbers within an organization", async () => {
		const ready = harness();
		const first = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-dup-1",
				idempotencyKey: "idem-dup-1",
				employeeNumber: "E-DUP",
				legalName: "First",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		const duplicate = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-dup-2",
				idempotencyKey: "idem-dup-2",
				employeeNumber: "e-dup",
				legalName: "Second",
			},
			ready,
		);
		expect(duplicate.ok).toBe(false);
		if (!duplicate.ok) {
			expect(duplicate.code).toBe("CONFLICT");
			expect(humanResourcesCodeFromResult(duplicate)).toBe(
				HUMAN_RESOURCES_ERROR_DUPLICATE,
			);
		}
	});

	it("allows the same employee number in a different organization", async () => {
		const ready = harness();
		const inA = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-iso-1",
				idempotencyKey: "idem-iso-1",
				employeeNumber: "E-SHARED",
				legalName: "Org A",
			},
			ready,
		);
		expect(inA.ok).toBe(true);
		const inB = await createEmployee(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: "corr-iso-2",
				idempotencyKey: "idem-iso-2",
				employeeNumber: "E-SHARED",
				legalName: "Org B",
			},
			ready,
		);
		expect(inB.ok).toBe(true);
	});

	it("binds getEmployeeById to organization scope", async () => {
		const ready = harness();
		const created = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-get-1",
				idempotencyKey: "idem-get-1",
				employeeNumber: "E-400",
				legalName: "Scoped Example",
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const inOrg = await getEmployeeById(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-get-2",
				employeeId: created.data.id,
			},
			ready,
		);
		expect(inOrg.ok).toBe(true);

		const crossOrg = await getEmployeeById(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: "corr-get-3",
				employeeId: created.data.id,
			},
			ready,
		);
		expect(crossOrg.ok).toBe(false);
		if (!crossOrg.ok) {
			expect(crossOrg.code).toBe("NOT_FOUND");
			expect(humanResourcesCodeFromResult(crossOrg)).toBe(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
	});

	it("requires an authorization port for mutations", async () => {
		const store = createMemoryHumanResourcesStore();
		const ports = createMemoryMutationPorts();
		const result = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-auth-1",
				idempotencyKey: "idem-auth-1",
				employeeNumber: "E-500",
				legalName: "Unauthorized Example",
			},
			{ store, ports },
		);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("UNAUTHORIZED");
			expect(humanResourcesCodeFromResult(result)).toBe(
				HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
			);
		}
	});

	it("denies mutations without the required permission", async () => {
		const store = createMemoryHumanResourcesStore();
		const ports = createMemoryMutationPorts();
		const authorization = createGrantingHumanResourcesAuthorization([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
		]);
		const result = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-auth-deny",
				idempotencyKey: "idem-auth-deny",
				employeeNumber: "E-501",
				legalName: "Forbidden Example",
			},
			{ store, ports, authorization },
		);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("FORBIDDEN");
			expect(humanResourcesCodeFromResult(result)).toBe(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			);
		}
	});

	it("denies queries without the required permission", async () => {
		const ready = harness();
		const created = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-query-auth-1",
				idempotencyKey: "idem-query-auth-1",
				employeeNumber: "E-502",
				legalName: "Query Auth",
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		const denied = await getEmployeeById(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-query-auth-2",
				employeeId: created.data.id,
			},
			{
				store: ready.store,
				ports: ready.ports,
				authorization: createGrantingHumanResourcesAuthorization([]),
			},
		);
		expect(denied.ok).toBe(false);
		if (!denied.ok) {
			expect(denied.code).toBe("FORBIDDEN");
			expect(humanResourcesCodeFromResult(denied)).toBe(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			);
		}
	});

	it("resets memory store state between isolations", async () => {
		const store = createMemoryHumanResourcesStore();
		const ports = createMemoryMutationPorts();
		const authorization = createGrantingHumanResourcesAuthorization([
			...HUMAN_RESOURCES_PERMISSION_CODES,
		]);
		const created = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-reset-1",
				idempotencyKey: "idem-reset-1",
				employeeNumber: "E-RESET",
				legalName: "Reset Me",
			},
			{ store, ports, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		store.reset();
		const afterReset = await getEmployeeById(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-reset-2",
				employeeId: created.data.id,
			},
			{ store, ports, authorization },
		);
		expect(afterReset.ok).toBe(false);
		if (!afterReset.ok) {
			expect(afterReset.code).toBe("NOT_FOUND");
		}
	});
});
