import type { Result } from "@afenda/errors/result";

import type { ApprovedPayrollHandoff } from "@afenda/events/schemas";

export interface ApprovedPayrollHandoffProducerPort {
	getApprovedPayrollHandoff: (input: {
		organizationId: string;
		employeeId: string;
		effectiveDate: string;
		correlationId: string;
		timesheetId?: string;
		leaveRequestIds?: readonly string[];
	}) => Promise<Result<ApprovedPayrollHandoff | null>>;
}
