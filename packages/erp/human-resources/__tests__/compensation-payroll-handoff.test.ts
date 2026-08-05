import {
	approvedPayrollHandoffSchema,
	HANDOFF_PAYROLL_CONTRACT_VERSION,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import {
	enrolBenefit,
	getApprovedCompensationHandoff,
} from "../src/features/compensation-benefits/benefit-enrollment";
import { createBenefitPlan } from "../src/features/compensation-benefits/benefit-plan";
import { mapApprovedPayrollHandoff } from "../src/features/payroll-handoff/map-approved-payroll-handoff";
import {
	HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
} from "../src/kernel/authorization/permissions";
import {
	COMPENSATION_HANDOFF_PARITY_ACTOR,
	COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE,
	COMPENSATION_HANDOFF_PARITY_ORG,
	compensationHandoffParityHarness,
	seedApprovedCompensationForHandoff,
	syntheticWorkAssignment,
} from "./helpers/compensation-handoff-parity";

describe("compensation payroll handoff parity (Slice 8.8)", () => {
	it("selects compensation only when it is effective for the payroll date", async () => {
		const ready = compensationHandoffParityHarness([
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
		]);
		const seeded = await seedApprovedCompensationForHandoff(ready, {
			idempotencySuffix: "effective-date",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const beforeEffectiveDate = await getApprovedCompensationHandoff(
			{
				organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
				actorUserId: COMPENSATION_HANDOFF_PARITY_ACTOR,
				correlationId: "corr-get-handoff-before-effective-date",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				effectiveDate: "2024-12-31",
			},
			ready,
		);

		expect(beforeEffectiveDate).toEqual({ ok: true, data: null });
	});

	it("mapApprovedPayrollHandoff emits contract-valid handoff with derived decimal scale", async () => {
		const ready = compensationHandoffParityHarness([
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
		]);
		const seeded = await seedApprovedCompensationForHandoff(ready, {
			idempotencySuffix: "map",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const compensationHandoff = await getApprovedCompensationHandoff(
			{
				organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
				actorUserId: COMPENSATION_HANDOFF_PARITY_ACTOR,
				correlationId: "corr-get-handoff",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				effectiveDate: COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE,
			},
			ready,
		);
		expect(compensationHandoff.ok).toBe(true);
		if (!(compensationHandoff.ok && compensationHandoff.data)) {
			return;
		}

		const mapped = mapApprovedPayrollHandoff({
			compensationHandoff: compensationHandoff.data,
			leaveBalanceAtTermination: null,
			leaveHandoffs: [],
			priorEmployerYtd: [],
			statutoryProfile: null,
			timeHandoff: null,
			assignment: syntheticWorkAssignment({
				organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
				employmentId: seeded.employment.id,
				employeeId: seeded.employee.id,
			}),
			effectiveDate: COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE,
			correlationId: "corr-map-handoff",
			employmentStatus: "active",
		});

		expect(mapped.ok).toBe(true);
		if (!mapped.ok) {
			return;
		}

		expect(mapped.data.contractVersion).toBe(HANDOFF_PAYROLL_CONTRACT_VERSION);
		expect(mapped.data.baseAmount).toBe("85000.50");
		expect(mapped.data.decimalScale).toBe(2);
		expect(mapped.data.effectiveDate).toBe(
			COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE,
		);
		expect(approvedPayrollHandoffSchema.safeParse(mapped.data).success).toBe(
			true,
		);
	});

	it("includes benefit contribution components with exact amounts", async () => {
		const ready = compensationHandoffParityHarness([
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
			HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
		]);
		const seeded = await seedApprovedCompensationForHandoff(ready, {
			idempotencySuffix: "benefits",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const plan = await createBenefitPlan(
			{
				organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
				actorUserId: COMPENSATION_HANDOFF_PARITY_ACTOR,
				correlationId: "corr-plan-handoff",
				code: "MED-HO",
				name: "Medical Handoff",
			},
			ready,
		);
		expect(plan.ok).toBe(true);
		if (!plan.ok) {
			return;
		}

		const enrollment = await enrolBenefit(
			{
				organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
				actorUserId: COMPENSATION_HANDOFF_PARITY_ACTOR,
				correlationId: "corr-enrol-handoff",
				idempotencyKey: "idem-enrol-handoff",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				planId: plan.data.id,
				effectiveFrom: COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE,
				employeeContributionAmount: "125.50",
				employerContributionAmount: "300.00",
				contributionCurrencyCode: "USD",
				contributionFrequency: "monthly",
			},
			ready,
		);
		expect(enrollment.ok).toBe(true);
		if (!enrollment.ok) {
			return;
		}

		const compensationHandoff = await getApprovedCompensationHandoff(
			{
				organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
				actorUserId: COMPENSATION_HANDOFF_PARITY_ACTOR,
				correlationId: "corr-get-handoff-benefits",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				effectiveDate: COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE,
			},
			ready,
		);
		expect(compensationHandoff.ok).toBe(true);
		if (!(compensationHandoff.ok && compensationHandoff.data)) {
			return;
		}

		const mapped = mapApprovedPayrollHandoff({
			compensationHandoff: compensationHandoff.data,
			leaveBalanceAtTermination: null,
			leaveHandoffs: [],
			priorEmployerYtd: [],
			statutoryProfile: null,
			timeHandoff: null,
			assignment: syntheticWorkAssignment({
				organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
				employmentId: seeded.employment.id,
				employeeId: seeded.employee.id,
			}),
			effectiveDate: COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE,
			correlationId: "corr-map-handoff-benefits",
			employmentStatus: "active",
		});
		expect(mapped.ok).toBe(true);
		if (!mapped.ok) {
			return;
		}

		const employeeContribution = mapped.data.components.find(
			(c) => c.kind === "benefit_employee_contribution",
		);
		const employerContribution = mapped.data.components.find(
			(c) => c.kind === "benefit_employer_contribution",
		);
		expect(employeeContribution?.amount).toBe("125.50");
		expect(employerContribution?.amount).toBe("300.00");
	});

	it("cross-package chain preserves decimal strings and effective dates", async () => {
		const ready = compensationHandoffParityHarness([
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
		]);
		const seeded = await seedApprovedCompensationForHandoff(ready, {
			idempotencySuffix: "chain",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const compensationHandoff = await getApprovedCompensationHandoff(
			{
				organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
				actorUserId: COMPENSATION_HANDOFF_PARITY_ACTOR,
				correlationId: "corr-chain-handoff",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				effectiveDate: COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE,
			},
			ready,
		);
		expect(compensationHandoff.ok).toBe(true);
		if (!(compensationHandoff.ok && compensationHandoff.data)) {
			return;
		}

		const mapped = mapApprovedPayrollHandoff({
			compensationHandoff: compensationHandoff.data,
			leaveBalanceAtTermination: null,
			leaveHandoffs: [],
			priorEmployerYtd: [],
			statutoryProfile: null,
			timeHandoff: null,
			assignment: syntheticWorkAssignment({
				organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
				employmentId: seeded.employment.id,
				employeeId: seeded.employee.id,
			}),
			effectiveDate: COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE,
			correlationId: "corr-chain-map",
			employmentStatus: "active",
		});
		expect(mapped.ok).toBe(true);
		if (!mapped.ok) {
			return;
		}

		const parsed = approvedPayrollHandoffSchema.safeParse(mapped.data);
		expect(parsed.success).toBe(true);
		if (!parsed.success) {
			return;
		}

		expect(parsed.data.effectiveDate).toBe(mapped.data.effectiveDate);
		expect(parsed.data.baseAmount).toBe(mapped.data.baseAmount);
		expect(parsed.data.decimalScale).toBe(mapped.data.decimalScale);

		for (const sourceComponent of mapped.data.components) {
			const parsedComponent = parsed.data.components.find(
				(c) =>
					c.code === sourceComponent.code && c.kind === sourceComponent.kind,
			);
			expect(parsedComponent?.amount).toBe(sourceComponent.amount);
			expect(parsedComponent?.decimalScale).toBe(sourceComponent.decimalScale);
		}
	});
});
