import { z } from "zod";

import {
	humanResourcesEmployeeIdSchema,
	humanResourcesEmploymentIdSchema,
	humanResourcesPositionIdSchema,
	humanResourcesWorkCalendarIdSchema,
} from "../brands";
import { humanResourcesMutationContextSchema, isoDateSchema } from "./common";

export const employeeOrgContextAsOfSchema = z
	.object({
		employmentId: humanResourcesEmploymentIdSchema,
		employeeId: humanResourcesEmployeeIdSchema,
		positionId: humanResourcesPositionIdSchema.nullable(),
		departmentId: z.string().uuid().nullable(),
		managerEmployeeId: humanResourcesEmployeeIdSchema.nullable(),
		locationKey: z.string().trim().min(1),
		legalEntityKey: z.string().trim().min(1),
		businessUnitKey: z.string().trim().min(1),
		costCentreKey: z.string().trim().min(1),
		projectKey: z.string().trim().min(1),
		workCalendarId: humanResourcesWorkCalendarIdSchema.nullable(),
	})
	.strict();

export type EmployeeOrgContextAsOf = z.infer<
	typeof employeeOrgContextAsOfSchema
>;

export const resolveEmployeeOrgContextAsOfInputSchema =
	humanResourcesMutationContextSchema
		.pick({
			organizationId: true,
			actorUserId: true,
			correlationId: true,
		})
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			asOf: isoDateSchema,
		})
		.strict();

export type ResolveEmployeeOrgContextAsOfInput = z.infer<
	typeof resolveEmployeeOrgContextAsOfInputSchema
>;
