import "server-only";

import { pool } from "@/modules/platform/db";

/**
 * Client profile port (Identity).
 * Session gates + auth bootstrap own these reads/ensures — Declarations must not
 * be imported for them. Declarations may re-export and still owns upsert/CRUD.
 */
export type ClientProfile = {
  userId: string;
  fullLegalName: string | null;
  nationality: string | null;
  countryOfResidence: string | null;
  additionalResidenceCountries: string[];
  passportIssuingCountry: string | null;
  passportNumber: string | null;
  phone: string | null;
  entityName: string | null;
  jurisdiction: string | null;
  notes: string | null;
  identityConsentAt: Date | null;
  onboardingComplete: boolean;
  portalAckAt: Date | null;
  portalAckVersion: string | null;
  updatedAt: Date;
};

function mapProfile(row: Record<string, unknown>): ClientProfile {
  const additional = row.additional_residence_countries;
  return {
    userId: String(row.user_id),
    fullLegalName: row.full_legal_name ? String(row.full_legal_name) : null,
    nationality: row.nationality ? String(row.nationality) : null,
    countryOfResidence: row.country_of_residence
      ? String(row.country_of_residence)
      : null,
    additionalResidenceCountries: Array.isArray(additional)
      ? additional.map(String)
      : [],
    passportIssuingCountry: row.passport_issuing_country
      ? String(row.passport_issuing_country)
      : null,
    passportNumber: row.passport_number ? String(row.passport_number) : null,
    phone: row.phone ? String(row.phone) : null,
    entityName: row.entity_name ? String(row.entity_name) : null,
    jurisdiction: row.jurisdiction ? String(row.jurisdiction) : null,
    notes: row.notes ? String(row.notes) : null,
    identityConsentAt: row.identity_consent_at
      ? new Date(String(row.identity_consent_at))
      : null,
    onboardingComplete: Boolean(row.onboarding_complete),
    portalAckAt: row.portal_ack_at
      ? new Date(String(row.portal_ack_at))
      : null,
    portalAckVersion: row.portal_ack_version
      ? String(row.portal_ack_version)
      : null,
    updatedAt: new Date(String(row.updated_at)),
  };
}

/** Shared row mapper for Identity + Declarations profile writes. */
export function mapClientProfileRow(
  row: Record<string, unknown>,
): ClientProfile {
  return mapProfile(row);
}

export async function getClientProfile(
  userId: string,
): Promise<ClientProfile | null> {
  const result = await pool.query(
    `SELECT user_id, full_legal_name, nationality, country_of_residence,
            additional_residence_countries, passport_issuing_country, passport_number,
            phone, entity_name, jurisdiction, notes, identity_consent_at,
            onboarding_complete, portal_ack_at, portal_ack_version, updated_at
     FROM client_profiles
     WHERE user_id = $1
     LIMIT 1`,
    [userId],
  );

  if (!result.rows[0]) {
    return null;
  }

  return mapProfile(result.rows[0]);
}

export async function ensureClientProfileRow(userId: string): Promise<void> {
  await pool.query(
    `INSERT INTO client_profiles (user_id, onboarding_complete, updated_at)
     VALUES ($1, false, NOW())
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
}
