import { pool } from "@/lib/db";

export type Survey = {
  id: string;
  slug: string;
  title: string;
  question: string;
  userId: string;
  createdAt: Date;
};

export type SurveyResponse = {
  id: string;
  surveyId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
};

export type SurveyWithStats = Survey & {
  responseCount: number;
  averageRating: number | null;
};

let schemaReady: Promise<void> | null = null;

export async function ensureSurveySchema() {
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS surveys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        question TEXT NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS survey_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS survey_responses_survey_id_idx
        ON survey_responses (survey_id);

      CREATE TABLE IF NOT EXISTS survey_invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        client_email TEXT NOT NULL,
        invited_by UUID NOT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS survey_invite_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token TEXT UNIQUE NOT NULL,
        survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        created_by UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS survey_invite_tokens_survey_id_idx
        ON survey_invite_tokens (survey_id);
    `).then(() => undefined);
  }

  await schemaReady;
}

function mapSurvey(row: Record<string, unknown>): Survey {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    question: String(row.question),
    userId: String(row.user_id),
    createdAt: new Date(String(row.created_at)),
  };
}

function mapResponse(row: Record<string, unknown>): SurveyResponse {
  return {
    id: String(row.id),
    surveyId: String(row.survey_id),
    rating: Number(row.rating),
    comment: row.comment ? String(row.comment) : null,
    createdAt: new Date(String(row.created_at)),
  };
}

export function createSlug(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const suffix = Math.random().toString(36).slice(2, 8);
  return base ? `${base}-${suffix}` : suffix;
}

export async function createSurvey(input: {
  title: string;
  question: string;
  userId: string;
}) {
  await ensureSurveySchema();

  const slug = createSlug(input.title);
  const result = await pool.query(
    `INSERT INTO surveys (slug, title, question, user_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, slug, title, question, user_id, created_at`,
    [slug, input.title.trim(), input.question.trim(), input.userId],
  );

  return mapSurvey(result.rows[0]);
}

export async function listSurveysForAdmin() {
  await ensureSurveySchema();

  const result = await pool.query(
    `SELECT
       s.id,
       s.slug,
       s.title,
       s.question,
       s.user_id,
       s.created_at,
       COUNT(r.id)::int AS response_count,
       ROUND(AVG(r.rating)::numeric, 1) AS average_rating
     FROM surveys s
     LEFT JOIN survey_responses r ON r.survey_id = s.id
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
  );

  return result.rows.map((row) => ({
    ...mapSurvey(row),
    responseCount: Number(row.response_count),
    averageRating: row.average_rating ? Number(row.average_rating) : null,
  })) satisfies SurveyWithStats[];
}

export async function listSurveysForUser(userId: string) {
  await ensureSurveySchema();

  const result = await pool.query(
    `SELECT
       s.id,
       s.slug,
       s.title,
       s.question,
       s.user_id,
       s.created_at,
       COUNT(r.id)::int AS response_count,
       ROUND(AVG(r.rating)::numeric, 1) AS average_rating
     FROM surveys s
     LEFT JOIN survey_responses r ON r.survey_id = s.id
     WHERE s.user_id = $1
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    [userId],
  );

  return result.rows.map((row) => ({
    ...mapSurvey(row),
    responseCount: Number(row.response_count),
    averageRating: row.average_rating ? Number(row.average_rating) : null,
  })) satisfies SurveyWithStats[];
}

export async function getSurveyBySlug(slug: string) {
  await ensureSurveySchema();

  const result = await pool.query(
    `SELECT id, slug, title, question, user_id, created_at
     FROM surveys
     WHERE slug = $1
     LIMIT 1`,
    [slug],
  );

  if (!result.rows[0]) {
    return null;
  }

  return mapSurvey(result.rows[0]);
}

export async function getSurveyForAdmin(id: string) {
  await ensureSurveySchema();

  const result = await pool.query(
    `SELECT id, slug, title, question, user_id, created_at
     FROM surveys
     WHERE id = $1
     LIMIT 1`,
    [id],
  );

  if (!result.rows[0]) {
    return null;
  }

  return mapSurvey(result.rows[0]);
}

export async function getSurveyForOwner(id: string, userId: string) {
  await ensureSurveySchema();

  const result = await pool.query(
    `SELECT id, slug, title, question, user_id, created_at
     FROM surveys
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [id, userId],
  );

  if (!result.rows[0]) {
    return null;
  }

  return mapSurvey(result.rows[0]);
}

export async function listResponsesForSurvey(surveyId: string) {
  await ensureSurveySchema();

  const result = await pool.query(
    `SELECT id, survey_id, rating, comment, created_at
     FROM survey_responses
     WHERE survey_id = $1
     ORDER BY created_at DESC`,
    [surveyId],
  );

  return result.rows.map(mapResponse);
}

export async function submitSurveyResponse(input: {
  surveyId: string;
  rating: number;
  comment?: string;
}) {
  await ensureSurveySchema();

  const result = await pool.query(
    `INSERT INTO survey_responses (survey_id, rating, comment)
     VALUES ($1, $2, $3)
     RETURNING id, survey_id, rating, comment, created_at`,
    [input.surveyId, input.rating, input.comment?.trim() || null],
  );

  return mapResponse(result.rows[0]);
}

export async function recordSurveyInvitation(input: {
  surveyId: string;
  clientEmail: string;
  invitedBy: string;
}) {
  await ensureSurveySchema();

  await pool.query(
    `INSERT INTO survey_invitations (survey_id, client_email, invited_by)
     VALUES ($1, $2, $3)`,
    [input.surveyId, input.clientEmail, input.invitedBy],
  );
}

function createInviteTokenValue() {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function getOrCreateInviteToken(input: {
  surveyId: string;
  createdBy: string;
}) {
  await ensureSurveySchema();

  const existing = await pool.query(
    `SELECT token
     FROM survey_invite_tokens
     WHERE survey_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [input.surveyId],
  );

  if (existing.rows[0]) {
    return String(existing.rows[0].token);
  }

  const token = createInviteTokenValue();
  await pool.query(
    `INSERT INTO survey_invite_tokens (token, survey_id, created_by)
     VALUES ($1, $2, $3)`,
    [token, input.surveyId, input.createdBy],
  );

  return token;
}

export async function regenerateInviteToken(input: {
  surveyId: string;
  createdBy: string;
}) {
  await ensureSurveySchema();

  const token = createInviteTokenValue();
  await pool.query(
    `INSERT INTO survey_invite_tokens (token, survey_id, created_by)
     VALUES ($1, $2, $3)`,
    [token, input.surveyId, input.createdBy],
  );

  return token;
}

export async function getSurveyByInviteToken(token: string) {
  await ensureSurveySchema();

  const result = await pool.query(
    `SELECT s.id, s.slug, s.title, s.question, s.user_id, s.created_at
     FROM survey_invite_tokens t
     JOIN surveys s ON s.id = t.survey_id
     WHERE t.token = $1
     LIMIT 1`,
    [token],
  );

  if (!result.rows[0]) {
    return null;
  }

  return mapSurvey(result.rows[0]);
}
