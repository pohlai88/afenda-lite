"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/app/actions/admin";
import { recordAuditEvent } from "@/lib/audit";
import {
  getEvidenceRecordsByIds,
  listQuestionsForSurvey,
  replaceSurveyQuestions,
  validateAnswers,
  type SurveyAnswers,
} from "@/lib/questions";
import { runLoggedAction } from "@/lib/observability";
import { portalCopy } from "@/lib/portal-copy";
import { parseSchema } from "@/lib/schemas/common";
import {
  deleteSurveySchema,
  rawSurveyFormFromFormData,
  rawUpdateSurveyFromFormData,
  submitSurveyResponseSchema,
  surveyFormSchema,
  updateSurveySchema,
} from "@/lib/schemas/surveys";
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

  const fileEvidenceIds = questions
    .filter((question) => question.type === "file")
    .map((question) => input.answers[question.id])
    .filter((value): value is string => typeof value === "string" && Boolean(value));

  const evidenceById = await getEvidenceRecordsByIds(
    fileEvidenceIds,
    input.surveyId,
  );

  for (const question of questions) {
    if (question.type !== "file") continue;
    const evidenceId = input.answers[question.id];
    if (typeof evidenceId !== "string" || !evidenceId) continue;
    const evidence = evidenceById.get(evidenceId);
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

  return runLoggedAction("createSurveyAction", session.user.id, async () => {
    const parsed = parseSchema(
      surveyFormSchema,
      rawSurveyFormFromFormData(formData),
    );

    if (!parsed.success) {
      if (parsed.error.includes("title") || parsed.error.includes("Title")) {
        return { error: portalCopy.org.create.titleRequired };
      }
      return { error: portalCopy.questions.emptyError };
    }

    const { title, question, questions } = parsed.data;

    const survey = await createSurvey({
      title,
      question: question || title,
      userId: session.user.id,
    });
    await replaceSurveyQuestions(survey.id, questions);

    await recordAuditEvent({
      actorId: session.user.id,
      eventType: "declaration.created",
      resourceType: "declaration",
      resourceId: survey.id,
      metadata: { title: survey.title },
    });

    revalidatePath("/dashboard");
    redirect(`/dashboard/${survey.id}`);
  });
}

export async function updateSurveyAction(formData: FormData) {
  const session = await requireAdminSession();

  return runLoggedAction("updateSurveyAction", session.user.id, async () => {
    const parsed = parseSchema(
      updateSurveySchema,
      rawUpdateSurveyFromFormData(formData),
    );

    if (!parsed.success) {
      return {
        error: parsed.error.includes("id")
          ? portalCopy.errors.declarationNotFound
          : portalCopy.errors.titleRequired,
      };
    }

    const { id, title, question, questions } = parsed.data;

    const existing = await getSurveyForAdmin(id);
    if (!existing) {
      return { error: portalCopy.errors.declarationNotFound };
    }

    await updateSurvey({ id, title, question: question || title });
    if (questions.length > 0) {
      await replaceSurveyQuestions(id, questions);
    }

    await recordAuditEvent({
      actorId: session.user.id,
      eventType: "declaration.updated",
      resourceType: "declaration",
      resourceId: id,
    });
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/${id}`);
    redirect(`/dashboard/${id}`);
  });
}

export async function deleteSurveyAction(formData: FormData) {
  const session = await requireAdminSession();

  return runLoggedAction("deleteSurveyAction", session.user.id, async () => {
    const parsed = parseSchema(deleteSurveySchema, {
      id: String(formData.get("id") ?? "").trim(),
    });

    if (!parsed.success) {
      return { error: portalCopy.errors.declarationNotFound };
    }

    const { id } = parsed.data;

    const existing = await getSurveyForAdmin(id);
    if (!existing) {
      return { error: portalCopy.errors.declarationNotFound };
    }

    await deleteSurvey(id);

    await recordAuditEvent({
      actorId: session.user.id,
      eventType: "declaration.deleted",
      resourceType: "declaration",
      resourceId: id,
    });

    revalidatePath("/dashboard");
    redirect("/dashboard");
  });
}

export async function submitSurveyResponseAction(input: {
  slug: string;
  answers: SurveyAnswers;
}) {
  return runLoggedAction("submitSurveyResponseAction", undefined, async () => {
    const parsed = parseSchema(submitSurveyResponseSchema, input);

    if (!parsed.success) {
      return { error: portalCopy.errors.declarationNotFound };
    }

    const survey = await getSurveyBySlug(parsed.data.slug);
    if (!survey) {
      return { error: portalCopy.errors.declarationNotFound };
    }

    const result = await submitAnswersForSurvey({
      surveyId: survey.id,
      answers: parsed.data.answers,
    });

    if (result.error) {
      return result;
    }

    await recordAuditEvent({
      eventType: "declaration.submitted",
      resourceType: "declaration",
      resourceId: survey.id,
      metadata: { surface: "public" },
    });

    return { success: true };
  });
}
