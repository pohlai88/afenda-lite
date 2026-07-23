import { describe, expect, it } from "vitest";

import { registerEmployeeDocument } from "../src/compliance/employee-document";
import { recordWorkEligibility } from "../src/compliance/work-eligibility";
import { createEmployee } from "../src/core/employee";
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../src/permissions";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

describe("event replay and consumer idempotency", () => {
	it("command idempotency replay does not append a second outbox event", async () => {
		const ports = createMemoryMutationPorts();
		const ready = createTestHumanResourcesCommandOptions({
			store: createMemoryHumanResourcesStore(),
			ports,
			authorization: createGrantingHumanResourcesAuthorization([
				...HUMAN_RESOURCES_PERMISSION_CODES,
			]),
		});

		const emp = await createEmployee(
			{
				organizationId: "org-replay-cmd",
				actorUserId: "user-replay-cmd",
				correlationId: "corr-seed",
				idempotencyKey: "idem-seed-replay",
				employeeNumber: "E-REPLAY",
				legalName: "Replay Worker",
			},
			ready,
		);
		expect(emp.ok).toBe(true);
		if (!emp.ok) return;

		const payload = {
			organizationId: "org-replay-cmd",
			actorUserId: "user-replay-cmd",
			correlationId: "corr-reg-1",
			employeeId: emp.data.id,
			documentType: "passport",
			issuedOn: "2026-01-01",
			expiresOn: "2030-01-01",
			documentRef: "vault://passport/replay",
			idempotencyKey: "idem-reg-replay",
		};

		ports.outbox.calls.length = 0;
		const first = await registerEmployeeDocument(payload, ready);
		expect(first.ok).toBe(true);
		const count = ports.outbox.calls.length;
		expect(count).toBeGreaterThan(0);

		const replay = await registerEmployeeDocument(
			{ ...payload, correlationId: "corr-reg-2" },
			ready,
		);
		expect(replay.ok).toBe(true);
		expect(ports.outbox.calls.length).toBe(count);
	});

	it("work eligibility idempotent record replay does not double-audit", async () => {
		const ports = createMemoryMutationPorts();
		const ready = createTestHumanResourcesCommandOptions({
			store: createMemoryHumanResourcesStore(),
			ports,
			authorization: createGrantingHumanResourcesAuthorization([
				...HUMAN_RESOURCES_PERMISSION_CODES,
			]),
		});

		const emp = await createEmployee(
			{
				organizationId: "org-replay-we",
				actorUserId: "user-replay-we",
				correlationId: "corr-seed-we",
				idempotencyKey: "idem-seed-we-replay",
				employeeNumber: "E-REPLAY-WE",
				legalName: "Replay WE",
			},
			ready,
		);
		expect(emp.ok).toBe(true);
		if (!emp.ok) return;

		const payload = {
			organizationId: "org-replay-we",
			actorUserId: "user-replay-we",
			correlationId: "corr-we-1",
			employeeId: emp.data.id,
			countryCode: "US",
			issuedOn: "2026-01-01",
			expiresOn: "2027-01-01",
			idempotencyKey: "idem-we-replay",
		};

		ports.audit.calls.length = 0;
		const first = await recordWorkEligibility(payload, ready);
		expect(first.ok).toBe(true);
		const auditCount = ports.audit.calls.length;
		expect(auditCount).toBeGreaterThan(0);

		const replay = await recordWorkEligibility(
			{ ...payload, correlationId: "corr-we-2" },
			ready,
		);
		expect(replay.ok).toBe(true);
		expect(ports.audit.calls.length).toBe(auditCount);
	});
});
