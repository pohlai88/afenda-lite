import type { MasterDataStore } from "./store";

/** Persistence boundary required by the payment-term aggregate. */
export type PaymentTermStore = Pick<
	MasterDataStore,
	| "getPaymentTermById"
	| "getPaymentTermByCode"
	| "listPaymentTerms"
	| "createPaymentTerm"
	| "updatePaymentTerm"
	| "transitionPaymentTerm"
>;

/** Persistence boundary required by the tax-registration aggregate. */
export type TaxRegistrationStore = Pick<
	MasterDataStore,
	| "getTaxRegistrationById"
	| "listTaxRegistrations"
	| "findTaxRegistrationsByParty"
	| "createTaxRegistration"
	| "updateTaxRegistration"
	| "transitionTaxRegistration"
>;
