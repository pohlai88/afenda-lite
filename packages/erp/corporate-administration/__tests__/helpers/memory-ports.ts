import { ok, type Result } from "@afenda/errors/result";

import type {
	AuditFactInput,
	MutationPorts,
	OutboxFactInput,
} from "../../src/ports";

export function createMemoryMutationPorts(): MutationPorts {
	const auditRecords: AuditFactInput[] = [];
	const outboxRecords: OutboxFactInput[] = [];
	return {
		audit: {
			async record(input): Promise<Result<{ id: string }>> {
				auditRecords.push(input);
				return ok({ id: `audit-${auditRecords.length}` });
			},
		},
		outbox: {
			async append(input): Promise<Result<{ id: string }>> {
				outboxRecords.push(input);
				return ok({ id: `outbox-${outboxRecords.length}` });
			},
		},
		async record(input) {
			const auditId = `audit-${auditRecords.length + 1}`;
			const eventId = `outbox-${outboxRecords.length + 1}`;
			auditRecords.push(input.audit);
			outboxRecords.push(input.outbox);
			return ok({ auditId, eventId });
		},
	};
}
