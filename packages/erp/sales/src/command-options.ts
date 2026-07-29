import type { SalesAuthorizationPort } from "./authorization";
import type {
	AvailabilityCheckPort,
	ClockPort,
	CreditCheckPort,
	MasterDataSnapshotPort,
	SalesStore,
	TaxCalculationPort,
} from "./ports";
import { createSystemClock } from "./production-ports";
import { resolveSalesStore } from "./resolve-store";

export interface SalesCommandOptions {
	authorization?: SalesAuthorizationPort;
	availability?: AvailabilityCheckPort;
	clock?: ClockPort;
	credit?: CreditCheckPort;
	masterData?: MasterDataSnapshotPort;
	store?: SalesStore;
	tax?: TaxCalculationPort;
}
export type SalesQueryOptions = Pick<
	SalesCommandOptions,
	"store" | "authorization" | "clock"
>;
export function resolveSalesDeps(options: SalesCommandOptions = {}) {
	return {
		store: resolveSalesStore(options.store),
		authorization: options.authorization,
		masterData: options.masterData,
		tax: options.tax,
		credit: options.credit,
		availability: options.availability,
		clock: options.clock ?? createSystemClock(),
	};
}
