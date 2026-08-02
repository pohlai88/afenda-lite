import { database as afendaDatabase, sql } from "@afenda/db";
import { describe, expect, it } from "vitest";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	`Corporate Administration pagination query plans (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("retains bounded tenant-scoped plans and their supporting indexes", async () => {
			const organizationId = "org-ca-pagination-plan";
			const legalCompanyId = "00000000-0000-4000-8000-000000000699";
			const asOf = "2026-06-01";
			const plans = await Promise.all([
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT id, normalized_company_code
					FROM ca_legal_company
					WHERE organization_id = ${organizationId}
					ORDER BY normalized_company_code ASC, id ASC
					LIMIT 51
				`),
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT id, normalized_company_code
					FROM ca_legal_company
					WHERE organization_id = ${organizationId}
						AND state = 'draft'
					ORDER BY normalized_company_code ASC, id ASC
					LIMIT 51
				`),
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT company.id, company.normalized_company_code
					FROM ca_legal_company AS company
					WHERE company.organization_id = ${organizationId}
						AND (
							SELECT history.status
							FROM ca_company_status_history AS history
							WHERE history.organization_id = company.organization_id
								AND history.legal_company_id = company.id
								AND history.effective_from <= ${asOf}
								AND (history.effective_to IS NULL OR ${asOf} < history.effective_to)
							ORDER BY history.effective_from DESC, history.recorded_at DESC, history.id DESC
							LIMIT 1
						) = 'draft'
					ORDER BY company.normalized_company_code ASC, company.id ASC
					LIMIT 51
				`),
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT id, name_type, language_code, effective_from, recorded_at
					FROM ca_company_name
					WHERE organization_id = ${organizationId}
						AND legal_company_id = ${legalCompanyId}::uuid
					ORDER BY name_type ASC, language_code ASC, effective_from DESC, recorded_at DESC, id ASC
					LIMIT 51
				`),
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT id, identifier_type, jurisdiction_code, authority_code, effective_from, recorded_at
					FROM ca_company_identifier
					WHERE organization_id = ${organizationId}
						AND legal_company_id = ${legalCompanyId}::uuid
					ORDER BY identifier_type ASC, jurisdiction_code ASC, authority_code ASC, effective_from DESC, recorded_at DESC, id ASC
					LIMIT 51
				`),
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT id, activity_type, activity_code, effective_from
					FROM ca_company_activity
					WHERE organization_id = ${organizationId}
						AND legal_company_id = ${legalCompanyId}::uuid
						AND effective_from <= ${asOf}
						AND (effective_to IS NULL OR ${asOf} < effective_to)
					ORDER BY activity_type ASC, activity_code ASC, effective_from ASC, id ASC
					LIMIT 51
				`),
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT id, updated_at
					FROM ca_legal_company
					WHERE organization_id = ${organizationId}
						AND id = ${legalCompanyId}::uuid
					ORDER BY updated_at ASC, id ASC
					LIMIT 1
				`),
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT id, recorded_at
					FROM ca_company_jurisdiction_profile
					WHERE organization_id = ${organizationId}
						AND legal_company_id = ${legalCompanyId}::uuid
						AND superseded_at IS NULL
					ORDER BY recorded_at ASC, id ASC
					LIMIT 51
				`),
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT id, recorded_at
					FROM ca_company_status_history
					WHERE organization_id = ${organizationId}
						AND legal_company_id = ${legalCompanyId}::uuid
					ORDER BY recorded_at ASC, id ASC
					LIMIT 51
				`),
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT establishment.id, establishment.establishment_type,
						establishment.jurisdiction_code,
						establishment.normalized_registration_identifier,
						(
							SELECT history.status
							FROM ca_establishment_status_history AS history
							WHERE history.organization_id = establishment.organization_id
								AND history.legal_establishment_id = establishment.id
								AND history.effective_from <= ${asOf}
								AND (history.effective_to IS NULL OR ${asOf} < history.effective_to)
							ORDER BY history.effective_from DESC, history.recorded_at DESC, history.id DESC
							LIMIT 1
						) AS resolved_status
					FROM ca_legal_establishment AS establishment
					WHERE establishment.organization_id = ${organizationId}
						AND establishment.legal_company_id = ${legalCompanyId}::uuid
						AND establishment.registered_from <= ${asOf}
						AND EXISTS (
							SELECT 1
							FROM ca_establishment_status_history AS history
							WHERE history.organization_id = establishment.organization_id
								AND history.legal_establishment_id = establishment.id
								AND history.effective_from <= ${asOf}
								AND (history.effective_to IS NULL OR ${asOf} < history.effective_to)
						)
					ORDER BY establishment.establishment_type ASC,
						establishment.jurisdiction_code ASC,
						establishment.normalized_registration_identifier ASC,
						establishment.id ASC
					LIMIT 51
				`),
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT id, premise_type, display_name
					FROM ca_premise
					WHERE organization_id = ${organizationId}
						AND legal_company_id = ${legalCompanyId}::uuid
						AND effective_from <= ${asOf}
						AND (effective_to IS NULL OR ${asOf} < effective_to)
					ORDER BY premise_type ASC, display_name ASC, id ASC
					LIMIT 51
				`),
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT id, body_type, normalized_body_code
					FROM ca_governance_body
					WHERE organization_id = ${organizationId}
						AND legal_company_id = ${legalCompanyId}::uuid
						AND body_type = 'committee'
						AND status = 'active'
						AND effective_from <= ${asOf}
						AND ${asOf} < COALESCE(effective_to, '9999-12-31'::date)
					ORDER BY body_type ASC, normalized_body_code ASC, id ASC
					LIMIT 51
				`),
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT id, is_chair, seat_label
					FROM ca_governance_membership
					WHERE organization_id = ${organizationId}
						AND governance_body_id = ${legalCompanyId}::uuid
						AND status = 'active'
						AND term_from <= ${asOf}
						AND ${asOf} < COALESCE(term_to, '9999-12-31'::date)
					ORDER BY is_chair DESC, seat_label ASC, id ASC
					LIMIT 51
				`),
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT id, jurisdiction_code, office_type_code
					FROM ca_statutory_office
					WHERE organization_id = ${organizationId}
						AND legal_company_id = ${legalCompanyId}::uuid
						AND required = true
						AND status = 'active'
						AND effective_from <= ${asOf}
						AND ${asOf} < COALESCE(effective_to, '9999-12-31'::date)
					ORDER BY jurisdiction_code ASC, office_type_code ASC, id ASC
					LIMIT 51
				`),
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT id, statutory_office_id, effective_from
					FROM ca_officer_appointment
					WHERE organization_id = ${organizationId}
						AND legal_company_id = ${legalCompanyId}::uuid
						AND status = 'active'
						AND effective_from <= ${asOf}
						AND ${asOf} < COALESCE(effective_to, '9999-12-31'::date)
					ORDER BY statutory_office_id ASC, effective_from ASC, id ASC
					LIMIT 51
				`),
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT id, expires_on
					FROM ca_officer_declaration
					WHERE organization_id = ${organizationId}
						AND legal_company_id = ${legalCompanyId}::uuid
						AND status = 'active'
						AND expires_on >= ${asOf}
						AND expires_on <= '2026-07-01'
					ORDER BY expires_on ASC, id ASC
					LIMIT 51
				`),
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT id, officer_appointment_id, effective_from
					FROM ca_officer_disqualification
					WHERE organization_id = ${organizationId}
						AND legal_company_id = ${legalCompanyId}::uuid
						AND status = 'active'
						AND effective_from <= ${asOf}
						AND ${asOf} < COALESCE(effective_to, '9999-12-31'::date)
					ORDER BY officer_appointment_id ASC, effective_from ASC, id ASC
					LIMIT 51
				`),
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT id, disclosed_at
					FROM ca_conflict_disclosure
					WHERE organization_id = ${organizationId}
						AND legal_company_id = ${legalCompanyId}::uuid
						AND matter_type = 'resolution'
						AND matter_id = 'resolution-plan'
						AND status <> 'cleared'
					ORDER BY disclosed_at ASC, id ASC
					LIMIT 51
				`),
				afendaDatabase.client.execute(sql`
					EXPLAIN (FORMAT JSON)
					SELECT id, governance_body_id, scheduled_start_at
					FROM ca_governance_meeting
					WHERE organization_id = ${organizationId}
						AND legal_company_id = ${legalCompanyId}::uuid
						AND governance_body_id = ${legalCompanyId}::uuid
						AND status = 'scheduled'
					ORDER BY scheduled_start_at ASC, id ASC
					LIMIT 51
				`),
			]);

			for (const plan of plans) {
				const serialized = JSON.stringify(plan);
				expect(serialized).toContain('"Node Type":"Limit"');
				expect(serialized).toContain("organization_id");
			}

			const indexes = await afendaDatabase.client.execute(sql`
				SELECT indexname, indexdef
				FROM pg_indexes
				WHERE schemaname = 'public'
					AND tablename IN (
						'ca_legal_company',
						'ca_company_status_history',
						'ca_company_name',
						'ca_company_identifier',
						'ca_company_activity',
						'ca_company_jurisdiction_profile',
						'ca_legal_establishment',
						'ca_establishment_status_history',
						'ca_premise',
						'ca_governance_body',
						'ca_governance_membership',
						'ca_statutory_office',
						'ca_officer_appointment',
						'ca_officer_declaration',
						'ca_officer_disqualification',
						'ca_conflict_disclosure',
						'ca_governance_meeting'
					)
			`);
			const serializedIndexes = JSON.stringify(indexes);
			expect(serializedIndexes).toContain("ca_legal_company_org_code_uidx");
			expect(serializedIndexes).toContain("ca_legal_company_org_state_idx");
			expect(serializedIndexes).toContain("ca_company_status_as_of_idx");
			expect(serializedIndexes).toContain("ca_company_status_value_idx");
			expect(serializedIndexes).toContain(
				"ca_company_name_scope_effective_idx",
			);
			expect(serializedIndexes).toContain(
				"ca_company_identifier_scope_effective_idx",
			);
			expect(serializedIndexes).toContain("ca_company_activity_as_of_idx");
			expect(serializedIndexes).toContain("ca_company_activity_known_at_idx");
			expect(serializedIndexes).toContain(
				"ca_company_jurisdiction_profile_recorded_idx",
			);
			expect(serializedIndexes).toContain(
				"ca_company_jurisdiction_profile_known_at_idx",
			);
			expect(serializedIndexes).toContain("ca_legal_establishment_company_idx");
			expect(serializedIndexes).toContain("ca_establishment_status_as_of_idx");
			expect(serializedIndexes).toContain("ca_premise_as_of_idx");
			expect(serializedIndexes).toContain("ca_governance_body_as_of_idx");
			expect(serializedIndexes).toContain(
				"ca_governance_body_natural_key_uidx",
			);
			expect(serializedIndexes).toContain(
				"ca_governance_membership_body_as_of_idx",
			);
			expect(serializedIndexes).toContain("ca_governance_membership_party_idx");
			expect(serializedIndexes).toContain("ca_statutory_office_as_of_idx");
			expect(serializedIndexes).toContain(
				"ca_statutory_office_natural_key_uidx",
			);
			expect(serializedIndexes).toContain(
				"ca_officer_appointment_org_company_id_uidx",
			);
			expect(serializedIndexes).toContain(
				"ca_officer_appointment_office_as_of_idx",
			);
			expect(serializedIndexes).toContain("ca_officer_appointment_party_idx");
			expect(serializedIndexes).toContain(
				"ca_officer_declaration_org_company_id_uidx",
			);
			expect(serializedIndexes).toContain("ca_officer_declaration_expiry_idx");
			expect(serializedIndexes).toContain(
				"ca_officer_disqualification_org_company_id_uidx",
			);
			expect(serializedIndexes).toContain(
				"ca_officer_disqualification_as_of_idx",
			);
			expect(serializedIndexes).toContain("ca_conflict_disclosure_matter_idx");
			expect(serializedIndexes).toContain(
				"ca_governance_meeting_body_time_idx",
			);
		}, 30_000);
	},
);
