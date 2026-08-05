import type { Result } from "@afenda/errors";
import type {
	PayrollRetroItem,
	PayrollRetroItemView,
	PayrollRetroLine,
	PayrollRetroStatus,
} from "./contract";

/**
 * Persistence contract for retro-pay — deferred corrections and the retro
 * lines emitted into an open target run. Persistence only; recompute and
 * period-state policy stay in retro-pay operations.
 */
export interface PayrollRetroStore {
	/** Seals the calculated difference into the target run in one write. */
	applyRetroItem: (input: {
		expectedVersion: number;
		item: PayrollRetroItem;
		lines: readonly PayrollRetroLine[];
	}) => Promise<Result<PayrollRetroItem>>;

	createRetroItem: (input: {
		item: PayrollRetroItem;
	}) => Promise<Result<PayrollRetroItem>>;

	findRetroItemByIdempotencyKey: (input: {
		idempotencyKey: string;
		organizationId: string;
	}) => Promise<Result<PayrollRetroItem | null>>;

	getRetroItem: (input: {
		organizationId: string;
		retroItemId: string;
	}) => Promise<Result<PayrollRetroItem | null>>;

	listRetroItemViews: (input: {
		employeeId?: string;
		organizationId: string;
		originPeriodId?: string;
		status?: PayrollRetroStatus;
		targetRunId?: string;
	}) => Promise<Result<readonly PayrollRetroItemView[]>>;

	saveRetroDifference: (input: {
		expectedVersion: number;
		item: PayrollRetroItem;
	}) => Promise<Result<PayrollRetroItem>>;
}
