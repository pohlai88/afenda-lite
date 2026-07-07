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
  rawUpdateSurveyFromFormData,
  submitSurveyResponseSchema,
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
import { DRAFT_SURVEY_TITLE } from "@/lib/survey-draft";
import { createClientAssignment } from "@/lib/clients";
import {
  buildCdpPackageForExport,
  cdpQuestionsToDrafts,
  cdpToMetadata,
  parseCdpPackage,
  serializeCdpPackage,
  type CdpPackage,
} from "@/lib/survey-package";
import { analyzeCdpPackageInput, type PackageAnalysis } from "@/lib/survey-package-analyze";

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

async function applyCdpPackageToSurvey(
  surveyId: string,
  pkg: CdpPackage,
  actorId: string,
  createAssignment: boolean,
) {
  const metadata = cdpToMetadata(pkg.metadata ?? {});

  await updateSurvey({
    id: surveyId,
    title: pkg.declaration.title,
    question: pkg.declaration.intro ?? pkg.declaration.title,
    metadata,
  });

  const drafts = cdpQuestionsToDrafts(pkg.declaration.questions);
  await replaceSurveyQuestions(
    surveyId,
    drafts.map((q) => ({
      prompt: q.prompt,
      type: q.type,
      required: q.required,
      config: q.config,
    })),
  );

  let assignmentCreated = false;
  if (createAssignment && pkg.assignment?.clientEmail) {
    await createClientAssignment({
      surveyId,
      clientEmail: pkg.assignment.clientEmail,
      assignedBy: actorId,
      dueDate: pkg.assignment.dueDate
        ? new Date(`${pkg.assignment.dueDate}T23:59:59.000Z`)
        : metadata.submitBefore ?? undefined,
    });
    assignmentCreated = true;
  }

  return { assignmentCreated };
}

function parseValidatedPackage(
  packageJson: string,
):
  | { ok: true; analysis: PackageAnalysis; pkg: CdpPackage }
  | { ok: false; error: string; analysis?: PackageAnalysis } {
  const analysis = analyzeCdpPackageInput({ packageJson });

  if (!analysis.canIngest || !analysis.valid) {
    return {
      ok: false,
      error: portalCopy.declarationDetail.package.ingestBlocked,
      analysis,
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(packageJson);
  } catch {
    return { ok: false, error: portalCopy.declarationDetail.package.invalidJson };
  }

  const parsed = parseCdpPackage(raw);
  if (!parsed.success) {
    return { ok: false, error: portalCopy.declarationDetail.package.invalidSchema };
  }

  return { ok: true, analysis, pkg: parsed.data };
}

export async function createDraftSurveyAction() {
  const session = await requireAdminSession();

  return runLoggedAction("createDraftSurveyAction", session.user.id, async () => {
    const survey = await createSurvey({
      title: DRAFT_SURVEY_TITLE,
      question: "",
      userId: session.user.id,
    });

    await recordAuditEvent({
      actorId: session.user.id,
      eventType: "declaration.created",
      resourceType: "declaration",
      resourceId: survey.id,
      metadata: { title: survey.title, draft: true },
    });

    revalidatePath("/dashboard");
    redirect(`/dashboard/${survey.id}?tab=manage`);
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

    const { id, title, question, questions, metadata } = parsed.data;

    const existing = await getSurveyForAdmin(id);
    if (!existing) {
      return { error: portalCopy.errors.declarationNotFound };
    }

    await updateSurvey({
      id,
      title,
      question: question || title,
      metadata: metadata ?? existing,
    });
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

export async function exportSurveyPackageAction(surveyId: string) {
  const session = await requireAdminSession();

  return runLoggedAction("exportSurveyPackageAction", session.user.id, async () => {
    const survey = await getSurveyForAdmin(surveyId);
    if (!survey) {
      return { error: portalCopy.errors.declarationNotFound };
    }

    const questions = await listQuestionsForSurvey(surveyId);
    const pkg = buildCdpPackageForExport({ survey, questions });
    return { packageJson: serializeCdpPackage(pkg) };
  });
}

export async function validateSurveyPackageAction(input: {
  packageJson: string;
  fileName?: string;
}) {
  await requireAdminSession();

  return analyzeCdpPackageInput(input);
}

export async function importSurveyPackageAction(input: {
  surveyId: string;
  packageJson: string;
  createAssignment?: boolean;
}) {
  const session = await requireAdminSession();

  return runLoggedAction("importSurveyPackageAction", session.user.id, async () => {
    const survey = await getSurveyForAdmin(input.surveyId);
    if (!survey) {
      return { error: portalCopy.errors.declarationNotFound };
    }

    const validated = parseValidatedPackage(input.packageJson);
    if (!validated.ok) {
      return validated.analysis
        ? { error: validated.error, analysis: validated.analysis }
        : { error: validated.error };
    }

    const { analysis, pkg } = validated;

    const { assignmentCreated } = await applyCdpPackageToSurvey(
      survey.id,
      pkg,
      session.user.id,
      input.createAssignment ?? true,
    );

    await recordAuditEvent({
      actorId: session.user.id,
      eventType: "declaration.imported",
      resourceType: "declaration",
      resourceId: survey.id,
      metadata: {
        cdpVersion: pkg.cdpVersion,
        confidence: analysis.confidence,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/${survey.id}`);
    revalidatePath("/dashboard/clients");

    return {
      success: true as const,
      analysis,
      assignmentCreated,
    };
  });
}
