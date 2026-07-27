import { randomUUID } from "node:crypto";

import { ok, type Result } from "@afenda/errors/result";

import type {
	AuditFactInput,
	AuditFactPort,
	ClockPort,
	MutationPorts,
	OutboxFactInput,
	OutboxPort,
} from "../../src/ports";

/** In-memory audit port for Vitest — records calls for assertions. */
export function createMemoryAuditPort(): AuditFactPort & {
	calls: AuditFactInput[];
	reset(): void;
} {
	const calls: AuditFactInput[] = [];
	return {
		calls,
		reset() {
			calls.length = 0;
		},
		async record(input: AuditFactInput): Promise<Result<{ id: string }>> {
			calls.push(input);
			return ok({ id: randomUUID() });
		},
	};
}

/** In-memory outbox port for Vitest — records calls for assertions. */
export function createMemoryOutboxPort(): OutboxPort & {
	calls: OutboxFactInput[];
	reset(): void;
} {
	const calls: OutboxFactInput[] = [];
	return {
		calls,
		reset() {
			calls.length = 0;
		},
		async append(input: OutboxFactInput): Promise<Result<{ id: string }>> {
			calls.push(input);
			return ok({ id: randomUUID() });
		},
	};
}

export function createMemoryMutationPorts(): MutationPorts & {
	audit: ReturnType<typeof createMemoryAuditPort>;
	outbox: ReturnType<typeof createMemoryOutboxPort>;
	clock: ClockPort & {
		current: Date;
		set(value: Date): void;
	};
} {
	const audit = createMemoryAuditPort();
	const outbox = createMemoryOutboxPort();
	const clock = {
		current: new Date("2026-01-01T00:00:00.000Z"),
		now() {
			return new Date(this.current);
		},
		set(value: Date) {
			this.current = new Date(value);
		},
	};
	return { audit, outbox, clock };
}
