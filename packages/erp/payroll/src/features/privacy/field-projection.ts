import type { PayrollPayslipViewModel } from "../../kernel/contracts/projected-types";
import type { PayrollProjectedFields } from "./contract";

const READ_OWN_FIELD_NAMES = [
	"currencyCode",
	"employeeDeductions",
	"employeeStatutory",
	"gross",
	"net",
	"status",
] as const;

const READ_ALL_ONLY_FIELD_NAMES = ["employerCost", "lines"] as const;

export function projectPayrollPayslipFields(input: {
	payslip: PayrollPayslipViewModel;
	projectionScope: "read-own" | "read-all";
}): PayrollProjectedFields {
	const ownFields: Record<string, unknown> = {
		currencyCode: input.payslip.currencyCode,
		employeeDeductions: input.payslip.employeeDeductions,
		employeeStatutory: input.payslip.employeeStatutory,
		gross: input.payslip.gross,
		net: input.payslip.net,
		status: input.payslip.status,
	};
	if (input.projectionScope === "read-own") {
		return {
			organizationId: input.payslip.organizationId,
			runId: input.payslip.runId,
			employeeId: input.payslip.employeeId,
			projectionScope: "read-own",
			fields: ownFields,
			omittedFieldNames: [...READ_ALL_ONLY_FIELD_NAMES],
		};
	}
	return {
		organizationId: input.payslip.organizationId,
		runId: input.payslip.runId,
		employeeId: input.payslip.employeeId,
		projectionScope: "read-all",
		fields: {
			...ownFields,
			employerCost: input.payslip.employerCost,
			lines: input.payslip.lines,
		},
		omittedFieldNames: [],
	};
}

export function payrollSubjectAccessRecords(
	projection: PayrollProjectedFields,
): {
	entity: string;
	fields: Readonly<Record<string, unknown>>;
	recordId: string;
	sensitivity: "standard" | "sensitive" | "highly_restricted";
}[] {
	return [
		{
			entity: "payroll_payslip",
			recordId: `${projection.runId}:${projection.employeeId}`,
			sensitivity:
				projection.projectionScope === "read-all"
					? "highly_restricted"
					: "sensitive",
			fields: projection.fields,
		},
	];
}

export { READ_OWN_FIELD_NAMES };
