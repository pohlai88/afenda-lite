import { z } from "zod";

export const CreateChartOfAccountsInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	code: z.string().min(1).max(50),
	name: z.string().min(1).max(200),
});

export const CreateLedgerAccountInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	chartOfAccountId: z.string().uuid(),
	code: z.string().min(1).max(50),
	name: z.string().min(1).max(200),
	accountType: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
	normalBalance: z.enum(["debit", "credit"]),
	isControl: z.boolean().default(false),
});

export const UpdateLedgerAccountInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	id: z.string().uuid(),
	name: z.string().min(1).max(200),
	accountType: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
	normalBalance: z.enum(["debit", "credit"]),
	isControl: z.boolean(),
	expectedVersion: z.number().int().positive(),
});

export const DeactivateLedgerAccountInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	id: z.string().uuid(),
	expectedVersion: z.number().int().positive(),
});

export const ListLedgerAccountsInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	chartOfAccountId: z.string().uuid().optional(),
	status: z.enum(["active", "inactive"]).optional(),
});

export const MapAccountRoleInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	accountRole: z.string().min(1).max(100),
	ledgerAccountId: z.string().uuid(),
});
