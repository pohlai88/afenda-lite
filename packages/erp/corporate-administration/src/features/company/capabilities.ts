import type { LegalCompanyStore } from "./store";

export type LegalCompanyReferencePort = Pick<
	LegalCompanyStore,
	"getLegalCompany" | "lockLegalCompany"
>;
