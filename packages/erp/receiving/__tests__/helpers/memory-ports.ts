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

export function createMemoryMutationPorts(): MutationPorts & {
	audit: AuditFactPort & { calls: AuditFactInput[] };
	outbox: OutboxPort & { calls: OutboxFactInput[] };
} {
	const auditCalls: AuditFactInput[] = [];
	const outboxCalls: OutboxFactInput[] = [];
	return {
		audit: {
			calls: auditCalls,
			record(input): Promise<Result<{ id: string }>> {
				return resolveAsync(() => {
					auditCalls.push(input);
					return ok({ id: randomUUID() });
				});
			},
		},
		outbox: {
			calls: outboxCalls,
			append(input): Promise<Result<{ id: string }>> {
				return resolveAsync(() => {
					outboxCalls.push(input);
					return ok({ id: randomUUID() });
				});
			},
		},
	};
}
