// biome-ignore-all lint/suspicious/useAwait: The deterministic helper implements the asynchronous audit port.
import type {
	CorporateAdministrationAuditFactInput,
	CorporateAdministrationAuditFactPort,
} from "@afenda/corporate-administration";
import { corporateAdministrationAuditFactInputSchema } from "@afenda/corporate-administration";
import { errorResult, type Result } from "@afenda/errors";

export function createMemoryCorporateAdministrationAuditFactPort(input?: {
	onRecord?: (fact: CorporateAdministrationAuditFactInput) => void;
}): CorporateAdministrationAuditFactPort {
	let nextId = 0;
	return Object.freeze({
		async record(
			fact: CorporateAdministrationAuditFactInput,
		): Promise<Result<{ id: string }>> {
			const parsed = corporateAdministrationAuditFactInputSchema.parse(fact);
			input?.onRecord?.(parsed);
			nextId += 1;
			return errorResult.ok({ id: `audit_${nextId}` });
		},
	});
}
