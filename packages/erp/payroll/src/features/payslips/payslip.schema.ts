import { z } from "zod";
import { payrollRunIdSchema } from "../../kernel/identity/brands";
import {
	payrollActorUserIdSchema,
	payrollEmployeeIdSchema,
	payrollOrganizationIdSchema,
} from "../../kernel/validation/common.schema";

export const getOwnPayrollPayslipInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		runId: payrollRunIdSchema,
		actorUserId: payrollActorUserIdSchema,
	})
	.strict();
export const getPayrollPayslipInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		runId: payrollRunIdSchema,
		employeeId: payrollEmployeeIdSchema,
		actorUserId: payrollActorUserIdSchema,
	})
	.strict();
