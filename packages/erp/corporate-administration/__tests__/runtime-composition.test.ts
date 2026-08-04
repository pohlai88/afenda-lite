import type {
	CorporateAdministrationCommandOptions,
	CorporateAdministrationRuntimePorts,
} from "@afenda/corporate-administration";
import {
	CORPORATE_ADMINISTRATION_EVENT_TYPES,
	corporateAdministrationModuleManifest,
	createCorporateAdministrationRuntime,
} from "@afenda/corporate-administration";
import { createMemoryCorporateAdministrationObservabilityPort } from "@afenda/corporate-administration/testing";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { createFixedCorporateAdministrationClock } from "./helpers/fixed-clock";
import { createInlineCorporateAdministrationTransactionPort } from "./helpers/inline-transaction";
import { createMemoryCorporateAdministrationAuditFactPort } from "./helpers/memory-audit";
import { createMemoryCorporateAdministrationIdempotencyPort } from "./helpers/memory-idempotency";
import { createMemoryCorporateAdministrationOutboxPort } from "./helpers/memory-outbox";

describe("Corporate Administration runtime composition", () => {
	function ports(): CorporateAdministrationRuntimePorts {
		return {
			clock: createFixedCorporateAdministrationClock(
				"2026-07-26T16:30:00.000Z",
			),
			transaction: createInlineCorporateAdministrationTransactionPort(),
			idempotency: createMemoryCorporateAdministrationIdempotencyPort(),
			audit: createMemoryCorporateAdministrationAuditFactPort(),
			outbox: createMemoryCorporateAdministrationOutboxPort(),
			observability: createMemoryCorporateAdministrationObservabilityPort(),
		};
	}

	it("requires every runtime port without installing fallbacks", () => {
		const input = ports();
		const { observability: _observability, ...withoutObservability } = input;
		const runtime = createCorporateAdministrationRuntime(input);
		expect(runtime.clock).toBe(input.clock);
		expect(runtime.transaction).toBe(input.transaction);
		expect(runtime.idempotency).toBe(input.idempotency);
		expect(runtime.audit).toBe(input.audit);
		expect(runtime.outbox).toBe(input.outbox);
		expect(runtime.observability).toBe(input.observability);
		expect(Object.isFrozen(runtime)).toBe(true);
		expect(() =>
			createCorporateAdministrationRuntime(withoutObservability),
		).toThrow();

		for (const incomplete of [
			{},
			{ clock: input.clock },
			{ clock: input.clock, transaction: input.transaction },
			{ clock: input.clock, idempotency: input.idempotency },
			{
				clock: input.clock,
				transaction: input.transaction,
				idempotency: input.idempotency,
			},
			{
				clock: input.clock,
				transaction: input.transaction,
				idempotency: input.idempotency,
				outbox: input.outbox,
			},
		]) {
			expect(() => createCorporateAdministrationRuntime(incomplete)).toThrow();
		}
	});

	it("rejects unsupported nesting, missing methods, and unknown top-level ports", () => {
		const input = ports();
		expect(() =>
			createCorporateAdministrationRuntime({
				...input,
				transaction: { nesting: "savepoint", run: vi.fn() },
			}),
		).toThrow();
		expect(() =>
			createCorporateAdministrationRuntime({
				...input,
				idempotency: { begin: vi.fn(), complete: vi.fn() },
			}),
		).toThrow();
		expect(() =>
			createCorporateAdministrationRuntime({
				...input,
				outbox: {},
			}),
		).toThrow();
		expect(() =>
			createCorporateAdministrationRuntime({
				...input,
				audit: {},
			}),
		).toThrow();
		expect(() =>
			createCorporateAdministrationRuntime({
				...input,
				observability: {},
			}),
		).toThrow();
		expect(() =>
			createCorporateAdministrationRuntime({
				...input,
				unapprovedPort: {},
			}),
		).toThrow();
	});

	it("does not invoke ports during composition", () => {
		const clock = {
			now: vi.fn(() => new Date("2026-07-26T00:00:00.000Z")),
			today: vi.fn(() => "2026-07-26" as const),
		};
		const transaction = {
			nesting: "prohibited" as const,
			run: vi.fn(),
		};
		const idempotency = {
			begin: vi.fn(),
			complete: vi.fn(),
			release: vi.fn(),
		};
		const outbox = {
			append: vi.fn(),
		};
		const audit = {
			record: vi.fn(),
		};
		const observability = {
			recordOperation: vi.fn(),
		};

		createCorporateAdministrationRuntime({
			clock,
			transaction,
			idempotency,
			audit,
			outbox,
			observability,
		});

		expect(clock.now).not.toHaveBeenCalled();
		expect(clock.today).not.toHaveBeenCalled();
		expect(transaction.run).not.toHaveBeenCalled();
		expect(idempotency.begin).not.toHaveBeenCalled();
		expect(idempotency.complete).not.toHaveBeenCalled();
		expect(idempotency.release).not.toHaveBeenCalled();
		expect(audit.record).not.toHaveBeenCalled();
		expect(outbox.append).not.toHaveBeenCalled();
		expect(observability.recordOperation).not.toHaveBeenCalled();
	});

	it("is deterministic and contains infrastructure only", () => {
		const input = ports();
		expect(createCorporateAdministrationRuntime(input)).toEqual(
			createCorporateAdministrationRuntime(input),
		);
		expect(
			Object.keys(createCorporateAdministrationRuntime(input)).sort(),
		).toEqual([
			"audit",
			"clock",
			"idempotency",
			"observability",
			"outbox",
			"transaction",
		]);
		expect(corporateAdministrationModuleManifest.events.emits).toEqual(
			CORPORATE_ADMINISTRATION_EVENT_TYPES,
		);
	});

	it("uses composed runtime model while caller context requires authorization", () => {
		expectTypeOf<CorporateAdministrationCommandOptions>().not.toHaveProperty(
			"clock",
		);
		expectTypeOf<CorporateAdministrationCommandOptions>().not.toHaveProperty(
			"transaction",
		);
		expectTypeOf<CorporateAdministrationCommandOptions>().not.toHaveProperty(
			"idempotency",
		);
		expectTypeOf<CorporateAdministrationCommandOptions>().toHaveProperty(
			"authorization",
		);
		expectTypeOf<CorporateAdministrationCommandOptions>().toHaveProperty(
			"idempotencyKey",
		);
		expectTypeOf<CorporateAdministrationCommandOptions>().toHaveProperty(
			"causationId",
		);
	});

	it("keeps request facts out of composed runtime infrastructure", () => {
		expectTypeOf<CorporateAdministrationRuntimePorts>().not.toHaveProperty(
			"organizationId",
		);
		expectTypeOf<CorporateAdministrationRuntimePorts>().not.toHaveProperty(
			"actorUserId",
		);
		expectTypeOf<CorporateAdministrationRuntimePorts>().not.toHaveProperty(
			"correlationId",
		);
		expectTypeOf<CorporateAdministrationRuntimePorts>().not.toHaveProperty(
			"authorization",
		);
		expectTypeOf<CorporateAdministrationRuntimePorts>().not.toHaveProperty(
			"idempotencyKey",
		);
	});
});
