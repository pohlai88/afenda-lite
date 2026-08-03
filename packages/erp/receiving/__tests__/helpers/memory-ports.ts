import { randomUUID } from "node:crypto";
import { errorResult, type Result } from "@afenda/errors";
import type {
	AuditFactInput,
	AuditFactPort,
	MutationPorts,
	OutboxFactInput,
	OutboxPort,
} from "../../src/kernel/contracts/ports";
import { resolveAsync } from "../../src/kernel/execution/async";

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
					return errorResult.ok({ id: randomUUID() });
				});
			},
		},
		outbox: {
			calls: outboxCalls,
			append(input): Promise<Result<{ id: string }>> {
				return resolveAsync(() => {
					outboxCalls.push(input);
					return errorResult.ok({ id: randomUUID() });
				});
			},
		},
	};
}
