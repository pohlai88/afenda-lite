import { createHash } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type {
	PayrollException,
	PayrollExceptionCreateRecord,
	PayrollPeriod,
	PayrollRun,
} from "../../kernel/contracts/projected-types";
import type { PayrollCommandOptions as GenericPayrollCommandOptions } from "../../kernel/execution/command-options";
import { runPayrollCommand } from "../../kernel/execution/execute-operation";
import type { MutationPorts } from "../../kernel/execution/ports";
import { PAYROLL_COMMAND_WORKFORCE_INGEST } from "../../kernel/operations/module-ids";
import type {
	AcceptedPayrollHandoff,
	PayrollWorkforceIngressStore,
} from "./accepted-handoff.store";
import { hasDeclaredHandoffRevision } from "./handoff-revision";
import { ingestApprovedPayrollHandoffInputSchema } from "./ingest.schema";
import { parseApprovedPayrollHandoff } from "./parse-approved-payroll-handoff";
import {
	isPeriodAcceptingHandoffs,
	isTerminalEmploymentStatus,
	MID_PERIOD_TERMINATION_EXCEPTION_CODE,
	periodMatchesHandoff,
} from "./period-freeze";

type PeriodFreezeStore = PayrollWorkforceIngressStore & {
	createException: (
		input: PayrollExceptionCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<PayrollException>>;
	listPeriodsForOrganization: (input: {
		organizationId: string;
	}) => Promise<Result<PayrollPeriod[]>>;
	listRunsForPeriod: (input: {
		organizationId: string;
		periodId: string;
	}) => Promise<Result<PayrollRun[]>>;
};

type PayrollCommandOptions = GenericPayrollCommandOptions<PeriodFreezeStore>;

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

function coveringFrozenPeriods(
	periods: readonly PayrollPeriod[],
	input: {
		effectiveDate: string;
		periodEnd: string | null;
		periodStart: string | null;
	},
): PayrollPeriod[] {
	return periods.filter(
		(period) =>
			periodMatchesHandoff(period, input) &&
			!isPeriodAcceptingHandoffs(period.status),
	);
}

async function recordMidPeriodTerminationExceptions(
	store: PeriodFreezeStore,
	ports: MutationPorts,
	input: {
		actorUserId: string;
		correlationId: string;
		employeeId: string;
		frozenPeriods: readonly PayrollPeriod[];
		organizationId: string;
	},
): Promise<Result<true>> {
	const runLists = await Promise.all(
		input.frozenPeriods.map((period) =>
			store.listRunsForPeriod({
				organizationId: input.organizationId,
				periodId: period.id,
			}),
		),
	);
	const activeRuns: PayrollRun[] = [];
	for (const runs of runLists) {
		if (!runs.ok) {
			return runs;
		}
		for (const run of runs.data) {
			if (run.status === "finalized" || run.status === "reversed") {
				continue;
			}
			activeRuns.push(run);
		}
	}

	const recorded = await Promise.all(
		activeRuns.map((run) =>
			store.createException(
				{
					organizationId: input.organizationId,
					runId: run.id,
					severity: "blocking",
					exceptionCode: MID_PERIOD_TERMINATION_EXCEPTION_CODE,
					message:
						"Mid-period termination arrived after period inputs locked and requires human clearance",
					employeeRef: input.employeeId,
					createdBy: input.actorUserId,
					correlationId: input.correlationId,
				},
				ports,
			),
		),
	);
	for (const result of recorded) {
		if (!result.ok) {
			return result;
		}
	}
	return errorResult.ok(true);
}

/**
 * Canonical Payroll workforce ingress (PRD R1 / bridging C3/C4/C6).
 * Accepts the versioned HR payload as unknown, validates it through the
 * Payroll-owned parser, rejects tenant mismatches without disclosure, and
 * seals an immutable accepted or deferred record with hash and supersession
 * lineage. After a covering period leaves `open`, non-termination handoffs
 * are deferred (C3/C4) and termination handoffs raise blocking exceptions (C6).
 */
export function ingestApprovedPayrollHandoff(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<AcceptedPayrollHandoff>> {
	return runPayrollCommand(input, options, {
		schema: ingestApprovedPayrollHandoffInputSchema,
		invalidMessage: "Invalid approved payroll handoff ingest input",
		command: PAYROLL_COMMAND_WORKFORCE_INGEST,
		execute: async (data, { store, ports }) => {
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

			const periods = await store.listPeriodsForOrganization({
				organizationId: data.organizationId,
			});
			if (!periods.ok) {
				return periods;
			}
			const frozenPeriods = coveringFrozenPeriods(periods.data, {
				effectiveDate: parsed.data.effectiveDate,
				periodEnd: data.periodEnd,
				periodStart: data.periodStart,
			});
			const terminal = isTerminalEmploymentStatus(parsed.data.employmentStatus);
			const acceptanceStatus =
				frozenPeriods.length > 0 && !terminal
					? "deferred_to_next_period"
					: "accepted";

			const sealed = await store.acceptWorkforceHandoff({
				acceptanceStatus,
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
			if (!sealed.ok) {
				return sealed;
			}

			if (frozenPeriods.length > 0 && terminal) {
				const exceptions = await recordMidPeriodTerminationExceptions(
					store,
					ports,
					{
						actorUserId: data.actorUserId,
						correlationId: data.correlationId,
						employeeId: parsed.data.employeeId,
						frozenPeriods,
						organizationId: data.organizationId,
					},
				);
				if (!exceptions.ok) {
					return exceptions;
				}
			}

			return sealed;
		},
	});
}
