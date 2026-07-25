import { fail, ok, type Result } from "@afenda/errors/result";

import {
	createMemoryCorporateAdministrationUnitOfWork,
	type MemoryUnitOfWorkOptions,
} from "../../src/adapters/memory/unit-of-work";
import type { MemoryCorporateAdministrationStore } from "../../src/memory-store";
import type {
	AuditFactInput,
	MutationPorts,
	OutboxFactInput,
} from "../../src/ports";
import type { CorporateAdministrationUnitOfWork } from "../../src/unit-of-work";

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

export function createFailingMemoryMutationPorts(options: {
	readonly failAudit?: boolean;
	readonly failOutbox?: boolean;
} = {}): MutationPorts {
	const base = createMemoryMutationPorts();
	return {
		...base,
		async record(input) {
			if (options.failAudit) {
				return fail("INTERNAL_ERROR", "Injected audit failure");
			}
			if (options.failOutbox) {
				return fail("INTERNAL_ERROR", "Injected outbox failure");
			}
			return base.record(input);
		},
	};
}

export function createMemoryUnitOfWork(
	store: MemoryCorporateAdministrationStore,
	options: MemoryUnitOfWorkOptions = {},
): CorporateAdministrationUnitOfWork {
	return createMemoryCorporateAdministrationUnitOfWork(store, options);
}
