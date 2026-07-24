import { describe, expect, it } from "vitest";

import {
	assertPayrollRunTransition,
	isPayrollRunTransitionAllowed,
} from "../src/runs/transitions";
import type { PayrollRunStatus } from "../src/types";

const ALL_STATUSES: PayrollRunStatus[] = [
	"draft",
	"calculating",
	"calculated",
	"failed",
	"finalized",
	"reversed",
];

const ALLOWED: Array<[PayrollRunStatus, PayrollRunStatus]> = [
	["draft", "calculating"],
	["failed", "calculating"],
	["calculating", "calculated"],
	["calculating", "failed"],
	["calculated", "finalized"],
	["finalized", "reversed"],
];

describe("payroll run transitions", () => {
	it("allows the Phase 5 transition edges", () => {
		for (const [from, to] of ALLOWED) {
			expect(isPayrollRunTransitionAllowed(from, to)).toBe(true);
			expect(assertPayrollRunTransition(from, to).ok).toBe(true);
		}
	});

	it("allows same-status no-op transitions", () => {
		for (const status of ALL_STATUSES) {
			expect(isPayrollRunTransitionAllowed(status, status)).toBe(true);
		}
	});

	it("rejects illegal transitions", () => {
		const allowedSet = new Set(
			ALLOWED.map(([from, to]) => `${from}->${to}`),
		);
		for (const from of ALL_STATUSES) {
			for (const to of ALL_STATUSES) {
				if (from === to) continue;
				if (allowedSet.has(`${from}->${to}`)) continue;
				expect(isPayrollRunTransitionAllowed(from, to)).toBe(false);
				const result = assertPayrollRunTransition(from, to);
				expect(result.ok).toBe(false);
				if (result.ok) continue;
				expect(result.details?.payrollCode).toBe("payroll.invalid_state");
			}
		}
	});
});
