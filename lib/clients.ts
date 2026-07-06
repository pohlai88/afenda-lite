import { pool } from "@/lib/db";
import { normalizeEmail } from "@/lib/client";

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
  phone: string | null;
  entityName: string | null;
  jurisdiction: string | null;
  notes: string | null;
  onboardingComplete: boolean;
  updatedAt: Date;
};

export type ClientAssignment = {
  id: string;
  surveyId: string;
  clientEmail: string;
  assignedBy: string;
  status: "pending" | "submitted";
  dueDate: Date | null;
  createdAt: Date;
  surveyTitle?: string;
  surveyQuestion?: string;
  surveySlug?: string;
  confirmationCode?: string | null;
};

let schemaReady: Promise<void> | null = null;

export async function ensureClientSchema() {
  if (!schemaReady) {
    schemaReady = pool
      .query(`
      CREATE TABLE IF NOT EXISTS client_invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        full_name TEXT NOT NULL,
        invited_by UUID NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS client_profiles (
        user_id UUID PRIMARY KEY,
        phone TEXT,
        entity_name TEXT,
        jurisdiction TEXT,
        notes TEXT,
        onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS client_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        client_email TEXT NOT NULL,
        assigned_by UUID NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        due_date TIMESTAMPTZ,
        confirmation_code TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS client_assignments_email_idx
        ON client_assignments (client_email);

      ALTER TABLE survey_responses
        ADD COLUMN IF NOT EXISTS confirmation_code TEXT;
    `)
      .then(() => undefined);
  }

  await schemaReady;
}

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

function mapProfile(row: Record<string, unknown>): ClientProfile {
  return {
    userId: String(row.user_id),
    phone: row.phone ? String(row.phone) : null,
    entityName: row.entity_name ? String(row.entity_name) : null,
    jurisdiction: row.jurisdiction ? String(row.jurisdiction) : null,
    notes: row.notes ? String(row.notes) : null,
    onboardingComplete: Boolean(row.onboarding_complete),
    updatedAt: new Date(String(row.updated_at)),
  };
}

function createInviteTokenValue() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function createConfirmationCode(assignmentId: string) {
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `CDP-${assignmentId.slice(0, 8).toUpperCase()}-${suffix}`;
}

export async function createClientInvitation(input: {
  email: string;
  fullName: string;
  invitedBy: string;
  surveyId?: string;
  expiresInDays?: number;
}) {
  await ensureClientSchema();

  const email = normalizeEmail(input.email);
  const token = createInviteTokenValue();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays ?? 14));

  const result = await pool.query(
    `INSERT INTO client_invitations (token, email, full_name, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, token, email, full_name, invited_by, status, expires_at, created_at`,
    [token, email, input.fullName.trim(), input.invitedBy, expiresAt.toISOString()],
  );

  const invitation = mapInvitation(result.rows[0]);

  if (input.surveyId) {
    await createClientAssignment({
      surveyId: input.surveyId,
      clientEmail: email,
      assignedBy: input.invitedBy,
    });
  }

  return invitation;
}

export async function getClientInvitationByToken(token: string) {
  await ensureClientSchema();

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

  const invitation = mapInvitation(result.rows[0]);
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

export async function markClientInvitationAccepted(id: string) {
  await ensureClientSchema();
  await pool.query(
    `UPDATE client_invitations SET status = 'accepted' WHERE id = $1`,
    [id],
  );
}

export async function getClientProfile(userId: string) {
  await ensureClientSchema();

  const result = await pool.query(
    `SELECT user_id, phone, entity_name, jurisdiction, notes, onboarding_complete, updated_at
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

export async function upsertClientProfile(input: {
  userId: string;
  phone: string;
  entityName: string;
  jurisdiction: string;
  notes?: string;
  onboardingComplete?: boolean;
}) {
  await ensureClientSchema();

  const result = await pool.query(
    `INSERT INTO client_profiles (user_id, phone, entity_name, jurisdiction, notes, onboarding_complete, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       phone = EXCLUDED.phone,
       entity_name = EXCLUDED.entity_name,
       jurisdiction = EXCLUDED.jurisdiction,
       notes = EXCLUDED.notes,
       onboarding_complete = EXCLUDED.onboarding_complete,
       updated_at = NOW()
     RETURNING user_id, phone, entity_name, jurisdiction, notes, onboarding_complete, updated_at`,
    [
      input.userId,
      input.phone.trim(),
      input.entityName.trim(),
      input.jurisdiction.trim(),
      input.notes?.trim() || null,
      input.onboardingComplete ?? true,
    ],
  );

  return mapProfile(result.rows[0]);
}

export async function createClientAssignment(input: {
  surveyId: string;
  clientEmail: string;
  assignedBy: string;
  dueDate?: Date;
}) {
  await ensureClientSchema();

  const result = await pool.query(
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

function mapAssignment(row: Record<string, unknown>): ClientAssignment {
  return {
    id: String(row.id),
    surveyId: String(row.survey_id),
    clientEmail: String(row.client_email),
    assignedBy: String(row.assigned_by),
    status: String(row.status) as ClientAssignment["status"],
    dueDate: row.due_date ? new Date(String(row.due_date)) : null,
    confirmationCode: row.confirmation_code ? String(row.confirmation_code) : null,
    createdAt: new Date(String(row.created_at)),
    surveyTitle: row.survey_title ? String(row.survey_title) : undefined,
    surveyQuestion: row.survey_question ? String(row.survey_question) : undefined,
    surveySlug: row.survey_slug ? String(row.survey_slug) : undefined,
  };
}

export async function listClientAssignments(email: string) {
  await ensureClientSchema();

  const result = await pool.query(
    `SELECT
       a.id,
       a.survey_id,
       a.client_email,
       a.assigned_by,
       a.status,
       a.due_date,
       a.confirmation_code,
       a.created_at,
       s.title AS survey_title,
       s.question AS survey_question,
       s.slug AS survey_slug
     FROM client_assignments a
     JOIN surveys s ON s.id = a.survey_id
     WHERE a.client_email = $1
     ORDER BY a.created_at DESC`,
    [normalizeEmail(email)],
  );

  return result.rows.map(mapAssignment);
}

export async function getClientAssignmentForUser(
  assignmentId: string,
  email: string,
) {
  await ensureClientSchema();

  const result = await pool.query(
    `SELECT
       a.id,
       a.survey_id,
       a.client_email,
       a.assigned_by,
       a.status,
       a.due_date,
       a.confirmation_code,
       a.created_at,
       s.title AS survey_title,
       s.question AS survey_question,
       s.slug AS survey_slug
     FROM client_assignments a
     JOIN surveys s ON s.id = a.survey_id
     WHERE a.id = $1 AND a.client_email = $2
     LIMIT 1`,
    [assignmentId, normalizeEmail(email)],
  );

  if (!result.rows[0]) {
    return null;
  }

  return mapAssignment(result.rows[0]);
}

export async function completeClientAssignment(input: {
  assignmentId: string;
  confirmationCode: string;
}) {
  await ensureClientSchema();

  await pool.query(
    `UPDATE client_assignments
     SET status = 'submitted', confirmation_code = $2
     WHERE id = $1`,
    [input.assignmentId, input.confirmationCode],
  );
}

export async function listClientInvitationsForAdmin() {
  await ensureClientSchema();

  const result = await pool.query(
    `SELECT id, token, email, full_name, invited_by, status, expires_at, created_at
     FROM client_invitations
     ORDER BY created_at DESC
     LIMIT 50`,
  );

  return result.rows.map(mapInvitation);
}
