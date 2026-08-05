import { errorResult } from "@afenda/errors";

import type {
	PayrollFilingObligation,
	PayrollStatutoryFiling,
	PayrollStatutoryFilingLine,
} from "./contract";
import type { PayrollStatutoryFilingStore } from "./filing.store";

const clone = <T>(value: T): T => structuredClone(value);

export interface StatutoryFilingMemoryState {
	filings: Map<string, PayrollStatutoryFiling>;
	itemKeys: Map<string, string>;
	lines: Map<string, PayrollStatutoryFilingLine>;
}

export function createStatutoryFilingMemoryState(): StatutoryFilingMemoryState {
	return {
		filings: new Map(),
		itemKeys: new Map(),
		lines: new Map(),
	};
}

export function resetStatutoryFilingMemoryState(
	state: StatutoryFilingMemoryState,
): void {
	state.filings.clear();
	state.itemKeys.clear();
	state.lines.clear();
}

function scoped(organizationId: string, value: string): string {
	return `${organizationId}:${value}`;
}

export function createMemoryStatutoryFilingMethods(
	state: StatutoryFilingMemoryState,
): PayrollStatutoryFilingStore {
	return {
		createStatutoryFiling(input) {
			const key = scoped(
				input.filing.organizationId,
				input.filing.idempotencyKey,
			);
			if (state.filings.has(input.filing.id) || state.itemKeys.has(key)) {
				return Promise.resolve(
					errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					}),
				);
			}
			const naturalKey = scoped(
				input.filing.organizationId,
				input.filing.kind === "period_filing"
					? `period:${input.filing.jurisdictionCode}:${input.filing.instrumentCode}:${input.filing.periodId}`
					: `annual:${input.filing.jurisdictionCode}:${input.filing.instrumentCode}:${input.filing.taxYear}:${input.filing.employeeId}`,
			);
			if (state.itemKeys.has(naturalKey)) {
				return Promise.resolve(
					errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					}),
				);
			}
			state.filings.set(input.filing.id, clone(input.filing));
			state.itemKeys.set(key, input.filing.id);
			state.itemKeys.set(naturalKey, input.filing.id);
			for (const line of input.lines) {
				state.lines.set(line.id, clone(line));
			}
			return Promise.resolve(errorResult.ok(clone(input.filing)));
		},
		findStatutoryFilingByIdempotencyKey(input) {
			const filingId = state.itemKeys.get(
				scoped(input.organizationId, input.idempotencyKey),
			);
			const filing =
				filingId === undefined ? undefined : state.filings.get(filingId);
			return Promise.resolve(
				errorResult.ok(filing === undefined ? null : clone(filing)),
			);
		},
		getStatutoryFiling(input) {
			const filing = state.filings.get(input.filingId);
			return Promise.resolve(
				errorResult.ok(
					filing?.organizationId === input.organizationId
						? clone(filing)
						: null,
				),
			);
		},
		listFilingObligations(input) {
			const obligations: PayrollFilingObligation[] = [...state.filings.values()]
				.filter((filing) => {
					if (filing.organizationId !== input.organizationId) {
						return false;
					}
					if (
						input.jurisdictionCode !== undefined &&
						filing.jurisdictionCode !== input.jurisdictionCode
					) {
						return false;
					}
					if (
						input.instrumentCode !== undefined &&
						filing.instrumentCode !== input.instrumentCode
					) {
						return false;
					}
					return (
						input.taxYear === undefined || filing.taxYear === input.taxYear
					);
				})
				.map((filing) => ({
					employeeId: filing.employeeId,
					filingId: filing.id,
					instrumentCode: filing.instrumentCode,
					jurisdictionCode: filing.jurisdictionCode,
					kind: filing.kind,
					periodId: filing.periodId,
					status: filing.status,
					taxYear: filing.taxYear,
				}));
			return Promise.resolve(errorResult.ok(obligations.map(clone)));
		},
		listStatutoryFilingLines(input) {
			const lines = [...state.lines.values()]
				.filter(
					(line) =>
						line.organizationId === input.organizationId &&
						line.filingId === input.filingId,
				)
				.sort((left, right) => left.sequence - right.sequence)
				.map(clone);
			return Promise.resolve(errorResult.ok(lines));
		},
		saveStatutoryFilingTransition(input) {
			const current = state.filings.get(input.filing.id);
			if (
				current === undefined ||
				current.organizationId !== input.filing.organizationId ||
				current.version !== input.expectedVersion ||
				input.filing.version !== input.expectedVersion + 1
			) {
				return Promise.resolve(
					errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					}),
				);
			}
			state.filings.set(input.filing.id, clone(input.filing));
			return Promise.resolve(errorResult.ok(clone(input.filing)));
		},
	};
}
