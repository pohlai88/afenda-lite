/**
 * CA-owned mutation tables for the scaffolded CA-0.4 vertical slice.
 *
 * Shared platform audit/outbox tables are mutated through platform-owned
 * facilities and are intentionally excluded.
 */
export const CORPORATE_ADMINISTRATION_MUTATION_TABLES = [
	"ca_mutation_receipt",
	"ca_legal_company",
	"ca_company_jurisdiction_profile",
	"ca_company_name",
	"ca_company_legal_form_history",
	"ca_company_identifier",
	"ca_company_financial_year",
	"ca_company_activity",
	"ca_legal_establishment",
	"ca_establishment_status_history",
	"ca_registered_address",
	"ca_premise",
] as const;

export type CorporateAdministrationMutationTable =
	(typeof CORPORATE_ADMINISTRATION_MUTATION_TABLES)[number];
