import "server-only";

import { pool } from "@/modules/platform/db";
import { normalizeEmail } from "@/modules/declarations/domain/clients";
import { getDeclarationDeadlineError } from "@/modules/declarations/domain/declaration-deadlines";
import {
  getEvidenceRecordsByIds,
  listQuestionsForSurvey,
  validateAnswers,
  type SurveyAnswers,
} from "@/modules/declarations/domain/questions";
import { portalCopy } from "@/modules/platform/copy/portal-copy";
import { submitSurveyResponse } from "@/modules/declarations/domain/surveys";

async function validateSubmissionAnswers(input: {
  surveyId: string;
  answers: SurveyAnswers;
}) {
  const questions = await listQuestionsForSurvey(input.surveyId);
  const validationError = validateAnswers(questions, input.answers, {
    requiredFieldError: portalCopy.declarationForm.requiredFieldError,
    fileRequired: portalCopy.declarationForm.fileRequired,
    yesNoRequired: portalCopy.declarationForm.yesNoRequired,
    textTooShort: portalCopy.declarationForm.textTooShort,
    textTooLong: portalCopy.declarationForm.textTooLong,
  });
  if (validationError) {
    return { error: validationError };
  }

  const fileEvidenceIds = questions
    .filter((question) => question.type === "file")
    .map((question) => input.answers[question.id])
    .filter(
      (value): value is string => typeof value === "string" && Boolean(value),
    );

  const evidenceById = await getEvidenceRecordsByIds(
    fileEvidenceIds,
    input.surveyId,
  );

  for (const question of questions) {
    if (question.type !== "file") continue;
    const evidenceId = input.answers[question.id];
    if (typeof evidenceId !== "string" || !evidenceId) continue;
    const evidence = evidenceById.get(evidenceId);
    if (!evidence) {
      return { error: portalCopy.declarationForm.fileEvidenceMissing };
    }
    if (evidence.questionId !== question.id) {
      return { error: portalCopy.declarationForm.fileEvidenceMismatch };
    }
  }

  return { questions };
}

export async function submitAnswersForSurvey(input: {
  surveyId: string;
  answers: SurveyAnswers;
  confirmationCode?: string;
}) {
  const validation = await validateSubmissionAnswers(input);
  if ("error" in validation) {
    return validation;
  }

  await submitSurveyResponse({
    surveyId: input.surveyId,
    answers: input.answers,
    confirmationCode: input.confirmationCode,
  });

  return { success: true as const };
}

export async function submitClientDeclaration(input: {
  assignmentId: string;
  surveyId: string;
  clientEmail: string;
  answers: SurveyAnswers;
  confirmationCode: string;
  dueDate: Date | null;
  submitBefore: Date | null;
}) {
  const deadlineKind = getDeclarationDeadlineError({
    dueDate: input.dueDate,
    submitBefore: input.submitBefore,
  });
  if (deadlineKind === "assignment") {
    return { error: portalCopy.clientDashboard.deadlineExpiredAssignment };
  }
  if (deadlineKind === "declaration") {
    return { error: portalCopy.clientDashboard.deadlineExpiredDeclaration };
  }

  const validation = await validateSubmissionAnswers({
    surveyId: input.surveyId,
    answers: input.answers,
  });
  if ("error" in validation) {
    return validation;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const assignmentResult = await client.query(
      `SELECT id, status, confirmation_code
       FROM client_assignments
       WHERE id = $1
         AND lower(client_email) = lower($2)
         AND survey_id = $3
       FOR UPDATE`,
      [
        input.assignmentId,
        normalizeEmail(input.clientEmail),
        input.surveyId,
      ],
    );

    const assignmentRow = assignmentResult.rows[0];
    if (!assignmentRow) {
      await client.query("ROLLBACK");
      return { error: portalCopy.clientDashboard.assignmentNotFound };
    }

    if (String(assignmentRow.status) === "submitted") {
      await client.query("ROLLBACK");
      return {
        error: portalCopy.clientDashboard.alreadySubmitted,
        confirmationCode: assignmentRow.confirmation_code
          ? String(assignmentRow.confirmation_code)
          : undefined,
      };
    }

    await client.query(
      `INSERT INTO survey_responses (survey_id, answers, confirmation_code, assignment_id)
       VALUES ($1, $2, $3, $4)`,
      [
        input.surveyId,
        JSON.stringify(input.answers),
        input.confirmationCode,
        input.assignmentId,
      ],
    );

    const completed = await client.query(
      `UPDATE client_assignments
       SET status = 'submitted',
           confirmation_code = $2,
           draft_answers = NULL,
           draft_step_index = NULL,
           draft_saved_at = NULL
       WHERE id = $1 AND status <> 'submitted'
       RETURNING id`,
      [input.assignmentId, input.confirmationCode],
    );

    if (!completed.rowCount) {
      await client.query("ROLLBACK");
      return { error: portalCopy.clientDashboard.alreadySubmitted };
    }

    await client.query("COMMIT");
    return { success: true as const, confirmationCode: input.confirmationCode };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
