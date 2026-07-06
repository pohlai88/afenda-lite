"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/app/actions/admin";
import {
  getEvidenceRecord,
  listQuestionsForSurvey,
  parseQuestionsFromForm,
  replaceSurveyQuestions,
  validateAnswers,
  type SurveyAnswers,
} from "@/lib/questions";
import { portalCopy } from "@/lib/portal-copy";
import {
  createSurvey,
  deleteSurvey,
  getSurveyBySlug,
  getSurveyForAdmin,
  submitSurveyResponse,
  updateSurvey,
} from "@/lib/surveys";

async function submitAnswersForSurvey(input: {
  surveyId: string;
  answers: SurveyAnswers;
  confirmationCode?: string;
}) {
  const questions = await listQuestionsForSurvey(input.surveyId);
  const missing = validateAnswers(questions, input.answers);
  if (missing) {
    return { error: portalCopy.declarationForm.requiredField(missing) };
  }

  for (const question of questions) {
    if (question.type !== "file") continue;
    const evidenceId = input.answers[question.id];
    if (typeof evidenceId !== "string" || !evidenceId) continue;
    const evidence = await getEvidenceRecord(evidenceId, input.surveyId);
    if (!evidence || evidence.questionId !== question.id) {
      return { error: portalCopy.declarationForm.fileInvalid };
    }
  }

  await submitSurveyResponse({
    surveyId: input.surveyId,
    answers: input.answers,
    confirmationCode: input.confirmationCode,
  });

  return { success: true as const };
}

export { submitAnswersForSurvey };

export async function createSurveyAction(formData: FormData) {
  const session = await requireAdminSession();
  const title = String(formData.get("title") ?? "").trim();
  const question = String(formData.get("description") ?? formData.get("question") ?? "").trim();
  const questions = parseQuestionsFromForm(formData);

  if (!title) {
    return { error: portalCopy.account.create.titleRequired };
  }

  if (questions.length === 0) {
    return { error: portalCopy.questions.emptyError };
  }

  const survey = await createSurvey({
    title,
    question: question || title,
    userId: session.user.id,
  });
  await replaceSurveyQuestions(survey.id, questions);
  revalidatePath("/dashboard");
  redirect(`/dashboard/${survey.id}`);
}

export async function updateSurveyAction(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const question = String(formData.get("description") ?? formData.get("question") ?? "").trim();
  const questions = parseQuestionsFromForm(formData);

  if (!id || !title) {
    throw new Error("Title is required.");
  }

  const existing = await getSurveyForAdmin(id);
  if (!existing) {
    throw new Error("Declaration not found.");
  }

  await updateSurvey({ id, title, question: question || title });
  if (questions.length > 0) {
    await replaceSurveyQuestions(id, questions);
  }
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${id}`);
  redirect(`/dashboard/${id}`);
}

export async function deleteSurveyAction(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return { error: "Declaration not found." };
  }

  const existing = await getSurveyForAdmin(id);
  if (!existing) {
    return { error: "Declaration not found." };
  }

  await deleteSurvey(id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function submitSurveyResponseAction(input: {
  slug: string;
  answers: SurveyAnswers;
}) {
  const survey = await getSurveyBySlug(input.slug);
  if (!survey) {
    return { error: "Declaration not found." };
  }

  const result = await submitAnswersForSurvey({
    surveyId: survey.id,
    answers: input.answers,
  });

  if (result.error) {
    return result;
  }

  return { success: true };
}

export async function submitSurveyResponseFormAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const answersJson = String(formData.get("answers") ?? "").trim();

  if (!slug || !answersJson) {
    return { error: portalCopy.declarationForm.submitError };
  }

  try {
    const answers = JSON.parse(answersJson) as SurveyAnswers;
    return submitSurveyResponseAction({ slug, answers });
  } catch {
    return { error: portalCopy.declarationForm.submitError };
  }
}
