import { pool } from "@/lib/db";
import { createInviteTokenValue } from "@/lib/tokens";

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
  answers: Record<string, boolean | string> | null;
  confirmationCode: string | null;
  createdAt: Date;
};

export type SurveyWithStats = Survey & {
  responseCount: number;
};

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
  const answersRaw = row.answers;
  let answers: Record<string, boolean | string> | null = null;
  if (answersRaw && typeof answersRaw === "object") {
    answers = answersRaw as Record<string, boolean | string>;
  } else if (typeof answersRaw === "string") {
    try {
      answers = JSON.parse(answersRaw) as Record<string, boolean | string>;
    } catch {
      answers = null;
    }
  }

  return {
    id: String(row.id),
    surveyId: String(row.survey_id),
    answers,
    confirmationCode: row.confirmation_code
      ? String(row.confirmation_code)
      : null,
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
  const result = await pool.query(
    `SELECT
       s.id,
       s.slug,
       s.title,
       s.question,
       s.user_id,
       s.created_at,
       COUNT(r.id)::int AS response_count
     FROM surveys s
     LEFT JOIN survey_responses r ON r.survey_id = s.id
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
  );

  return result.rows.map((row) => ({
    ...mapSurvey(row),
    responseCount: Number(row.response_count),
  })) satisfies SurveyWithStats[];
}

export async function getSurveyBySlug(slug: string) {
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

export async function updateSurvey(input: {
  id: string;
  title: string;
  question: string;
}) {
  const result = await pool.query(
    `UPDATE surveys
     SET title = $2, question = $3
     WHERE id = $1
     RETURNING id, slug, title, question, user_id, created_at`,
    [input.id, input.title.trim(), input.question.trim()],
  );

  if (!result.rows[0]) {
    return null;
  }

  return mapSurvey(result.rows[0]);
}

export async function deleteSurvey(id: string) {
  const result = await pool.query(
    `DELETE FROM surveys WHERE id = $1 RETURNING id`,
    [id],
  );

  return Boolean(result.rows[0]);
}

export async function listResponsesForSurvey(surveyId: string) {
  const result = await pool.query(
    `SELECT id, survey_id, answers, confirmation_code, created_at
     FROM survey_responses
     WHERE survey_id = $1
     ORDER BY created_at DESC`,
    [surveyId],
  );

  return result.rows.map(mapResponse);
}

export async function submitSurveyResponse(input: {
  surveyId: string;
  answers?: Record<string, boolean | string>;
  confirmationCode?: string;
}) {
  const result = await pool.query(
    `INSERT INTO survey_responses (survey_id, answers, confirmation_code)
     VALUES ($1, $2, $3)
     RETURNING id, survey_id, answers, confirmation_code, created_at`,
    [
      input.surveyId,
      input.answers ? JSON.stringify(input.answers) : null,
      input.confirmationCode ?? null,
    ],
  );

  return mapResponse(result.rows[0]);
}

export async function recordSurveyInvitation(input: {
  surveyId: string;
  clientEmail: string;
  invitedBy: string;
}) {
  await pool.query(
    `INSERT INTO survey_invitations (survey_id, client_email, invited_by)
     VALUES ($1, $2, $3)`,
    [input.surveyId, input.clientEmail, input.invitedBy],
  );
}

export async function listSurveyInvitationsForSurvey(surveyId: string) {
  const result = await pool.query(
    `SELECT id, survey_id, client_email, invited_by, created_at
     FROM survey_invitations
     WHERE survey_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [surveyId],
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    surveyId: String(row.survey_id),
    clientEmail: String(row.client_email),
    invitedBy: String(row.invited_by),
    createdAt: new Date(String(row.created_at)),
  }));
}

export async function getOrCreateInviteToken(input: {
  surveyId: string;
  createdBy: string;
}) {
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
  await pool.query(`DELETE FROM survey_invite_tokens WHERE survey_id = $1`, [
    input.surveyId,
  ]);

  const token = createInviteTokenValue();
  await pool.query(
    `INSERT INTO survey_invite_tokens (token, survey_id, created_by)
     VALUES ($1, $2, $3)`,
    [token, input.surveyId, input.createdBy],
  );

  return token;
}

export async function getSurveyByInviteToken(token: string) {
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
