import { z } from "zod";

const payrollEntityPayloadBase = z.object({
	organizationId: z.string().trim().min(1),
	entityType: z.string().trim().min(1),
	entityId: z.string().trim().min(1),
	actorId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	causationId: z.string().trim().min(1).optional(),
});

export const payrollEntityPayloadSchema = payrollEntityPayloadBase;

export type PayrollEntityPayload = z.infer<typeof payrollEntityPayloadSchema>;

export const PAYROLL_RUN_STARTED_EVENT = "payroll.run.started.v1" as const;
export const PAYROLL_RUN_CALCULATED_EVENT =
	"payroll.run.calculated.v1" as const;
export const PAYROLL_RUN_FINALIZED_EVENT = "payroll.run.finalized.v1" as const;
export const PAYROLL_RUN_REVERSED_EVENT = "payroll.run.reversed.v1" as const;
export const PAYROLL_PAYMENT_REQUESTED_EVENT =
	"payroll.payment-requested.v1" as const;
export const PAYROLL_POSTING_REQUESTED_EVENT =
	"payroll.posting-requested.v1" as const;
export const PAYROLL_PAYSLIP_PUBLISHED_EVENT =
	"payroll.payslip.published.v1" as const;

export const PayrollEventSchemas = {
	[PAYROLL_RUN_STARTED_EVENT]: payrollEntityPayloadSchema,
	[PAYROLL_RUN_CALCULATED_EVENT]: payrollEntityPayloadSchema,
	[PAYROLL_RUN_FINALIZED_EVENT]: payrollEntityPayloadSchema,
	[PAYROLL_RUN_REVERSED_EVENT]: payrollEntityPayloadSchema,
	[PAYROLL_PAYMENT_REQUESTED_EVENT]: payrollEntityPayloadSchema,
	[PAYROLL_POSTING_REQUESTED_EVENT]: payrollEntityPayloadSchema,
	[PAYROLL_PAYSLIP_PUBLISHED_EVENT]: payrollEntityPayloadSchema,
} as const;

export type PayrollEventType = keyof typeof PayrollEventSchemas;

export const PAYROLL_EVENT_IDS = [
	PAYROLL_RUN_STARTED_EVENT,
	PAYROLL_RUN_CALCULATED_EVENT,
	PAYROLL_RUN_FINALIZED_EVENT,
	PAYROLL_RUN_REVERSED_EVENT,
	PAYROLL_PAYMENT_REQUESTED_EVENT,
	PAYROLL_POSTING_REQUESTED_EVENT,
	PAYROLL_PAYSLIP_PUBLISHED_EVENT,
] as const satisfies readonly PayrollEventType[];
