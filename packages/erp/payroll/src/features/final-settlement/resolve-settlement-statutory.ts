import { errorResult, type Result } from "@afenda/errors";

import type { PayrollStatutoryRule } from "../../kernel/contracts/projected-types";
import type { PayrollStatutoryCapability } from "../../kernel/execution/capability-ports";
import { addScaled, formatScaledToDecimal } from "../../kernel/money/money";
import { getStatutoryCalculator } from "../statutory-rules/calculator-registry";
import type { PayrollFinalSettlementStatutoryResolver } from "./compute-final-settlement";
import type {
	PayrollFinalSettlementCompensationSnapshot,
	PayrollFinalSettlementStatutoryEvidenceEntry,
} from "./contract";

function notApprovedForProduction(): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage:
			"Payroll statutory calculation is not approved for production",
	});
}

/**
 * Fail-closed statutory gate for a final settlement.
 *
 * This is the same seam payroll runs use (`PayrollStatutoryCapability` +
 * the package calculator registry), applied at the settlement's calculate
 * step. A settlement may never assert its own statutory amounts: absent the
 * capability, or with any configured rule whose calculator is unregistered or
 * not production-approved, the settlement refuses with `CONFLICT` exactly as a
 * run does. Jurisdiction packs are `awaiting_review` and `synth.v1` is
 * `synthetic_only`, so production activation fails closed until a pack is
 * reviewer-approved.
 *
 * Every rule is priced as the subject's FINAL withholding occasion of the tax
 * year. Deriving a position-in-the-year from the declared pay frequency, as this
 * once did, made an annualized pack project pay for periods the terminated
 * employee will never work and then collect only a fraction of the outstanding
 * tax at the last moment it could collect any.
 */
export function createFinalSettlementStatutoryResolver(input: {
	compensationSnapshot: PayrollFinalSettlementCompensationSnapshot;
	rules: readonly PayrollStatutoryRule[];
	statutory: PayrollStatutoryCapability | undefined;
}): PayrollFinalSettlementStatutoryResolver {
	const { statutoryProfile, yearToDate } = input.compensationSnapshot;
	return ({ currencyCode, grossScaled, roundingPolicy }) => {
		const { statutory } = input;
		if (statutory === undefined) {
			return notApprovedForProduction();
		}

		const ordered = [...input.rules].sort(
			(left: PayrollStatutoryRule, right: PayrollStatutoryRule) => {
				const code = left.code.localeCompare(right.code);
				return code === 0 ? left.id.localeCompare(right.id) : code;
			},
		);

		for (const rule of ordered) {
			const { calculatorId } = rule.configJson;
			if (typeof calculatorId !== "string") {
				return notApprovedForProduction();
			}
			const registered = statutory.requireCalculator(calculatorId);
			if (!(registered.ok && statutory.isProductionApproved(calculatorId))) {
				return notApprovedForProduction();
			}
		}

		let employeeScaled = 0n;
		let employerScaled = 0n;
		const evidence: PayrollFinalSettlementStatutoryEvidenceEntry[] = [];

		for (const rule of ordered) {
			const calculatorId = String(rule.configJson.calculatorId);
			let output: ReturnType<
				ReturnType<typeof getStatutoryCalculator>["calculate"]
			>;
			try {
				output = getStatutoryCalculator(calculatorId).calculate({
					configJson: rule.configJson,
					currencyCode,
					gross: grossScaled,
					jurisdictionCode: rule.jurisdictionCode,
					// A settlement is the last withholding occasion of the tax year
					// for this subject. Annualized packs therefore project no future
					// income and collect the outstanding liability whole; the
					// settlement needs no position-in-the-year at all.
					finalPeriod: true,
					periodOrdinal: null,
					periodsPerYear: null,
					roundingPolicy,
					ruleCode: rule.code,
					ruleVersion: rule.ruleVersion,
					statutoryProfile,
					taxableBase: grossScaled,
					yearToDate,
				});
			} catch {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Payroll statutory rule configuration is not calculable",
				});
			}

			employeeScaled = addScaled(employeeScaled, output.employeeAmount);
			employerScaled = addScaled(employerScaled, output.employerAmount);
			evidence.push({
				baseAmount: formatScaledToDecimal(output.baseAmount),
				calculatorId: output.calculatorId,
				employeeAmount: formatScaledToDecimal(output.employeeAmount),
				employerAmount: formatScaledToDecimal(output.employerAmount),
				jurisdictionCode: rule.jurisdictionCode,
				ruleCode: rule.code,
				ruleVersion: rule.ruleVersion,
			});
		}

		return errorResult.ok({ employeeScaled, employerScaled, evidence });
	};
}
