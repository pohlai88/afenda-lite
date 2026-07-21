import type { Change } from "@afenda/audit";
import type { Result } from "@afenda/errors/result";
import type { PayrollEventType } from "@afenda/events";

export type PayrollEmployeeQueryPort = {
	getPayrollEmployee(input: {
		organizationId: string;
		employeeId: string;
		effectiveDate: string;
	}): Promise<{
		employeeId: string;
		employmentStatus: "active" | "notice" | "terminated";
		payGroupId: string;
		baseCompensation: string;
		currencyCode: string;
		recurringAllowances: Array<{
			code: string;
			amount: string;
		}>;
		recurringDeductions: Array<{
			code: string;
			amount: string;
		}>;
	} | null>;
};

export type AuditFactInput = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	entity: string;
	entityId: string;
	action: "CREATE" | "UPDATE" | "DELETE";
	changes: Change[];
	oldValue?: Record<string, unknown> | null;
	newValue?: Record<string, unknown> | null;
};

export type AuditFactPort = {
	record(input: AuditFactInput): Promise<Result<{ id: string }>>;
};

export type OutboxFactInput = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	type: PayrollEventType;
	payload: Record<string, unknown>;
};

export type OutboxPort = {
	append(input: OutboxFactInput): Promise<Result<{ id: string }>>;
};

export type MutationPorts = {
	audit: AuditFactPort;
	outbox: OutboxPort;
};
