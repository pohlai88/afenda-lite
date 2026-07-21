/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_EMPLOYEE_PAYROLL_ASSIGNMENT =
	"employee-payroll-assignment" as const;
export type PayrollEmployeePayrollAssignmentAggregate =
	typeof PAYROLL_AGGREGATE_EMPLOYEE_PAYROLL_ASSIGNMENT;
