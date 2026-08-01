import { z } from "zod";
import { payrollRunIdSchema } from "../brands";
import {
	payrollActorUserIdSchema,
	payrollEmployeeIdSchema,
	payrollOrganizationIdSchema,
} from "./common";

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
