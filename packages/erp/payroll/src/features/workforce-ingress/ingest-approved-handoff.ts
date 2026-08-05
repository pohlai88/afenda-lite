import { createHash } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type { PayrollCommandOptions as GenericPayrollCommandOptions } from "../../kernel/execution/command-options";
import { runPayrollCommand } from "../../kernel/execution/execute-operation";
import { PAYROLL_COMMAND_WORKFORCE_INGEST } from "../../kernel/operations/module-ids";
import type {
	AcceptedPayrollHandoff,
	PayrollWorkforceIngressStore,
} from "./accepted-handoff.store";
import { hasDeclaredHandoffRevision } from "./handoff-revision";
import { ingestApprovedPayrollHandoffInputSchema } from "./ingest.schema";
import { parseApprovedPayrollHandoff } from "./parse-approved-payroll-handoff";

type PayrollCommandOptions =
	GenericPayrollCommandOptions<PayrollWorkforceIngressStore>;

/** Stable canonical JSON: object keys sorted recursively before hashing. */
function canonicalJson(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(canonicalJson);
	}
	if (value !== null && typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>)
			.filter(([, child]) => child !== undefined)
			// Codepoint order, never locale collation: the hash must be stable
			// across runtimes and ICU versions.
			.sort(([left], [right]) => (left < right ? -1 : Number(left > right)));
		return Object.fromEntries(
			entries.map(([key, child]) => [key, canonicalJson(child)]),
		);
	}
	return value;
}

export function hashApprovedPayrollHandoffPayload(payload: unknown): string {
	return createHash("sha256")
		.update(JSON.stringify(canonicalJson(payload)))
		.digest("hex");
}

/**
 * Canonical Payroll workforce ingress (PRD R1).
 * Accepts the versioned HR payload as unknown, validates it through the
 * Payroll-owned parser, rejects tenant mismatches without disclosure, and
 * seals an immutable accepted record with hash and supersession lineage.
 */
export function ingestApprovedPayrollHandoff(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<AcceptedPayrollHandoff>> {
	return runPayrollCommand(input, options, {
		schema: ingestApprovedPayrollHandoffInputSchema,
		invalidMessage: "Invalid approved payroll handoff ingest input",
		command: PAYROLL_COMMAND_WORKFORCE_INGEST,
		execute: async (data, { store }) => {
			const parsed = parseApprovedPayrollHandoff(data.payload);
			if (!parsed.ok) {
				return parsed;
			}
			if (parsed.data.organizationId !== data.organizationId) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Invalid approved payroll handoff input.",
				});
			}
			// Fail-closed: an undeclared sourceVersion can never supersede or be
			// superseded, so accepting it would silently collide instead of
			// ordering handoffs. Reject before any store call.
			if (!hasDeclaredHandoffRevision(data.payload)) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Approved payroll handoff must declare at least one sourceVersion axis",
				});
			}
			return await store.acceptWorkforceHandoff({
				organizationId: data.organizationId,
				employeeId: parsed.data.employeeId,
				employmentId: parsed.data.employmentId,
				contractVersion: parsed.data.contractVersion,
				effectiveDate: parsed.data.effectiveDate,
				periodStart: data.periodStart,
				periodEnd: data.periodEnd,
				payload: data.payload,
				payloadHash: hashApprovedPayrollHandoffPayload(data.payload),
				idempotencyKey: data.idempotencyKey,
				actorUserId: data.actorUserId,
				correlationId: data.correlationId,
			});
		},
	});
}
