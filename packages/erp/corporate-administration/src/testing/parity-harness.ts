import type { Result } from "@afenda/errors/result";

import type {
	CompanyActivityStore,
	CompanyFinancialYearStore,
	CompanyIdentifierStore,
	CompanyLegalFormStore,
	CompanyNameStore,
	LegalCompanyStore,
} from "../company/store";

export type CorporateAdministrationParityStore = LegalCompanyStore &
	CompanyNameStore &
	CompanyLegalFormStore &
	CompanyIdentifierStore &
	CompanyFinancialYearStore &
	CompanyActivityStore;

export type CorporateAdministrationParityStoreFactory =
	() => CorporateAdministrationParityStore;

export async function runCorporateAdministrationStoreParityHarness(input: {
	createStore: CorporateAdministrationParityStoreFactory;
	run: (store: CorporateAdministrationParityStore) => Promise<Result<unknown>>;
}): Promise<Result<unknown>> {
	return input.run(input.createStore());
}
