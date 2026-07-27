import {
	type CorporateAdministrationProductionRuntimeDependencies,
	createCorporateAdministrationProductionRuntime,
} from "@afenda/corporate-administration";
import { describe, expect, it, vi } from "vitest";
import { createFixedCorporateAdministrationClock } from "./helpers/fixed-clock";
import { createMemoryCorporateAdministrationAuditFactPort } from "./helpers/memory-audit";
import { createMemoryCorporateAdministrationIdempotencyPort } from "./helpers/memory-idempotency";
import { createMemoryCorporateAdministrationOutboxPort } from "./helpers/memory-outbox";

describe("Corporate Administration production runtime composition", () => {
	function dependencies(): CorporateAdministrationProductionRuntimeDependencies {
		return {
			clock: createFixedCorporateAdministrationClock(
				"2026-07-26T16:30:00.000Z",
			),
			transaction: {
				nesting: "prohibited",
				run: vi.fn(),
			},
			idempotency: createMemoryCorporateAdministrationIdempotencyPort(),
			audit: createMemoryCorporateAdministrationAuditFactPort(),
			outbox: createMemoryCorporateAdministrationOutboxPort(),
		};
	}

	it("validates already-created dependencies and returns a readonly runtime", () => {
		const input = dependencies();
		const runtime = createCorporateAdministrationProductionRuntime(input);

		expect(runtime).toEqual(input);
		expect(runtime.clock).toBe(input.clock);
		expect(runtime.transaction).toBe(input.transaction);
		expect(runtime.idempotency).toBe(input.idempotency);
		expect(runtime.audit).toBe(input.audit);
		expect(runtime.outbox).toBe(input.outbox);
		expect(Object.isFrozen(runtime)).toBe(true);
	});

	it("rejects missing, unknown, or non-durable dependency shapes", () => {
		const input = dependencies();

		for (const invalid of [
			{},
			{ ...input, audit: undefined },
			{ ...input, outbox: {} },
			{ ...input, idempotency: { begin: vi.fn() } },
			{ ...input, transaction: { nesting: "savepoint", run: vi.fn() } },
			{ ...input, allowAllAuthorization: true },
		]) {
			expect(() =>
				createCorporateAdministrationProductionRuntime(invalid),
			).toThrow();
		}
	});
});
