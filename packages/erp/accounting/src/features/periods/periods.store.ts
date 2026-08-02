import type { Result } from "@afenda/errors";

import type { AccountingPeriod } from "../../kernel/contracts/domain";

export interface AccountingPeriodsStore {
	closePeriod: (record: {
		organizationId: string;
		periodId: string;
		expectedVersion: number;
		closeReason: string | null;
		actorUserId: string;
	}) => Promise<Result<AccountingPeriod>>;
	openPeriod: (record: {
		organizationId: string;
		code: string;
		normalizedCode: string;
		startDate: string;
		endDate: string;
		actorUserId: string;
	}) => Promise<Result<AccountingPeriod>>;
	reopenPeriod: (record: {
		organizationId: string;
		periodId: string;
		expectedVersion: number;
		reason: string;
		actorUserId: string;
	}) => Promise<Result<AccountingPeriod>>;
	softClosePeriod: (record: {
		organizationId: string;
		periodId: string;
		expectedVersion: number;
		actorUserId: string;
	}) => Promise<Result<AccountingPeriod>>;
}
