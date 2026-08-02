import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type {
	AuditFactInput,
	AuditFactPort,
	MutationPorts,
	OutboxFactInput,
	OutboxPort,
} from "../../src/kernel/execution/ports";

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
		record(input: AuditFactInput): Promise<Result<{ id: string }>> {
			calls.push(input);
			if (remaining <= 0) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			remaining -= 1;
			return Promise.resolve(errorResult.ok({ id: randomUUID() }));
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
		append(input: OutboxFactInput): Promise<Result<{ id: string }>> {
			calls.push(input);
			if (remaining <= 0) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			remaining -= 1;
			return Promise.resolve(errorResult.ok({ id: randomUUID() }));
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
	const audit = createMemoryAuditPort(
		options?.auditFailAfter === undefined
			? undefined
			: { failAfter: options.auditFailAfter },
	);
	const outbox = createMemoryOutboxPort(
		options?.outboxFailAfter === undefined
			? undefined
			: { failAfter: options.outboxFailAfter },
	);
	return {
		audit,
		outbox,
		transaction: {
			async execute<T>(work: () => Promise<Result<T>>): Promise<Result<T>> {
				const auditLength = audit.calls.length;
				const outboxLength = outbox.calls.length;
				const result = await work();
				if (!result.ok) {
					audit.calls.splice(auditLength);
					outbox.calls.splice(outboxLength);
				}
				return result;
			},
		},
	};
}
