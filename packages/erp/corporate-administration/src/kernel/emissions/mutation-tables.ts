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
	"ca_company_status_history",
	"ca_legal_establishment",
	"ca_establishment_status_history",
	"ca_registered_address",
	"ca_premise",
	"ca_governance_body",
	"ca_governance_membership",
	"ca_statutory_office",
	"ca_officer_appointment",
	"ca_officer_qualification",
	"ca_officer_declaration",
	"ca_officer_disqualification",
	"ca_conflict_disclosure",
	"ca_governance_meeting",
	"ca_meeting_notice",
	"ca_meeting_participant",
	"ca_meeting_quorum_result",
	"ca_meeting_vote",
	"ca_resolution",
	"ca_resolution_action",
] as const;

export type CorporateAdministrationMutationTable =
	(typeof CORPORATE_ADMINISTRATION_MUTATION_TABLES)[number];
