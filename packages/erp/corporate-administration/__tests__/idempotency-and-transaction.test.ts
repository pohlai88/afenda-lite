import { randomUUID } from "node:crypto";

import type {
	CorporateAdministrationIdempotencyBeginOutcome,
	CorporateAdministrationIdempotencyPort,
	CorporateAdministrationIdempotencyScope,
	CorporateAdministrationTransactionContext,
} from "@afenda/corporate-administration";
import {
	commandFingerprintSchema,
	commitCorporateAdministrationTransaction,
	createCorporateAdministrationDomainEventEnvelope,
	idempotencyKeySchema,
	idempotencyReservationTokenSchema,
	organizationIdSchema,
	rollbackCorporateAdministrationTransaction,
} from "@afenda/corporate-administration";
import {
	type CorporateAdministrationNeonTransactionExecutor,
	createDrizzleCorporateAdministrationIdempotencyPort,
	createDrizzleCorporateAdministrationOutboxPort,
	createDrizzleCorporateAdministrationTransactionPort,
} from "@afenda/corporate-administration/adapters/drizzle";
import { db, type NeonHttpSql, runNeonHttpTransaction } from "@afenda/db";
import { fail, ok } from "@afenda/errors/result";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInlineCorporateAdministrationTransactionPort } from "./helpers/inline-transaction";
import { createMemoryCorporateAdministrationIdempotencyPort } from "./helpers/memory-idempotency";
import {
	cleanupCorporateAdministrationInfrastructureTestData,
	countCorporateAdministrationMutationReceipts,
	countCorporateAdministrationOutboxEvents,
	createNeonCorporateAdministrationPendingEventAppender,
} from "./helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "./helpers/neon-parity";

const fingerprint = commandFingerprintSchema.parse("a".repeat(64));
const otherFingerprint = commandFingerprintSchema.parse("b".repeat(64));

function createDurableIdempotencyPort() {
	return createDrizzleCorporateAdministrationIdempotencyPort({
		database: db,
		createReservationToken: randomUUID,
		now: () => new Date(),
	});
}

function createDurableOutboxPort() {
	return createDrizzleCorporateAdministrationOutboxPort({
		appender: createNeonCorporateAdministrationPendingEventAppender(),
	});
}

function createDurableTransactionPort() {
	return createDrizzleCorporateAdministrationTransactionPort({
		execute: (buildQueries) => runNeonHttpTransaction(buildQueries),
	});
}

type IdempotencyHarness = Readonly<{
	port: CorporateAdministrationIdempotencyPort;
	scope: CorporateAdministrationIdempotencyScope;
	cleanup(): Promise<void>;
	countRows?(): Promise<number>;
}>;

function memoryHarness(): IdempotencyHarness {
	return {
		port: createMemoryCorporateAdministrationIdempotencyPort(),
		scope: scopeFor("memory"),
		async cleanup() {},
	};
}

function drizzleHarness(): IdempotencyHarness {
	const scope = scopeFor("drizzle");
	return {
		port: createDurableIdempotencyPort(),
		scope,
		async cleanup() {
			await cleanupCorporateAdministrationInfrastructureTestData(
				scope.organizationId,
			);
		},
		async countRows() {
			return countCorporateAdministrationMutationReceipts(scope);
		},
	};
}

function scopeFor(adapter: string): CorporateAdministrationIdempotencyScope {
	const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
	return {
		organizationId: organizationIdSchema.parse(
			`org-ca-idem-${adapter}-${suffix}`,
		),
		commandId: "test.create",
		idempotencyKey: idempotencyKeySchema.parse(`key-${suffix}`),
	};
}

function enqueueMutationReceiptReservation(
	context: CorporateAdministrationTransactionContext,
	scope: CorporateAdministrationIdempotencyScope,
	reservationToken = "tx-reservation-token",
): void {
	context.enqueue((database) => {
		const sql = database as NeonHttpSql;
		return sql`
			INSERT INTO ca_mutation_receipt (
				organization_id,
				command_id,
				idempotency_key,
				fingerprint,
				reservation_token,
				status
			)
			VALUES (
				${scope.organizationId},
				${scope.commandId},
				${scope.idempotencyKey},
				${fingerprint},
				${reservationToken},
				${"in_progress"}
			)
		`;
	});
}

async function beginOutcome(
	port: CorporateAdministrationIdempotencyPort,
	scope: CorporateAdministrationIdempotencyScope,
	inputFingerprint = fingerprint,
): Promise<CorporateAdministrationIdempotencyBeginOutcome> {
	const result = await port.begin({ scope, fingerprint: inputFingerprint });
	if (!result.ok) throw new Error("expected an idempotency decision");
	return result.data;
}

async function acquireToken(
	port: CorporateAdministrationIdempotencyPort,
	scope: CorporateAdministrationIdempotencyScope,
) {
	const outcome = await beginOutcome(port, scope);
	if (outcome.status !== "acquired") throw new Error("expected acquisition");
	return outcome.reservationToken;
}

async function expectReplay(
	port: CorporateAdministrationIdempotencyPort,
	scope: CorporateAdministrationIdempotencyScope,
	expected: unknown,
) {
	await expect(beginOutcome(port, scope)).resolves.toEqual({
		status: "replay",
		result: expected,
	});
}

function runIdempotencyContract(
	label: string,
	createHarness: () => IdempotencyHarness,
) {
	describe(`Corporate Administration idempotency contract (${label})`, () => {
		let harness: IdempotencyHarness;

		beforeEach(() => {
			harness = createHarness();
		});

		afterEach(async () => {
			await harness.cleanup();
		});

		it("acquires once and distinguishes in-progress from fingerprint conflict", async () => {
			const first = await beginOutcome(harness.port, harness.scope);
			expect(first.status).toBe("acquired");
			if (first.status === "acquired") {
				expect(first.reservationToken).toEqual(expect.any(String));
				expect(first.reservationToken.length).toBeGreaterThan(0);
			}

			expect(await beginOutcome(harness.port, harness.scope)).toEqual({
				status: "in_progress",
			});
			expect(
				await beginOutcome(harness.port, harness.scope, otherFingerprint),
			).toEqual({
				status: "conflict",
				existingFingerprint: fingerprint,
			});
		});

		it("isolates identical keys by organization and command", async () => {
			expect((await beginOutcome(harness.port, harness.scope)).status).toBe(
				"acquired",
			);
			expect(
				(
					await beginOutcome(harness.port, {
						...harness.scope,
						organizationId: organizationIdSchema.parse(
							`${harness.scope.organizationId}-other-org`,
						),
					})
				).status,
			).toBe("acquired");
			expect(
				(
					await beginOutcome(harness.port, {
						...harness.scope,
						commandId: "test.update",
					})
				).status,
			).toBe("acquired");
		});

		it("allows only the active owner to complete and makes completion replayable", async () => {
			const reservationToken = await acquireToken(harness.port, harness.scope);
			const replayResult = { id: "result_1", amounts: ["1.00"] };

			expect(
				await harness.port.complete({
					scope: harness.scope,
					fingerprint,
					reservationToken,
					result: replayResult,
				}),
			).toEqual(ok(undefined));

			await expectReplay(harness.port, harness.scope, replayResult);
			expect(
				await harness.port.complete({
					scope: harness.scope,
					fingerprint,
					reservationToken,
					result: { id: "changed" },
				}),
			).toMatchObject({ ok: false, code: "CONFLICT" });
			await expectReplay(harness.port, harness.scope, replayResult);
		});

		it("rejects wrong and stale completion tokens without changing fingerprint ownership", async () => {
			const firstToken = await acquireToken(harness.port, harness.scope);
			const wrongToken = idempotencyReservationTokenSchema.parse("wrong-token");

			expect(
				await harness.port.complete({
					scope: harness.scope,
					fingerprint,
					reservationToken: wrongToken,
					result: null,
				}),
			).toMatchObject({ ok: false, code: "CONFLICT" });
			expect(await beginOutcome(harness.port, harness.scope)).toEqual({
				status: "in_progress",
			});

			expect(
				await harness.port.complete({
					scope: harness.scope,
					fingerprint: otherFingerprint,
					reservationToken: firstToken,
					result: null,
				}),
			).toMatchObject({ ok: false, code: "CONFLICT" });
			expect(
				await beginOutcome(harness.port, harness.scope, otherFingerprint),
			).toEqual({
				status: "conflict",
				existingFingerprint: fingerprint,
			});

			expect(
				await harness.port.release({
					scope: harness.scope,
					fingerprint,
					reservationToken: firstToken,
				}),
			).toEqual(ok(undefined));
			const reacquired = await beginOutcome(harness.port, harness.scope);
			expect(reacquired.status).toBe("acquired");
			expect(
				await harness.port.complete({
					scope: harness.scope,
					fingerprint,
					reservationToken: firstToken,
					result: null,
				}),
			).toMatchObject({ ok: false, code: "CONFLICT" });
		});

		it("keeps repeated completion deterministic and replay unchanged", async () => {
			const reservationToken = await acquireToken(harness.port, harness.scope);
			const replayResult = { id: "result_2" };

			expect(
				await harness.port.complete({
					scope: harness.scope,
					fingerprint,
					reservationToken,
					result: replayResult,
				}),
			).toEqual(ok(undefined));
			expect(
				await harness.port.complete({
					scope: harness.scope,
					fingerprint,
					reservationToken,
					result: replayResult,
				}),
			).toMatchObject({ ok: false, code: "CONFLICT" });
			await expectReplay(harness.port, harness.scope, replayResult);
		});

		it("releases only by owner and preserves conflict evidence after reacquire", async () => {
			const reservationToken = await acquireToken(harness.port, harness.scope);

			expect(
				await harness.port.release({
					scope: harness.scope,
					fingerprint: otherFingerprint,
					reservationToken,
				}),
			).toMatchObject({ ok: false, code: "CONFLICT" });
			expect(await beginOutcome(harness.port, harness.scope)).toEqual({
				status: "in_progress",
			});

			expect(
				await harness.port.release({
					scope: harness.scope,
					fingerprint,
					reservationToken,
				}),
			).toEqual(ok(undefined));
			expect(
				await beginOutcome(harness.port, harness.scope, otherFingerprint),
			).toEqual({
				status: "conflict",
				existingFingerprint: fingerprint,
			});
			expect((await beginOutcome(harness.port, harness.scope)).status).toBe(
				"acquired",
			);
			expect(
				await harness.port.release({
					scope: harness.scope,
					fingerprint,
					reservationToken,
				}),
			).toMatchObject({ ok: false, code: "CONFLICT" });
		});

		it("does not treat failed execution release as completed", async () => {
			const reservationToken = await acquireToken(harness.port, harness.scope);

			expect(
				await harness.port.release({
					scope: harness.scope,
					fingerprint,
					reservationToken,
				}),
			).toEqual(ok(undefined));
			expect((await beginOutcome(harness.port, harness.scope)).status).toBe(
				"acquired",
			);
		});
	});
}

runIdempotencyContract("memory", memoryHarness);

describe("Corporate Administration Neon parity gate", () => {
	it("makes exact skip conditions visible", () => {
		expect(CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON).toMatch(
			/^(running|skipped|blocked):/,
		);
	});
});

describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	"Corporate Administration idempotency contract (durable Neon)",
	() => {
		const cleanupOrganizations = new Set<string>();

		afterEach(async () => {
			for (const org of cleanupOrganizations) {
				await cleanupCorporateAdministrationInfrastructureTestData(org);
			}
			cleanupOrganizations.clear();
		});

		runIdempotencyContract("durable Neon", drizzleHarness);

		it("allows exactly one concurrent first reservation without duplicate rows", async () => {
			const harness = drizzleHarness();
			cleanupOrganizations.add(harness.scope.organizationId);
			const ready = Promise.withResolvers<void>();
			const started: boolean[] = [];

			async function beginAfterBarrier() {
				started.push(true);
				await ready.promise;
				return harness.port.begin({ scope: harness.scope, fingerprint });
			}

			try {
				const attempts = [beginAfterBarrier(), beginAfterBarrier()] as const;
				await vi.waitFor(() => expect(started).toHaveLength(2));
				ready.resolve();
				const outcomes = await Promise.all(attempts);
				const successes = outcomes.filter(
					(result) => result.ok && result.data.status === "acquired",
				);
				const nonAcquired = outcomes.filter(
					(result) => result.ok && result.data.status !== "acquired",
				);

				expect(outcomes.every((result) => result.ok)).toBe(true);
				expect(successes).toHaveLength(1);
				expect(nonAcquired).toHaveLength(1);
				expect(nonAcquired[0]?.ok && nonAcquired[0].data).toEqual({
					status: "in_progress",
				});
				await expect(harness.countRows?.()).resolves.toBe(1);
			} finally {
				await harness.cleanup();
			}
		});
	},
);

describe("Corporate Administration idempotency unavailable store contract", () => {
	const scope = scopeFor("unavailable");

	it("does not disguise infrastructure failure as an idempotency decision", async () => {
		const unavailable: CorporateAdministrationIdempotencyPort = Object.freeze({
			begin: async () =>
				fail("SERVICE_UNAVAILABLE", "Idempotency store is unavailable"),
			complete: async () =>
				fail("SERVICE_UNAVAILABLE", "Idempotency store is unavailable"),
			release: async () =>
				fail("SERVICE_UNAVAILABLE", "Idempotency store is unavailable"),
		});

		expect(await unavailable.begin({ scope, fingerprint })).toMatchObject({
			ok: false,
			code: "SERVICE_UNAVAILABLE",
		});
	});
});

describe("Corporate Administration transaction contract", () => {
	it("preserves success and domain failure and executes work exactly once", async () => {
		const transaction = createInlineCorporateAdministrationTransactionPort();
		const successWork = vi
			.fn()
			.mockResolvedValue(
				commitCorporateAdministrationTransaction(ok({ id: "result_1" })),
			);
		const failure = fail("CONFLICT", "Version conflict");
		const failureWork = vi
			.fn()
			.mockResolvedValue(rollbackCorporateAdministrationTransaction(failure));

		expect(await transaction.run(successWork)).toEqual(ok({ id: "result_1" }));
		expect(successWork).toHaveBeenCalledTimes(1);
		expect(await transaction.run(failureWork)).toBe(failure);
		expect(failureWork).toHaveBeenCalledTimes(1);
	});

	it("enforces selected failed-Result policy and closes context after completion", async () => {
		const transaction = createInlineCorporateAdministrationTransactionPort();
		const failure = fail("CONFLICT", "Version conflict");
		let capturedContext: CorporateAdministrationTransactionContext | undefined;

		expect(
			await transaction.run(async (context) => {
				capturedContext = context;
				context.enqueue(() => "queued");
				return rollbackCorporateAdministrationTransaction(failure);
			}),
		).toBe(failure);

		expect(capturedContext?.statementCount).toBe(1);
		expect(() => capturedContext?.enqueue(() => "late")).toThrow(
			"Corporate Administration transaction context is closed",
		);
		expect(
			await transaction.run(async () =>
				commitCorporateAdministrationTransaction(failure),
			),
		).toBe(failure);
	});

	it("propagates infrastructure exceptions and explicitly prohibits nesting", async () => {
		const transaction = createInlineCorporateAdministrationTransactionPort();
		const infrastructureFailure = new Error("database unavailable");
		await expect(
			transaction.run(async () => {
				throw infrastructureFailure;
			}),
		).rejects.toBe(infrastructureFailure);
		await expect(
			transaction.run(() =>
				transaction.run(async () =>
					commitCorporateAdministrationTransaction(ok(undefined)),
				),
			),
		).rejects.toThrow(
			"Nested Corporate Administration transactions are prohibited",
		);
	});

	it("allows independent concurrent durable transactions while rejecting true nesting", async () => {
		const bothStarted = Promise.withResolvers<void>();
		let started = 0;
		const execute: CorporateAdministrationNeonTransactionExecutor = vi.fn(
			async (buildQueries) => {
				buildQueries({} as NeonHttpSql);
			},
		);
		const transaction = createDrizzleCorporateAdministrationTransactionPort({
			execute,
		});

		async function overlappingWork(
			context: CorporateAdministrationTransactionContext,
		) {
			started += 1;
			if (started === 2) bothStarted.resolve();
			await bothStarted.promise;
			context.enqueue(() => Promise.resolve());
			return commitCorporateAdministrationTransaction(ok(started));
		}

		const results = await Promise.all([
			transaction.run(overlappingWork),
			transaction.run(overlappingWork),
		]);

		expect(results.every((result) => result.ok)).toBe(true);
		expect(execute).toHaveBeenCalledTimes(2);
		await expect(
			transaction.run(async () => {
				await transaction.run(async () =>
					commitCorporateAdministrationTransaction(ok(undefined)),
				);
				return commitCorporateAdministrationTransaction(ok(undefined));
			}),
		).rejects.toThrow(
			"Nested Corporate Administration transactions are prohibited",
		);
	});

	it("rejects invalid runtime outcomes before executing queued statements", async () => {
		const execute: CorporateAdministrationNeonTransactionExecutor = vi.fn();
		const transaction = createDrizzleCorporateAdministrationTransactionPort({
			execute,
		});

		await expect(
			transaction.run(async (context) => {
				context.enqueue(() => Promise.resolve());
				return {
					effect: "unexpected",
					result: ok(undefined),
				} as never;
			}),
		).rejects.toThrow(
			"Corporate Administration transaction outcome is invalid",
		);
		expect(execute).not.toHaveBeenCalled();
	});
});

describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	"Corporate Administration transaction contract (durable Neon)",
	() => {
		const cleanupOrganizations = new Set<string>();

		afterEach(async () => {
			for (const org of cleanupOrganizations) {
				await cleanupCorporateAdministrationInfrastructureTestData(org);
			}
			cleanupOrganizations.clear();
		});

		it("commits idempotency reservation and outbox insert together", async () => {
			const scope = scopeFor("tx-commit");
			cleanupOrganizations.add(scope.organizationId);
			const transaction = createDurableTransactionPort();
			const outbox = createDurableOutboxPort();
			const event = createCorporateAdministrationDomainEventEnvelope({
				eventId: `event-${scope.idempotencyKey}`,
				eventType: "corporate_administration.test_entity.created.v1",
				organizationId: scope.organizationId,
				aggregateType: "test_entity",
				aggregateId: "entity_1",
				aggregateVersion: 1,
				occurredAt: "2026-07-26T10:00:00.000Z",
				actorUserId: "user_1",
				correlationId: "corr_1",
				payload: { id: "entity_1" },
			});

			try {
				const result = await transaction.run(async (context) => {
					enqueueMutationReceiptReservation(context, scope);
					const outboxResult = await outbox.append([event], {
						transaction: context,
					});
					if (!outboxResult.ok) {
						return rollbackCorporateAdministrationTransaction(outboxResult);
					}
					return commitCorporateAdministrationTransaction(ok("committed"));
				});

				expect(result).toEqual(ok("committed"));
				await expect(
					countCorporateAdministrationMutationReceipts(scope),
				).resolves.toBe(1);
				await expect(
					countCorporateAdministrationOutboxEvents(scope.organizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					scope.organizationId,
				);
			}
		});

		it("rolls back idempotency reservation and outbox insert together", async () => {
			const scope = scopeFor("tx-rollback");
			cleanupOrganizations.add(scope.organizationId);
			const transaction = createDurableTransactionPort();
			const outbox = createDurableOutboxPort();
			const event = createCorporateAdministrationDomainEventEnvelope({
				eventId: `event-${scope.idempotencyKey}`,
				eventType: "corporate_administration.test_entity.created.v1",
				organizationId: scope.organizationId,
				aggregateType: "test_entity",
				aggregateId: "entity_1",
				aggregateVersion: 1,
				occurredAt: "2026-07-26T10:00:00.000Z",
				actorUserId: "user_1",
				correlationId: "corr_1",
				payload: { id: "entity_1" },
			});
			const governedFailure = fail("CONFLICT", "Synthetic rollback");

			try {
				const result = await transaction.run(async (context) => {
					enqueueMutationReceiptReservation(context, scope);
					const outboxResult = await outbox.append([event], {
						transaction: context,
					});
					if (!outboxResult.ok) {
						return rollbackCorporateAdministrationTransaction(outboxResult);
					}
					return rollbackCorporateAdministrationTransaction(governedFailure);
				});

				expect(result).toBe(governedFailure);
				await expect(
					countCorporateAdministrationMutationReceipts(scope),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationOutboxEvents(scope.organizationId),
				).resolves.toBe(0);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					scope.organizationId,
				);
			}
		});

		it("rolls back partial writes when a later transactional statement fails", async () => {
			const scope = scopeFor("tx-partial");
			cleanupOrganizations.add(scope.organizationId);
			const transaction = createDurableTransactionPort();
			const outbox = createDurableOutboxPort();
			const event = createCorporateAdministrationDomainEventEnvelope({
				eventId: `event-${scope.idempotencyKey}`,
				eventType: "corporate_administration.test_entity.created.v1",
				organizationId: scope.organizationId,
				aggregateType: "test_entity",
				aggregateId: "entity_1",
				aggregateVersion: 1,
				occurredAt: "2026-07-26T10:00:00.000Z",
				actorUserId: "user_1",
				correlationId: "corr_1",
				payload: { id: "entity_1" },
			});

			try {
				const result = await transaction.run(async (context) => {
					const outboxResult = await outbox.append([event], {
						transaction: context,
					});
					if (!outboxResult.ok) {
						return rollbackCorporateAdministrationTransaction(outboxResult);
					}
					context.enqueue((database) => {
						const sql = database as NeonHttpSql;
						return sql`INSERT INTO ca_transaction_missing_table (id) VALUES (${randomUUID()})`;
					});
					return commitCorporateAdministrationTransaction(ok("unreachable"));
				});

				expect(result).toMatchObject({ ok: false });
				await expect(
					countCorporateAdministrationOutboxEvents(scope.organizationId),
				).resolves.toBe(0);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					scope.organizationId,
				);
			}
		});
	},
);
