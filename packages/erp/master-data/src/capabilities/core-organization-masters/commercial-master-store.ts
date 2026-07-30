import type { CommercialMasterStore } from "./store";

export type { CommercialMasterStore } from "./store";

export type PaymentTermStore = Pick<
	CommercialMasterStore,
	| "getPaymentTermById"
	| "getPaymentTermByCode"
	| "listPaymentTerms"
	| "createPaymentTerm"
	| "updatePaymentTerm"
	| "transitionPaymentTerm"
>;

export type TaxRegistrationStore = Pick<
	CommercialMasterStore,
	| "getTaxRegistrationById"
	| "listTaxRegistrations"
	| "findTaxRegistrationsByParty"
	| "createTaxRegistration"
	| "updateTaxRegistration"
	| "transitionTaxRegistration"
>;
