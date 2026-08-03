import type { Result } from "@afenda/errors";

import type { AcceptedPayrollHandoff } from "../../kernel/contracts/projected-types";

export type { AcceptedPayrollHandoff } from "../../kernel/contracts/projected-types";

export interface AcceptHandoffRecord {
	actorUserId: string;
	contractVersion: string;
	correlationId: string;
	effectiveDate: string;
	employeeId: string;
	employmentId: string;
	idempotencyKey: string;
	organizationId: string;
	payload: unknown;
	payloadHash: string;
	periodEnd: string | null;
	periodStart: string | null;
}

export interface PayrollWorkforceIngressStore {
	/**
	 * Seal an accepted handoff. Idempotent on (organization, idempotencyKey):
	 * an identical payload hash replays the existing record; a different hash
	 * under the same key fails with CONFLICT. A new payload for the same
	 * active identity (employee, effectiveDate, period) supersedes the prior
	 * accepted record with explicit lineage.
	 */
	acceptWorkforceHandoff: (
		record: AcceptHandoffRecord,
	) => Promise<Result<AcceptedPayrollHandoff>>;
	/** Latest accepted (non-superseded) record for the identity, if any. */
	getAcceptedWorkforceHandoff: (input: {
		organizationId: string;
		employeeId: string;
		effectiveDate: string;
		periodStart: string | null;
		periodEnd: string | null;
	}) => Promise<Result<AcceptedPayrollHandoff | null>>;
}
