import type { Result } from "@afenda/errors";

import type {
	PayrollFilingObligation,
	PayrollStatutoryFiling,
	PayrollStatutoryFilingLine,
} from "./contract";

/**
 * Persistence contract for statutory-filings. Persistence only; snapshot
 * assembly, SoD seal, and obligation projection stay in operations.
 */
export interface PayrollStatutoryFilingStore {
	createStatutoryFiling: (input: {
		filing: PayrollStatutoryFiling;
		lines: readonly PayrollStatutoryFilingLine[];
	}) => Promise<Result<PayrollStatutoryFiling>>;

	findStatutoryFilingByIdempotencyKey: (input: {
		idempotencyKey: string;
		organizationId: string;
	}) => Promise<Result<PayrollStatutoryFiling | null>>;

	getStatutoryFiling: (input: {
		filingId: string;
		organizationId: string;
	}) => Promise<Result<PayrollStatutoryFiling | null>>;

	listFilingObligations: (input: {
		instrumentCode?: string;
		jurisdictionCode?: string;
		organizationId: string;
		taxYear?: number;
	}) => Promise<Result<readonly PayrollFilingObligation[]>>;

	listStatutoryFilingLines: (input: {
		filingId: string;
		organizationId: string;
	}) => Promise<Result<readonly PayrollStatutoryFilingLine[]>>;

	saveStatutoryFilingTransition: (input: {
		expectedVersion: number;
		filing: PayrollStatutoryFiling;
	}) => Promise<Result<PayrollStatutoryFiling>>;
}
