import { pool } from "@/lib/db";
import { ensureSurveySchema } from "@/lib/surveys";

export type QuestionType = "yes_no" | "text" | "file";

export type SurveyQuestion = {
  id: string;
  surveyId: string;
  prompt: string;
  type: QuestionType;
  required: boolean;
  sortOrder: number;
};

export type SurveyAnswers = Record<string, boolean | string>;

export type EvidenceRecord = {
  id: string;
  surveyId: string;
  questionId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

let questionSchemaReady: Promise<void> | null = null;

export async function ensureQuestionSchema() {
  await ensureSurveySchema();
  if (!questionSchemaReady) {
    questionSchemaReady = pool
      .query(`
      CREATE TABLE IF NOT EXISTS survey_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        prompt TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('yes_no', 'text', 'file')),
        required BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS survey_questions_survey_id_idx
        ON survey_questions (survey_id);

      CREATE TABLE IF NOT EXISTS evidence_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
        size_bytes INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE survey_responses
        ALTER COLUMN rating DROP NOT NULL;

      ALTER TABLE survey_responses
        ADD COLUMN IF NOT EXISTS answers JSONB;
    `)
      .then(() => undefined);
  }
  await questionSchemaReady;
}

function mapQuestion(row: Record<string, unknown>): SurveyQuestion {
  return {
    id: String(row.id),
    surveyId: String(row.survey_id),
    prompt: String(row.prompt),
    type: String(row.type) as QuestionType,
    required: Boolean(row.required),
    sortOrder: Number(row.sort_order),
  };
}

export async function listQuestionsForSurvey(surveyId: string) {
  await ensureQuestionSchema();
  const result = await pool.query(
    `SELECT id, survey_id, prompt, type, required, sort_order
     FROM survey_questions
     WHERE survey_id = $1
     ORDER BY sort_order ASC`,
    [surveyId],
  );
  return result.rows.map(mapQuestion);
}

export async function replaceSurveyQuestions(
  surveyId: string,
  questions: Array<{
    prompt: string;
    type: QuestionType;
    required: boolean;
  }>,
) {
  await ensureQuestionSchema();
  await pool.query(`DELETE FROM survey_questions WHERE survey_id = $1`, [surveyId]);

  for (const [index, question] of questions.entries()) {
    await pool.query(
      `INSERT INTO survey_questions (survey_id, prompt, type, required, sort_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [surveyId, question.prompt.trim(), question.type, question.required, index],
    );
  }
}

export async function registerEvidence(input: {
  surveyId: string;
  questionId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}) {
  await ensureQuestionSchema();
  const result = await pool.query(
    `INSERT INTO evidence_records (survey_id, question_id, file_name, mime_type, size_bytes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, survey_id, question_id, file_name, mime_type, size_bytes, created_at`,
    [
      input.surveyId,
      input.questionId,
      input.fileName.trim(),
      input.mimeType.trim() || "application/octet-stream",
      Math.max(0, input.sizeBytes),
    ],
  );
  const row = result.rows[0];
  return {
    id: String(row.id),
    surveyId: String(row.survey_id),
    questionId: String(row.question_id),
    fileName: String(row.file_name),
    mimeType: String(row.mime_type),
    sizeBytes: Number(row.size_bytes),
    createdAt: new Date(String(row.created_at)),
  } satisfies EvidenceRecord;
}

export async function getEvidenceRecord(id: string, surveyId: string) {
  await ensureQuestionSchema();
  const result = await pool.query(
    `SELECT id, survey_id, question_id, file_name, mime_type, size_bytes, created_at
     FROM evidence_records
     WHERE id = $1 AND survey_id = $2
     LIMIT 1`,
    [id, surveyId],
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    id: String(row.id),
    surveyId: String(row.survey_id),
    questionId: String(row.question_id),
    fileName: String(row.file_name),
    mimeType: String(row.mime_type),
    sizeBytes: Number(row.size_bytes),
    createdAt: new Date(String(row.created_at)),
  } satisfies EvidenceRecord;
}

export async function ensureDefaultQuestions(surveyId: string, intro: string) {
  const existing = await listQuestionsForSurvey(surveyId);
  if (existing.length > 0) return existing;

  await replaceSurveyQuestions(surveyId, [
    {
      prompt: intro.trim() || "Please complete this declaration.",
      type: "text",
      required: true,
    },
  ]);

  return listQuestionsForSurvey(surveyId);
}

export function parseQuestionsFromForm(formData: FormData) {
  const prompts = formData.getAll("questionPrompt");
  const types = formData.getAll("questionType");
  const requiredFlags = formData.getAll("questionRequired");

  const questions: Array<{
    prompt: string;
    type: QuestionType;
    required: boolean;
  }> = [];

  for (let index = 0; index < prompts.length; index += 1) {
    const prompt = String(prompts[index] ?? "").trim();
    const type = String(types[index] ?? "text") as QuestionType;
    if (!prompt) continue;
    if (type !== "yes_no" && type !== "text" && type !== "file") continue;
    questions.push({
      prompt,
      type,
      required: String(requiredFlags[index] ?? "true") === "true",
    });
  }

  return questions;
}

export function validateAnswers(
  questions: SurveyQuestion[],
  answers: SurveyAnswers,
) {
  for (const question of questions) {
    const value = answers[question.id];
    if (!question.required) continue;

    if (question.type === "yes_no") {
      if (typeof value !== "boolean") {
        return question.prompt;
      }
      continue;
    }

    if (typeof value !== "string" || !value.trim()) {
      return question.prompt;
    }
  }
  return null;
}

export function formatAnswerForDisplay(
  question: SurveyQuestion,
  value: boolean | string | undefined,
  evidenceName?: string,
) {
  if (value === undefined) return "—";
  if (question.type === "yes_no") return value ? "Yes" : "No";
  if (question.type === "file") return evidenceName ?? String(value);
  return String(value);
}
