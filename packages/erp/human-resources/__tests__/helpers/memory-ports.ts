import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import type {
	AuditFactInput,
	AuditFactPort,
	MutationPorts,
	OutboxFactInput,
	OutboxPort,
} from "../../src/ports";

export function createMemoryAuditPort(options?: {
	failAfter?: number;
}): AuditFactPort & {
	calls: AuditFactInput[];
} {
	const calls: AuditFactInput[] = [];
	let remaining =
		options?.failAfter === undefined
			? Number.POSITIVE_INFINITY
			: options.failAfter;
	return {
		calls,
		async record(input: AuditFactInput): Promise<Result<{ id: string }>> {
			calls.push(input);
			if (remaining <= 0) {
				return fail("INTERNAL_ERROR", "audit port failed");
			}
			remaining -= 1;
			return ok({ id: randomUUID() });
		},
	};
}

export function createMemoryOutboxPort(options?: {
	failAfter?: number;
}): OutboxPort & {
	calls: OutboxFactInput[];
} {
	const calls: OutboxFactInput[] = [];
	let remaining =
		options?.failAfter === undefined
			? Number.POSITIVE_INFINITY
			: options.failAfter;
	return {
		calls,
		async append(input: OutboxFactInput): Promise<Result<{ id: string }>> {
			calls.push(input);
			if (remaining <= 0) {
				return fail("INTERNAL_ERROR", "outbox port failed");
			}
			remaining -= 1;
			return ok({ id: randomUUID() });
		},
	};
}

export function createMemoryMutationPorts(options?: {
	auditFailAfter?: number;
	outboxFailAfter?: number;
}): MutationPorts & {
	audit: ReturnType<typeof createMemoryAuditPort>;
	outbox: ReturnType<typeof createMemoryOutboxPort>;
} {
	return {
		audit: createMemoryAuditPort(
			options?.auditFailAfter === undefined
				? undefined
				: { failAfter: options.auditFailAfter },
		),
		outbox: createMemoryOutboxPort(
			options?.outboxFailAfter === undefined
				? undefined
				: { failAfter: options.outboxFailAfter },
		),
	};
}
