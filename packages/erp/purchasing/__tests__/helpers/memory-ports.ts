import { randomUUID } from "node:crypto";

import { ok, type Result } from "@afenda/errors/result";

import type {
	AuditFactInput,
	AuditFactPort,
	MutationPorts,
	OutboxFactInput,
	OutboxPort,
} from "../../src/ports";
import { resolveAsync } from "../../src/resolve-async";

export function createMemoryAuditPort(): AuditFactPort & {
	calls: AuditFactInput[];
} {
	const calls: AuditFactInput[] = [];
	return {
		calls,
		record(input: AuditFactInput): Promise<Result<{ id: string }>> {
			return resolveAsync(() => {
				calls.push(input);
				return ok({ id: randomUUID() });
			});
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
			return resolveAsync(() => {
				calls.push(input);
				return ok({ id: randomUUID() });
			});
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
