import { pool } from "@/lib/db";
import { validateEvidenceMetadata } from "@/lib/evidence-policy";

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

function mapEvidenceRecord(row: Record<string, unknown>): EvidenceRecord {
  return {
    id: String(row.id),
    surveyId: String(row.survey_id),
    questionId: String(row.question_id),
    fileName: String(row.file_name),
    mimeType: String(row.mime_type),
    sizeBytes: Number(row.size_bytes),
    createdAt: new Date(String(row.created_at)),
  };
}

export async function listQuestionsForSurvey(surveyId: string) {
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
  const policy = validateEvidenceMetadata({
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  });
  if (!policy.ok) {
    throw new Error(`Evidence metadata rejected: ${policy.reason}`);
  }

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

  return mapEvidenceRecord(result.rows[0]);
}

export async function getEvidenceRecord(id: string, surveyId: string) {
  const result = await pool.query(
    `SELECT id, survey_id, question_id, file_name, mime_type, size_bytes, created_at
     FROM evidence_records
     WHERE id = $1 AND survey_id = $2
     LIMIT 1`,
    [id, surveyId],
  );
  if (!result.rows[0]) return null;
  return mapEvidenceRecord(result.rows[0]);
}

export async function getEvidenceRecordsByIds(ids: string[], surveyId: string) {
  if (ids.length === 0) {
    return new Map<string, EvidenceRecord>();
  }

  const result = await pool.query(
    `SELECT id, survey_id, question_id, file_name, mime_type, size_bytes, created_at
     FROM evidence_records
     WHERE survey_id = $1 AND id = ANY($2::uuid[])`,
    [surveyId, ids],
  );

  const records = new Map<string, EvidenceRecord>();
  for (const row of result.rows) {
    const record = mapEvidenceRecord(row);
    records.set(record.id, record);
  }

  return records;
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
