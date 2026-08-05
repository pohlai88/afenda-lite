import type { Result } from "@afenda/errors";
import type {
	PayrollFinalSettlement,
	PayrollFinalSettlementLine,
} from "./contract";

/**
 * Persistence contract for final-settlement. Persistence only; C6 clearance,
 * compensation pinning, pro-rata math, statutory resolution, SoD, and
 * statement projection stay in operations.
 */
export interface PayrollFinalSettlementStore {
	createFinalSettlement: (input: {
		settlement: PayrollFinalSettlement;
	}) => Promise<Result<PayrollFinalSettlement>>;

	findFinalSettlementByIdempotencyKey: (input: {
		idempotencyKey: string;
		organizationId: string;
	}) => Promise<Result<PayrollFinalSettlement | null>>;

	getFinalSettlement: (input: {
		organizationId: string;
		settlementId: string;
	}) => Promise<Result<PayrollFinalSettlement | null>>;

	listFinalSettlementLines: (input: {
		organizationId: string;
		settlementId: string;
	}) => Promise<Result<readonly PayrollFinalSettlementLine[]>>;

	saveFinalSettlementCalculation: (input: {
		expectedVersion: number;
		lines: readonly PayrollFinalSettlementLine[];
		settlement: PayrollFinalSettlement;
	}) => Promise<Result<PayrollFinalSettlement>>;

	saveFinalSettlementTransition: (input: {
		expectedVersion: number;
		settlement: PayrollFinalSettlement;
	}) => Promise<Result<PayrollFinalSettlement>>;
}
