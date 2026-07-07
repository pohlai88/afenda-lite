import { pool } from "@/lib/db";
import { createInviteTokenValue } from "@/lib/tokens";

export { DRAFT_SURVEY_TITLE, isDraftSurveyTitle } from "@/lib/survey-draft";

export type SurveyMetadata = {
  referenceNumber: string | null;
  caseNumber: string | null;
  effectiveDate: Date | null;
  submitBefore: Date | null;
  surveyorName: string | null;
  surveyorOrg: string | null;
  surveyeeIndividual: string | null;
  surveyeeOrg: string | null;
  purpose: string | null;
  categories: string[];
};

export type Survey = {
  id: string;
  slug: string;
  title: string;
  question: string;
  userId: string;
  createdAt: Date;
} & SurveyMetadata;

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

export function pickSurveyMetadata(survey: Survey): SurveyMetadata {
  return {
    referenceNumber: survey.referenceNumber,
    caseNumber: survey.caseNumber,
    effectiveDate: survey.effectiveDate,
    submitBefore: survey.submitBefore,
    surveyorName: survey.surveyorName,
    surveyorOrg: survey.surveyorOrg,
    surveyeeIndividual: survey.surveyeeIndividual,
    surveyeeOrg: survey.surveyeeOrg,
    purpose: survey.purpose,
    categories: survey.categories,
  };
}

function mapSurveyMetadata(row: Record<string, unknown>): SurveyMetadata {
  const categoriesRaw = row.categories;
  let categories: string[] = [];
  if (Array.isArray(categoriesRaw)) {
    categories = categoriesRaw.map(String);
  }

  return {
    referenceNumber: row.reference_number
      ? String(row.reference_number)
      : null,
    caseNumber: row.case_number ? String(row.case_number) : null,
    effectiveDate: row.effective_date
      ? new Date(String(row.effective_date))
      : null,
    submitBefore: row.submit_before
      ? new Date(String(row.submit_before))
      : null,
    surveyorName: row.surveyor_name ? String(row.surveyor_name) : null,
    surveyorOrg: row.surveyor_org ? String(row.surveyor_org) : null,
    surveyeeIndividual: row.surveyee_individual
      ? String(row.surveyee_individual)
      : null,
    surveyeeOrg: row.surveyee_org ? String(row.surveyee_org) : null,
    purpose: row.purpose ? String(row.purpose) : null,
    categories,
  };
}

const SURVEY_SELECT_COLUMNS = `
  id, slug, title, question, user_id, created_at,
  reference_number, case_number, effective_date, submit_before,
  surveyor_name, surveyor_org, surveyee_individual, surveyee_org,
  purpose, categories
`;

function mapSurvey(row: Record<string, unknown>): Survey {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    question: String(row.question),
    userId: String(row.user_id),
    createdAt: new Date(String(row.created_at)),
    ...mapSurveyMetadata(row),
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
  metadata?: Partial<SurveyMetadata>;
}) {
  const slug = createSlug(input.title);
  const metadata = input.metadata;
  const result = await pool.query(
    `INSERT INTO surveys (
       slug, title, question, user_id,
       reference_number, case_number, effective_date, submit_before,
       surveyor_name, surveyor_org, surveyee_individual, surveyee_org,
       purpose, categories
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING ${SURVEY_SELECT_COLUMNS}`,
    [
      slug,
      input.title.trim(),
      input.question.trim(),
      input.userId,
      metadata?.referenceNumber ?? null,
      metadata?.caseNumber ?? null,
      metadata?.effectiveDate?.toISOString().slice(0, 10) ?? null,
      metadata?.submitBefore?.toISOString() ?? null,
      metadata?.surveyorName ?? null,
      metadata?.surveyorOrg ?? null,
      metadata?.surveyeeIndividual ?? null,
      metadata?.surveyeeOrg ?? null,
      metadata?.purpose ?? null,
      metadata?.categories ?? [],
    ],
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
       s.reference_number,
       s.case_number,
       s.effective_date,
       s.submit_before,
       s.surveyor_name,
       s.surveyor_org,
       s.surveyee_individual,
       s.surveyee_org,
       s.purpose,
       s.categories,
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
    `SELECT ${SURVEY_SELECT_COLUMNS}
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
    `SELECT ${SURVEY_SELECT_COLUMNS}
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
  metadata?: SurveyMetadata;
}) {
  const metadata = input.metadata;
  const result = await pool.query(
    `UPDATE surveys
     SET title = $2,
         question = $3,
         reference_number = $4,
         case_number = $5,
         effective_date = $6,
         submit_before = $7,
         surveyor_name = $8,
         surveyor_org = $9,
         surveyee_individual = $10,
         surveyee_org = $11,
         purpose = $12,
         categories = $13
     WHERE id = $1
     RETURNING ${SURVEY_SELECT_COLUMNS}`,
    [
      input.id,
      input.title.trim(),
      input.question.trim(),
      metadata?.referenceNumber ?? null,
      metadata?.caseNumber ?? null,
      metadata?.effectiveDate?.toISOString().slice(0, 10) ?? null,
      metadata?.submitBefore?.toISOString() ?? null,
      metadata?.surveyorName ?? null,
      metadata?.surveyorOrg ?? null,
      metadata?.surveyeeIndividual ?? null,
      metadata?.surveyeeOrg ?? null,
      metadata?.purpose ?? null,
      metadata?.categories ?? [],
    ],
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
    `SELECT id, survey_id, client_email, invited_by, sent_at AS created_at
     FROM survey_invitations
     WHERE survey_id = $1
     ORDER BY sent_at DESC
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
    `SELECT s.id, s.slug, s.title, s.question, s.user_id, s.created_at,
            s.reference_number, s.case_number, s.effective_date, s.submit_before,
            s.surveyor_name, s.surveyor_org, s.surveyee_individual, s.surveyee_org,
            s.purpose, s.categories
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
