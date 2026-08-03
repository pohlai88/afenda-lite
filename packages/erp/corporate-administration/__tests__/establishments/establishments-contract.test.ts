import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
	activateEstablishment,
	type CorporateAdministrationApprovalPort,
	type CorporateAdministrationAuthorizationPort,
	closeEstablishment,
	createMemoryStore,
	getEstablishment,
	listEstablishments,
	registerEstablishment,
	suspendEstablishment,
	updateEstablishment,
} from "../../src";
import { createMemoryMutationReceiptStore } from "../../src/kernel/execution/mutation-receipt.memory";

const ORG_A = randomUUID();
const ORG_B = randomUUID();
const ACTOR = randomUUID();

function allowAll(): CorporateAdministrationAuthorizationPort {
	return { can: () => Promise.resolve(true) };
}

function denyAll(): CorporateAdministrationAuthorizationPort {
	return { can: () => Promise.resolve(false) };
}

function approveAll(): CorporateAdministrationApprovalPort {
	return { verify: () => Promise.resolve(true) };
}

function declineAll(): CorporateAdministrationApprovalPort {
	return { verify: () => Promise.resolve(false) };
}

function baseInput() {
	return {
		organizationId: ORG_A,
		actorUserId: ACTOR,
		correlationId: randomUUID(),
		idempotencyKey: randomUUID(),
		legalCompanyId: randomUUID(),
		establishmentType: "branch" as const,
		jurisdictionCode: "MY",
		registrationIdentifier: "REG-001",
		displayName: "Kuala Lumpur Branch",
		registeredFrom: "2026-01-01",
		sourceDocumentId: "doc-001",
	};
}

function transitionInput() {
	return {
		organizationId: ORG_A,
		actorUserId: ACTOR,
		correlationId: randomUUID(),
		idempotencyKey: randomUUID(),
		sourceDocumentId: "doc-002",
	};
}

describe("establishments (memory)", () => {
	it("registers an establishment in registered status", async () => {
		const store = createMemoryStore();
		const authorization = allowAll();
		const mutationReceipts = createMemoryMutationReceiptStore();
		const result = await registerEstablishment(baseInput(), {
			store,
			authorization,
			mutationReceipts,
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.status).toBe("registered");
			expect(result.data.version).toBe(1);
		}
	});

	it("replays an idempotent retry without duplicate effects (BR-07)", async () => {
		const store = createMemoryStore();
		const authorization = allowAll();
		const mutationReceipts = createMemoryMutationReceiptStore();
		const input = baseInput();
		const first = await registerEstablishment(input, {
			store,
			authorization,
			mutationReceipts,
		});
		const replay = await registerEstablishment(input, {
			store,
			authorization,
			mutationReceipts,
		});
		expect(first.ok).toBe(true);
		expect(replay.ok).toBe(true);
		if (first.ok && replay.ok) {
			expect(replay.data.id).toBe(first.data.id);
		}
		const list = await listEstablishments(
			{ organizationId: ORG_A, actorUserId: ACTOR, limit: 50 },
			{ store, authorization, mutationReceipts },
		);
		expect(list.ok).toBe(true);
		if (list.ok) {
			expect(list.data.items).toHaveLength(1);
		}
	});

	it("rejects the same idempotency key reused with different input (BR-07 fingerprint mismatch)", async () => {
		const store = createMemoryStore();
		const authorization = allowAll();
		const mutationReceipts = createMemoryMutationReceiptStore();
		const input = baseInput();
		await registerEstablishment(input, {
			store,
			authorization,
			mutationReceipts,
		});
		const mismatched = await registerEstablishment(
			{ ...input, registrationIdentifier: "REG-999" },
			{ store, authorization, mutationReceipts },
		);
		expect(mismatched.ok).toBe(false);
		if (!mismatched.ok) {
			expect(mismatched.code).toBe("CONFLICT");
		}
	});

	it("rejects a duplicate natural key (org, jurisdiction, type, normalized identifier)", async () => {
		const store = createMemoryStore();
		const authorization = allowAll();
		const mutationReceipts = createMemoryMutationReceiptStore();
		await registerEstablishment(baseInput(), {
			store,
			authorization,
			mutationReceipts,
		});
		const dup = await registerEstablishment(
			{ ...baseInput(), registrationIdentifier: "reg 001" },
			{ store, authorization, mutationReceipts },
		);
		expect(dup.ok).toBe(false);
		if (!dup.ok) {
			expect(dup.code).toBe("CONFLICT");
		}
	});

	it("denies mutation without permission (BR-05)", async () => {
		const store = createMemoryStore();
		const mutationReceipts = createMemoryMutationReceiptStore();
		const result = await registerEstablishment(baseInput(), {
			store,
			authorization: denyAll(),
			mutationReceipts,
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("FORBIDDEN");
		}
	});

	it("rejects stale version on update (BR-03 concurrency)", async () => {
		const store = createMemoryStore();
		const authorization = allowAll();
		const mutationReceipts = createMemoryMutationReceiptStore();
		const registered = await registerEstablishment(baseInput(), {
			store,
			authorization,
			mutationReceipts,
		});
		if (!registered.ok) {
			throw new Error("setup failed");
		}
		const stale = await updateEstablishment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: randomUUID(),
				idempotencyKey: randomUUID(),
				id: registered.data.id,
				displayName: "Renamed",
				expectedVersion: 999,
			},
			{ store, authorization, mutationReceipts },
		);
		expect(stale.ok).toBe(false);
		if (!stale.ok) {
			expect(stale.code).toBe("CONCURRENCY_CONFLICT");
		}
	});

	it("fails closed on activate with no mutation when no approval verifier is configured", async () => {
		const store = createMemoryStore();
		const authorization = allowAll();
		const mutationReceipts = createMemoryMutationReceiptStore();
		const registered = await registerEstablishment(baseInput(), {
			store,
			authorization,
			mutationReceipts,
		});
		if (!registered.ok) {
			throw new Error("setup failed");
		}

		const activateResult = await activateEstablishment(
			{
				...transitionInput(),
				id: registered.data.id,
				effectiveFrom: "2026-02-01",
				expectedVersion: registered.data.version,
			},
			{ store, authorization, mutationReceipts },
		);
		expect(activateResult.ok).toBe(false);
		if (!activateResult.ok) {
			expect(activateResult.code).toBe("SERVICE_UNAVAILABLE");
		}

		const unchanged = await getEstablishment(
			{ organizationId: ORG_A, actorUserId: ACTOR, id: registered.data.id },
			{ store, authorization, mutationReceipts },
		);
		expect(unchanged.ok).toBe(true);
		if (unchanged.ok) {
			expect(unchanged.data?.status).toBe("registered");
			expect(unchanged.data?.version).toBe(1);
		}
	});

	it("declines activation when the approval verifier rejects it, with no mutation", async () => {
		const store = createMemoryStore();
		const authorization = allowAll();
		const mutationReceipts = createMemoryMutationReceiptStore();
		const registered = await registerEstablishment(baseInput(), {
			store,
			authorization,
			mutationReceipts,
		});
		if (!registered.ok) {
			throw new Error("setup failed");
		}

		const declined = await activateEstablishment(
			{
				...transitionInput(),
				id: registered.data.id,
				effectiveFrom: "2026-02-01",
				expectedVersion: registered.data.version,
			},
			{ store, authorization, mutationReceipts, approval: declineAll() },
		);
		expect(declined.ok).toBe(false);
		if (!declined.ok) {
			expect(declined.code).toBe("FORBIDDEN");
		}

		const unchanged = await getEstablishment(
			{ organizationId: ORG_A, actorUserId: ACTOR, id: registered.data.id },
			{ store, authorization, mutationReceipts },
		);
		expect(unchanged.ok).toBe(true);
		if (unchanged.ok) {
			expect(unchanged.data?.status).toBe("registered");
		}
	});

	it("walks the allowed lifecycle: registered -> active -> suspended -> closed (BR-04)", async () => {
		const store = createMemoryStore();
		const authorization = allowAll();
		const mutationReceipts = createMemoryMutationReceiptStore();
		const approval = approveAll();
		const registered = await registerEstablishment(baseInput(), {
			store,
			authorization,
			mutationReceipts,
		});
		if (!registered.ok) {
			throw new Error("setup failed");
		}

		const activated = await activateEstablishment(
			{
				...transitionInput(),
				id: registered.data.id,
				effectiveFrom: "2026-02-01",
				expectedVersion: registered.data.version,
			},
			{ store, authorization, mutationReceipts, approval },
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			throw new Error("activate failed");
		}
		expect(activated.data.status).toBe("active");

		const suspended = await suspendEstablishment(
			{
				...transitionInput(),
				id: registered.data.id,
				effectiveFrom: "2026-03-01",
				reason: "under review",
				expectedVersion: activated.data.version,
			},
			{ store, authorization, mutationReceipts },
		);
		expect(suspended.ok).toBe(true);
		if (!suspended.ok) {
			throw new Error("suspend failed");
		}
		expect(suspended.data.status).toBe("suspended");

		const closed = await closeEstablishment(
			{
				...transitionInput(),
				id: registered.data.id,
				effectiveFrom: "2026-04-01",
				expectedVersion: suspended.data.version,
			},
			{ store, authorization, mutationReceipts },
		);
		expect(closed.ok).toBe(true);
		if (!closed.ok) {
			throw new Error("close failed");
		}
		expect(closed.data.status).toBe("closed");

		const reopenAttempt = await activateEstablishment(
			{
				...transitionInput(),
				id: registered.data.id,
				effectiveFrom: "2026-05-01",
				expectedVersion: closed.data.version,
			},
			{ store, authorization, mutationReceipts, approval },
		);
		expect(reopenAttempt.ok).toBe(false);
		if (!reopenAttempt.ok) {
			expect(reopenAttempt.code).toBe("CONFLICT");
		}
	});

	it("supersedes the previous open-ended status history row on transition (BR-09 chronology)", async () => {
		const store = createMemoryStore();
		const authorization = allowAll();
		const mutationReceipts = createMemoryMutationReceiptStore();
		const approval = approveAll();
		const registered = await registerEstablishment(baseInput(), {
			store,
			authorization,
			mutationReceipts,
		});
		if (!registered.ok) {
			throw new Error("setup failed");
		}

		await activateEstablishment(
			{
				...transitionInput(),
				id: registered.data.id,
				effectiveFrom: "2026-02-01",
				expectedVersion: registered.data.version,
			},
			{ store, authorization, mutationReceipts, approval },
		);

		const history = await store.listEstablishmentStatusHistory({
			organizationId: ORG_A,
			establishmentId: registered.data.id,
		});
		expect(history.ok).toBe(true);
		if (!history.ok) {
			throw new Error("history lookup failed");
		}
		expect(history.data).toHaveLength(2);
		const registeredEntry = history.data.find(
			(entry) => entry.status === "registered",
		);
		const activeEntry = history.data.find((entry) => entry.status === "active");
		expect(registeredEntry?.effectiveTo).toBe("2026-02-01");
		expect(activeEntry?.effectiveTo).toBeNull();
	});

	it("does not disclose cross-tenant existence (BR-01 tenancy)", async () => {
		const store = createMemoryStore();
		const authorization = allowAll();
		const mutationReceipts = createMemoryMutationReceiptStore();
		const registered = await registerEstablishment(baseInput(), {
			store,
			authorization,
			mutationReceipts,
		});
		if (!registered.ok) {
			throw new Error("setup failed");
		}

		const crossTenantGet = await getEstablishment(
			{ organizationId: ORG_B, actorUserId: ACTOR, id: registered.data.id },
			{ store, authorization, mutationReceipts },
		);
		expect(crossTenantGet.ok).toBe(true);
		if (crossTenantGet.ok) {
			expect(crossTenantGet.data).toBeNull();
		}
	});

	it("lists establishments scoped to organization with cursor pagination", async () => {
		const store = createMemoryStore();
		const authorization = allowAll();
		const mutationReceipts = createMemoryMutationReceiptStore();
		await Promise.all(
			[0, 1, 2].map((i) =>
				registerEstablishment(
					{ ...baseInput(), registrationIdentifier: `REG-00${i}` },
					{ store, authorization, mutationReceipts },
				),
			),
		);
		const firstPage = await listEstablishments(
			{ organizationId: ORG_A, actorUserId: ACTOR, limit: 2 },
			{ store, authorization, mutationReceipts },
		);
		expect(firstPage.ok).toBe(true);
		if (!firstPage.ok) {
			throw new Error("list failed");
		}
		expect(firstPage.data.items).toHaveLength(2);
		expect(firstPage.data.nextCursor).toBeDefined();

		const secondPage = await listEstablishments(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				limit: 2,
				cursor: firstPage.data.nextCursor,
			},
			{ store, authorization, mutationReceipts },
		);
		expect(secondPage.ok).toBe(true);
		if (!secondPage.ok) {
			throw new Error("list failed");
		}
		expect(secondPage.data.items).toHaveLength(1);
	});
});
