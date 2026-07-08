import { pool } from "@/lib/db";
import { createInviteTokenValue } from "@/lib/tokens";
import { CLIENT_PORTAL_ACK_VERSION } from "@/lib/portal-copy";
import type { SurveyAnswers } from "@/lib/question-models";
import type { PoolClient } from "pg";

export function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

export type ClientInvitation = {
  id: string;
  token: string;
  email: string;
  fullName: string;
  invitedBy: string;
  status: "pending" | "accepted" | "expired";
  expiresAt: Date;
  createdAt: Date;
};

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

export type ClientAssignment = {
  id: string;
  surveyId: string;
  clientEmail: string;
  assignedBy: string;
  status: "pending" | "submitted";
  dueDate: Date | null;
  submitBefore: Date | null;
  createdAt: Date;
  surveyTitle?: string;
  surveyQuestion?: string;
  surveySlug?: string;
  confirmationCode?: string | null;
  draftAnswers?: SurveyAnswers | null;
  draftStepIndex?: number | null;
  draftSavedAt?: Date | null;
};

function mapInvitation(row: Record<string, unknown>): ClientInvitation {
  return {
    id: String(row.id),
    token: String(row.token),
    email: String(row.email),
    fullName: String(row.full_name),
    invitedBy: String(row.invited_by),
    status: String(row.status) as ClientInvitation["status"],
    expiresAt: new Date(String(row.expires_at)),
    createdAt: new Date(String(row.created_at)),
  };
}

async function expirePendingInvitationIfNeeded(
  invitation: ClientInvitation,
): Promise<ClientInvitation> {
  if (
    invitation.status === "pending" &&
    invitation.expiresAt.getTime() < Date.now()
  ) {
    await pool.query(
      `UPDATE client_invitations SET status = 'expired' WHERE id = $1`,
      [invitation.id],
    );
    return { ...invitation, status: "expired" as const };
  }

  return invitation;
}

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
    portalAckAt: row.portal_ack_at ? new Date(String(row.portal_ack_at)) : null,
    portalAckVersion: row.portal_ack_version
      ? String(row.portal_ack_version)
      : null,
    updatedAt: new Date(String(row.updated_at)),
  };
}

function mapDraftAnswers(value: unknown): SurveyAnswers | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const answers: SurveyAnswers = {};
  for (const [key, answer] of Object.entries(value)) {
    if (typeof answer === "boolean" || typeof answer === "string") {
      answers[key] = answer;
    }
  }

  return Object.keys(answers).length > 0 ? answers : null;
}

function mapAssignment(row: Record<string, unknown>): ClientAssignment {
  return {
    id: String(row.id),
    surveyId: String(row.survey_id),
    clientEmail: String(row.client_email),
    assignedBy: String(row.assigned_by),
    status: String(row.status) as ClientAssignment["status"],
    dueDate: row.due_date ? new Date(String(row.due_date)) : null,
    submitBefore: row.submit_before
      ? new Date(String(row.submit_before))
      : null,
    confirmationCode: row.confirmation_code ? String(row.confirmation_code) : null,
    createdAt: new Date(String(row.created_at)),
    surveyTitle: row.survey_title ? String(row.survey_title) : undefined,
    surveyQuestion: row.survey_question ? String(row.survey_question) : undefined,
    surveySlug: row.survey_slug ? String(row.survey_slug) : undefined,
    draftAnswers: mapDraftAnswers(row.draft_answers),
    draftStepIndex:
      row.draft_step_index === null || row.draft_step_index === undefined
        ? null
        : Number(row.draft_step_index),
    draftSavedAt: row.draft_saved_at
      ? new Date(String(row.draft_saved_at))
      : null,
  };
}

const ASSIGNMENT_SELECT = `
  a.id,
  a.survey_id,
  a.client_email,
  a.assigned_by,
  a.status,
  a.due_date,
  a.confirmation_code,
  a.created_at,
  a.draft_answers,
  a.draft_step_index,
  a.draft_saved_at,
  s.title AS survey_title,
  s.question AS survey_question,
  s.slug AS survey_slug,
  s.submit_before
`;

export function createConfirmationCode(assignmentId: string) {
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `CDP-${assignmentId.slice(0, 8).toUpperCase()}-${suffix}`;
}

export async function countPendingClientAssignments() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM client_assignments
     WHERE status = 'pending'`,
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function createClientInvitation(input: {
  email: string;
  fullName: string;
  invitedBy: string;
  surveyId?: string;
  dueDate?: Date;
  expiresInDays?: number;
}) {
  const email = normalizeEmail(input.email);
  const token = createInviteTokenValue();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays ?? 14));

  const dbClient = await pool.connect();
  try {
    await dbClient.query("BEGIN");

    const result = await dbClient.query(
      `INSERT INTO client_invitations (token, email, full_name, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, token, email, full_name, invited_by, status, expires_at, created_at`,
      [
        token,
        email,
        input.fullName.trim(),
        input.invitedBy,
        expiresAt.toISOString(),
      ],
    );

    const invitation = mapInvitation(result.rows[0]);

    if (input.surveyId) {
      await insertClientAssignment(dbClient, {
        surveyId: input.surveyId,
        clientEmail: email,
        assignedBy: input.invitedBy,
        dueDate: input.dueDate,
      });
    }

    await dbClient.query("COMMIT");
    return invitation;
  } catch (error) {
    await dbClient.query("ROLLBACK");
    throw error;
  } finally {
    dbClient.release();
  }
}

export async function getClientInvitationByToken(token: string) {
  const result = await pool.query(
    `SELECT id, token, email, full_name, invited_by, status, expires_at, created_at
     FROM client_invitations
     WHERE token = $1
     LIMIT 1`,
    [token],
  );

  if (!result.rows[0]) {
    return null;
  }

  return expirePendingInvitationIfNeeded(mapInvitation(result.rows[0]));
}

export async function markClientInvitationAccepted(id: string) {
  await pool.query(
    `UPDATE client_invitations SET status = 'accepted' WHERE id = $1`,
    [id],
  );
}

export async function getClientInvitationByEmail(email: string) {
  const result = await pool.query(
    `SELECT id, token, email, full_name, invited_by, status, expires_at, created_at
     FROM client_invitations
     WHERE lower(email) = lower($1)
     ORDER BY created_at DESC
     LIMIT 1`,
    [email],
  );

  if (!result.rows[0]) {
    return null;
  }

  return expirePendingInvitationIfNeeded(mapInvitation(result.rows[0]));
}

export async function getClientProfile(userId: string) {
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

export async function ensureClientProfileRow(userId: string) {
  await pool.query(
    `INSERT INTO client_profiles (user_id, onboarding_complete, updated_at)
     VALUES ($1, false, NOW())
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
}

export async function upsertClientProfile(input: {
  userId: string;
  fullLegalName: string;
  nationality: string;
  countryOfResidence: string;
  additionalResidenceCountries?: string[];
  passportIssuingCountry: string;
  passportNumber: string;
  phone: string;
  entityName: string;
  jurisdiction: string;
  notes?: string;
  identityConsentAt?: Date;
  onboardingComplete?: boolean;
}) {
  const result = await pool.query(
    `INSERT INTO client_profiles (
       user_id, full_legal_name, nationality, country_of_residence,
       additional_residence_countries, passport_issuing_country, passport_number,
       phone, entity_name, jurisdiction, notes, identity_consent_at,
       onboarding_complete, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       full_legal_name = EXCLUDED.full_legal_name,
       nationality = EXCLUDED.nationality,
       country_of_residence = EXCLUDED.country_of_residence,
       additional_residence_countries = EXCLUDED.additional_residence_countries,
       passport_issuing_country = EXCLUDED.passport_issuing_country,
       passport_number = EXCLUDED.passport_number,
       phone = EXCLUDED.phone,
       entity_name = EXCLUDED.entity_name,
       jurisdiction = EXCLUDED.jurisdiction,
       notes = EXCLUDED.notes,
       identity_consent_at = EXCLUDED.identity_consent_at,
       onboarding_complete = EXCLUDED.onboarding_complete,
       updated_at = NOW()
     RETURNING user_id, full_legal_name, nationality, country_of_residence,
               additional_residence_countries, passport_issuing_country, passport_number,
               phone, entity_name, jurisdiction, notes, identity_consent_at,
               onboarding_complete, portal_ack_at, portal_ack_version, updated_at`,
    [
      input.userId,
      input.fullLegalName.trim(),
      input.nationality.trim(),
      input.countryOfResidence.trim(),
      input.additionalResidenceCountries ?? [],
      input.passportIssuingCountry.trim(),
      input.passportNumber.trim(),
      input.phone.trim(),
      input.entityName.trim(),
      input.jurisdiction.trim(),
      input.notes?.trim() || null,
      input.identityConsentAt?.toISOString() ?? null,
      input.onboardingComplete ?? true,
    ],
  );

  return mapProfile(result.rows[0]);
}

export function isClientPortalAcknowledged(profile: ClientProfile | null) {
  if (!profile?.portalAckAt) {
    return false;
  }
  return profile.portalAckVersion === CLIENT_PORTAL_ACK_VERSION;
}

export async function acknowledgeClientPortal(input: {
  userId: string;
  version: string;
}) {
  await pool.query(
    `UPDATE client_profiles
     SET portal_ack_at = NOW(), portal_ack_version = $2, updated_at = NOW()
     WHERE user_id = $1`,
    [input.userId, input.version],
  );
}

async function insertClientAssignment(
  dbClient: PoolClient,
  input: {
    surveyId: string;
    clientEmail: string;
    assignedBy: string;
    dueDate?: Date;
  },
) {
  const result = await dbClient.query(
    `INSERT INTO client_assignments (survey_id, client_email, assigned_by, due_date)
     VALUES ($1, $2, $3, $4)
     RETURNING id, survey_id, client_email, assigned_by, status, due_date, confirmation_code, created_at`,
    [
      input.surveyId,
      normalizeEmail(input.clientEmail),
      input.assignedBy,
      input.dueDate?.toISOString() ?? null,
    ],
  );

  return mapAssignment(result.rows[0]);
}

export async function createClientAssignment(input: {
  surveyId: string;
  clientEmail: string;
  assignedBy: string;
  dueDate?: Date;
}) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query("BEGIN");
    const assignment = await insertClientAssignment(dbClient, input);
    await dbClient.query("COMMIT");
    return assignment;
  } catch (error) {
    await dbClient.query("ROLLBACK");
    throw error;
  } finally {
    dbClient.release();
  }
}

export async function listClientAssignments(email: string) {
  const result = await pool.query(
    `SELECT ${ASSIGNMENT_SELECT}
     FROM client_assignments a
     JOIN surveys s ON s.id = a.survey_id
     WHERE lower(a.client_email) = lower($1)
     ORDER BY a.created_at DESC`,
    [normalizeEmail(email)],
  );

  return result.rows.map(mapAssignment);
}

export async function getActiveClientAssignmentForSurvey(
  email: string,
  surveyId: string,
) {
  const result = await pool.query(
    `SELECT ${ASSIGNMENT_SELECT}
     FROM client_assignments a
     JOIN surveys s ON s.id = a.survey_id
     WHERE lower(a.client_email) = lower($1)
       AND a.survey_id = $2
       AND a.status <> 'submitted'
     ORDER BY a.created_at DESC
     LIMIT 1`,
    [normalizeEmail(email), surveyId],
  );

  if (!result.rows[0]) {
    return null;
  }

  return mapAssignment(result.rows[0]);
}

export async function getClientAssignmentForUser(
  assignmentId: string,
  email: string,
) {
  const result = await pool.query(
    `SELECT ${ASSIGNMENT_SELECT}
     FROM client_assignments a
     JOIN surveys s ON s.id = a.survey_id
     WHERE a.id = $1 AND lower(a.client_email) = lower($2)
     LIMIT 1`,
    [assignmentId, normalizeEmail(email)],
  );

  if (!result.rows[0]) {
    return null;
  }

  return mapAssignment(result.rows[0]);
}

export async function saveClientAssignmentDraft(input: {
  assignmentId: string;
  clientEmail: string;
  answers: SurveyAnswers;
  stepIndex: number;
}) {
  const result = await pool.query(
    `UPDATE client_assignments
     SET draft_answers = $3::jsonb,
         draft_step_index = $4,
         draft_saved_at = NOW()
     WHERE id = $1
       AND lower(client_email) = lower($2)
       AND status = 'pending'
     RETURNING id`,
    [
      input.assignmentId,
      normalizeEmail(input.clientEmail),
      JSON.stringify(input.answers),
      input.stepIndex,
    ],
  );

  return Boolean(result.rows[0]);
}

export async function completeClientAssignment(input: {
  assignmentId: string;
  confirmationCode: string;
}) {
  const result = await pool.query(
    `UPDATE client_assignments
     SET status = 'submitted', confirmation_code = $2
     WHERE id = $1 AND status <> 'submitted'
     RETURNING id`,
    [input.assignmentId, input.confirmationCode],
  );

  return Boolean(result.rows[0]);
}

export async function listClientInvitationsForAdmin() {
  const result = await pool.query(
    `SELECT id, token, email, full_name, invited_by, status, expires_at, created_at
     FROM client_invitations
     ORDER BY created_at DESC
     LIMIT 50`,
  );

  return result.rows.map(mapInvitation);
}

export async function listClientAssignmentsForAdmin() {
  const result = await pool.query(
    `SELECT ${ASSIGNMENT_SELECT}
     FROM client_assignments a
     JOIN surveys s ON s.id = a.survey_id
     ORDER BY a.created_at DESC
     LIMIT 50`,
  );

  return result.rows.map(mapAssignment);
}

export async function getClientInvitationById(id: string) {
  const result = await pool.query(
    `SELECT id, token, email, full_name, invited_by, status, expires_at, created_at
     FROM client_invitations
     WHERE id = $1
     LIMIT 1`,
    [id],
  );

  if (!result.rows[0]) {
    return null;
  }

  return mapInvitation(result.rows[0]);
}

export async function deleteClientInvitationById(id: string) {
  await pool.query(`DELETE FROM client_invitations WHERE id = $1`, [id]);
}

export async function deleteClientAssignmentsForEmail(email: string) {
  await pool.query(
    `DELETE FROM client_assignments WHERE lower(client_email) = lower($1)`,
    [normalizeEmail(email)],
  );
}

export async function getClientAssignmentById(id: string) {
  const result = await pool.query(
    `SELECT id FROM client_assignments WHERE id = $1 LIMIT 1`,
    [id],
  );

  return result.rows[0] ? { id: result.rows[0].id as string } : null;
}

export async function deleteClientAssignmentById(id: string) {
  await pool.query(`DELETE FROM client_assignments WHERE id = $1`, [id]);
}

export async function deleteClientProfileByUserId(userId: string) {
  await pool.query(`DELETE FROM client_profiles WHERE user_id = $1`, [userId]);
}
