import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type {
	AuditFactInput,
	AuditFactPort,
	MutationPorts,
	OutboxFactInput,
	OutboxPort,
} from "../../src/kernel/contracts/ports";

export function createMemoryAuditPort(): AuditFactPort & {
	calls: AuditFactInput[];
} {
	const calls: AuditFactInput[] = [];
	return {
		calls,
		record(input: AuditFactInput): Promise<Result<{ id: string }>> {
			calls.push(input);
			return Promise.resolve(errorResult.ok({ id: randomUUID() }));
		},
	};
}

export function createMemoryOutboxPort(): OutboxPort & {
	calls: OutboxFactInput[];
} {
	const calls: OutboxFactInput[] = [];
	return {
		calls,
		append(input: OutboxFactInput): Promise<Result<{ id: string }>> {
			calls.push(input);
			return Promise.resolve(errorResult.ok({ id: randomUUID() }));
		},
	};
}

export function createMemoryMutationPorts(): MutationPorts & {
	audit: ReturnType<typeof createMemoryAuditPort>;
	outbox: ReturnType<typeof createMemoryOutboxPort>;
} {
	return {
		audit: createMemoryAuditPort(),
		outbox: createMemoryOutboxPort(),
	};
}
