import { randomUUID } from "node:crypto";
import { ok, type Result } from "@afenda/errors/result";

import type {
	AuditFactInput,
	AuditFactPort,
	MutationPorts,
	OutboxFactInput,
	OutboxPort,
} from "../../src/ports";

export function createMemoryMutationPorts(): MutationPorts & {
	audit: AuditFactPort & { calls: AuditFactInput[] };
	outbox: OutboxPort & { calls: OutboxFactInput[] };
} {
	const auditCalls: AuditFactInput[] = [];
	const outboxCalls: OutboxFactInput[] = [];
	return {
		audit: {
			calls: auditCalls,
			async record(input): Promise<Result<{ id: string }>> {
				auditCalls.push(input);
				return ok({ id: randomUUID() });
			},
		},
		outbox: {
			calls: outboxCalls,
			async append(input): Promise<Result<{ id: string }>> {
				outboxCalls.push(input);
				return ok({ id: randomUUID() });
			},
		},
	};
}
