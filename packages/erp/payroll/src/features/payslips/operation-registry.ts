import {
	PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
	PAYROLL_PERMISSION_PAYSLIP_READ_OWN,
} from "../../kernel/execution/permissions";
import { definePayrollOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "payslips" as const;

export const PAYROLL_PAYSLIP_QUERIES = definePayrollOperationRegistry({
	readOwnPayslip: {
		id: PAYROLL_PERMISSION_PAYSLIP_READ_OWN,
		kind: "query",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_PAYSLIP_READ_OWN,
		publicName: "readOwnPayslip",
	},
	readAllPayslips: {
		id: PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
		kind: "query",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
		publicName: "readAllPayslips",
	},
});
